FROM python:3.11-slim

WORKDIR /app

# Install git (required for cloning repositories during indexing)
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml /app/pyproject.toml
COPY app /app/app

# Install CPU-only torch first to prevent pip from pulling NVIDIA CUDA libraries (~2 GB)
RUN pip install --no-cache-dir --timeout 300 --retries 10 torch --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir --timeout 300 --retries 10 .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]