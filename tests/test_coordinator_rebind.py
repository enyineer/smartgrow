"""Regression: entities must REBIND to the current coordinator on re-add.

After an entry reload, a NEW coordinator replaces the old one in hass.data.
Entities deduped by unique_id kept the constructor's (dead) coordinator —
their data froze mid-boot (phase stuck 'unknown', curing summary frozen)
while the new coordinator cycled with no listeners.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.smartgrow.const import DOMAIN
from custom_components.smartgrow.coordinator import SmartGrowCoordinator


async def test_phase_sensor_rebinds_to_current_coordinator(hass, enable_custom_integrations):
    """Phase sensor must rebind to the CURRENT coordinator in added_to_hass."""
    old = MagicMock(spec=SmartGrowCoordinator)
    old.is_stale.return_value = False
    old.data = {}  # the frozen empty data that produced phase 'unknown'
    new = MagicMock(spec=SmartGrowCoordinator)
    new.is_stale.return_value = False
    new.data = {"phase": "drying", "stage": "Drying"}
    new.device_info = {}
    old.device_info = {}

    entry = MockConfigEntry(domain=DOMAIN, data={"name": "Growbox 1"})
    entry.add_to_hass(hass)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"coordinator": new}

    from custom_components.smartgrow.sensor import PhaseSensor

    entity = PhaseSensor(old, entry)
    entity.hass = hass
    assert entity.coordinator is old  # constructed against the dead one
    await entity.async_added_to_hass()
    assert entity.coordinator is new  # rebound to the CURRENT one
    assert entity.native_value == "drying"


async def test_stage_select_calls_super_on_added(hass, enable_custom_integrations):
    """StageSelect.async_added_to_hass must chain to the base (rebinding)."""
    import inspect

    from custom_components.smartgrow.select import StageSelect

    src = inspect.getsource(StageSelect.async_added_to_hass)
    assert "super().async_added_to_hass()" in src
