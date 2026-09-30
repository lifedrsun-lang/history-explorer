# School original required before publication

The referenced `2026 2분기 교육활동 결과통지서 (과목명)_2026_09_30_10_07_44.hwpx` was not attached to this turn and was not found in accessible Library search/list results. Do not invent its notice, wording, geometry, or rating-grid coordinates.

Once the original is supplied, inspect its XML and visual preview, retain the original as an internal source asset, and reproduce its verified page in `result-report.html`. Use A4 `@page` with zero margins and embed all artwork as data URLs. Preserve the original notice, wording, five rating columns, table geometry, and instructor line. Do not fetch any external resources.

Supported escaped text tokens: `{{program}}`, `{{period}}`, `{{grade}}`, `{{schoolClass}}`, `{{name}}`, `{{activities}}`, `{{comment}}`, `{{instructor}}`.

Embedded-font tokens: `{{fontRegular}}`, `{{fontBold}}`.

Each evaluation cell uses `{{readiness.0}}` through `.4`, and likewise `participation`, `concentration`, `completion`. Indices correspond exactly to `매우 우수함`, `우수함`, `보통임`, `약간 부족함`, `부족함`. A selected cell contains `✓`; others are empty. Verify the original's column order when placing these tokens.

The original's bounded text regions must have `data-report-fit="activities"` and `data-report-fit="comment"`, fixed dimensions, and `white-space: pre-wrap; overflow-wrap: anywhere`. Renderer decreases font size no lower than 11 px and rejects overflow rather than cutting off text. Inspect short/long text and all five rating positions against the supplied original using the PDF skill.

Without a verified template, API returns 503 and editor visibly disables preview/download. Evaluation saving remains available. This is an explicit incomplete implementation, not a substituted school form.
