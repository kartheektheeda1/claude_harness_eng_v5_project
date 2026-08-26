# Story dependency graph

```text
E1-S1 Intake and adjudication
 ├─> E1-S2 Access boundaries
 └─> E2-S1 Fixed-point rules
      └─> E2-S2 Settlement, reopen, audit
           └─> E3-S1 Customer/admin portals
```

Groups A, B, and C in `specs/sprint-contracts/` follow this order. A downstream story may not weaken an upstream domain, security, money, migration, or audit invariant.
