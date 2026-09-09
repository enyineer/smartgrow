"""Stub out the Home Assistant surface SmartGrow's HA layer touches.

Used only when the real homeassistant package is not installed (pure-logic
CI runs). Enough of HA exists so that importing the integration package does
not explode; behaviour is NOT simulated — the HA layer is exercised by the
HA harness / in-production, while this suite targets the pure logic.
"""

from __future__ import annotations

import sys
import types
from typing import Any


def _mk(name: str) -> types.ModuleType:
    if name in sys.modules:
        return sys.modules[name]
    mod = types.ModuleType(name)
    sys.modules[name] = mod
    return mod


class _Stub:
    """Attribute-tolerant stand-in for HA classes used at import time only."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self.args = args
        self.kwargs = kwargs

    def __call__(self, *args: Any, **kwargs: Any) -> _Stub:
        return _Stub(*args, **kwargs)

    def __getattr__(self, item: str) -> Any:
        return _Stub()


class callback:  # noqa: N801 - mirrors HA decorator name
    def __init__(self, func: Any = None) -> None:
        self.func = func

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        if self.func is not None:
            return self.func(*args, **kwargs)
        return _Stub()


def _attr(name: str, value: Any) -> None:
    setattr(_current(), name, value)


_root: types.ModuleType | None = None


def _current() -> types.ModuleType:
    assert _root is not None
    return _root


def install_stubs() -> None:
    """Install import-time stubs for homeassistant.* modules."""
    global _root
    existing = sys.modules.get("homeassistant")
    if existing is not None and getattr(existing, "__smartgrow_real__", False):
        return  # real HA present

    _root = _mk("homeassistant")
    _root.__path__ = []  # allow submodule imports

    # homeassistant.const constants used by the integration
    const = _mk("homeassistant.const")
    for const_name in (
        "ATTR_ENTITY_ID",
        "CONF_ENTITY_ID",
        "STATE_OFF",
        "STATE_ON",
        "STATE_UNAVAILABLE",
        "STATE_UNKNOWN",
    ):
        setattr(const, const_name, const_name.lower())
    const.STATE_OFF = "off"
    const.STATE_ON = "on"
    const.STATE_UNAVAILABLE = "unavailable"
    const.STATE_UNKNOWN = "unknown"
    const.ATTR_ENTITY_ID = "entity_id"
    const.CONF_ENTITY_ID = "entity_id"

    ce = _mk("homeassistant.config_entries")
    ce.ConfigEntry = _Stub
    ce.ConfigFlow = _Stub
    ce.ConfigFlowResult = _Stub
    ce.OptionsFlow = _Stub

    core = _mk("homeassistant.core")
    core.callback = callback
    core.HomeAssistant = _Stub
    core.Event = _Stub
    core.Context = _Stub

    ex = _mk("homeassistant.exceptions")
    ex.HomeAssistantError = type("HomeAssistantError", (Exception,), {})
    ex.ConfigEntryNotReady = type("ConfigEntryNotReady", (Exception,), {})

    helpers = _mk("homeassistant.helpers")
    helpers.__path__ = []

    for sub in (
        "device_registry",
        "entity_registry",
        "config_validation",
        "selector",
        "event",
        "restore_state",
        "issue_registry",
        "integration_platform",
        "singleton",
        "service",
        "area_registry",
        "floor_registry",
        "intent",
        "deprecation",
        "typing",
    ):
        m = _mk(f"homeassistant.helpers.{sub}")
        if sub == "entity_registry":
            m.async_entries_for_config_entry = lambda *a, **k: []
        if sub == "config_validation":
            m.string = str
            m.boolean = bool
        if sub == "issue_registry":
            m.IssueSeverity = _Stub()
        if sub == "device_registry":
            m.DeviceInfo = _Stub
            m.async_get = lambda *a, **k: _Stub()
        if sub == "event":
            m.async_track_point_in_time = lambda *a, **k: (lambda: None)
            m.async_track_state_change_event = lambda *a, **k: (lambda: None)
            m.async_track_time_interval = lambda *a, **k: (lambda: None)
        if sub == "restore_state":
            m.RestoreEntity = _Stub

    uc = _mk("homeassistant.helpers.update_coordinator")

    class _CoordinatorMeta(type):
        def __getitem__(cls, item: Any) -> Any:
            return cls

    class _StubCoordinator(_Stub, metaclass=_CoordinatorMeta):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            super().__init__(*args, **kwargs)

    uc.DataUpdateCoordinator = _StubCoordinator
    uc.UpdateFailed = type("UpdateFailed", (Exception,), {})
    uc.CoordinatorEntity = _StubCoordinator

    defp = _mk("homeassistant.helpers.entity_platform")
    defp.AddEntitiesCallback = _Stub

    comps = _mk("homeassistant.components")
    comps.__path__ = []
    for domain in (
        "sensor",
        "binary_sensor",
        "switch",
        "number",
        "select",
        "fan",
        "humidifier",
        "automation",
        "light",
        "llm",
    ):
        m = _mk(f"homeassistant.components.{domain}")
        for cls in (
            "SensorEntity",
            "SensorDeviceClass",
            "SensorStateClass",
            "BinarySensorEntity",
            "SwitchEntity",
            "NumberEntity",
            "NumberMode",
            "SelectEntity",
            "RestoreEntity",
            "LLMTools",
        ):
            setattr(m, cls, _Stub)

    util = _mk("homeassistant.util")
    util.__path__ = []
    dtu = _mk("homeassistant.util.dt")
    dtu.now = lambda *a, **k: None
    jutil = _mk("homeassistant.util.json")
    jutil.JsonObjectType = dict

    hjson = _mk("homeassistant.util.hass_dict")
    hjson.HassKey = _Stub

    llm = _mk("homeassistant.helpers.llm")
    llm.API = _Stub
    llm.APIInstance = _Stub
    llm.LLMContext = _Stub
    llm.Tool = type("Tool", (), {"parameters": None})
    llm.ToolInput = _Stub
    llm.LLMTools = _Stub
    llm.LLM_API_ASSIST = "assist"
    llm.async_register_api = lambda *a, **k: (lambda: None)
    llm.async_get_api = lambda *a, **k: None
    llm.async_get_apis = lambda *a, **k: []
    llm.selector_serializer = lambda *a, **k: None

    data_entry = _mk("homeassistant.data_entry_flow")
    data_entry.FlowResult = dict

    vol = _mk("voluptuous")
    vol.Schema = _Stub
    vol.Required = _Stub
    vol.Optional = _Stub
    vol.In = _Stub
    vol.All = _Stub
    vol.Range = _Stub
    vol.Coerce = _Stub
    vol.Any = _Stub
    vol.Invalid = type("Invalid", (Exception,), {})

    sel = _mk("homeassistant.helpers.selector")
    for cls in (
        "EntitySelector",
        "EntitySelectorConfig",
        "SelectSelector",
        "SelectSelectorConfig",
        "SelectSelectorOption",
        "BooleanSelector",
        "NumberSelector",
    ):
        setattr(sel, cls, _Stub)


def mark_real(hass_module: types.ModuleType) -> None:
    """Tag the real HA module (called by HA-harness runs)."""
    hass_module.__smartgrow_real__ = True
