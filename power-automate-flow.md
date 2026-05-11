# Power Automate Flow — No-Show Release

A scheduled cloud flow that flips today's un-checked-in `Reserved` bookings to `NoShow` after a configurable cutoff (default: 10:00 local). This frees the desk so somebody else can grab it.

## Why this isn't in the app

Power Apps formulas only run while someone has the app open. Releasing no-shows has to happen on a schedule whether or not anyone is using the app — so it lives in Power Automate.

---

## Create the flow

In `https://make.powerautomate.com` → **Create → Scheduled cloud flow**.

- **Flow name**: `Desk Booking — Release No-Shows`
- **Starting**: today, 10:00
- **Repeat every**: 30 minutes

Once created, edit the recurrence trigger:

- **Time zone**: your local TZ (e.g. `(UTC-05:00) Eastern Time`)
- **On these days**: Mon, Tue, Wed, Thu, Fri
- **At these hours**: 10, 11, 12, 13, 14
- **At these minutes**: 0, 30

That gives you sweeps every half hour from 10:00 to 14:30, only on weekdays. Adjust to taste.

---

## Steps

### 1. Initialize cutoff time

Action: **Initialize variable**
- Name: `CutoffHour`
- Type: Integer
- Value: `10`

(Make this a flow constant so changing the policy is one edit.)

### 2. Get pending bookings for today

Action: **SharePoint → Get items**
- Site Address: your site
- List Name: `Bookings`
- Filter Query:
  ```
  BookingDate eq '@{formatDateTime(utcNow(), 'yyyy-MM-dd')}' and Status eq 'Reserved' and CheckInTime eq null
  ```
- Top Count: `500`

> The single-quoted date string assumes your site's regional setting is ISO-style. If your filter errors with "Invalid date", wrap the date in `datetime'...'` instead: `BookingDate eq datetime'@{formatDateTime(utcNow(), 'yyyy-MM-dd')}T00:00:00Z'`.

### 3. Loop and release

Action: **Apply to each** over `value` from step 2.

Inside the loop, add a **Condition**:

- Left: `@{convertFromUtc(utcNow(), 'Eastern Standard Time', 'HH')}` (use your TZ; this returns the current hour as a 2-digit string)
- Operator: `is greater than or equal to`
- Right: `@{string(variables('CutoffHour'))}`

In the **If yes** branch, add: **SharePoint → Update item**
- Site Address: your site
- List Name: `Bookings`
- Id: `@{items('Apply_to_each')?['ID']}`
- Title: `@{items('Apply_to_each')?['Title']}`
- Status Value: `NoShow`

Leave the **If no** branch empty.

### 4. (Optional) Notify the booker

Inside **If yes**, after the update, add **Office 365 Outlook → Send an email (V2)**:

- To: `@{items('Apply_to_each')?['BookedFor']?['Email']}`
- Subject: `Your desk booking was released`
- Body:
  > Hi @{items('Apply_to_each')?['BookedFor']?['DisplayName']},
  >
  > You didn't check in by @{variables('CutoffHour')}:00 for desk @{items('Apply_to_each')?['DeskLookup']?['Value']} on @{formatDateTime(items('Apply_to_each')?['BookingDate'], 'ddd, MMM d')}, so the desk has been released for others to book.

---

## Test it

1. In the app, book a desk for **today** but don't check in.
2. In Power Automate, open the flow and click **Test → Manually**.
3. The flow should find your booking and (if the current hour ≥ cutoff) flip it to `NoShow`. Refresh the floor plan in the app — that desk's pin turns green again.

## Failure modes to watch for

| Symptom | Cause | Fix |
|---|---|---|
| Flow runs but no items returned | Filter Query date format wrong for your tenant | Switch to the `datetime'…'` form shown above |
| `BookedFor` email blank | Bookings created before the column existed | Backfill manually, or guard the email step with `if(empty(...), ...)` |
| Updates flip back to `Reserved` next sweep | Nothing — once `Status` is `NoShow`, the trigger filter excludes it | n/a |
| Loop is slow with many rows | `Apply to each` runs serially by default | Settings → Concurrency Control → On → 20 |

---

## Extending later

- **Auto-release based on desk location grace period**: add a `GraceMinutes` column on `Desks` and compare `addMinutes(BookingDate, GraceMinutes)` to current time instead of a fixed cutoff hour.
- **Reminder the night before**: add a second scheduled flow at 18:00 that emails everyone with a Reserved booking for tomorrow.
- **Slack / Teams notification** instead of email: swap the final action for the Teams "Post message in chat or channel" connector.
