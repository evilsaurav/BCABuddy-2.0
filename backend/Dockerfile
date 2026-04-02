FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .

# Heavy ML packages alag install karo cache ke liye
RUN pip install --no-cache-dir torch==2.0.1+cpu \
    -f https://download.pytorch.org/whl/torch_stable.html

RUN pip install --no-cache-dir -r requirements.txt

# HuggingFace model pehle se download karo IMAGE build time pe
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY . .

ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]