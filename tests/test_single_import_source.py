"""Regression: the card module must have a SINGLE import source.

v0.7.x-0.8.3 registered the card BOTH via ``frontend.add_extra_js_url`` (an
eager ``<script type=module>`` injected into every HA page) AND as an awaited
lovelace storage resource. The two racing import tasks left the module
fetched-but-never-executed on ~50% of real dashboard loads; HA's 2s
``whenDefined`` fallback then stuck on "Configuration error". v0.8.4 removed
the eager injection — these tests make sure it never comes back.
"""
import ast
import pathlib

MODULE = pathlib.Path(
    "/root/smartgrow/custom_components/smartgrow/frontend_reg.py"
).read_text()


def _import_names_from(module_text: str, import_line_prefix: str) -> set[str]:
    tree = ast.parse(module_text)
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "homeassistant.components.frontend":
            for alias in node.names:
                names.add(alias.name)
        elif isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.name)
    return names


def test_no_add_extra_js_url_import():
    """The eager-injection helper must not even be imported."""
    names = _import_names_from(MODULE, "frontend")
    assert "add_extra_js_url" not in names, (
        "add_extra_js_url re-introduced in frontend_reg.py imports — "
        "this causes the dual-import race that breaks card rendering on "
        "~50% of loads (see growbook 2026-09-14g)."
    )


def test_no_add_extra_js_url_call():
    """The eager-injection helper must not be called anywhere."""
    assert "add_extra_js_url(" not in MODULE.replace(
        "from homeassistant.components.frontend import", ""
    ), (
        "add_extra_js_url(...) call re-introduced in frontend_reg.py — "
        "single import source rule violated (dual-import race)."
    )


def test_lovelace_resource_registration_present():
    """The deterministic awaited resource registration must still exist."""
    assert "_async_register_lovelace_resource" in MODULE
    assert "async_create_item" in MODULE
    tree = ast.parse(MODULE)
    awaited = any(
        isinstance(node, ast.Await)
        and isinstance(node.value, ast.Call)
        and isinstance(node.value.func, ast.Name)
        and node.value.func.id == "_async_register_lovelace_resource"
        for node in ast.walk(tree)
    )
    assert awaited, (
        "async_register_frontend must await _async_register_lovelace_resource "
        "(deterministic single import source)."
    )
