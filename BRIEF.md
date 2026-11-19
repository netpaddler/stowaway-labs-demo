# Stowaway Labs demo site (spec build)

Goal: a BEAUTIFUL, modern, fast demo website for Stowaway Labs, a waterfront coworking space in Gig Harbor, WA. Pete Chiou is building this on spec to show the owners (Nick and Lauren Gough) in hopes of trading the site for free use of the space. Beauty first. It must look clearly better than their current Squarespace site (https://www.stowawaylabs.com/) while keeping their brand, maritime voice ("Gig Harbor coworking for the adventurous", "ahoy", "shipwreck chic" interior), and waterfront story.

Build it as a static site in this folder (plain HTML/CSS/JS, or Astro/Vite if you prefer, but it must produce a static build that opens locally and could be hosted on GitHub Pages). Responsive, mobile first, accessible (alt text, contrast, keyboard), lightweight (lazy-load images, modern formats where possible, no heavy effects). Tasteful subtle motion only.

## Facts to use (verified from their live site, Nov 2026). Do not invent other facts.
- Address: 8809 N. Harborview Dr., Suite 101, Gig Harbor, WA 98332. Under Devoted Kiss Cafe, in the former TideRunner Boat Co. building. Opened Sept 22, 2025.
- Hours: Mon to Fri, 9 a.m. to 5 p.m. Email: ahoy@stowawaylabs.com. Phone: (253) 525-8911. Instagram: https://www.instagram.com/stowawaylabs/
- Amenities: indoor and outdoor (deck/waterfront) workspace, gigabit Wi-Fi, free printing, ultrawide monitors, laptop stands, mice, keyboards, whiteboards, coffee and snacks bar, soundproof meeting booths.
- Free full day for locals in greater Gig Harbor, no strings attached.
- Drop-in: $12/hour, 2-hour minimum, weekdays 9 to 5.
- Part-time membership: $250/month, up to 50 hours, priority workspace booking, local-business discounts.
- Full-time membership: $500/month, unlimited weekday access, private storage locker, virtual office included.
- Corporate Flex: $750/month, shared company pool of 100 hours/month for a team.
- Virtual office and mail: $49/month ($39 for members), professional waterfront address plus private mailbox, daily arrival emails, pickup Mon to Fri 9 to 5, up to three names/DBAs, packages up to 6 cu ft or 30 lb, 12-month term, $30 one-time setup. No scanning/forwarding yet. Also marketed as a waterfront address for boaters and liveaboards.
- Waterfront event venue: inquiry by email.
- Coming 2027: waterfront conference room, recording studio, private meeting rooms and storage (1 to 10 people).
- Desk types in their system: monitor desks, no-monitor desks, heated table seats, booth seats.
- House rules: 18+, no pets, check-in required, member priority seating.
- Their real booking/billing system is Archie (member login https://archieapp.co/stowaway-labs/sign-in). Keep a "Member login" link to that.

## Photos
Download their existing photos from https://www.stowawaylabs.com/ (and /virtual-office-mail, /waterfront-boater-address) into ./assets/img, resize/compress them, and use them. Credit photographers in the footer: Jahni Lynn Photo (jahnilynnphoto.com) and Beyond Harbor Waves. Also grab their logo.

## Pages / sections
Home (hero with waterfront photo, three paths: Work here / Get an address / Host an event, social proof, free local day callout), Memberships and pricing (clean comparison cards), The Space (gallery, amenities, desk types), Book, Virtual office and boater address, Events and venue, About (founders, story, land acknowledgement link), Contact/visit (map embed, hours, phone, email, tour request). Address, phone, hours in every footer. Good SEO: unique titles/meta descriptions, complete LocalBusiness JSON-LD, OG image of the space.

## Booking (key feature)
A polished booking flow on the Book page (front-end demo, no real payments): pick date, start time and duration (2-hour minimum, 30-minute steps, 9 to 5 weekdays only), desk type, and NUMBER OF PEOPLE (1 to 6, default 1). Booking for 2+ people must be first class: e.g. owner plus employee sharing adjacent seats. Show a seat picker or "seats together" option, a live price summary (people x hours x $12, or "covered by membership"), guest names/emails per person, and a confirmation screen. Also a "Book a tour" time-slot picker and a "Claim your free local day" option. Store nothing server-side; make it clear in a small note in the README (not on the page) that it is a demo front end meant to hand off to Archie.

## Copy style
Warm, confident, maritime but not cheesy. Do not use em dashes or en dashes anywhere in copy. Fix their typos. No lorem ipsum.

## Deliverables
- Working site in this folder with a README explaining how to open/preview it.
- Run a local preview check yourself (e.g. build, and verify pages load without console errors).
- At the end, print a short summary of what you built and the path to open.
