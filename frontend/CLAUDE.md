# ClaimFlow frontend guidance

This file supplements the repository `CLAUDE.md` for `frontend/**`.

- Treat backend authorization as authoritative; client-side hiding is not an access-control boundary.
- Preserve loading, empty, error, validation, forbidden, and success states for every changed flow.
- Keep claim state labels and available actions derived from the API contract; do not invent transitions in the browser.
- Format money from exact decimal strings and a declared currency. Do not perform settlement arithmetic with binary floating point.
- Keep forms keyboard accessible, labels associated, errors announced, and focus moved deliberately after dialogs or route changes.
- Add Vitest coverage for component/logic behavior and Playwright coverage for critical user journeys. Use only synthetic claim/customer data.
- Never expose secrets, raw tokens, internal exception text, or private document URLs in the bundle or browser logs.

Run the targeted test, then `npm --prefix frontend test` and `npm --prefix frontend run build`. Run the mapped Playwright journey when the verification matrix requires an end-to-end layer.
