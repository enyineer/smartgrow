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
    EntitySelector,
    EntitySelectorConfig,
    SelectSelector,
    SelectSelectorConfig,
    TimeSelector,
    TimeSelectorConfig,
)
from .const import (
    CONF_DRY_RUN,
    CONF_DEHUM_ENTITY,
    CONF_HUM_ENTITY,
    CONF_CAMERA_ENTITY,
    CONF_FAN_ENTITY,
    CONF_LAMP_ENTITY,
    CONF_LEGACY_DEHUM_AUTOMATION,
    CONF_LEGACY_VENT_AUTOMATION,
    CONF_LUNG_RH_ENTITY,
    CONF_LUNG_TEMP_ENTITY,
    CONF_TENT_RH_ENTITY,
    CONF_TENT_TEMP_ENTITY,
    CONF_VPD_ENTITY,
    DEFAULTS,
    DOMAIN,
    STAGES,
    CONF_LIGHTS_ON_TIME,
    CONF_LIGHTS_OFF_TIME,
    CONF_WAVEMAKER_ENTITY,
    CONF_WAVEMAKER_MODE,
    CONF_WAVEMAKER_RUN_S,
    CONF_WAVEMAKER_EVERY_MIN,
    WAVEMAKER_MODES,)

_LOGGER = logging.getLogger(__name__)

# Source-entity fields with FILTERED ENTITY PICKERS.
#
# Invariant that prevents the v0.5.6 500 ("Object of type Required is not
# JSON serializable"): the KEYS of this map are PLAIN STRINGS and the VALUES
# are Selector objects. Steps must wrap them as
#     vol.Optional(key_string, default=current): ENTITY_SELECTORS[key_string]
# — NEVER vol.Optional(some_marker): HA's flow serializer (helpers/
# config_validation.py custom_serializer) handles selector.Selector via
# .serialize(), but a marker nested inside a marker serializes the inner
# marker as the field NAME -> 500. Regressed against by
# tests/test_flow_serialization.py (double-wrap + JSON round-trip).
ENTITY_SELECTORS = {
    CONF_FAN_ENTITY: EntitySelector(EntitySelectorConfig(domain="fan")),
    CONF_TENT_TEMP_ENTITY: EntitySelector(
        EntitySelectorConfig(domain="sensor", device_class="temperature")
    ),
    CONF_TENT_RH_ENTITY: EntitySelector(
        EntitySelectorConfig(domain="sensor", device_class="humidity")
    ),
    # Everything below degrades gracefully when omitted — the flow tells the
    # user what stops working (labels), the logic never breaks.
    CONF_DEHUM_ENTITY: EntitySelector(
        EntitySelectorConfig(domain=["switch", "humidifier"])
    ),
    CONF_HUM_ENTITY: EntitySelector(
        EntitySelectorConfig(domain=["humidifier", "switch", "valve"])
    ),
    CONF_LUNG_TEMP_ENTITY: EntitySelector(
        EntitySelectorConfig(domain="sensor", device_class="temperature")
    ),
    CONF_LUNG_RH_ENTITY: EntitySelector(
        EntitySelectorConfig(domain="sensor", device_class="humidity")
    ),
    CONF_VPD_ENTITY: EntitySelector(EntitySelectorConfig(domain="sensor")),
    CONF_LAMP_ENTITY: EntitySelector(
        EntitySelectorConfig(domain=["light", "switch", "input_boolean"])
    ),
    CONF_CAMERA_ENTITY: EntitySelector(EntitySelectorConfig(domain="camera")),
    CONF_WAVEMAKER_ENTITY: EntitySelector(EntitySelectorConfig(domain="switch")),
}

REQUIRED_ENTITY_KEYS = (CONF_FAN_ENTITY, CONF_TENT_TEMP_ENTITY, CONF_TENT_RH_ENTITY)

OPTIONAL_ENTITY_KEYS = tuple(
    k for k in ENTITY_SELECTORS if k not in REQUIRED_ENTITY_KEYS
)


def _entity_schema(entry_or_data: dict[str, Any]) -> dict:
    """Marker-keyed schema for source entities, prefilled from stored data.

    `entry_or_data` is any mapping-like with .get() (entry.data, entry.options
    merged, or a plain dict). Keys are vol.Optional over PLAIN STRINGS; values
    are the shared Selector objects — see ENTITY_SELECTORS for the invariant.
    Optional fields are pure Selectors — HA's frontend omits cleared
    fields instead of sending "" (vol.Any("", selector) would itself be
    unserializable). API callers must do the same.
    """
    schema: dict = {}
    for key in REQUIRED_ENTITY_KEYS:
        schema[vol.Required(key, default=entry_or_data.get(key))] = (
            ENTITY_SELECTORS[key]
        )
    for key in OPTIONAL_ENTITY_KEYS:
        current = entry_or_data.get(key) or None
        if current is None:
            # No default: HA renders an empty picker and validates nothing
            # for this key unless the user picks an entity. A default=""
            # would itself fail EntitySelector validation.
            schema[vol.Optional(key)] = ENTITY_SELECTORS[key]
        else:
            schema[vol.Optional(key, default=current)] = ENTITY_SELECTORS[key]
    return schema


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
            **_entity_schema(self._data),
            vol.Optional(CONF_LIGHTS_ON_TIME): TimeSelector(TimeSelectorConfig()),
            vol.Optional(CONF_LIGHTS_OFF_TIME): TimeSelector(TimeSelectorConfig()),
            vol.Optional(CONF_WAVEMAKER_MODE): SelectSelector(
                SelectSelectorConfig(
                    options=[{"value": m, "label": m} for m in WAVEMAKER_MODES]
                )
            ),
            vol.Required(CONF_DRY_RUN, default=True): bool,
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
                SelectSelectorConfig(options=[{"value": s, "label": s} for s in STAGES])
            ),
        }
        return self.async_show_form(step_id="extras", data_schema=vol.Schema(schema))


    @staticmethod
    @callback
    def async_get_supported_reconfigure_features() -> dict[str, bool]:
        """This integration supports reconfigure (HA 2024.4+)."""
        return {"reconfigure": True}

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Reconfigure: update source entities in place."""
        errors: dict[str, str] = {}
        entry = self._get_reconfigure_entry()  # provided by ConfigFlow
        if user_input is not None:
            new_data = {**entry.data, **user_input}
            self.hass.config_entries.async_update_entry(entry, data=new_data)
            await self.hass.config_entries.async_reload(entry.entry_id)
            return self.async_abort(reason="reconfigure_successful")

        # Filtered pickers, prefilled from options-then-data. The
        # ENTITY_SELECTORS invariant (plain-string marker keys, Selector
        # values, no double-wrapping) is what keeps this dialog from 500ing —
        # see the comment there and tests/test_flow_serialization.py.
        merged = {**entry.data, **entry.options}
        schema = _entity_schema(merged)
        return self.async_show_form(
            step_id="reconfigure", data_schema=vol.Schema(schema), errors=errors
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> SmartGrowOptionsFlow:
        """Return the options flow handler (HA sets .config_entry itself)."""
        return SmartGrowOptionsFlow()


class SmartGrowOptionsFlow(config_entries.OptionsFlow):
    """Options: floors, gains, thresholds, band overrides, adaptation."""

    # NOTE: do NOT assign self.config_entry here — in HA ≥ 2025.3 it is a
    # read-only property set automatically by the flow manager. Assigning it
    # raises AttributeError -> HTTP 500 when the Configure dialog opens.

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

        # Source entities live here too, with FILTERED PICKERS (options-first
        # defaults). Same invariant as everywhere: plain-string keys, Selector
        # values — see ENTITY_SELECTORS / tests/test_flow_serialization.py.
        merged = {**self.config_entry.data, **self.config_entry.options}
        entity_fields = _entity_schema(merged)
        schema = vol.Schema(
            {
                **entity_fields,
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
                ): bool,
                vol.Required(
                    CONF_ADAPTATION_AGGRESSIVENESS,
                    default=current[CONF_ADAPTATION_AGGRESSIVENESS],
                ): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=3.0)),
                vol.Required(
                    CONF_DRY_RUN, default=current[CONF_DRY_RUN]
                ): bool,
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
