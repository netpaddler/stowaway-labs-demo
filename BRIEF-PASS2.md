# Pass 2: the "easy button"

The owner, Nick Gough, runs a software company (NoteRouter) and likely uses AI himself. The pitch is "you don't have to build this, it's done and it's effortless." Add:

1. Smart, personalized suggestions based on the visitor's previous actions (stored locally in the browser via localStorage; demo only, no server). Examples:
   - Returning visitor: a prominent one-tap "Book your usual" card on Home and Book (e.g. "2 monitor desks, Tuesday 9 to 1, seats together") prefilled from their last booking, editable before confirming.
   - "Same as last time, tomorrow" and "Same time next week" quick actions.
   - If they viewed pricing or booked drop-ins several times, gently suggest the membership that would save them money (compute it: e.g. hours booked x $12 vs $250 part-time).
   - If they browsed the virtual office or events pages, surface that next time.
   - Remember party size and guest names (e.g. owner plus employee) so booking for 2 is one tap.
   - A small "Forget my preferences" link for privacy.
2. A "Quick book" easy button in the header that opens a minimal sheet with the smartest suggested booking ready to confirm.
3. Include a way to demo it: a hidden "?demo=returning" URL param that seeds sample history so Pete can show the returning-visitor experience in a meeting.
Keep everything beautiful, fast, and consistent with pass 1. No em dashes or en dashes in copy. Verify no console errors. Print a short summary at the end.
