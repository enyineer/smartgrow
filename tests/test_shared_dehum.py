"""Tests for shared-dehumidifier arbitration (multi-tent)."""

from custom_components.smartgrow.coordinator import SmartGrowCoordinator


def _agg(wishes: dict, entry_id: str, own: str) -> str:
    """Call the real aggregation method against a stubbed registry."""
    registry = {"humidifier.x": dict(wishes)}

    class FakeCoord:
        _SHARED_DEHUM_WISHES = registry
        entry = type("E", (), {"entry_id": entry_id})()

        _aggregate_shared_wish = SmartGrowCoordinator._aggregate_shared_wish

    return FakeCoord()._aggregate_shared_wish("humidifier.x", own)


def test_single_tent_passthrough():
    assert _agg({"tent_a": "on"}, "tent_a", "on") == "on"


def test_conflict_any_on_wins():
    assert _agg({"tent_a": "on", "tent_b": "off"}, "tent_a", "on") == "on"


def test_both_off_stays_off():
    assert _agg({"tent_a": "off", "tent_b": "off"}, "tent_a", "off") == "off"


def test_any_on_wins_even_if_we_are_off():
    """Shared unit runs if ANY tent needs it (documented tradeoff):
    tent_b's legitimate ON demand wins over tent_a's band-satisfied OFF.
    Per-tent over-dry protection is enforced in each wish computation."""
    assert _agg({"tent_a": "off", "tent_b": "on"}, "tent_a", "off") == "on"


def test_registry_isolation_between_dehumidifiers():
    SmartGrowCoordinator._SHARED_DEHUM_WISHES.clear()
    SmartGrowCoordinator._SHARED_DEHUM_WISHES["humidifier.a"] = {"tent_a": "on"}
    SmartGrowCoordinator._SHARED_DEHUM_WISHES["humidifier.b"] = {"tent_b": "off"}
    assert _agg({"tent_a": "on"}, "tent_a", "on") == "on"
