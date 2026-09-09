FROM python:3.11-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchvision

COPY skill_analyzer ./skill_analyzer

ENV PYTHONUNBUFFERED=1 \
    SKILL_ANALYZER_INLINE=1 \
    STORAGE_DIR=/data \
    YOLO_CONFIG_DIR=/app/.ultralytics

RUN mkdir -p /data /app/.ultralytics \
    && python -c "from ultralytics import YOLO; YOLO('yolov8n-pose.pt')"

EXPOSE 8080
CMD ["sh", "-c", "uvicorn skill_analyzer.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
