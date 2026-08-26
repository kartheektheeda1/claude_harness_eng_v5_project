---
name: payout-calculator
description: Generate and verify AC-05/AC-07 BigDecimal payout calculations and immutable settlement invariants.
---

# Payout Calculator

Use `min(claimedAmount, sumInsured)`, subtract deductible, apply co-pay to the deductible-adjusted value, clamp to zero, and finish with scale 2 and `HALF_UP`. Prohibit `double` and `float`. Cover cap, zero, rounding, full co-pay, deductible-greater-than-claim, and positive settlement branches. Settlement amount must equal the recorded assessment and must never be updated.
