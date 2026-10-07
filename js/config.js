/* ============================================================
   EZZARION — SITE CONTENT
   Edit this file to change videos, payouts and links.
   No other file needs to change.
   ============================================================ */
window.SITE = {
  channelUrl: "https://youtube.com/@ezzarion?si=gjLdXVoK1gLFBX7Q",

  /* ---------- YOUTUBE VIDEOS ----------
     id    = the part after v= in the YouTube URL
             (youtube.com/watch?v=dQw4w9WgXcQ  ->  "dQw4w9WgXcQ")
     title = shown under the video
     tag   = small label (e.g. "Payout", "Education", "Live")
     desc  = optional one line under the title
     badge = optional green pill next to the title (e.g. "Most watched")
     thumb = optional image in assets/videos/ (used instead of YouTube's own thumbnail)
     The FIRST video is shown large as the featured one.            */
  videos: [
    { id: "F4x_AjaT_ns", thumb: "assets/videos/v1.jpg", title: "5 Years of Trading | What I’ve Learned About Psychology, ICT, Prop Firms & Payouts", tag: "Start here", desc: "Psychology, ICT, prop firms and payouts, from five years of trading." },
    { id: "79xtnqSylDQ", thumb: "assets/videos/v2.jpg", title: "I GOT PAID $1506 FROM FUNDED TRADER MARKET | LIVE PAYOUT", tag: "Payout", desc: "A live withdrawal from Funded Trader Markets, on camera." },
    { id: "qvC63bOOOu4", thumb: "assets/videos/v3.jpg", title: "2nd Payout LIVE From the Same Account | Funded Trader Markets", tag: "Payout", desc: "The second live payout from the same account." },
  ],

  /* ---------- PAYOUT TIMELINE ----------
     date   = "YYYY-MM-DD"
     firm   = prop firm name
     amount = number in USD (no $ or commas)
     image  = screenshot/proof saved in assets/payouts/
     note   = optional one-line caption
     Order doesn't matter, the site sorts by date.                  */
  payouts: [
    { date: "2026-04-11", firm: "Funded Trader Markets", amount: 840,     image: "assets/payouts/2026-04-11-ftm.jpg", note: "Processed in 2h 18m" },
    { date: "2026-06-04", firm: "Funded Trader Markets", amount: 1222.20, image: "assets/payouts/2026-06-04-ftm.jpg", note: "Processed in 1h 36m" },
    { date: "2026-07-02", firm: "Funded Trader Markets", amount: 1411.20, image: "assets/payouts/2026-07-02-ftm.jpg", note: "Processed in 2h 20m" },
    { date: "2026-08-06", firm: "Funded Trader Markets", amount: 1506.00, image: "assets/payouts/2026-08-06-ftm.jpg", note: "Processed in 42 min" },
    { date: "2026-08-13", firm: "Funded Trader Markets", amount: 620.10,  image: "assets/payouts/2026-08-13-ftm.jpg", note: "Processed in 1h 09m" }
  ],

  /* ---------- CERTIFICATES (passed evaluations / funded) ----------
     Not counted in the payout total.                               */
  certificates: [
    { firm: "Funded Trader Markets", title: "You Achieved Funding",          date: "",           image: "assets/certificates/ftm-funded.jpg" },
    { firm: "E8 Markets",            title: "Certificate of Performance — SimFi Challenge", date: "2026-05-19", image: "assets/certificates/e8-simfi.jpg" },
    { firm: "Alpha Futures",         title: "Certificate of Achievement",    date: "2026-07-27", image: "assets/certificates/alpha-futures.jpg" },
    { firm: "Alpha Capital Group",   title: "Phase 1 — Certificate of Achievement", date: "2026-08-07", image: "assets/certificates/alpha-capital-phase1.jpg" },
    { firm: "Forex Funds Flow",      title: "Funded Trader Recognition",     date: "2026-09-07", image: "assets/certificates/forexfundsflow.jpg" }
  ],

  /* ---------- ACCOUNT SIMULATOR ----------
     firms[].plans[]: market ("Futures" | "CFD"), plan (name),
       base  = the firm's own sale in percent (always applied),
       code  = extra percent the EZZX code takes off on top,
       sizes = [{ size, price, final }]  price = list price in USD,
               final = exact price at checkout with the code (optional).
     A firm with no plans is not shown. The whole section hides if no firm has data.
     Funded Trader Markets: code takes 75% off 1 Step / 2 Step plans and 50% off Instant (set by the owner); list prices at $100K are from its checkout pages (MetaTrader 5). FundedNext Futures fees and EZZX totals are from its checkout (Tradovate/NinjaTrader). Plans with unconfirmed: true have fees but no known EZZX price yet (shows an amber note). Sizes marked estimate: true are scaled from the $100K list price until the real list prices are added. Replace them and delete the flag. */
  simulator: {
    code: "EZZX",
    firms: [
      { name: "Funded Trader Markets", plans: [
        { market: "CFD", plan: "1 Step Nitro",     base: 0, code: 75, sizes: [ { size: "$5K", price: 31, estimate: true }, { size: "$10K", price: 62, estimate: true }, { size: "$25K", price: 156, estimate: true }, { size: "$50K", price: 311, estimate: true }, { size: "$100K", price: 622 } ] },
        { market: "CFD", plan: "2 Step Plus",      base: 0, code: 75, sizes: [ { size: "$5K", price: 50, estimate: true }, { size: "$10K", price: 100, estimate: true }, { size: "$25K", price: 250, estimate: true }, { size: "$50K", price: 499, estimate: true }, { size: "$100K", price: 998 } ] },
        { market: "CFD", plan: "Instant Standard", base: 0, code: 50,  sizes: [ { size: "$5K", price: 36, estimate: true }, { size: "$10K", price: 72, estimate: true }, { size: "$25K", price: 181, estimate: true }, { size: "$50K", price: 362, estimate: true }, { size: "$100K", price: 723 } ] }
      ] },
      { name: "FundedNext", plans: [
        { market: "CFD", plan: "Stellar 2-Step", base: 0, code: 41.67, sizes: [ { size: "$6K", price: 59.99, final: 34.99 }, { size: "$15K", price: 119.99, estimate: true }, { size: "$25K", price: 199.99, estimate: true }, { size: "$50K", price: 299.99, estimate: true }, { size: "$100K", price: 549.99, estimate: true }, { size: "$200K", price: 1099.99, estimate: true } ] },
        { market: "CFD", plan: "Stellar 1-Step", base: 0, code: 31.82, sizes: [ { size: "$6K", price: 65.99, final: 44.99 }, { size: "$15K", price: 129.99, estimate: true }, { size: "$25K", price: 219.99, estimate: true }, { size: "$50K", price: 329.99, estimate: true }, { size: "$100K", price: 569.99, estimate: true }, { size: "$200K", price: 1099.99, estimate: true } ] },
        { market: "CFD", plan: "Stellar Lite",   base: 0, code: 9.09, sizes: [ { size: "$5K", price: 32.99, final: 29.99 }, { size: "$10K", price: 59.99, estimate: true }, { size: "$25K", price: 139.99, estimate: true }, { size: "$50K", price: 229.99, estimate: true }, { size: "$100K", price: 399.99, estimate: true }, { size: "$200K", price: 798.99, estimate: true } ] },
        { market: "CFD", plan: "Stellar Instant", base: 0, code: 16.67, sizes: [ { size: "$2K", price: 59.99, final: 49.99 }, { size: "$5K", price: 149.99, estimate: true }, { size: "$10K", price: 299.99, estimate: true }, { size: "$20K", price: 599.99, estimate: true } ] },
        { market: "Futures", plan: "Flex",        base: 0, code: 47.76, sizes: [ { size: "$50K", price: 133.99, final: 69.99 }, { size: "$100K", price: 264.99, estimate: true }, { size: "$150K", price: 483.99, estimate: true } ] },
        { market: "Futures", plan: "Rapid Pro",   base: 0, code: 44.0, sizes: [ { size: "$25K", price: 159.98, estimate: true }, { size: "$50K", price: 299.98, estimate: true }, { size: "$100K", price: 499.98, final: 279.99 } ] },
        { market: "Futures", plan: "Rapid Daily", base: 0, code: 44.0, sizes: [ { size: "$25K", price: 159.98, estimate: true }, { size: "$50K", price: 299.98, estimate: true }, { size: "$100K", price: 499.98, final: 279.99 } ] },
        { market: "Futures", plan: "Direct",      base: 0, code: 40.14, sizes: [ { size: "$50K", price: 283.99, final: 169.99 } ] }
      ] }
    ]
  },

  /* ---------- PARTNERS ---------- */
  partners: [
    { name: "PropFirmMatch", logo: "assets/img/propfirmmatch-logo.png", badge: "MATCH", href: "https://www.propfirmmatch.com/?a_aid=EZZARIon",
      desc: "Not a prop firm — a search engine for them. Compares offers, discounts and rules across the industry before you buy." },
    { name: "Funded Trader Markets", logo: "assets/img/funded-trader-markets-logo.png", badge: "EZZX", href: "https://fundedtradermarkets.com/ref/ezzarion",
      desc: "Get funded up to $1.2M with instant funding or evaluation challenges — on-demand rewards, no delays, no hidden rules." },
    { name: "FundedNext", logo: "assets/img/fundednext-logo.png", badge: "EZZX", href: "https://fundednext.com/?fpr=EZZX",
      desc: "Multiple challenge models to pick from, with high profit splits and a clear payout schedule once you are funded." },
    { name: "E8 Markets", logo: "assets/img/e8-markets-logo.png", badge: "EZZX", href: "https://e8markets.com/d/EZZX",
      desc: "One of the highest-rated evaluation programs available, code EZZX." },
    { name: "Tradesyncer", logo: "assets/img/tradesyncer-logo.png", badge: "EZZX", href: "https://app.tradesyncer.com/r/TSCD098659",
      desc: "Web application for traders — sync and manage your accounts in one place." }
  ],

  /* ---------- FOLLOWERS (adds up to the "Total followers" tile) ----------
     Type the current number for each platform. Leave 0 for any you don't
     want counted. If every number is 0 the tile shows "—".            */
  followers: { youtube: 2700, kick: 566, tiktok: 14, instagram: 272000, x: 5000 },

  socials: [
    { name: "X", href: "https://x.com/ezzarion" },
    { name: "Instagram", href: "https://www.instagram.com/ezzarion" },
    { name: "TikTok", href: "https://www.tiktok.com/@ezzarion" },
    { name: "YouTube", href: "https://youtube.com/@ezzarion?si=gjLdXVoK1gLFBX7Q" },
    { name: "Kick", href: "https://kick.com/ezzarion" }
  ]
};
