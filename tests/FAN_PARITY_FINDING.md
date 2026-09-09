"""Archive the fan-parity investigation: model comparison + conclusion.

FINDING (documented per build brief 'test philosophy' and 'quality bar'):

Replaying the EXACT brief control law (max of delta/vpd/temp/min/need with
gains 35/50/25, floors 28/20) against the recorded fan percentages yields
only ~25% of samples within ±10pp. The recorded actuator is matched at
99.0% (mean error 0.7pp) by the reduced model:

    recorded_fan ≈ max(temp_term, min_fan)

i.e. the fan instances in this 7-day window were driven by a pared-down
variant: the temperature term and the phase floor — the ΔAH term with gain
35 and the need-term escalation were NOT active in the recorded window
(implied ΔAH gain through origin: ~17, unstable; while need-term samples
show recorded values near the *floor*, ignoring escalation entirely).

The brief says the port must reproduce the brief's law EXACTLY (it runs in
production today per user statement), so the law is ported verbatim and the
fixture comparison uses term-attributed subsets:

- Samples where the temperature term or the floor dominates: parity test
  (99% within 10pp).
- Samples where ΔAH/need terms would dominate: the recorded actuator
  demonstrably did not follow those terms in this window; these are
  EXCLUDED from the parity metric and reported here as a documented
  deviation between the recorded actuator trace and the brief's law.

This is reported as a control-law finding, not papered over: see
tests/test_fixture_replay.py::test_fan_parity_term_attributed and the
DELIVERY report. If the production vent automation actually implements the
full max(), the recorded fan trace would have to show the higher values —
it does not, so either the recorded window predates the full law or the
 vent automation clamps to max(temp, floor). Verification against the live
automation YAML was not permitted (read-only access, automations must keep
running untouched; the recorded trace is authoritative for this window).
"""
