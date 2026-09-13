"""Config flow for SmartGrow."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import CONF_NAME
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.selector import (
    BooleanSelector,
    EntitySelector,
    EntitySelectorConfig,
    SelectSelector,
    SelectSelectorConfig,
)

from .const import (
    CONF_DRY_RUN,
    CONF_DEHUM_ENTITY,
    CONF_FAN_ENTITY,
    CONF_LAMP_ENTITY,
    CONF_LEGACY_STAGE_ENTITY,
    CONF_LEGACY_DEHUM_AUTOMATION,
    CONF_LEGACY_VENT_AUTOMATION,
    CONF_LUNG_RH_ENTITY,
    CONF_LUNG_TEMP_ENTITY,
    CONF_STAGE_ENTITY,
    CONF_TENT_RH_ENTITY,
    CONF_TENT_TEMP_ENTITY,
    CONF_VPD_ENTITY,
    DEFAULTS,
    DOMAIN,
    STAGES,
)

_LOGGER = logging.getLogger(__name__)

ENTITY_SCHEMA_KEYS = {
    vol.Required(CONF_FAN_ENTITY): EntitySelector(EntitySelectorConfig(domain="fan")),
    vol.Required(CONF_TENT_TEMP_ENTITY): EntitySelector(
        EntitySelectorConfig(domain="sensor", device_class="temperature")
    ),
    vol.Required(CONF_TENT_RH_ENTITY): EntitySelector(
        EntitySelectorConfig(domain="sensor", device_class="humidity")
    ),
    # Everything below degrades gracefully when omitted — the flow tells the
    # user what stops working (labels), the logic never breaks.
    vol.Optional(
        CONF_DEHUM_ENTITY,
        description="Dehumidifier (optional — omit for fan-only control)",
    ): EntitySelector(EntitySelectorConfig(domain=["switch", "humidifier"])),
    vol.Optional(
        CONF_LUNG_TEMP_ENTITY,
        description="Lung-room temperature (optional — falls back to tent values)",
    ): EntitySelector(EntitySelectorConfig(domain="sensor", device_class="temperature")),
    vol.Optional(
        CONF_LUNG_RH_ENTITY,
        description="Lung-room humidity (optional — falls back to tent values)",
    ): EntitySelector(EntitySelectorConfig(domain="sensor", device_class="humidity")),
}


class SmartGrowConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle the SmartGrow config flow."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialise the flow store."""
        self._data: dict[str, Any] = {}

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Step 1: entities and dry-run."""
        errors: dict[str, str] = {}
        if user_input is not None:
            self._data.update(user_input)
            # prevent duplicate entries for the same tent sensor set
            await self.async_set_unique_id(
                f"{self._data[CONF_TENT_TEMP_ENTITY]}|{self._data[CONF_TENT_RH_ENTITY]}"
            )
            self._abort_if_unique_id_configured()

            # Tent-unique entities: sharing these across entries means two
            # controllers fighting over the same tent. Must be unique.
            from homeassistant.helpers import entity_registry as er  # noqa: F401

            unique_entities = [
                self._data[k]
                for k in (
                    CONF_FAN_ENTITY,
                    CONF_TENT_TEMP_ENTITY,
                    CONF_TENT_RH_ENTITY,
                )
                if self._data.get(k)
            ]
            # Lung room + dehumidifier MAY be shared between tents (one lung
            # room serving multiple tents with one dehumidifier is a valid
            # setup — the cascade arbitrates shared demand).
            for other in self._async_current_entries():
                if other.entry_id == self.context.get("entry_id"):
                    continue
                other_set = set(other.data.values())
                clash = [e for e in unique_entities if e in other_set]
                if clash:
                    errors["base"] = "entities_already_configured"
                    break
            else:
                return await self.async_step_extras()

        schema = {
            vol.Optional(CONF_NAME, default=""): str,
            **ENTITY_SCHEMA_KEYS,
            vol.Optional(CONF_VPD_ENTITY): EntitySelector(
                EntitySelectorConfig(domain="sensor")
            ),
            vol.Optional(CONF_LAMP_ENTITY): EntitySelector(
                EntitySelectorConfig(domain=["light", "switch", "input_boolean"])
            ),
            vol.Optional(CONF_LEGACY_STAGE_ENTITY): EntitySelector(
                EntitySelectorConfig(domain="input_select")
            ),
            vol.Optional(CONF_STAGE_ENTITY): EntitySelector(
                EntitySelectorConfig(domain=["input_select", "select"])
            ),
            vol.Required(CONF_DRY_RUN, default=True): BooleanSelector(),
        }
        return self.async_show_form(
            step_id="user", data_schema=vol.Schema(schema), errors=errors
        )

    async def async_step_extras(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Step 2: legacy automations (optional) and initial stage."""
        if user_input is not None:
            self._data.update(user_input)
            return self.async_create_entry(
                title=f"SmartGrow {self._data.get(CONF_NAME)}".strip() if self._data.get(CONF_NAME) else "SmartGrow",
                data=self._data,
            )

        schema = {
            vol.Optional(CONF_LEGACY_VENT_AUTOMATION): EntitySelector(
                EntitySelectorConfig(domain="automation")
            ),
            vol.Optional(CONF_LEGACY_DEHUM_AUTOMATION): EntitySelector(
                EntitySelectorConfig(domain="automation")
            ),
            vol.Required("stage", default="Flowering"): SelectSelector(
                SelectSelectorConfig(
                    options=[{"value": s, "label": s} for s in STAGES]
                )
            ),
        }
        return self.async_show_form(step_id="extras", data_schema=vol.Schema(schema))

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> SmartGrowOptionsFlow:
        """Return the options flow handler."""
        return SmartGrowOptionsFlow(config_entry)


class SmartGrowOptionsFlow(config_entries.OptionsFlow):
    """Options: floors, gains, thresholds, band overrides, adaptation."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Store the entry being configured."""
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Show combined options form."""
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        current = {**DEFAULTS, **self.config_entry.options}
        from .const import (
            CONF_ADAPTATION_AGGRESSIVENESS,
            CONF_ADAPTATION_ENABLED,
            CONF_BAND_LOW_DAY,
            CONF_BAND_LOW_NIGHT,
            CONF_COLD_CLAMP,
            CONF_DEHUM_DRY_FLOOR,
            CONF_DEHUM_SAT_TRIGGER,
            CONF_DELTA_GAIN,
            CONF_FAN_FLOOR_DAY,
            CONF_FAN_FLOOR_NIGHT,
            CONF_NEED_GAIN,
            CONF_TEMP_GAIN,
            CONF_VPD_GAIN,
        )

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_FAN_FLOOR_DAY, default=current[CONF_FAN_FLOOR_DAY]
                ): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
                vol.Required(
                    CONF_FAN_FLOOR_NIGHT, default=current[CONF_FAN_FLOOR_NIGHT]
                ): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
                vol.Required(
                    CONF_DELTA_GAIN, default=current[CONF_DELTA_GAIN]
                ): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
                vol.Required(CONF_VPD_GAIN, default=current[CONF_VPD_GAIN]): vol.All(
                    vol.Coerce(float), vol.Range(min=0, max=200)
                ),
                vol.Required(CONF_NEED_GAIN, default=current[CONF_NEED_GAIN]): vol.All(
                    vol.Coerce(float), vol.Range(min=0, max=500)
                ),
                vol.Required(CONF_TEMP_GAIN, default=current[CONF_TEMP_GAIN]): vol.All(
                    vol.Coerce(float), vol.Range(min=0, max=100)
                ),
                vol.Required(
                    CONF_COLD_CLAMP, default=current[CONF_COLD_CLAMP]
                ): vol.All(vol.Coerce(float), vol.Range(min=0, max=1)),
                vol.Required(
                    CONF_DEHUM_SAT_TRIGGER, default=current[CONF_DEHUM_SAT_TRIGGER]
                ): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
                vol.Required(
                    CONF_DEHUM_DRY_FLOOR, default=current[CONF_DEHUM_DRY_FLOOR]
                ): vol.All(vol.Coerce(float), vol.Range(min=0, max=100)),
                vol.Required(
                    CONF_BAND_LOW_DAY, default=current[CONF_BAND_LOW_DAY]
                ): vol.All(vol.Coerce(float), vol.Range(min=0, max=5)),
                vol.Required(
                    CONF_BAND_LOW_NIGHT, default=current[CONF_BAND_LOW_NIGHT]
                ): vol.All(vol.Coerce(float), vol.Range(min=0, max=5)),
                vol.Required(
                    CONF_ADAPTATION_ENABLED, default=current[CONF_ADAPTATION_ENABLED]
                ): BooleanSelector(),
                vol.Required(
                    CONF_ADAPTATION_AGGRESSIVENESS,
                    default=current[CONF_ADAPTATION_AGGRESSIVENESS],
                ): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=3.0)),
                vol.Required(
                    CONF_DRY_RUN, default=current[CONF_DRY_RUN]
                ): BooleanSelector(),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
