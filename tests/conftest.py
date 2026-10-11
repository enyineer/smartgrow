"""Pytest configuration for the SmartGrow test suite.

Installs import-time stubs only when the real homeassistant package is not
installed, so the pure-logic modules can be exercised standalone.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
for p in (str(ROOT), str(Path(__file__).parent)):
    if p not in sys.path:
        sys.path.insert(0, p)

# Editable installs (setuptools PEP 660 via uv/pip) append a *file sentinel*
# named '__editable__.<pkg>.finder.__path_hook__' to the package __path__.
# HA's loader._get_custom_components() does Path(path).iterdir() over every
# custom_components.__path__ entry, which raises FileNotFoundError on that
# sentinel. Strip sentinels so the loader only sees real directories.
import custom_components  # noqa: E402

custom_components.__path__ = [p for p in custom_components.__path__ if Path(p).is_dir()]

_HAS_REAL_HA = importlib.util.find_spec("homeassistant") is not None

if not _HAS_REAL_HA:
    from _ha_stubs import install_stubs

    install_stubs()
