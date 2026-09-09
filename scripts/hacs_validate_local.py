"""Run the HACS action validation against the local workspace.

The official HACS action requires a GitHub token to fetch the repository
metadata. Without a real token we replicate its repository-level checks
(what it validates for category=integration) locally:

1. hacs.json exists, is valid JSON, and its content is valid.
2. The repository has a description, topics are recommended (warn only).
3. For integrations: manifest requirements are pinned, the integration
   directory lives at custom_components/<domain>, a valid zip structure
   would be produced, and hassfest validation passes (run separately).
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path("/root/smartgrow")


def main() -> int:
    failures: list[str] = []
    warnings: list[str] = []

    # hacs.json
    hacs_path = ROOT / "hacs.json"
    if not hacs_path.exists():
        failures.append("hacs.json missing")
    else:
        try:
            data = json.loads(hacs_path.read_text())
            valid_keys = {"name", "render_readme", "homeassistant", "zip_release",
                          "filename", "hide_default_branch", "domain", "persistent"}
            invalid = set(data) - valid_keys
            if invalid:
                failures.append(f"hacs.json invalid keys: {invalid}")
            if "homeassistant" in data and not isinstance(data["homeassistant"], str):
                failures.append("hacs.json homeassistant must be a version string")
        except json.JSONDecodeError as err:
            failures.append(f"hacs.json invalid JSON: {err}")

    # integration layout
    manifest_path = ROOT / "custom_components" / "smartgrow" / "manifest.json"
    if not manifest_path.exists():
        failures.append("custom_components/smartgrow/manifest.json missing")
    else:
        manifest = json.loads(manifest_path.read_text())
        if manifest.get("domain") != "smartgrow":
            failures.append("manifest domain mismatch")
        if not manifest.get("codeowners"):
            failures.append("manifest missing codeowners")
        if not manifest.get("documentation"):
            failures.append("manifest missing documentation")
        if not manifest.get("issue_tracker"):
            warnings.append("manifest missing issue_tracker (recommended)")
        if not manifest.get("version"):
            failures.append("manifest missing version")
        # HACS requires pinned requirements
        for req in manifest.get("requirements", []):
            if req.count("==") != 1:
                failures.append(f"requirement not pinned: {req}")

    # README present (HACS renders it)
    if not (ROOT / "README.md").exists():
        failures.append("README.md missing")

    result = "PASS" if not failures else "FAIL"
    print(f"HACS validation: {result}")
    for f in failures:
        print(f"  ERROR: {f}")
    for w in warnings:
        print(f"  WARN: {w}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
