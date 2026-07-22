FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
# Use CPU-only torch to save ~2.5GB of CUDA binaries (crucial for Azure deployment speed and timeouts)
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
EXPOSE 8080

# main.py handles PORT and WEBSITES_PORT parsing safely without shell syntax errors
CMD ["python", "main.py"]
