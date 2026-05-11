# SharePoint Lists

Create these three lists on your SharePoint site **before** building the app. Use **Site contents → New → List → Blank list**.

> ⚠️ For every column other than `Title`, use **Add column** in the list view. The list designer's column types map to Power Fx differently than you might expect — match the types below exactly.

---

## List 1: `Floors`

Holds one row per floor / building zone, with a pointer to the floor-plan image and the pixel dimensions of that image (used to scale the canvas).

| Column | Type | Notes |
|---|---|---|
| `Title` | Single line of text | Floor name, e.g. "HQ — Level 3" |
| `FloorPlanUrl` | Hyperlink | Direct URL to the floor-plan PNG/JPG in your SharePoint library |
| `ImageWidth` | Number | Native pixel width of the floor-plan image |
| `ImageHeight` | Number | Native pixel height of the floor-plan image |
| `SortOrder` | Number | Optional — controls dropdown order |

**Seed at least one row** before building the app.

---

## List 2: `Desks`

One row per bookable desk. The `XCoord`/`YCoord` are pixel positions on the floor-plan image — you'll set them once by eyeballing where each desk sits.

| Column | Type | Notes |
|---|---|---|
| `Title` | Single line of text | Desk code, e.g. "L3-014" |
| `Floor` | Lookup → `Floors.Title` | Required |
| `Zone` | Single line of text | Optional — e.g. "Quiet zone", "Window row" |
| `XCoord` | Number | Pixel X on the floor plan |
| `YCoord` | Number | Pixel Y on the floor plan |
| `Amenities` | Choice (multi-select) | Choices: `Monitor`, `Dock`, `StandingDesk`, `Window`, `Quiet` |
| `Status` | Choice (single) | Choices: `Active`, `Inactive`, `OutOfService`. Default `Active` |

**Tip for finding coordinates**: open the floor-plan image in any editor that shows pixel position on hover (Preview's "Inspector", or simply paste into PowerPoint with a ruler). For a first pass, you can also set them all to 0/0 and drag desks visually in admin mode (the admin screen lets you save new coords).

---

## List 3: `Bookings`

One row per **day** per **desk** per **person**. Multi-day bookings expand into multiple rows tied together by `RecurrenceGroupId` so a user can cancel the whole series in one go.

| Column | Type | Notes |
|---|---|---|
| `Title` | Single line of text | Auto-filled by the app: `<DeskCode> - <yyyy-mm-dd>` |
| `DeskLookup` | Lookup → `Desks.Title` | Required |
| `BookedFor` | Person or Group | Single user. Defaults to current user but admins can book on behalf |
| `BookingDate` | Date only | The day this row covers |
| `AllDay` | Yes/No | Default `Yes`. (Half-day support is out of scope for v1 but the column lets you add it later.) |
| `Status` | Choice (single) | Choices: `Reserved`, `CheckedIn`, `Cancelled`, `NoShow`. Default `Reserved` |
| `CheckInTime` | Date and Time | Stamped by the check-in button |
| `RecurrenceGroupId` | Single line of text | A GUID shared by all rows in the same multi-day / weekday-recurring booking |

### Indexed columns (important for performance)

In **List settings → Indexed columns**, index:
- `BookingDate`
- `Status`
- `DeskLookup`

Without these, queries will hit SharePoint's 2 000-row delegation limit once you have a few months of history.

### Delegation note

Power Apps `Filter()` on SharePoint **does** delegate `=`, `<>`, `>`, `>=`, `<`, `<=`, `StartsWith` on most column types, but **`in` on choice columns is not delegable**. The formulas in [screens-and-formulas.md](screens-and-formulas.md) work around this by collecting bookings for the selected date range first (a delegable date filter), then filtering the collection in memory.

---

## After creating the lists

1. Add yourself and one test user to the site's **Members** group (gives Edit permission).
2. Add at least 1 Floor, 5 Desks, and **leave Bookings empty**.
3. Note the site URL — you'll paste it into the Power Apps data connector.
