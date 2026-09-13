"""
Proves vol default materialization: submitting WITHOUT an optional key that has
default=old still yields the old value in user_input (flow-manager validation).
With suggested_value, the key stays absent -> the clear-semantics work.
"""
import voluptuous as vol
from voluptuous import UNDEFINED

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.const import DOMAIN
from tests.test_flow_serialization import REQUIRED_DATA


async def test_absent_optional_key_stays_absent(hass, enable_custom_integrations):
    for eid, st in [
        ("fan.demo", "off"),
        ("sensor.demo_tent_temp", "24.0"),
        ("sensor.demo_tent_rh", "55.0"),
        ("sensor.demo_lung_temp", "23.0"),
        ("sensor.demo_lung_rh", "50.0"),
        ("sensor.demo_vpd", "1.2"),
        ("light.demo_lamp", "on"),
        ("input_select.demo_stage", "Flowering"),
    ]:
        hass.states.async_set(eid, st, {})
    entry = MockConfigEntry(domain=DOMAIN, data=REQUIRED_DATA)
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": "reconfigure", "entry_id": entry.entry_id})
    assert result["type"] == "form"

    def _name(marker):
        return marker.schema if hasattr(marker, "schema") else marker

    def _default(marker):
        d = getattr(marker, "default", UNDEFINED)
        if d is UNDEFINED or not isinstance(d, str):
            return None
        return d

    submitted = {
        _name(m): _default(m) for m in result["data_schema"].schema
    }
    # simulate the browser: omit the cleared vpd key, submit everything else
    submitted.pop("vpd_entity")
    # validate EXACTLY like the flow manager would
    clean = result["data_schema"]({
        k: v for k, v in submitted.items() if v is not None
    })
    print("VALIDATED user_input keys:", sorted(clean.keys()))
    assert "vpd_entity" not in clean, (
        "default materialized the cleared key back — clear semantics broken"
    )
