# ForestVision ML Service

FastAPI-based ML inference service that keeps models loaded in memory for fast predictions.

## Features

- **Persistent Models**: Models are loaded once on startup, eliminating startup overhead
- **REST API**: Clean REST endpoints for Random Forest and CNN inference
- **Fallback Support**: Falls back to spawn method if service is unavailable
- **Health Checks**: Built-in health monitoring

## Setup

1. **Install Dependencies**
   ```bash
   cd ML Service
   pip install -r requirements.txt
   ```

2. **Start Service**
   ```bash
   # Option 1: Direct start
   python main.py

   # Option 2: Windows batch file
   start_ml_service.bat
   ```

3. **Verify Service**
   ```bash
   curl http://localhost:8000/health
   ```

## API Endpoints

### Health Check
```http
GET /health
```

### Random Forest Prediction
```http
POST /predict/rf
Content-Type: application/json

{
  "data": {
    "features": {
      "Air_Temp": 25.0,
      "Rainfall": 100.0,
      "Soil_Moisture": 40.0,
      "NDVI": 0.5,
      "EVI": 0.3,
      "LST": 25.0,
      "Elevation": 500.0,
      "Soil_Type": 1,
      "Humidity": 50.0
    }
  },
  "thresholds": {
    "high": 0.7,
    "medium": 0.4
  }
}
```

### CNN Prediction
```http
POST /predict/cnn
Content-Type: application/json

{
  "data": {
    "image_path": "/path/to/satellite/image.jpg"
  }
}
```

## Model Files

The service expects model files in the following locations:
- `../ML Model/models/random_forest_model.pkl` - Random Forest model
- `../ML Model/models/cnn_model.h5` - CNN model

## Integration

The Node.js backend automatically uses this service when available. If the service is down, it falls back to the original spawn-based method.

## Development

To reload models without restarting:
```http
POST /reload-models
```