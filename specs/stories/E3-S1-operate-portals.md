# E3-S1 — Operate customer and administrator portals

As a customer or claims administrator, I want a responsive, keyboard-operable portal with clear loading, empty, error, decision, settlement, and audit states so that the workflow can be demonstrated and reviewed safely.

The normative criteria are `E3-S1-AC1` through `E3-S1-AC6` in `stories.json` and are named directly in `frontend/e2e/portal.spec.js`. Admin actions render only for states accepted by domain methods. Errors use inline live alerts; dialogs expose dialog semantics and close with Escape; a mobile viewport is part of automated browser verification.

The browser suite uses synthetic API responses for deterministic UI validation. Backend integration behavior is independently verified by the Java API suite.
