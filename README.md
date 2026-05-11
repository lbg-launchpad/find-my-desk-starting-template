# Desk Booking — Power Apps Build Kit

A complete build guide for a tablet/desktop canvas app backed by SharePoint, with a floor-plan picker, multi-day & weekday-recurring bookings, check-in / no-show release, and an admin screen for managing desks.

## What's in this folder

| File | Purpose |
|------|---------|
| [sharepoint-lists.md](sharepoint-lists.md) | Exact SharePoint list schemas (Desks, Bookings, Floors). Build these first. |
| [screens-and-formulas.md](screens-and-formulas.md) | Every screen, control, and Power Fx formula. |
| [power-automate-flow.md](power-automate-flow.md) | The scheduled flow that releases no-shows. |

## Prerequisites

- Microsoft 365 tenant with Power Apps and SharePoint
- A SharePoint site you own (e.g. `https://contoso.sharepoint.com/sites/Workplace`)
- Power Apps Studio access at `https://make.powerapps.com`
- (Optional but recommended) A document library on the same site for floor-plan images

## Build order

1. **Create the three SharePoint lists** per [sharepoint-lists.md](sharepoint-lists.md). Seed at least 1 floor and 5–10 desks so you have something to test against. Upload your floor-plan image to a `FloorPlans` document library and copy the direct URL into the `Floors` list.
2. **Create a blank canvas app**, tablet layout, in Power Apps Studio.
3. **Add the three data sources**: in the Data pane, connect SharePoint → your site → add `Desks`, `Bookings`, `Floors`.
4. **Build screens in this order**: `App.OnStart` → `scrHome` → `scrFloorPlan` → `scrBookingForm` → `scrMyBookings` → `scrAdmin`. Formulas are in [screens-and-formulas.md](screens-and-formulas.md).
5. **Create the Power Automate flow** from [power-automate-flow.md](power-automate-flow.md). It runs on a schedule and doesn't need to be called from the app.
6. **Test**: book a desk for today, refresh the floor plan (it should turn red), check in, then create a no-show and wait for the flow to flip it.
7. **Share**: in Power Apps, share the app with your test users; in SharePoint, make sure those same users have at minimum **Contribute** on the three lists.

## Naming conventions used throughout

- Screens: `scrHome`, `scrFloorPlan`, `scrBookingForm`, `scrMyBookings`, `scrAdmin`
- Galleries: `galDesks`, `galMyBookings`, `galAdminDesks`
- Variables: `varUser`, `varSelectedStart`, `varSelectedEnd`, `varSelectedDesk`, `varCurrentFloor`, `varIsAdmin`
- Collections: `colDesks`, `colFloors`, `colBookingsInRange`, `colDeskStatus`
- Forms: `frmBooking`, `frmDeskAdmin`

Stick to these names and the formulas copy-paste cleanly.

## Licensing note

SharePoint is a **standard connector** — no premium license needed for users. If you later swap the backend to Dataverse or SQL, each user needs a Power Apps premium license.
