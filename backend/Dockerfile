FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Azure may set WEBSITES_PORT env var - default to 8000 if not set
# Also respect PORT env var for local testing
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-${WEBSITES_PORT:-8000}}"]
