# E2-S2 — Settle, reopen, and preserve audit history

As a policyholder or administrator, I want settlement and reopening operations to preserve financial and decision evidence so that later review cannot silently rewrite history.

The normative criteria are `E2-S2-AC1` through `E2-S2-AC4` in `stories.json`. A claim has at most one settlement row. Reprocessing may reuse an equal existing settlement but cannot mutate it or replace it with a different amount. Every workflow action appends a new `AuditEvent`; no update path exists for prior events.

The current settlement is a payment stub, not an external funds transfer.
