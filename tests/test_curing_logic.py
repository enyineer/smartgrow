"""Unit tests for the curing jar evaluation logic (pure module)."""

from __future__ import annotations

from custom_components.smartgrow.curing import (
    JarReading,
    alert_message,
    evaluate_jar,
    worst_status,
)

BANDS = dict(temp_min=15.0, temp_max=23.0, rh_min=55.0, rh_max=65.0)


def _jar(temp: float | None, rh: float | None, name: str = "Glas 2"):
    return evaluate_jar(
        name,
        "sensor.temp_rh_glas_2_temperature",
        "sensor.temp_rh_glas_2_humidity",
        JarReading(temp=temp, rh=rh),
        **BANDS,
    )


class TestJarStatus:
    def test_ok_in_band(self) -> None:
        j = _jar(18.0, 62.0)
        assert j.status == "ok"
        assert j.reasons == []

    def test_too_cold_dominates(self) -> None:
        j = _jar(10.0, 70.0)
        assert j.status == "too_cold"

    def test_too_warm(self) -> None:
        assert _jar(25.0, 60.0).status == "too_warm"

    def test_too_dry(self) -> None:
        j = _jar(18.0, 50.0)
        assert j.status == "too_dry"
        assert "50%" in j.reasons[0]

    def test_too_humid(self) -> None:
        assert _jar(18.0, 66.0).status == "too_humid"

    def test_band_edges_are_ok(self) -> None:
        assert _jar(15.0, 55.0).status == "ok"
        assert _jar(23.0, 65.0).status == "ok"

    def test_both_missing_is_unavailable(self) -> None:
        assert _jar(None, None).status == "unavailable"

    def test_temp_only_when_rh_missing(self) -> None:
        """Missing humidity sibling must NOT alert (monitored, temp fine)."""
        j = _jar(18.0, None)
        assert j.status == "temp_only"
        assert j.status not in ("too_dry", "too_humid", "unavailable")

    def test_rh_only_when_temp_missing(self) -> None:
        assert _jar(None, 60.0).status == "rh_only"


class TestAggregate:
    def test_worst_status_orders(self) -> None:
        assert worst_status([_jar(18, 62), _jar(18, 66)]) == "too_humid"
        assert worst_status([_jar(18, 62), _jar(26, 62)]) == "too_warm"
        assert worst_status([_jar(26, 62), _jar(None, None)]) == "unavailable"
        assert worst_status([_jar(18, 62), _jar(18, 63)]) == "ok"
        assert worst_status([]) == "unavailable"


class TestAlertMessage:
    def test_message_names_jars_and_targets(self) -> None:
        msg = alert_message(
            [_jar(26.0, 60.0), _jar(18.0, 66.0, name="Glas 7")],
            **BANDS,
        )
        assert "Glas 2" in msg
        assert "Glas 7" in msg
        assert "15–23 °C" in msg
        assert "55–65% RH" in msg

    def test_message_handles_partial_readings(self) -> None:
        msg = alert_message([_jar(None, None)], **BANDS)
        assert "unavailable" in msg
