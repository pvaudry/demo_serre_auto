# Dockerfile (racine du repo)
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances Python (requirements.txt est à la racine)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn==21.2.0

# --- Copie du code (tout ce qui est dans web_interface)
# Si tu utilises web_interface/lib dans tes imports, on le copie aussi.
COPY web_interface/app.py ./app.py
COPY web_interface/templates ./templates
COPY web_interface/static ./static
COPY web_interface/lib ./lib

# Facultatif: rendre lib importable facilement
ENV PYTHONPATH=/app

ENV FLASK_ENV=production \
    PYTHONUNBUFFERED=1

EXPOSE 5000
HEALTHCHECK --interval=10s --timeout=3s --retries=10 CMD curl -fs http://localhost:5000/api/latest || exit 1

# Démarre Flask via Gunicorn
CMD ["gunicorn", "--bind=0.0.0.0:5000", "--workers=2", "--threads=4", "app:app"]
