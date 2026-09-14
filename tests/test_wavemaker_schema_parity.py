"""Anti-drift: reconfigure and tuning (options) dialogs must render the
wavemaker program fields identically (v0.9.9). They drifted once: the mode
selector existed in reconfigure while run/interval only existed in tuning —
users configured an entity that could never run."""
import json

import voluptuous_serialize
from homeassistant.helpers import config_validation as cv
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.config_flow import (
    SmartGrowConfigFlow,
    SmartGrowOptionsFlow,
)
from custom_components.smartgrow.const import DOMAIN


PROGRAM_FIELDS = ("wavemaker_mode", "wavemaker_run_s", "wavemaker_every_min")


def _wavemaker_fields(converted):
    out = {}
    for f in converted:
        name = f.get("name")
        # wavemaker_entity is a source picker (reconfigure-only by design);
        # parity applies to the PROGRAM fields.
        if name and name.startswith("wavemaker_") and name != "wavemaker_entity":
            out[name] = f
    return out


def _converted(schema):
    return voluptuous_serialize.convert(schema, custom_serializer=cv.custom_serializer)


async def test_reconfigure_and_options_wavemaker_fields_match(
    hass, enable_custom_integrations
):
    entry = MockConfigEntry(domain=DOMAIN, data={"dry_run": True}, options={})
    entry.add_to_hass(hass)

    # reconfigure form
    cfg_flow = SmartGrowConfigFlow()
    cfg_flow.hass = hass
    cfg_flow._get_reconfigure_entry = lambda: entry
    res = await cfg_flow.async_step_reconfigure()
    re_fields = _wavemaker_fields(_converted(res["data_schema"]))

    # options (tuning) form
    opt_flow = SmartGrowOptionsFlow()
    opt_flow.hass = hass
    opt_flow.handler = entry.entry_id
    opt_flow.context = {"source": "init", "entry_id": entry.entry_id}
    res2 = await opt_flow.async_step_init()
    op_fields = _wavemaker_fields(_converted(res2["data_schema"]))

    assert set(re_fields) == set(PROGRAM_FIELDS), (
        f"field sets diverged: {sorted(re_fields)} vs {sorted(op_fields)}")
    assert json.dumps(re_fields, sort_keys=True) == json.dumps(
        op_fields, sort_keys=True
    ), "wavemaker field definitions diverged between reconfigure and tuning"
