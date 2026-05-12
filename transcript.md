# Spaces@LBG — 10-Minute Presentation Transcript

**Team:** Ctrl + Alt + She
**Total target:** ~10 minutes (6 min talking to slides + ~3 min live demo + ~1 min wrap/Q&A intro)

Pacing notes: square brackets `[ ]` are stage directions — don't read them aloud. Press the right-arrow key once between sections to advance the slide.

---

## Slide 1 — Title  *(~30s)*

Hi everyone, we're **Ctrl + Alt + She**, and this is **Spaces@LBG** — our take on rethinking how people book a desk.

The current system is clunky and leans heavily on a vendor API that doesn't give us the data we'd like. So we've built **one product across two surfaces** — a flat browser app and a glassmorphism mobile app — and over the next ten minutes we'll walk you through how it answers all six of the prompts you set us, with a live demo of both at the end.

[Advance →]

---

## Slide 2 — The Problem  *(~45s)*

Quick reality check on where we are today.

The system we have now is a vendor product, and that gives us four problems.

**One — we're locked in.** The API is a black box. We can't extend it, can't reshape it, can't get the data we want out of it.

**Two — colleagues are flying blind on the day.** You don't know who's in, which floor is busy, or whether your team is even there until you walk through the door.

**Three — ghost bookings.** People book a desk, don't show up, and that desk sits empty all day while someone else walks home.

**Four — leadership has no real visibility.** Reporting is whatever the vendor decides to share with us, when they decide to share it.

Those are the four problems we set out to fix.

[Advance →]

---

## Slide 3 — Our Concept  *(~30s)*

Our concept is simple. **One product. Two surfaces. Six prompts answered.**

A **flat browser app** for desktop-based planning — your week, your team, your reports.

A **glassmorphism mobile app** for the morning commute — book on the train, check in at the door.

And critically — **we own the data and the rules.** Licensing comes from Workday. Reporting is built in from day one. No vendor middleman.

[Advance →]

---

## Slide 4 — Finding & Booking  *(~40s)*

**Prompt one — finding and booking.** How does someone actually know what's available before they decide to come in?

You see the whole floorplan. Every desk on every floor. **Green dot** means free. **Red** means booked. **Blue** means a teammate is sitting there. And **yellow** is you.

Tap any green dot — that's your desk. No menus, no codes, no calling facilities.

And if you tap a booked desk, you can see *who's* sitting there — so you can plan around them, or go and join them.

[Advance →]

---

## Slide 5 — Morning vs Full Day  *(~40s)*

**Prompt two — morning vs full day.** What does booking for a morning mean for the space, and for the next person?

We give you five booking windows: **full day, morning, afternoon, evening, or custom.** That alone makes the space go further — one desk, three handovers, zero wasted space.

The key bit is what happens at handover. **One hour before your checkout time**, you get a notification. It says — and I'll read it — "It's nearly time to leave (yay!). Please ensure that your desk is clear and tidy for the next user."

So the next person doesn't walk into someone else's coffee cup.

[Advance →]

---

## Slide 6 — No-Shows  *(~45s)*

**Prompt three — no-shows.** If someone books but doesn't show, who gets the desk, and when?

If the floor's full when you try to book, you can **join the waitlist** for that floor in one tap.

**Check-in cut-off is 10am.** After that, if you haven't checked in, the desk is **released automatically** and goes back into circulation. Same thing if you cancel — the waitlist fires immediately.

And whoever's at the top of the waitlist gets a **push notification, an email, or both** — whichever they've chosen in their alert preferences.

The schedule heals itself. No one has to chase facilities.

[Advance →]

---

## Slide 7 — Teams & Neighbourhoods  *(~40s)*

**Prompt four — teams and neighbourhoods.** How do people who want to sit together actually end up together?

You see your teammates' bookings highlighted on the floorplan. There's a button — **"Sit with team"** — that finds you the nearest open desk in that cluster.

You can also **book for multiple colleagues** in one flow — useful for a PA booking on behalf of an exec team.

And if there's already a clash — someone's already got a booking that day — you get a **warning before you confirm.** Not an apologetic email after the fact.

[Advance →]

---

## Slide 8 — Admin & Policy  *(~50s)*

**Prompt five — admin and policy.** How should leadership see utilisation without vendor-supplied reporting?

Three license tiers, all driven by the **job-title marker on Workday** — no manual provisioning, no separate access list.

**Normal Users** can book multiple desks — four months ahead for desks, three months for meeting rooms.

**Line Managers** get everything a normal user has, **plus a stats tab** showing how often their direct reports book, no-show, or cancel. So they can spot patterns early.

**PAs** get normal-user functionality plus the ability to book **up to a year in advance** for both desks and meeting rooms — because that's the planning horizon they actually work to.

Reporting lives where the bookings live. Leadership stops raising vendor tickets to see their own office.

[Advance →]

---

## Slide 9 — Accessibility  *(~50s)*

**Prompt six — accessibility.** What does a booking flow look like that works for everyone?

Our principle: **nobody has to disclose anything personal** to use this app well.

Amenities — sit-stand, monitor, quiet zone, step-free — are **universal**. Anyone can filter for them. They're presented in an **Airbnb-style card layout** that's visual and scannable.

You set personal preferences in settings, and those shape which desks surface first for you.

Every screen has a **light/dark mode toggle** and an **adjustable font size**.

And the two visual styles — flat for browser, glassmorphism for mobile — both meet WCAG-AA. **Accessibility isn't a separate flow. It's just the flow.**

[Advance →]

---

## Slide 10 — Browser Demo  *(~3 min)*

**Intro (read aloud):**

> Right — let's see it live. I'll switch to the browser app.

[**Switch tab to the running browser app.**]

**Talk over the demo — work through these five beats:**

1. **Floorplan landing.** "First thing you land on — the floorplan. I'll pick a floor… and tap a green dot. That's a full-day booking, done."

2. **Time slot switch.** "Let me change that to a morning slot. You can see the time chips here. If I were closer to checkout, I'd get that handover nudge."

3. **Team view.** "Over to my team. Here's everyone who's already booked in. I'll click 'Sit with team' — and it slots me right next to them."

4. **Line Manager view.** "Now I'll switch to a Line Manager account. You can see the extra **stats tab** — booking frequency, no-show rate, cancellation rate across the team I manage."

5. **Accessibility controls.** "And finally — settings. Dark mode toggle. Font size scaler. Same controls, same place, available to everyone."

[Advance →]

---

## Slide 11 — Mobile Demo  *(~3 min)*

**Intro (read aloud):**

> Now the mobile side. Same product, glassmorphism style.

[**Open `glassmorphism-prototype.html` on the phone — or DevTools mobile view.**]

**Talk over the demo — work through these five beats:**

1. **Home screen.** "Today's booking and check-in are right at the top. Frosted glass cards — sits naturally on a modern phone."

2. **Floor view.** "Tap into the floor. Same green dots, same one-tap booking. Built for the train ride in."

3. **Waitlist alert.** "Let me trigger a waitlist alert — there's the push. 'G-12 is yours if you want it.' One tap to claim it."

4. **Amenities sheet.** "Pop open the amenities sheet — Airbnb-style cards. Anyone can use them. No disclosure form, no special request."

5. **Theme & font scale.** "And the same theme and font controls. Same place, same behaviour. Accessibility doesn't change between web and mobile."

[Advance →]

---

## Slide 12 — Wrap & Q&A  *(~40s)*

To wrap up — what we've built is **workplace-owned, data-rich, and accessible by default.**

Floorplan-first booking. Flexible time windows with a built-in handover nudge. A self-healing waitlist. Team-aware booking with clash warnings. Workday-driven licensing with reporting baked in. And accessibility controls available to everyone — across a flat browser app and a glassmorphism mobile app.

**What's next:** replace the vendor API with our own service layer, integrate Workday job markers for licensing, and pilot on one floor of one building before we scale.

We're **Ctrl + Alt + She** — happy to take any questions.

---

## Timing summary

| Section | Slide(s) | Time |
|---|---|---|
| Intro + problem + concept | 1–3 | 1:45 |
| Six prompts | 4–9 | 4:05 |
| Browser demo | 10 | 3:00 |
| Mobile demo | 11 | 3:00 |
| Wrap | 12 | 0:40 |
| **Buffer / Q&A intro** | — | ~0:30 |
| **Total** | | **~10 min** |

If you're running long, the easiest cut is in the prompts section — slide 8 (admin) and slide 9 (accessibility) can each lose 10–15 seconds without losing the core point.
