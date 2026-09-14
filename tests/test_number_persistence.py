"""Regression: live number tuning must survive reloads.

The number entities used to mutate ``options_rt.control`` in memory only;
any config-entry reload reverted the value to entry.options/defaults (same
bug class as the old in-memory dry-run flip). The write must land in
``entry.options`` (single-key partial merge) and rebuild RuntimeOptions.
"""
from unittest.mock import MagicMock

from custom_components.smartgrow.coordinator import RuntimeOptions
from custom_components.smartgrow.number import DeltaGainNumber


def _make_number(tmp_entry):
    entry = tmp_entry
    coordinator = MagicMock()
    coordinator.entry = entry
    coordinator.options_rt = RuntimeOptions.from_entry(entry)
    num = DeltaGainNumber(coordinator, entry)
    num.hass = MagicMock()
    num.hass.config_entries.async_update_entry = (
        lambda e, **kwargs: e.__dict__.update(kwargs)
    )
    return num, coordinator


from types import SimpleNamespace


def _Entry(options, data=None):
    """Minimal config-entry stand-in with attribute access."""
    return SimpleNamespace(entry_id="test_entry", options=options,
                           data=data or {})


def test_set_value_persists_into_entry_options():
    entry = _Entry(options={"delta_gain": 35})
    num, coordinator = _make_number(entry)

    num._persist(50.0)

    assert entry.options["delta_gain"] == 50
    assert coordinator.options_rt.control.delta_gain == 50


def test_partial_merge_keeps_other_keys():
    entry = _Entry(options={"delta_gain": 35, "need_gain": 200})
    num, _coordinator = _make_number(entry)

    num._persist(50.0)

    assert entry.options["need_gain"] == 200
    assert entry.options["delta_gain"] == 50


def test_reload_rebuilds_from_entry():
    """Simulate a reload: from_entry(entry) must carry the tuned value."""
    entry = _Entry(options={"delta_gain": 35})
    num, coordinator = _make_number(entry)
    num._persist(50.0)

    rebuilt = RuntimeOptions.from_entry(entry)
    assert rebuilt.control.delta_gain == 50
