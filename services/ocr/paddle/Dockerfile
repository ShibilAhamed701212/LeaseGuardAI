FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./

RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8885

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8885/health || exit 1

CMD ["python", "app.py"]