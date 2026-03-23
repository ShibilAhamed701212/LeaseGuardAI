FROM python:3.10-slim

# Install only what PaddleOCR actually needs - avoid libgl1-mesa-dri (pulls 26MB libllvm19)
RUN apt-get update && apt-get install -y \
    libglib2.0-0t64 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    poppler-utils \
    curl \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./
RUN useradd -m appuser && chown -R appuser /app
USER appuser
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "app:app"]
