"""The coordinator dispatches fired alerts to configured notify targets."""
from unittest.mock import AsyncMock, MagicMock

from custom_components.smartgrow.alerts import AlertEngine
from custom_components.smartgrow.coordinator import RuntimeOptions
from custom_components.smartgrow.logic.params import ControlParams, SensorInputs


async def test_dispatch_sends_to_targets_and_persistent(hass):
    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    c = MagicMock(spec=SmartGrowCoordinator)
    c.hass = MagicMock()
    c.options_rt = RuntimeOptions(
        notify_targets=["mobile_app_pixel_11_pro", "alexa_media_buero"],
    )
    c.alerts = AlertEngine(cooldown_s=3600, vpd_tolerance=0.15)
    c._lamp_is_on = lambda: False
    c._lamp_switch_is_on = lambda: None

    calls = []
    c.hass.services.async_call = AsyncMock(
        side_effect=lambda domain, service, data=None, **kw: calls.append(
            (domain, service, data.get("entity_id") or data.get("message"))
        )
    )

    inputs = SensorInputs(tent_temp=25, tent_rh=60, lung_temp=25, lung_rh=55,
                          vpd=1.0, fan_pct=50, is_day=False, stage="Flowering")
    params = ControlParams()
    await SmartGrowCoordinator._dispatch_alerts(
        c, 0.0, inputs, params,
        {"degraded": {"lung": False, "vpd_sensor": False}},
    )

    services = [c1[1] for c1 in calls if c1[0] == "notify"]
    assert "mobile_app_pixel_11_pro" in services
    assert "alexa_media_buero" in services
    # persistent notification always created as well
    assert ("persistent_notification", "create") in [
        (c1[0], c1[1]) for c1 in calls
    ]


async def test_dispatch_no_alerts_is_silent(hass):
    from custom_components.smartgrow.coordinator import SmartGrowCoordinator

    c = MagicMock(spec=SmartGrowCoordinator)
    c.hass = MagicMock()
    c.options_rt = RuntimeOptions(notify_targets=["mobile_app_x"])
    c.alerts = AlertEngine(cooldown_s=3600, vpd_tolerance=0.15)
    c._lamp_is_on = lambda: True
    c._lamp_switch_is_on = lambda: True

    inputs = SensorInputs(tent_temp=25, tent_rh=60, lung_temp=25, lung_rh=55,
                          vpd=1.4, fan_pct=50, is_day=False, stage="Flowering")
    await SmartGrowCoordinator._dispatch_alerts(
        c, 0.0, inputs, ControlParams(),
        {"degraded": {"lung": False, "vpd_sensor": False}},
    )
    c.hass.services.async_call.assert_not_called()
