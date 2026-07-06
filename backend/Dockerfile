# FastAPI backend image.
FROM python:3.11-slim

WORKDIR /app

# System deps for psycopg2.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# pipelines/ live one level up in the repo; when building from ./backend only
# the API is included. Ingestion jobs run separately (see OPERATIONS_MANUAL).
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
