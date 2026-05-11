# Screens & Power Fx Formulas

All formulas below are Power Fx, paste-ready. Property names are in the form `ControlName.Property` — set each one in Power Apps Studio.

The app has 5 screens. Build them in order; later screens reference variables from earlier ones.

---

## App-level

### `App.OnStart`

```powerapps
Set(varUser, User());
Set(varToday, Today());
Set(varSelectedStart, Today());
Set(varSelectedEnd, Today());

ClearCollect(colFloors, Sort(Floors, SortOrder, Ascending));
Set(varCurrentFloor, First(colFloors));

ClearCollect(
    colDesks,
    Filter(Desks, Status.Value = "Active")
);

// Admin list — replace with your own emails, or move to a SharePoint list if you
// expect this set to change. Comparison is case-insensitive because Lower() is applied.
Set(
    varIsAdmin,
    Lower(varUser.Email) in [
        "you@contoso.com"
    ]
);
```

### `App.OnError`

```powerapps
Notify("Something went wrong: " & FirstError.Message, NotificationType.Error)
```

---

## Reusable: refresh the desk-status overlay

You'll call this from `scrHome` (when the user picks new dates) and from `scrFloorPlan.OnVisible`. Define it as a named formula or just paste it where needed:

```powerapps
ClearCollect(
    colBookingsInRange,
    Filter(
        Bookings,
        BookingDate >= varSelectedStart && BookingDate <= varSelectedEnd
    )
);
ClearCollect(
    colDeskStatus,
    ForAll(
        Filter(colDesks, Floor.Value = varCurrentFloor.Title) As d,
        {
            DeskId: d.ID,
            DeskCode: d.Title,
            X: d.XCoord,
            Y: d.YCoord,
            Amenities: d.Amenities,
            IsBooked:
                CountRows(
                    Filter(
                        colBookingsInRange,
                        DeskLookup.Id = d.ID
                            && Status.Value in ["Reserved", "CheckedIn"]
                    )
                ) > 0,
            BookedBy:
                First(
                    Filter(
                        colBookingsInRange,
                        DeskLookup.Id = d.ID
                            && Status.Value in ["Reserved", "CheckedIn"]
                    )
                ).BookedFor.DisplayName
        }
    )
)
```

> `IsBooked = true` over the **entire selected range** means at least one day in the range is taken. That's the conservative behaviour you want for multi-day bookings — only show a desk as free if it's free for every day.

---

## Screen 1: `scrHome`

A landing page: name, date pickers, a "Find me a desk" button, and a card listing the user's upcoming bookings.

### Controls

| Control | Type | Key properties |
|---|---|---|
| `lblWelcome` | Label | `Text` = `"Hi " & First(Split(varUser.FullName, " ")).Value & " 👋"` |
| `dpStart` | Date picker | `DefaultDate` = `varSelectedStart` · `OnChange` = `Set(varSelectedStart, dpStart.SelectedDate); If(varSelectedEnd < varSelectedStart, Set(varSelectedEnd, varSelectedStart))` |
| `dpEnd` | Date picker | `DefaultDate` = `varSelectedEnd` · `OnChange` = `Set(varSelectedEnd, dpEnd.SelectedDate)` |
| `cmbFloor` | Combo box | `Items` = `colFloors` · `DefaultSelectedItems` = `[varCurrentFloor]` · `SelectMultiple` = `false` · `OnChange` = `Set(varCurrentFloor, cmbFloor.Selected)` |
| `btnFindDesk` | Button | `OnSelect` = (paste the desk-status refresh block above, then) `Navigate(scrFloorPlan, ScreenTransition.Cover)` |
| `galUpcoming` | Gallery (vertical) | `Items` = formula below |

`galUpcoming.Items`:

```powerapps
SortByColumns(
    Filter(
        Bookings,
        BookedFor.Email = varUser.Email
            && BookingDate >= varToday
            && Status.Value in ["Reserved", "CheckedIn"]
    ),
    "BookingDate",
    Ascending
)
```

Inside the gallery template, useful expressions on labels:
- Desk: `ThisItem.DeskLookup.Value`
- Date: `Text(ThisItem.BookingDate, "ddd, mmm d")`
- Status pill: `ThisItem.Status.Value`

---

## Screen 2: `scrFloorPlan`

The visual picker. The floor-plan image sits in the background; a gallery of desk pins is overlaid using absolute X/Y positioning.

### `scrFloorPlan.OnVisible`

Paste the desk-status refresh block from above.

### Controls

| Control | Type | Key properties |
|---|---|---|
| `imgFloor` | Image | `Image` = `varCurrentFloor.FloorPlanUrl` · `X` = `40` · `Y` = `100` · `Width` = `1000` · `Height` = `600` · `ImagePosition` = `ImagePosition.Fit` |
| `galDesks` | Gallery (blank, vertical, **WrapCount** = 1) | See below |
| `lblLegend` | Label | `Text` = `"🟢 Available    🔴 Booked"` |

#### `galDesks` properties

```powerapps
// Items
colDeskStatus

// X (per-item)
imgFloor.X + (ThisItem.X / varCurrentFloor.ImageWidth) * imgFloor.Width - 14

// Y (per-item)
imgFloor.Y + (ThisItem.Y / varCurrentFloor.ImageHeight) * imgFloor.Height - 14

// TemplateSize  (height of each card)
28

// Width
28
```

> The `-14` offsets centre the 28×28 pin on the coordinate. Adjust if you change the pin size.

Inside the gallery, place a **circular icon** (`icoPin`) and set:

```powerapps
// icoPin.Fill
If(ThisItem.IsBooked, ColorValue("#E74C3C"), ColorValue("#2ECC71"))

// icoPin.DisplayMode
If(ThisItem.IsBooked, DisplayMode.View, DisplayMode.Edit)

// icoPin.OnSelect
Set(
    varSelectedDesk,
    LookUp(colDesks, ID = ThisItem.DeskId)
);
Navigate(scrBookingForm, ScreenTransition.UnCover)

// icoPin.TooltipText
ThisItem.DeskCode & If(ThisItem.IsBooked, " — " & ThisItem.BookedBy, " — available")
```

---

## Screen 3: `scrBookingForm`

Confirms the chosen desk, lets the user adjust date range, optionally pick recurring weekdays, then writes the booking(s).

### Controls

| Control | Type | Key properties |
|---|---|---|
| `lblDeskTitle` | Label | `Text` = `"Booking desk " & varSelectedDesk.Title` |
| `lblAmenities` | Label | `Text` = `Concat(varSelectedDesk.Amenities, Value, " · ")` |
| `dpStart2` | Date picker | `DefaultDate` = `varSelectedStart` |
| `dpEnd2` | Date picker | `DefaultDate` = `varSelectedEnd` |
| `tglRecurring` | Toggle | Label "Repeat weekly" — default `false` |
| `cmbWeekdays` | Combo box | `Items` = `[{Name:"Mon",N:2},{Name:"Tue",N:3},{Name:"Wed",N:4},{Name:"Thu",N:5},{Name:"Fri",N:6}]` · `SelectMultiple` = `true` · `Visible` = `tglRecurring.Value` |
| `btnCancel` | Button | `OnSelect` = `Navigate(scrFloorPlan)` |
| `btnConfirm` | Button | See formula below |

### `btnConfirm.OnSelect`

```powerapps
// 1. Build the list of dates this booking will cover.
ClearCollect(
    colTargetDates,
    Filter(
        AddColumns(
            Sequence(DateDiff(dpStart2.SelectedDate, dpEnd2.SelectedDate) + 1, 0),
            "TheDate", DateAdd(dpStart2.SelectedDate, Value, Days)
        ),
        !tglRecurring.Value || (Weekday(TheDate) in cmbWeekdays.SelectedItems.N)
    )
);

// 2. Conflict guard: any of those dates already taken for this desk?
If(
    CountRows(
        Filter(
            Bookings,
            DeskLookup.Id = varSelectedDesk.ID
                && BookingDate >= dpStart2.SelectedDate
                && BookingDate <= dpEnd2.SelectedDate
                && Status.Value in ["Reserved", "CheckedIn"]
        )
    ) > 0
        && CountRows(
            Filter(
                Filter(
                    Bookings,
                    DeskLookup.Id = varSelectedDesk.ID
                        && BookingDate >= dpStart2.SelectedDate
                        && BookingDate <= dpEnd2.SelectedDate
                        && Status.Value in ["Reserved", "CheckedIn"]
                ) As existing,
                existing.BookingDate in colTargetDates.TheDate
            )
        ) > 0,
    Notify("Sorry — one or more of those days is no longer available.", NotificationType.Error),

    // 3. All clear: write one row per target date.
    Set(varRecurrenceId, GUID());
    ForAll(
        colTargetDates As day,
        Patch(
            Bookings,
            Defaults(Bookings),
            {
                Title: varSelectedDesk.Title & " - " & Text(day.TheDate, "yyyy-mm-dd"),
                DeskLookup: {
                    Id: varSelectedDesk.ID,
                    Value: varSelectedDesk.Title
                },
                BookedFor: {
                    '@odata.type': "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedUser",
                    Claims: "i:0#.f|membership|" & varUser.Email,
                    DisplayName: varUser.FullName,
                    Email: varUser.Email,
                    Department: "",
                    JobTitle: "",
                    Picture: ""
                },
                BookingDate: day.TheDate,
                AllDay: true,
                Status: { Value: "Reserved" },
                RecurrenceGroupId: varRecurrenceId
            }
        )
    );
    Notify(
        "Booked " & CountRows(colTargetDates) & " day(s) on desk " & varSelectedDesk.Title,
        NotificationType.Success
    );
    Navigate(scrMyBookings, ScreenTransition.Cover)
)
```

> **Why the double `Filter` in the conflict guard:** SharePoint can't delegate `in` on a Power Apps collection, so the outer filter restricts to the *date range* (delegable) and the inner one narrows to the exact target dates (in-memory). Without this, recurring-weekday bookings would miss conflicts on days outside the chosen weekdays.

---

## Screen 4: `scrMyBookings`

### Controls

| Control | Type | Key properties |
|---|---|---|
| `galMyBookings` | Gallery | `Items` formula below |

`galMyBookings.Items`:

```powerapps
SortByColumns(
    Filter(
        Bookings,
        BookedFor.Email = varUser.Email
            && BookingDate >= DateAdd(varToday, -30, Days)
    ),
    "BookingDate",
    Descending
)
```

Inside each row, add three buttons with these properties:

**`btnCheckIn`**
```powerapps
// Visible
ThisItem.BookingDate = varToday && ThisItem.Status.Value = "Reserved"

// OnSelect
Patch(
    Bookings,
    ThisItem,
    { Status: { Value: "CheckedIn" }, CheckInTime: Now() }
);
Notify("Checked in. Have a good day!", NotificationType.Success)
```

**`btnCancelDay`**
```powerapps
// Visible
ThisItem.BookingDate >= varToday && ThisItem.Status.Value in ["Reserved", "CheckedIn"]

// OnSelect
Patch(Bookings, ThisItem, { Status: { Value: "Cancelled" } });
Notify("Cancelled.", NotificationType.Information)
```

**`btnCancelSeries`** (only meaningful if this booking has a group)
```powerapps
// Visible
!IsBlank(ThisItem.RecurrenceGroupId) && ThisItem.BookingDate >= varToday

// OnSelect
ForAll(
    Filter(
        Bookings,
        RecurrenceGroupId = ThisItem.RecurrenceGroupId
            && BookingDate >= varToday
            && Status.Value in ["Reserved", "CheckedIn"]
    ) As b,
    Patch(Bookings, b, { Status: { Value: "Cancelled" } })
);
Notify("Cancelled the whole series.", NotificationType.Information)
```

---

## Screen 5: `scrAdmin`

Visible only when `varIsAdmin = true`. Lets admins add / edit / disable desks and tweak their X/Y coordinates.

### Show / hide in navigation

On whatever nav icon links here, set:
```powerapps
// Visible
varIsAdmin
```

### Controls

| Control | Type | Key properties |
|---|---|---|
| `galAdminDesks` | Gallery | `Items` = `SortByColumns(Desks, "Title", Ascending)` |
| `btnAdminNew` | Button | `OnSelect` = `NewForm(frmDeskAdmin); Set(varEditingDesk, Defaults(Desks))` |
| `frmDeskAdmin` | Edit form | `DataSource` = `Desks` · `Item` = `varEditingDesk` |
| `btnAdminSave` | Button | `OnSelect` = `SubmitForm(frmDeskAdmin)` |

On `galAdminDesks` row select:
```powerapps
Set(varEditingDesk, ThisItem);
EditForm(frmDeskAdmin)
```

On `frmDeskAdmin.OnSuccess`:
```powerapps
ClearCollect(colDesks, Filter(Desks, Status.Value = "Active"));
Notify("Saved.", NotificationType.Success)
```

### "Disable desk" shortcut (soft-delete)

A button inside `galAdminDesks` rows:
```powerapps
// Text
If(ThisItem.Status.Value = "Active", "Disable", "Re-enable")

// OnSelect
Patch(
    Desks,
    ThisItem,
    { Status: { Value: If(ThisItem.Status.Value = "Active", "Inactive", "Active") } }
);
ClearCollect(colDesks, Filter(Desks, Status.Value = "Active"))
```

We don't hard-delete desks because historical bookings still reference them.

---

## Theme (optional but cheap polish)

Set these on `App.OnStart` and reference them everywhere:

```powerapps
Set(varTheme, {
    Bg:        ColorValue("#F4F6F8"),
    Card:      ColorValue("#FFFFFF"),
    Primary:   ColorValue("#0F62FE"),
    PrimaryFg: ColorValue("#FFFFFF"),
    Free:      ColorValue("#2ECC71"),
    Busy:      ColorValue("#E74C3C"),
    Text:      ColorValue("#1F2933"),
    Muted:     ColorValue("#697586")
})
```

Then a button's `Fill` becomes `varTheme.Primary`, etc. Makes restyling later a one-line change.
