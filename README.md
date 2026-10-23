# OVPCASSS Paperless PAR System

Replaces the paper Post-Activity Report process of OVPCASSS with a paperless
system: submission, review, endorsement, approval, acknowledgement, storage,
search, and audit trail, plus the three Excel monitoring sheets the office
keeps by hand.

The browser app is deployed to Cloudflare Pages at
<https://ovpcasss-par.pages.dev>; the same build ships as a Windows desktop app.
The API runs on the `par` Worker (`apps/api`), which the site reaches through its
`/api/*` proxy so the browser stays on one origin.
