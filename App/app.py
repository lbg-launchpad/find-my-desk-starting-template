import os
import sys
from pathlib import Path

from sqlalchemy import inspect, text

# Allow running this file directly (`python App/app.py`) as well as
# `python -m App.app`. When invoked as a script, the project root is not on
# sys.path, so `from App.X` would fail — add it explicitly.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from flask import Flask

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ModuleNotFoundError:
    pass

from App.config import build_config
from App.extensions import db
from App.routes.api_bookings import api_bookings_bp
from App.routes.api_desks import api_desks_bp
from App.routes.api_users import api_users_bp
from App.routes.auth import auth_bp
from App.routes.pages import pages_bp


def create_app():
    app = Flask(__name__)
    app.config.update(build_config())
    app.secret_key = app.config["SECRET_KEY"]

    db.init_app(app)
    with app.app_context():
        db.create_all()
        _ensure_users_schema()

    _init_azure_auth(app)

    for bp in (pages_bp, auth_bp, api_users_bp, api_desks_bp, api_bookings_bp):
        app.register_blueprint(bp)

    return app


def _ensure_users_schema():
    users_engine = db.engines.get("users")
    if users_engine is None:
        return

    columns = {col["name"] for col in inspect(users_engine).get_columns("app_users")}
    if "anchor_days" in columns:
        return

    # Backward-compatible schema patch for existing databases.
    with users_engine.begin() as conn:
        conn.execute(text("ALTER TABLE app_users ADD COLUMN anchor_days JSON"))


def _init_azure_auth(app):
    try:
        from App.Auth.Auth import AzureOAuthHelper
        app.extensions["azure_auth"] = AzureOAuthHelper()
    except (ImportError, ValueError) as exc:
        app.logger.warning("Azure OAuth disabled: %s", exc)
        app.extensions["azure_auth"] = None


app = create_app()


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5001")),
        debug=os.getenv("FLASK_DEBUG") == "1",
    )
