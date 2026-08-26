# E2-S1 — Assess with fixed-point rules

As the claim decision service, I want deterministic policy caps, deductible, co-pay, document, and fraud rules so that the same input always produces the same explainable financial result.

The normative criteria are `E2-S1-AC1` through `E2-S1-AC4` in `stories.json`. All currency operations use `BigDecimal`, scale 2, and `RoundingMode.HALF_UP`. Configured fraud thresholds must satisfy `0 <= manual-review < reject <= 100`; boundary tests cover 49, 50, 79, and 80.

Machine-learned fraud detection and real insurer rating tables are out of scope.
