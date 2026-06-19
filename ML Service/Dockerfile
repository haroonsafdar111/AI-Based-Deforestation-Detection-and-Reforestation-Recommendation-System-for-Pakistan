FROM python:3.10-slim

# Install system dependencies for Rasterio (GDAL) and OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils \
    libgdal-dev \
    g++ \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements from the ML Service folder (context is root)
COPY ["ML Service/requirements.txt", "./"]

# Upgrade pip and install packages
RUN pip install --no-cache-dir -U pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy directories to preserve correct relative path: ../ML Model/models/
COPY ["ML Service", "/app/ML Service"]
COPY ["ML Model", "/app/ML Model"]

WORKDIR "/app/ML Service"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
