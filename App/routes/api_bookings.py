from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from App.extensions import db
from App.models import Booking, Desk
from App.services.dates import parse_date_arg
from App.services.users import get_effective_user

api_bookings_bp = Blueprint("api_bookings", __name__, url_prefix="/api/bookings")


@api_bookings_bp.get("")
def bookings_query():
    single = request.args.get("date")
    email = request.args.get("email")

    if single:
        return _bookings_for_single_date(single, email)
    return _bookings_for_range(
        request.args.get("start_date"),
        request.args.get("end_date"),
        email,
    )


def _bookings_for_single_date(raw_date, email):
    single_date, error = parse_date_arg(raw_date, default_today=False)
    if error:
        return error

    q = Booking.query.filter(Booking.date == single_date)
    if email:
        q = q.filter(Booking.user_email == email)

    rows = q.order_by(Booking.desk_id).all()

    if not email:
        return jsonify(
            {
                "date": raw_date,
                "bookings": {row.desk_id: row.to_api() for row in rows},
            }
        )

    return jsonify({"bookings": _rows_to_list(rows)})


def _bookings_for_range(start, end, email):
    q = Booking.query

    if start:
        start_date, error = parse_date_arg(start, default_today=False, field_name="start_date")
        if error:
            return error
        q = q.filter(Booking.date >= start_date)

    if end:
        end_date, error = parse_date_arg(end, default_today=False, field_name="end_date")
        if error:
            return error
        q = q.filter(Booking.date <= end_date)

    if email:
        q = q.filter(Booking.user_email == email)

    rows = q.order_by(Booking.date, Booking.desk_id).all()
    return jsonify({"bookings": _rows_to_list(rows)})


def _rows_to_list(rows):
    return [
        {"deskId": row.desk_id, "date": row.date.isoformat(), **row.to_api()}
        for row in rows
    ]


@api_bookings_bp.post("")
def create_booking():
    payload = request.get_json(silent=True) or {}
    desk_id = payload.get("deskId")
    if not desk_id:
        return jsonify({"error": "deskId is required"}), 400

    booking_date, error = parse_date_arg(payload.get("date"))
    if error:
        return error

    if db.session.get(Desk, desk_id) is None:
        return jsonify({"error": "Unknown deskId"}), 404

    user = get_effective_user()
    booking = Booking(
        desk_id=desk_id,
        date=booking_date,
        user_email=user["email"],
        user_name=user["name"],
        source=user["source"],
    )
    db.session.add(booking)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Desk already booked"}), 409

    return jsonify({"ok": True, "deskId": desk_id, "date": booking_date.isoformat()}), 201


@api_bookings_bp.delete("/<desk_id>")
def cancel_booking(desk_id):
    booking_date, error = parse_date_arg(request.args.get("date"))
    if error:
        return error

    user = get_effective_user()
    booking = Booking.query.filter_by(desk_id=desk_id, date=booking_date).first()
    if booking is None:
        return jsonify({"error": "No booking found for that desk/date"}), 404
    if booking.user_email != user["email"]:
        return jsonify({"error": "You can only cancel your own booking"}), 403

    db.session.delete(booking)
    db.session.commit()
    return jsonify({"ok": True, "deskId": desk_id, "date": booking_date.isoformat()})
