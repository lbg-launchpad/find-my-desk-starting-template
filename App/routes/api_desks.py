from flask import Blueprint, jsonify, request

from App.extensions import db
from App.models import AppUser, Booking, Desk
from App.services.dates import parse_date_arg

api_desks_bp = Blueprint("api_desks", __name__, url_prefix="/api")
WEEKDAY_CODES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _busyness_band(percent):
    if percent >= 75:
        return "High"
    if percent >= 45:
        return "Moderate"
    return "Light"


@api_desks_bp.get("/desks")
def desks():
    booking_date, error = parse_date_arg(request.args.get("date"))
    if error:
        return error

    rows = (
        db.session.query(Desk, Booking)
        .outerjoin(
            Booking,
            (Booking.desk_id == Desk.id) & (Booking.date == booking_date),
        )
        .order_by(Desk.id)
        .all()
    )

    desk_payload = [
        {
            **desk.to_api(),
            "available": booking is None,
            "bookedBy": booking.to_api() if booking else None,
        }
        for desk, booking in rows
    ]

    return jsonify({"date": booking_date.isoformat(), "desks": desk_payload})


@api_desks_bp.get("/office-busyness")
def office_busyness():
    booking_date, error = parse_date_arg(request.args.get("date"))
    if error:
        return error

    total_desks = Desk.query.count()
    booked_count = Booking.query.filter(Booking.date == booking_date).count()

    target_day = WEEKDAY_CODES[booking_date.weekday()]
    users = AppUser.query.with_entities(AppUser.email, AppUser.anchor_days).all()
    anchor_users = {
        str(user_email).strip().lower()
        for user_email, anchor_days in users
        if user_email and isinstance(anchor_days, list) and target_day in {
            str(day).strip().lower() for day in anchor_days if str(day).strip()
        }
    }

    anchor_matched_users = len(anchor_users)
    predicted_occupancy_count = min(total_desks, max(booked_count, anchor_matched_users))
    predicted_occupancy_pct = round((predicted_occupancy_count / total_desks) * 100) if total_desks else 0

    return jsonify(
        {
            "date": booking_date.isoformat(),
            "predictedOccupancyCount": predicted_occupancy_count,
            "predictedOccupancyPct": predicted_occupancy_pct,
            "bookedCount": booked_count,
            "anchorMatchedUsers": anchor_matched_users,
            "totalDesks": total_desks,
            "band": _busyness_band(predicted_occupancy_pct),
            "basis": "Based on users with matching anchor days in user settings.",
        }
    )
