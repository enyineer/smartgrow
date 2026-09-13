"""Constants for the SmartGrow integration."""

from __future__ import annotations

from typing import TypedDict

DOMAIN = "smartgrow"
MANUFACTURER = "SmartGrow"

# Config-flow keys.
CONF_FAN_ENTITY = "fan_entity"
CONF_DEHUM_ENTITY = "dehum_entity"
CONF_TENT_TEMP_ENTITY = "tent_temp_entity"
CONF_TENT_RH_ENTITY = "tent_rh_entity"
CONF_LUNG_TEMP_ENTITY = "lung_temp_entity"
CONF_LUNG_RH_ENTITY = "lung_rh_entity"
CONF_VPD_ENTITY = "vpd_entity"
CONF_LAMP_ENTITY = "lamp_entity"
CONF_LIGHTS_ON_TIME = "lights_on_time"
CONF_LIGHTS_OFF_TIME = "lights_off_time"
CONF_SCHEDULE_ENABLED = "schedule_enabled"
CONF_LAMP_MODE = "lamp_mode"
CONF_CAMERA_ENTITY = "camera_entity"
CONF_WAVEMAKER_ENTITY = "wavemaker_entity"
CONF_WAVEMAKER_MODE = "wavemaker_mode"
CONF_WAVEMAKER_RUN_S = "wavemaker_run_s"
CONF_WAVEMAKER_EVERY_MIN = "wavemaker_every_min"

LAMP_MODE_NONE = "none"
LAMP_MODE_SWITCH = "switch_only"
LAMP_MODE_DIMMER = "dimmer"
LAMP_MODES = [LAMP_MODE_NONE, LAMP_MODE_SWITCH, LAMP_MODE_DIMMER]

WAVEMAKER_MODE_NONE = "none"
WAVEMAKER_MODE_WITH_LIGHTS = "with_lights"
WAVEMAKER_MODE_INTERVAL = "interval"
WAVEMAKER_MODES = [WAVEMAKER_MODE_NONE, WAVEMAKER_MODE_WITH_LIGHTS, WAVEMAKER_MODE_INTERVAL]

DEFAULT_LIGHTS_ON = "06:00"
DEFAULT_LIGHTS_OFF = "22:00"

DEFAULT_LIGHTS_ON = "06:00"
DEFAULT_LIGHTS_OFF = "22:00"
CONF_LEGACY_VENT_AUTOMATION = "legacy_vent_automation"
CONF_LEGACY_DEHUM_AUTOMATION = "legacy_dehum_automation"
CONF_DRY_RUN = "dry_run"

# Options keys (also used as Number-entity backing where sensible).
CONF_FAN_FLOOR_DAY = "fan_floor_day"
CONF_FAN_FLOOR_NIGHT = "fan_floor_night"
CONF_DELTA_GAIN = "delta_gain"
CONF_VPD_GAIN = "vpd_gain"
CONF_NEED_GAIN = "need_gain"
CONF_TEMP_GAIN = "temp_gain"
CONF_COLD_CLAMP = "cold_clamp"
CONF_DEHUM_SAT_TRIGGER = "dehum_sat_trigger"
CONF_DEHUM_DRY_FLOOR = "dehum_dry_floor"
CONF_BAND_LOW_DAY = "band_low_day"
CONF_BAND_LOW_NIGHT = "band_low_night"
CONF_ADAPTATION_ENABLED = "adaptation_enabled"
CONF_ADAPTATION_AGGRESSIVENESS = "adaptation_aggressiveness"

DEFAULTS: dict[str, float | bool] = {
    CONF_DRY_RUN: True,
    CONF_FAN_FLOOR_DAY: 28.0,
    CONF_FAN_FLOOR_NIGHT: 20.0,
    CONF_DELTA_GAIN: 35.0,
    CONF_VPD_GAIN: 50.0,
    CONF_NEED_GAIN: 200.0,
    CONF_TEMP_GAIN: 25.0,
    CONF_COLD_CLAMP: 0.5,
    CONF_DEHUM_SAT_TRIGGER: 70.0,
    CONF_DEHUM_DRY_FLOOR: 44.0,
    CONF_BAND_LOW_DAY: 0.0,
    CONF_BAND_LOW_NIGHT: 0.0,
    CONF_ADAPTATION_ENABLED: True,
    CONF_ADAPTATION_AGGRESSIVENESS: 1.0,
}

STAGES = ("Seedling", "Vegetative", "Flowering")

# Unique-id prefix per entity kind: smartgrow_{entry_id}_{name}
UNIQUE_ID_TEMPLATE = "smartgrow_{entry_id}_{name}"

STALE_SENSOR_LIMIT_S = 15 * 60


class FanDecisionDict(TypedDict):
    """Serialised fan decision for MCP/tools consumption."""

    fan_target: int
    active_term: str
    d_ah: float
    cold: bool
