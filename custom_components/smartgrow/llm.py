"""SmartGrow LLM tools — exposed through HA's MCP Server integration.

How this works (verified against HA 2026.8 source):
- ``homeassistant/components/llm`` registers the Assist API with
  ``homeassistant.helpers.llm.async_register_api``.
- Integrations contribute tools by shipping an ``llm.py`` platform module
  exposing ``async_get_tools(hass, llm_context, api_id) -> LLMTools | None``.
- The built-in **MCP Server** integration serves those exact tools over
  MCP (SSE + streamable HTTP at ``/mcp_server/...``) — no extra server needed
  from this integration. Tools therefore appear both to Assist pipelines and
  to any MCP client connected to HA's MCP server.

There is deliberately NO raw fan-setpoint tool: the fan is driven by the
control law, not by ad-hoc commands.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import voluptuous as vol
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError
try:  # HA >= 2026.8 exposes the llm component with LLMTools
    from homeassistant.components.llm import LLMTools  # noqa: F401
except ImportError:  # older HA: tools are registered via helpers.llm API instead
    LLMTools = None  # type: ignore[assignment]
from homeassistant.helpers.llm import LLM_API_ASSIST, LLMContext, Tool, ToolInput
from homeassistant.util.json import JsonObjectType

from .const import DOMAIN
from .logic.params import STAGES, ControlParams

_LOGGER = logging.getLogger(__name__)

TOOLS_PROMPT = (
    "SmartGrow grow-tent tools are available: use get_climate_summary for current "
    "tent conditions, get_control_trace to explain recent fan/dehumidifier "
    "decisions, get_adaptation_state / set_adaptation for the adaptation engine, "
    "set_targets to change the VPD band, force_recalibrate to reset learned "
    "parameters, and get_parameter_explanations for human-readable parameter "
    "rationale."
)


@callback
def async_get_tools(
    hass: HomeAssistant, llm_context: LLMContext, api_id: str
) -> LLMTools | None:
    """Return SmartGrow's tools for the Assist/MCP API."""
    if api_id != LLM_API_ASSIST:
        return None
    return LLMTools(
        tools=[
            GetClimateSummaryTool(hass),
            GetControlTraceTool(hass),
            GetAdaptationStateTool(hass),
            SetTargetsTool(hass),
            SetAdaptationTool(hass),
            ForceRecalibrateTool(hass),
            GetParameterExplanationsTool(hass),
        ],
        prompt=TOOLS_PROMPT,
    )


def _one_coordinator(hass: HomeAssistant) -> Any:
    """The (single) SmartGrow coordinator, or an error."""
    store = hass.data.get(DOMAIN, {})
    if not store:
        raise HomeAssistantError("SmartGrow is not configured")
    return next(iter(store.values()))["coordinator"]


class _SmartGrowTool(Tool):
    """Base tool holding a hass reference."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self.parameters = vol.Schema({})


class GetClimateSummaryTool(_SmartGrowTool):
    """Current tent/lung climate and last decisions."""

    name = "get_climate_summary"
    description = (
        "Current SmartGrow grow-tent climate: tent/lung temperature, humidity, "
        "absolute humidity, VPD vs band, fan target and dehumidifier state."
    )

    async def async_call(
        self, hass: HomeAssistant, tool_input: ToolInput, llm_context: LLMContext
    ) -> JsonObjectType:
        coordinator = _one_coordinator(hass)
        inputs = coordinator.last_inputs
        if inputs is None:
            return {"success": False, "error": "No sensor sample yet"}
        fan = coordinator.last_fan_decision
        dehum = coordinator.last_dehum_decision
        control: ControlParams = coordinator.options_rt.control
        low = control.effective_band_low(inputs.stage, inputs.is_day)
        high = control.band_high(inputs.stage, inputs.is_day)
        return {
            "success": True,
            "result": {
                "tent": {"temp_c": inputs.tent_temp, "rh_pct": inputs.tent_rh},
                "lung_room": {"temp_c": inputs.lung_temp, "rh_pct": inputs.lung_rh},
                "vpd_kpa": inputs.vpd,
                "vpd_band": [low, high],
                "stage": inputs.stage,
                "phase": "day" if inputs.is_day else "night",
                "fan": {
                    "target_pct": fan.fan_target if fan else None,
                    "active_term": fan.active_term if fan else None,
                    "delta_ah_gm3": fan.d_ah if fan else None,
                },
                "dehumidifier": {
                    "decision": dehum.action if dehum else None,
                    "reason": dehum.reason if dehum else None,
                    "dry_run": coordinator.options_rt.dry_run,
                },
            },
        }


class GetControlTraceTool(_SmartGrowTool):
    name = "get_control_trace"
    description = (
        "Recent SmartGrow control decisions (fan target + terms, dehumidifier "
        "cascade actions with reasons), newest first."
    )

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)
        self.parameters = vol.Schema(
            {
                vol.Optional("limit", default=20): vol.All(
                    vol.Coerce(int), vol.Range(min=1, max=200)
                ),
            }
        )

    async def async_call(
        self, hass: HomeAssistant, tool_input: ToolInput, llm_context: LLMContext
    ) -> JsonObjectType:
        coordinator = _one_coordinator(hass)
        limit = int(tool_input.tool_args.get("limit", 20))
        trace = list(reversed(coordinator.trace[-limit:]))
        return {"success": True, "result": {"decisions": trace, "count": len(trace)}}


class GetAdaptationStateTool(_SmartGrowTool):
    name = "get_adaptation_state"
    description = (
        "SmartGrow adaptation engine state: enabled, oscillation flips/24h, "
        "adapted parameters with confidence and watchdog status."
    )

    async def async_call(
        self, hass: HomeAssistant, tool_input: ToolInput, llm_context: LLMContext
    ) -> JsonObjectType:
        coordinator = _one_coordinator(hass)
        return {"success": True, "result": coordinator.engine.snapshot()}


class SetTargetsTool(_SmartGrowTool):
    name = "set_targets"
    description = (
        "Set the SmartGrow VPD band lows (kPa) for day and night for a grow "
        "stage. Zero means 'use the stage default'."
    )

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)
        self.parameters = vol.Schema(
            {
                vol.Required("stage"): vol.In(STAGES),
                vol.Required("band_low_day"): vol.All(
                    vol.Coerce(float), vol.Range(min=0.0, max=5.0)
                ),
                vol.Required("band_low_night"): vol.All(
                    vol.Coerce(float), vol.Range(min=0.0, max=5.0)
                ),
            }
        )

    async def async_call(
        self, hass: HomeAssistant, tool_input: ToolInput, llm_context: LLMContext
    ) -> JsonObjectType:
        coordinator = _one_coordinator(hass)
        args = tool_input.tool_args
        coordinator.options_rt.control = coordinator.options_rt.control.with_updates(
            band_low_day=float(args["band_low_day"]),
            band_low_night=float(args["band_low_night"]),
        )
        return {
            "success": True,
            "result": {
                "stage": args["stage"],
                "band_low_day": args["band_low_day"],
                "band_low_night": args["band_low_night"],
            },
        }


class SetAdaptationTool(_SmartGrowTool):
    name = "set_adaptation"
    description = (
        "Enable/disable SmartGrow adaptation and set its aggressiveness "
        "(0.1–3.0). Watchdog auto-disables adaptation on >40% parameter drift."
    )

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)
        self.parameters = vol.Schema(
            {
                vol.Required("enabled"): bool,
                vol.Optional("aggressiveness", default=1.0): vol.All(
                    vol.Coerce(float), vol.Range(min=0.1, max=3.0)
                ),
            }
        )

    async def async_call(
        self, hass: HomeAssistant, tool_input: ToolInput, llm_context: LLMContext
    ) -> JsonObjectType:
        coordinator = _one_coordinator(hass)
        engine = coordinator.engine
        engine.enabled = bool(tool_input.tool_args["enabled"])
        engine.aggressiveness = float(tool_input.tool_args.get("aggressiveness", 1.0))
        if not engine.enabled:
            engine.disabled_reason = "disabled via MCP/Assist tool"
        return {"success": True, "result": engine.snapshot()}


class ForceRecalibrateTool(_SmartGrowTool):
    name = "force_recalibrate"
    description = (
        "Reset SmartGrow adaptation to safe defaults (clears learned gains, "
        "hysteresis widening and oscillation counters)."
    )

    async def async_call(
        self, hass: HomeAssistant, tool_input: ToolInput, llm_context: LLMContext
    ) -> JsonObjectType:
        coordinator = _one_coordinator(hass)
        result = coordinator.engine.force_recalibrate(time.time())
        return {"success": True, "result": result}


class GetParameterExplanationsTool(_SmartGrowTool):
    name = "get_parameter_explanations"
    description = (
        "Human-readable explanation of every active SmartGrow parameter: its "
        "current value, why it has that value (default vs adapted) and the "
        "expected effect of changing it."
    )

    async def async_call(
        self, hass: HomeAssistant, tool_input: ToolInput, llm_context: LLMContext
    ) -> JsonObjectType:
        coordinator = _one_coordinator(hass)
        return {"success": True, "result": explain_parameters(coordinator)}


def explain_parameters(coordinator: Any) -> dict[str, Any]:
    """Build the parameter explanation payload (also used by diagnostics)."""
    control: ControlParams = coordinator.options_rt.control
    engine = coordinator.engine
    inputs = coordinator.last_inputs

    explanations: dict[str, Any] = {
        "fan_floor_day": {
            "value": control.fan_floor_day,
            "why": "proven default" if control.fan_floor_day == 28.0 else "user-tuned",
            "effect": "minimum ventilation % during the day (base airflow)",
        },
        "fan_floor_night": {
            "value": control.fan_floor_night,
            "why": (
                "proven default" if control.fan_floor_night == 20.0 else "user-tuned"
            ),
            "effect": "minimum ventilation % at night (noise + cold protection)",
        },
        "delta_gain": engine.adapted_value("delta_gain", control.delta_gain)
        | {"effect": "fan % per g/m^3 moisture gap tent vs lung room"},
        "dehum_vpd_margin": engine.adapted_value(
            "dehum_vpd_margin", control.dehum_vpd_margin
        )
        | {
            "effect": (
                "anti-churn hysteresis around the VPD band; larger = fewer "
                "on/off flips (the 26-flip-night lesson)"
            )
        },
        "dehum_sat_trigger": {
            "value": control.dehum_sat_trigger,
            "why": (
                "proven default" if control.dehum_sat_trigger == 70.0 else "user-tuned"
            ),
            "effect": (
                "fan % at which the dehumidifier assists (fan at its limit = "
                "ventilation alone insufficient)"
            ),
        },
        "dehum_dry_floor": {
            "value": control.dehum_dry_floor,
            "why": (
                "proven default" if control.dehum_dry_floor == 44.0 else "user-tuned"
            ),
            "effect": (
                "lung-room RH below which the dehumidifier must stop "
                "(protects the intake air)"
            ),
        },
        "adaptation": engine.snapshot(),
        "current_band_low": control.effective_band_low(
            inputs.stage if inputs else "Flowering", inputs.is_day if inputs else True
        ),
    }
    return explanations
