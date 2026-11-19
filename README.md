# Stowaway Labs website (spec redesign)

A fast, static redesign of [stowawaylabs.com](https://www.stowawaylabs.com/) for Stowaway Labs, waterfront coworking in Gig Harbor, WA. Plain HTML, CSS, and JavaScript. No framework and no runtime dependencies.

## Open it

**Quickest:** double-click `index.html`. Every page works straight from disk.

**Local server (recommended, matches real hosting):**

```bash
npm run preview      # node scripts/serve.mjs, then open http://localhost:4173/
```

Node 18 or newer. The preview server has no dependencies, so `npm install` is not needed to view the site.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: hero, three paths (Work here, Get an address, Host an event), logbook, amenities, pricing, free local day, visit |
| `memberships.html` | Plan cards, comparison table, Coming 2027, FAQ |
| `space.html` | Photo gallery with lightbox, desk types, amenities, deck, house rules |
| `book.html` | Booking flow: desk reservations, free local day, tours |
| `virtual-office.html` | Virtual office and mail, plus the boater and liveaboard address (`#boaters`) |
| `events.html` | Waterfront event venue and inquiry form |
| `about.html` | Founders, the building, land acknowledgement |
| `contact.html` | Map, hours, phone, email, tour request |
| `404.html` | Not found page |

## Booking demo (important)

`book.html` is a **front-end demo only**. Nothing is sent to a server, nothing is stored, and no payment is taken. The confirmation screens, reference numbers, and the "a confirmation is on its way" message are simulated so the owners can click through the full flow. In production these steps would hand off to Archie, Stowaway Labs' booking and billing system (members already sign in at <https://archieapp.co/stowaway-labs/sign-in>, which is linked as "Member login" across the site).

What the demo covers:

- Date picker for weekdays only, up to 60 days out. Past times today are disabled.
- Start times 9:00 to 3:00 in 30-minute steps, duration from a 2-hour minimum in 30-minute steps, always ending by 5 p.m.
- **1 to 6 people** (default 1). For 2 or more, "Seat us together" finds adjacent open seats at one table. Click any open seat to move the group, or turn the toggle off to pick seats one by one.
- Desk types: monitor desks, no-monitor desks, heated table seats, booth seats, each with a live "open" count.
- Name and email for each person (email optional for guests).
- Coverage: drop-in ($12 per person per hour), member (covers you, with a per-guest "Also a member" option), or Corporate Flex (draws people × hours from the team pool).
- Live price summary and a confirmation screen with a downloadable `.ics` calendar file.
- "Claim your free local day" and "Book a tour" tabs, deep-linkable as `book.html#free-day` and `book.html#tour`. `book.html?people=2&type=booth` also works.

The seat map is a simplified, made-up layout and the "taken" seats are simulated. Tour time slots (9:30, 10:30, 11:30, 1:00, 2:00, 3:00, 4:00) are placeholders too. Swap both for real data when this is wired to Archie.

The event inquiry and contact forms open a pre-filled email to ahoy@stowawaylabs.com, so they work today without a backend.

## Smart suggestions, the "easy button" (pass 2)

The site remembers what a visitor did **in their own browser only** (`localStorage`, key `swl.memory.v1`) and turns it into one-tap suggestions. Like the booking flow, this is a demo front end: nothing is sent anywhere, and in production the history would come from Archie.

- **Book your usual.** The most frequent day, time, desk type, and party (recent visits count a bit more) shows up as a card on Home (in the hero and in a "Welcome back" section) and on Book. On Home, "Book it" opens the Quick book sheet. On Book, "Use my usual" fills in the whole form so it can be edited before confirming.
- **Same as last time, tomorrow** and **Same time next week** quick actions. Booked or past slots are skipped, and a suggestion that matches the usual is merged into it.
- **Membership savings.** Looks at the last 30 days of drop-in bookings per person (hours × $12) and compares against Part-time ($250, up to 50 hours), Full-time ($500), and Corporate Flex ($750 for a team pool of 100 hours). Shows the saving when there is one. If the visitor has looked at pricing a few times but would not save yet, it shows the 21-hour break-even instead.
- **Picked up where you left off.** If an earlier visit included the virtual office or events pages, Home brings them back up next time.
- **Crews.** Party size and guest names are remembered, so "You + Casey" on the Book page sets 2 people, seats together, and both names in one tap. The booking lead's name and email are prefilled, and house rules are pre-checked once accepted.
- **Quick book** (header, every page): a small sheet with the best suggestion ready to confirm, other suggestions as chips, a people stepper, and a "Change details" link into the full form. New visitors get the next open 2 hours at a monitor desk.
- **Forget my preferences** clears everything. It appears on the smart cards, in the Quick book sheet, and in the footer whenever something is remembered.

### Demo the returning visitor

Add `?demo=returning` to any URL (for example `index.html?demo=returning`) to load a sample history: Jordan Reyes, who books 2 monitor desks with Casey Lin on Tuesdays 9 to 1, comes solo on Thursdays, recently had an afternoon at the heated table, viewed pricing three times, and looked at the virtual office and events pages. Use `?demo=new` (or "Forget my preferences") to go back to a first-time visitor. The parameter is removed from the address bar after it loads.

Code: `assets/js/smart.js` (memory, suggestions, Quick book sheet, shared date and seat helpers) and `assets/js/book.js` (booking form).

## Editing and building

Source pages live in `src/pages/`. The shared header, footer, SEO tags, and LocalBusiness JSON-LD are generated by `build.mjs`.

```bash
npm run build        # regenerate the .html files in the repo root
npm run check        # static QA: no em/en dashes, alt text, links, unique titles, valid JSON-LD
```

- Business details (address, phone, links) are set once in `SITE` at the top of `build.mjs` and used as `{{tokens}}` in pages.
- Images are written as `<x-img name="..." alt="...">` in source and expand to responsive `<picture>` tags (AVIF, WebP, JPEG).
- Styles: `assets/css/site.css`. Scripts: `assets/js/site.js` (nav, motion, gallery, email forms), `assets/js/smart.js` (suggestions and Quick book, loaded on every page), and `assets/js/book.js` (booking).

### Images

Photos were downloaded from the current site and processed with `scripts/optimize-images.mjs` (needs `npm install` for `sharp`). It writes 640 and 1024 px versions in AVIF, WebP, and JPEG to `assets/img/`, plus the Open Graph image and the ink and cream logos. The largest originals Squarespace serves are 1024 px wide, so higher-resolution originals from the photographers would sharpen the hero on large screens.

Photography by [Jahni Lynn Photo](https://jahnilynnphoto.com) and Beyond Harbor Waves (credited in every footer).

## Deploy to GitHub Pages

The site is already built into the repo root. Push to GitHub, then go to **Settings → Pages → Deploy from a branch** and choose `main` and `/ (root)`. Canonical URLs, the sitemap, and Open Graph tags point at `https://www.stowawaylabs.com`. Change `SITE.url` in `build.mjs` and rebuild if it will live somewhere else.

## Notes for the owners

- **Facts.** Copy uses only the details in the project brief, verified against the live site in November 2026. The live site also mentions dockside mail pickup by boat and 2 hours a month of coworking with the virtual office. Those were left out for now and are easy to add once confirmed.
- **Social proof.** The site has no member testimonials because none exist on the current site and none were invented. The home page "logbook" section is ready for a few real quotes.
- **Unknowns marked "Ask us".** The comparison table says "Ask us" where a Corporate Flex perk is not documented (priority booking, discounts, locker, virtual office rate).
