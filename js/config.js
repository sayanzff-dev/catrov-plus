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
     The FIRST video is shown large as the featured one.            */
  videos: [
    // { id: "VIDEO_ID", title: "How I passed the evaluation", tag: "Education" },
  ],

  /* ---------- PAYOUT TIMELINE ----------
     date   = "YYYY-MM-DD"
     firm   = prop firm name
     amount = number in USD (no $ or commas)
     image  = screenshot/proof saved in assets/payouts/
     note   = optional one-line caption
     Order doesn't matter, the site sorts by date.                  */
  payouts: [
    // { date: "2026-03-14", firm: "E8 Markets", amount: 4200, image: "assets/payouts/2026-03-e8.jpg", note: "Second payout" },
  ],

  /* ---------- PARTNERS ---------- */
  partners: [
    { name: "PropFirmMatch", logo: "assets/img/propfirmmatch-logo.png", badge: "MATCH", href: "https://www.propfirmmatch.com/?a_aid=EZZARIon",
      desc: "Not a prop firm — a search engine for them. Compares offers, discounts and rules across the industry before you buy." },
    { name: "Funded Trader Markets", logo: "assets/img/funded-trader-markets-logo.png", badge: "EZZX", promo: "-65% OFF", href: "https://fundedtradermarkets.com/ref/ezzarion",
      desc: "Get funded up to $1.2M with instant funding or evaluation challenges — on-demand rewards, no delays, no hidden rules." },
    { name: "Alpha Capital Group", logo: "assets/img/alpha-capital-group-logo.jpg", badge: "EZZX", href: "https://app.alphacapitalgroup.uk/signup/EZZX",
      desc: "Structured trading evaluations with a clear route toward an Alpha Capital funded account." },
    { name: "Alpha Futures", logo: "assets/img/alpha-futures-logo.png", badge: "EZZX", promo: "-25% OFF", href: "https://app.alpha-futures.com/signup/EZZX/",
      desc: "Futures evaluations built by ACG Futures, with straightforward rules and a clean path to a funded account." },
    { name: "E8 Markets", logo: "assets/img/e8-markets-logo.png", badge: "EZZX", href: "https://e8markets.com/d/EZZX",
      desc: "One of the highest-rated evaluation programs available, code EZZX." },
    { name: "Forex Funds Flow", logo: "assets/img/forex-funds-flow-logo.png", badge: "EZZX", promo: "-5% OFF", href: "https://portal.forexfundsflow.com/ref/MREZZAW79J",
      desc: "Manage your evaluation accounts, track payouts and monitor performance in one clean dashboard." },
    { name: "AquaFunded", logo: "assets/img/aquafunded-logo.png", badge: "EZZX", href: "https://www.aquafunded.com/?afmc=EZZX",
      desc: "Instant trading capital with 100% profit split, on-demand payouts and 24/7 support." },
    { name: "HyroTrader", logo: "assets/img/hyrotrader-logo.png", badge: "EZZX", promo: "-10% OFF", href: "https://www.hyrotrader.com/?coupon=EZZX",
      desc: "The crypto side of prop trading — real exchange execution with up to 90% profit split." },
    { name: "Tradesyncer", logo: "assets/img/tradesyncer-logo.png", badge: "EZZX", promo: "-30% OFF", href: "https://app.tradesyncer.com/r/TSCD098659",
      desc: "Web application for traders — sync and manage your accounts in one place." }
  ],

  socials: [
    { name: "X", href: "https://x.com/ezzarion" },
    { name: "Instagram", href: "https://www.instagram.com/ezzarion" },
    { name: "TikTok", href: "https://www.tiktok.com/@ezzarion" },
    { name: "YouTube", href: "https://youtube.com/@ezzarion?si=gjLdXVoK1gLFBX7Q" },
    { name: "Kick", href: "https://kick.com/ezzarion" }
  ]
};
