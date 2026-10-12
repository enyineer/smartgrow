"""Coordinator for SmartGrow Curing devices.

A curing device samples jar temp/RH sensor pairs (300 s cadence — jars are
thermal masses, nothing here actuates), evaluates each jar against the
configured curing bands, and fires per-jar alerts with a per-jar cooldown
(default 6 h, mirroring the legacy automation's cadence).

There is deliberately NO actuation path in this coordinator: curing entries
cannot command anything, by construction.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import (
    CONF_CURING_ALERT_COOLDOWN_H,
    CONF_CURING_RH_MAX,
    CONF_CURING_RH_MIN,
    CONF_CURING_TEMP_MAX,
    CONF_CURING_TEMP_MIN,
    CONF_JAR_TEMP_ENTITIES,
    CURING_DEFAULTS,
    DOMAIN,
)
from .curing import JarReading, JarStatus, alert_message, evaluate_jar, worst_status

_LOGGER = logging.getLogger(__name__)

CURING_SCAN_INTERVAL = timedelta(seconds=300)


# Humidity sibling discovery: same device, device_class humidity, the entity
# id of BLE siblings conventionally shares the temperature sensor's stem.
# Resolved ONCE per jar via the entity registry at setup.
def discover_rh_sibling(hass: HomeAssistant, temp_entity_id: str) -> str:
    """Find the humidity sensor sharing the jar device with a temp sensor.

    Returns '' when the temp sensor has no registry device or the device has
    no humidity sensor — the jar then reports temp_only (still monitored).
    """
    from homeassistant.helpers import entity_registry as er

    ent_reg = er.async_get(hass)
    entry = ent_reg.async_get(temp_entity_id)
    if entry is None or not entry.device_id:
        # Fallback heuristic for registry-less (template etc.) sensors:
        # same stem with _humidity suffix.
        if temp_entity_id.endswith("_temperature"):
            return temp_entity_id[: -len("_temperature")] + "_humidity"
        return ""
    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get(entry.device_id)
    if device is None:
        return ""
    # Scan the registry for this device's humidity sensor (small cost,
    # once per jar at setup).
    for ent in ent_reg.entities.values():
        if ent.device_id != entry.device_id:
            continue
        if ent.domain != "sensor":
            continue
        if ent.device_class == "humidity" or ent.entity_id.endswith("_humidity"):
            return ent.entity_id
    return ""


class CuringCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Samples jar sensors; publishes per-jar status; fires alerts."""

    config_entry: Any

    def __init__(self, hass: HomeAssistant, entry: Any) -> None:
        """Initialise from a curing config entry."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=entry,
            name=f"{DOMAIN}-curing",
            update_interval=CURING_SCAN_INTERVAL,
        )
        self.entry = entry
        merged = {**CURING_DEFAULTS, **entry.data}
        self.temp_min = float(merged[CONF_CURING_TEMP_MIN])
        self.temp_max = float(merged[CONF_CURING_TEMP_MAX])
        self.rh_min = float(merged[CONF_CURING_RH_MIN])
        self.rh_max = float(merged[CONF_CURING_RH_MAX])
        cooldown_h = float(merged.get(CONF_CURING_ALERT_COOLDOWN_H, 6.0))
        self._cooldown_s = cooldown_h * 3600.0
        # notify targets live in entry options (same pattern as grow alerts)
        self.notify_targets: list[str] = list(entry.options.get("notify_targets", []) or [])

        temp_ids: list[str] = list(entry.data.get(CONF_JAR_TEMP_ENTITIES, []))
        self._rh_siblings = {eid: discover_rh_sibling(hass, eid) for eid in temp_ids}

        self.jars: list[JarStatus] = []
        self._last_alert: dict[str, float] = {}  # jar name -> ts of last alert

    @property
    def device_info(self) -> DeviceInfo:
        """DeviceInfo for the curing device."""
        name = self.entry.data.get("name") or "Curing"
        return DeviceInfo(
            identifiers={(DOMAIN, self.entry.entry_id)},
            name=f"SmartGrow {name}".strip(),
            manufacturer="SmartGrow",
            model="Curing jar monitor",
        )

    # -- sampling -----------------------------------------------------------
    def _read(self, entity_id: str) -> float | None:
        state = self.hass.states.get(entity_id)
        if state is None or state.state in (STATE_UNKNOWN, STATE_UNAVAILABLE):
            return None
        try:
            return float(state.state)
        except ValueError:
            return None

    def _jar_label(self, entity_id: str) -> str:
        """Human jar name from the live friendly_name, else the id stem.

        Read at SAMPLE time: at __init__ the sources may not have states yet.
        """
        st = self.hass.states.get(entity_id)
        friendly = st.attributes.get("friendly_name") if st else None
        if friendly:
            return friendly.removesuffix(" temperature").removesuffix(" Temperatur").strip()
        stem = entity_id.split(".")[-1]
        return stem.removesuffix("_temperature").removesuffix("temperature").strip(" _")

    async def _async_update_data(self) -> dict[str, Any]:
        """Sample every jar, evaluate, and (maybe) alert."""
        import time as _time

        now = _time.time()
        jars: list[JarStatus] = []
        for eid in self.entry.data.get(CONF_JAR_TEMP_ENTITIES, []):
            reading = JarReading(
                temp=self._read(eid),
                rh=self._read(self._rh_siblings.get(eid, "")) if self._rh_siblings.get(eid) else None,
            )
            jars.append(
                evaluate_jar(
                    self._jar_label(eid),
                    eid,
                    self._rh_siblings.get(eid, ""),
                    reading,
                    temp_min=self.temp_min,
                    temp_max=self.temp_max,
                    rh_min=self.rh_min,
                    rh_max=self.rh_max,
                )
            )
        self.jars = jars

        bad = [j for j in jars if j.status in ("too_cold", "too_warm", "too_dry", "too_humid", "unavailable")]
        alerts: list[str] = []
        for j in bad:
            last = self._last_alert.get(j.name, 0.0)
            if now - last >= self._cooldown_s:
                self._last_alert[j.name] = now
                alerts.append(j.name)
        if alerts:
            await self._dispatch_alerts([j for j in bad if j.name in alerts])

        return {
            "jars": [j.as_dict() for j in jars],
            "worst": worst_status(jars),
            "ok_count": sum(1 for j in jars if j.status == "ok"),
            "total": len(jars),
            "temp_band": (self.temp_min, self.temp_max),
            "rh_band": (self.rh_min, self.rh_max),
        }

    async def _dispatch_alerts(self, bad_jars: list[JarStatus]) -> None:
        """Send one consolidated notification for the freshly-alerting jars.

        Awaited inline (never fire-and-forget): a notify path that drops its
        coroutine without awaiting is the v0.10.5 wavemaker bug class — the
        alert silently never happens.
        """
        msg = alert_message(
            bad_jars,
            temp_min=self.temp_min,
            temp_max=self.temp_max,
            rh_min=self.rh_min,
            rh_max=self.rh_max,
        )
        _LOGGER.info("Curing alert: %s", msg.replace("\n", " | "))
        targets = self.notify_targets or []
        for target in targets:
            service = target if "." in target else f"notify.{target}"
            domain, _, name = service.partition(".")
            try:
                await self.hass.services.async_call(
                    domain,
                    name,
                    {"title": "Curing check", "message": msg},
                    blocking=True,
                )
            except Exception as err:  # noqa: BLE001 — one bad target must not eat the rest
                _LOGGER.warning("Curing alert to %s failed: %s", service, err)
        # Always mirror into persistent notifications (same doctrine as grow
        # alerts: zero targets still surfaces).
        try:
            await self.hass.services.async_call(
                "persistent_notification",
                "create",
                {"title": "Curing check", "message": msg},
                blocking=True,
            )
        except Exception as err:  # noqa: BLE001
            _LOGGER.warning("Curing persistent notification failed: %s", err)
