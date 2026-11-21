# GapAnalyzer API — container image for Render (or any Docker host).
# The app uses flat imports, so the build context must be `backend/`.

FROM python:3.12-slim

# libgomp1 is required by the CPU build of torch (OpenMP runtime).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    TOKENIZERS_PARALLELISM=false \
    HF_HOME=/app/.cache/huggingface

WORKDIR /app

# Install the CPU-only torch build first: ~200 MB instead of ~2.5 GB of CUDA
# wheels. `--extra-index-url` lets pip resolve torch's own dependencies from
# PyPI while preferring the higher `+cpu` local version.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu torch \
    || pip install --no-cache-dir torch

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# App code + data/skill_dictionary.json (read relative to skills.py).
COPY . .

ENV PORT=8000
EXPOSE 8000

# Render injects PORT; one worker keeps the embedder's memory footprint single.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
