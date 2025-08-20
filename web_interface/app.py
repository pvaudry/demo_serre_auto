from datetime import datetime, timedelta, timezone
import random
import threading

from flask import Flask, render_template, jsonify, request, abort
from flask_sqlalchemy import SQLAlchemy
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///serre.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# =========================
# Modèles
# =========================
class Reading(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # timestamp aware (UTC)
    timestamp = db.Column(db.DateTime, index=True, default=lambda: datetime.now(timezone.utc))
    temperature = db.Column(db.Float)
    humidity = db.Column(db.Float)
    luminosity = db.Column(db.Float)  # lux
    energy_consumed = db.Column(db.Float)  # Wh cumulés
    energy_produced = db.Column(db.Float)  # Wh cumulés
    water_consumed = db.Column(db.Float)   # L cumulés

class Config(db.Model):
    id = db.Column(db.Integer, primary_key=True, default=1)
    set_temp = db.Column(db.Float, default=22.0)
    set_humi = db.Column(db.Float, default=55.0)
    set_lux = db.Column(db.Float, default=15000.0)
    auto_mode = db.Column(db.Boolean, default=True)
    # états actionneurs
    heater_on = db.Column(db.Boolean, default=False)
    fan_on = db.Column(db.Boolean, default=False)
    pump_on = db.Column(db.Boolean, default=False)
    light_on = db.Column(db.Boolean, default=False)

# =========================
# Initialisation
# =========================
with app.app_context():
    db.create_all()
    if db.session.get(Config, 1) is None:  # SQLAlchemy 2.0
        db.session.add(Config(id=1))
        base = Reading(
            temperature=22.0,
            humidity=55.0,
            luminosity=12000.0,
            energy_consumed=0.0,
            energy_produced=0.0,
            water_consumed=0.0,
        )
        db.session.add(base)
        db.session.commit()

lock = threading.Lock()

@app.context_processor
def inject_now():
    # Rend disponible {{ current_year }} dans tous les templates
    return {"current_year": datetime.now(timezone.utc).year}

# =========================
# Simulateur + contrôle auto
# =========================
def simulate_and_control():
    """Simule l’arrivée d’une mesure et applique un contrôle simple en mode auto."""
    with app.app_context():
        cfg = db.session.get(Config, 1)  # SQLAlchemy 2.0
        last = Reading.query.order_by(Reading.timestamp.desc()).first()

        # --- bruit + dynamique simple
        dt_min = 1  # pas d'1 minute simulée à chaque tick
        ambient = 18.0  # température extérieure approx
        temp = last.temperature + (ambient - last.temperature) * 0.02 + random.uniform(-0.15, 0.15)
        humi = max(20.0, min(95.0, last.humidity + random.uniform(-1.2, 1.2)))
        lux = max(0.0, last.luminosity + random.uniform(-700, 700))

        # Énergie / eau cumulées
        e_conso = last.energy_consumed
        e_prod = last.energy_produced
        water = last.water_consumed

        # --- Contrôle auto (bang-bang)
        heater_on = cfg.heater_on
        fan_on = cfg.fan_on
        pump_on = cfg.pump_on
        light_on = cfg.light_on

        if cfg.auto_mode:
            # Chauffage
            heater_on = temp < (cfg.set_temp - 0.5)
            # Ventilation (si trop humide ou trop chaud)
            fan_on = (humi > (cfg.set_humi + 5)) or (temp > (cfg.set_temp + 0.8))
            # Irrigation simple : si humidité < consigne - 5
            pump_on = humi < (cfg.set_humi - 5)
            # Lumière si luminosité < consigne (jour simulé 06:00–20:00)
            hour = datetime.now(timezone.utc).hour
            is_day = 6 <= hour <= 20
            light_on = is_day and (lux < cfg.set_lux)

        # Effets actionneurs
        if heater_on:
            temp += 0.4
            e_conso += 30 * dt_min  # 30 W-min ~ 0.5 W·h par tick
        if fan_on:
            temp -= 0.2
            humi -= 0.8
            e_conso += 15 * dt_min
        if pump_on:
            humi += 2.5
            water += 0.2  # L par tick
            e_conso += 10 * dt_min
        if light_on:
            lux += 6000
            e_conso += 50 * dt_min

        # Production PV (jour)
        hour = datetime.now(timezone.utc).hour
        if 8 <= hour <= 18:
            pv = max(0, 100 - abs(13 - hour) * 15)  # courbe en cloche grossière (W)
            e_prod += pv * dt_min

        # Clamp et création mesure
        temp = round(temp, 2)
        humi = round(max(20.0, min(95.0, humi)), 2)
        lux = round(max(0.0, lux), 0)
        e_conso = round(e_conso, 2)
        e_prod = round(e_prod, 2)
        water = round(water, 3)

        with lock:
            cfg.heater_on = heater_on
            cfg.fan_on = fan_on
            cfg.pump_on = pump_on
            cfg.light_on = light_on
            db.session.add(
                Reading(
                    # timestamp par défaut déjà UTC aware via default=...
                    temperature=temp,
                    humidity=humi,
                    luminosity=lux,
                    energy_consumed=e_conso,
                    energy_produced=e_prod,
                    water_consumed=water,
                )
            )
            db.session.commit()

# Planificateur : un tick toutes les 3 secondes (≈ 1 minute simulée)
scheduler = BackgroundScheduler(daemon=True)
scheduler.add_job(simulate_and_control, "interval", seconds=3, id="sim")
scheduler.start()

# =========================
# Vues
# =========================
@app.route("/")
def dashboard():
    return render_template("dashboard.html")

# =========================
# API
# =========================
@app.route("/api/latest")
def api_latest():
    last = Reading.query.order_by(Reading.timestamp.desc()).first()
    cfg = db.session.get(Config, 1)
    return jsonify({
        "timestamp": last.timestamp.isoformat(),
        "temperature": last.temperature,
        "humidity": last.humidity,
        "luminosity": last.luminosity,
        "energy_consumed": last.energy_consumed,
        "energy_produced": last.energy_produced,
        "water_consumed": last.water_consumed,
        "actuators": {
            "heater": cfg.heater_on,
            "fan": cfg.fan_on,
            "pump": cfg.pump_on,
            "light": cfg.light_on,
        }
    })

@app.route("/api/history")
def api_history():
    # par défaut : dernières 24h (simulées). On limite à 500 points.
    hours = float(request.args.get("hours", 24))
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    q = (Reading.query
         .filter(Reading.timestamp >= since)
         .order_by(Reading.timestamp.asc()))
    data = [{
        "t": r.timestamp.isoformat(),
        "temperature": r.temperature,
        "humidity": r.humidity,
        "luminosity": r.luminosity,
        "energy_consumed": r.energy_consumed,
        "energy_produced": r.energy_produced,
        "water_consumed": r.water_consumed,
    } for r in q.limit(500).all()]
    return jsonify(data)

@app.route("/api/config", methods=["GET"])
def api_get_config():
    cfg = db.session.get(Config, 1)
    return jsonify({
        "setpoints": {"temperature": cfg.set_temp, "humidity": cfg.set_humi, "luminosity": cfg.set_lux},
        "auto_mode": cfg.auto_mode
    })

@app.route("/api/setpoints", methods=["POST"])
def api_setpoints():
    payload = request.get_json(silent=True) or {}
    try:
        t = float(payload.get("temperature"))
        h = float(payload.get("humidity"))
        l = float(payload.get("luminosity"))
    except (TypeError, ValueError):
        abort(400, "Paramètres invalides")
    with lock:
        cfg = db.session.get(Config, 1)
        cfg.set_temp, cfg.set_humi, cfg.set_lux = t, h, l
        db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/mode", methods=["POST"])
def api_mode():
    payload = request.get_json(silent=True) or {}
    auto = payload.get("auto")
    if not isinstance(auto, bool):
        abort(400, "Champ 'auto' requis (booléen).")
    with lock:
        cfg = db.session.get(Config, 1)
        cfg.auto_mode = auto
        db.session.commit()
    return jsonify({"ok": True, "auto_mode": auto})

@app.route("/api/actuators", methods=["POST"])
def api_actuators():
    payload = request.get_json(silent=True) or {}
    keys = {"heater_on", "fan_on", "pump_on", "light_on"}
    if not set(payload.keys()).issubset(keys):
        abort(400, "Clés autorisées: heater_on, fan_on, pump_on, light_on.")
    with lock:
        cfg = db.session.get(Config, 1)
        if not cfg.auto_mode:
            for k, v in payload.items():
                if isinstance(v, bool):
                    setattr(cfg, k, v)
        else:
            abort(400, "Passer en mode manuel pour commander les actionneurs.")
        db.session.commit()
    return jsonify({"ok": True})

# Entrée
if __name__ == "__main__":
    app.run(debug=True)
