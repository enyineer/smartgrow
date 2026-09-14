"""Regression: registration must be idempotent under repeated module execution.

Lit's ``@customElement`` decorator registers the element at class-definition
time; if the module ever executes twice under two URLs (the browser's module
map is per-URL), the second execution throws "has already been used with this
registry" and the import rejects -> Lovelace "Configuration error". v0.8.2
removed the decorators; registration is ONLY the guarded idempotent define.
These tests pin that.
"""
import pathlib
import re

CARD_TS = pathlib.Path("/root/smartgrow/card-src/src/smartgrow-card.ts").read_text()
EDITOR_TS = pathlib.Path(
    "/root/smartgrow/card-src/src/smartgrow-card-editor.ts"
).read_text()


def test_no_custom_element_decorator():
    for name, src in (("smartgrow-card.ts", CARD_TS), ("smartgrow-card-editor.ts", EDITOR_TS)):
        assert "@customElement(" not in src, (
            f"@customElement decorator re-introduced in {name} — it registers "
            "BEFORE any guarded define, so a second module execution (extra "
            "URL in the browser module map) throws 'already been used' and "
            "kills the import -> Configuration error."
        )


def test_guarded_define_present():
    for name, src in (("smartgrow-card.ts", CARD_TS), ("smartgrow-card-editor.ts", EDITOR_TS)):
        assert re.search(r"customElements\s*\.\s*get\(", src), (
            f"{name}: missing customElements.get() guard before define"
        )
        assert re.search(r"customElements\s*\.\s*define\(", src), (
            f"{name}: missing customElements.define"
        )


def test_deployed_bundle_is_the_built_bundle():
    """The bundle shipped in custom_components must be the card-src build output."""
    built = pathlib.Path("/root/smartgrow/card-src/dist/smartgrow-card.js").read_bytes()
    deployed = pathlib.Path(
        "/root/smartgrow/custom_components/smartgrow/frontend/smartgrow-card.js"
    ).read_bytes()
    assert built == deployed, (
        "deployed smartgrow-card.js differs from card-src/dist build output "
        "(stale bundle deployed — rebuild card-src and copy)"
    )
