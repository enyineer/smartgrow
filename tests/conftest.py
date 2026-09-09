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

_HAS_REAL_HA = importlib.util.find_spec("homeassistant") is not None

if not _HAS_REAL_HA:
    from _ha_stubs import install_stubs

    install_stubs()
