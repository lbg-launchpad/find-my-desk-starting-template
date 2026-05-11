import os
import secrets
from datetime import date
from pathlib import Path
from threading import Lock

import json

from flask import Flask, jsonify, redirect, render_template, request, send_from_directory, session

try:
    from App.Auth.Auth import AzureOAuthHelper
except ModuleNotFoundError:
    from Auth.Auth import AzureOAuthHelper


app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", secrets.token_urlsafe(32))

try:
    auth = AzureOAuthHelper()
except Exception:
    auth = None


DATA_ROOT = Path(__file__).resolve().parent.parent / "data"
USERS_PATH = DATA_ROOT / "users.json"
DESKS_PATH = DATA_ROOT / "desks.json"

BOOKINGS_LOCK = Lock()
BOOKINGS_BY_DATE = {}


def load_users():
    if not USERS_PATH.exists():
        return []

    with USERS_PATH.open("r", encoding="utf-8") as users_file:
        return json.load(users_file)


def _normalize_desk(raw_desk):
    location = raw_desk.get("location", {})
    return {
        "id": raw_desk.get("deskNumber"),
        "floor": raw_desk.get("floor"),
        "zone": location.get("zone", "Unknown"),
        "x": location.get("xPercent", 0),
        "y": location.get("yPercent", 0),
        "features": raw_desk.get("attributes", []),
        "nearWindow": raw_desk.get("nearWindow", False),
        "location": location,
    }


def load_desks():
    if not DESKS_PATH.exists():
        return []

    with DESKS_PATH.open("r", encoding="utf-8") as desks_file:
        raw_desks = json.load(desks_file)
        return [_normalize_desk(desk) for desk in raw_desks]


USERS = load_users()
DESKS = load_desks()


def get_effective_user():
    signed_in_user = session.get("user")
    if signed_in_user:
        return {
            "name": signed_in_user.get("name") or "Signed-in user",
            "email": signed_in_user.get("email") or "",
            "source": "oauth",
        }

    if USERS:
        first_user = USERS[0]
        return {
            "name": first_user.get("fullName", "Demo User"),
            "email": first_user.get("email", "demo@thebank.com"),
            "source": "demo",
        }

    return {"name": "Demo User", "email": "demo@thebank.com", "source": "demo"}


def today_iso():
    return date.today().isoformat()


def get_bookings_for_date(day):
    with BOOKINGS_LOCK:
        bookings = BOOKINGS_BY_DATE.get(day, {})
        return {desk_id: dict(booking) for desk_id, booking in bookings.items()}


@app.get("/")
def home():
    return render_template("index.html", initial_view="bookings")


@app.get("/settings")
def settings_page():
    return render_template("index.html", initial_view="settings")


@app.get("/auth/login")
def auth_login():
    if auth is None:
        return "Azure OAuth is not configured. Set AZURE_* environment variables.", 503

    state = secrets.token_urlsafe(32)
    session["oauth_state"] = state
    return redirect(auth.create_auth_url(state=state))


@app.get("/auth/callback")
def auth_callback():
    if auth is None:
        return "Azure OAuth is not configured. Set AZURE_* environment variables.", 503

    expected_state = session.get("oauth_state")
    incoming_state = request.args.get("state")
    if not expected_state or expected_state != incoming_state:
        return "Invalid OAuth state", 400

    code = request.args.get("code")
    if not code:
        return "Missing authorization code", 400

    token_result = auth.exchange_code_for_token(code)
    session["user"] = auth.get_user_from_token(token_result)
    session.pop("oauth_state", None)
    return redirect("/")


@app.get("/auth/logout")
def auth_logout():
    if auth is None:
        session.clear()
        return redirect("/")

    session.clear()
    post_logout_redirect = os.getenv("POST_LOGOUT_REDIRECT_URI", request.url_root.rstrip("/"))
    return redirect(auth.build_logout_url(post_logout_redirect))


@app.get("/api/me")
def me():
    active_user = get_effective_user()
    is_authenticated = active_user["source"] == "oauth"
    return jsonify({"authenticated": is_authenticated, "user": active_user})


@app.get("/api/users")
def users_list():
    return jsonify(
        [
            {
                "id": user.get("id"),
                "fullName": user.get("fullName"),
                "email": user.get("email"),
                "team": user.get("team"),
                "location": user.get("location"),
                "preferredNeighbourhood": user.get("preferredNeighbourhood"),
                "deskPreferences": user.get("deskPreferences", []),
            }
            for user in USERS
        ]
    )


@app.get("/api/desks")
def desks():
    booking_date = request.args.get("date", today_iso())
    bookings = get_bookings_for_date(booking_date)
    desk_payload = []

    for desk in DESKS:
        desk_booking = bookings.get(desk["id"])
        desk_payload.append(
            {
                **desk,
                "available": desk_booking is None,
                "bookedBy": desk_booking,
            }
        )

    return jsonify({"date": booking_date, "desks": desk_payload})


@app.get("/api/bookings")
def bookings_for_date():
    booking_date = request.args.get("date", today_iso())
    return jsonify({"date": booking_date, "bookings": get_bookings_for_date(booking_date)})


@app.post("/api/bookings")
def create_booking():
    payload = request.get_json(silent=True) or {}
    desk_id = payload.get("deskId")
    booking_date = payload.get("date", today_iso())
    user = get_effective_user()

    if not desk_id:
        return jsonify({"error": "deskId is required"}), 400

    if desk_id not in {desk["id"] for desk in DESKS}:
        return jsonify({"error": "Unknown deskId"}), 404

    with BOOKINGS_LOCK:
        day_bookings = BOOKINGS_BY_DATE.setdefault(booking_date, {})
        if desk_id in day_bookings:
            return jsonify({"error": "Desk already booked"}), 409

        day_bookings[desk_id] = {
            "name": user["name"],
            "email": user["email"],
            "source": user["source"],
        }

    return jsonify({"ok": True, "deskId": desk_id, "date": booking_date}), 201


@app.delete("/api/bookings/<desk_id>")
def cancel_booking(desk_id):
    booking_date = request.args.get("date", today_iso())

    with BOOKINGS_LOCK:
        day_bookings = BOOKINGS_BY_DATE.get(booking_date, {})
        if desk_id not in day_bookings:
            return jsonify({"error": "No booking found for that desk/date"}), 404

        del day_bookings[desk_id]

    return jsonify({"ok": True, "deskId": desk_id, "date": booking_date})


@app.get("/floorplans/<path:filename>")
def floorplan_image(filename):
    floorplan_dir = Path(__file__).resolve().parent.parent / "floorplans"
    return send_from_directory(floorplan_dir, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)