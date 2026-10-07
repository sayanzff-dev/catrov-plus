# EZZARION website

Static site (no build step). Open `index.html`, or deploy the folder to any static host.

## What to edit
Everything content-related lives in **`js/config.js`**:

| Section | Where | What you add |
|---|---|---|
| Videos | `videos: [...]` | `{ id: "YOUTUBE_ID", title: "...", tag: "..." }` — first one is featured |
| Payouts | `payouts: [...]` | `{ date: "2026-03-14", firm: "E8 Markets", amount: 4200, image: "assets/payouts/file.jpg", note: "..." }` |
| Partners / socials | `partners`, `socials` | links, codes, discounts |

Payout screenshots go in `assets/payouts/`. The "Total withdrawn" number and hero stats are computed automatically from the list.
