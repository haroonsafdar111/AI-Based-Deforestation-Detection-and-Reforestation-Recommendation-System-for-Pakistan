"""
FastAPI ML Inference Service
Keeps ML models loaded in memory for fast inference
"""

from fastapi import FastAPI, HTTPException, Response, status
from pydantic import BaseModel
import joblib
import tensorflow as tf
import os
import pandas as pd
from typing import Dict, Any, Optional
import logging
import numpy as np
import time
from threading import Lock
import subprocess
import sys
import shutil
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI(title="ForestVision ML Service", version="1.0.0")

# Global model variables
rf_model = None
tree_model = None
label_encoder = None
cnn_model = None
models_loaded = False
retrain_lock = Lock()

@app.on_event("startup")
async def startup_event():
    logger.info("[ML STARTUP] Beginning model preloading sequence...")
    global models_loaded
    import sys

    start_total = time.time()
    try:
        # 1. Preload Risk Model
        logger.info("[ML STARTUP] Preloading Risk Model...")
        start_rf = time.time()
        get_risk_model()
        logger.info(f"[ML PERF] Risk Model preload completed in {time.time() - start_rf:.4f} seconds.")

        # 2. Preload Tree Model
        logger.info("[ML STARTUP] Preloading Tree Model...")
        start_tree = time.time()
        get_tree_model()
        logger.info(f"[ML PERF] Tree Model preload completed in {time.time() - start_tree:.4f} seconds.")

        # 3. Preload Label Encoder
        logger.info("[ML STARTUP] Preloading Tree Label Encoder...")
        start_le = time.time()
        get_label_encoder()
        logger.info(f"[ML PERF] Tree Label Encoder preload completed in {time.time() - start_le:.4f} seconds.")

        # 4. Preload CNN Model
        logger.info("[ML STARTUP] Preloading CNN Model...")
        start_cnn = time.time()
        get_cnn_model()
        logger.info(f"[ML PERF] CNN Model preload completed in {time.time() - start_cnn:.4f} seconds.")

        # Set flag
        models_loaded = True
        logger.info(f"[ML STARTUP] Startup initialization successful! All models preloaded in {time.time() - start_total:.4f} seconds.")
    except Exception as e:
        logger.critical(f"[ML STARTUP CRITICAL] Failed to preload models during startup: {e}. Exiting process immediately.")
        sys.exit(1)


# Request/Response models
class InferenceRequest(BaseModel):
    data: Dict[str, Any]
    thresholds: Optional[Dict[str, float]] = None

class InferenceResponse(BaseModel):
    risk_score: float
    risk_level: str
    confidence: float
    recommended_tree: Optional[str] = None
    recommendation_confidence: Optional[float] = None
    trends: Optional[list] = None
    reforestation_recommendations: Optional[list] = None
    feature_importance: Optional[Dict[str, float]] = None

class CNNInferenceResponse(BaseModel):
    forest_loss_probability: float
    confidence: float

def get_risk_model():
    global rf_model

    if rf_model is None:
        logger.info("[ML CACHE] Cache MISS: Risk model is not loaded. Starting load...")
        path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "ML Model",
            "models",
            "random_forest_risk.pkl"
        )

        start_exists = time.time()
        exists = os.path.exists(path)
        logger.info(f"[ML PERF] Risk model file check completed in {time.time() - start_exists:.4f} seconds (exists: {exists})")

        if not exists:
            logger.error(f"Risk model file not found at: {path}")
            raise FileNotFoundError(f"Risk model not found at {path}")

        logger.info("Starting joblib.load() for Risk model...")
        start_load = time.time()
        rf_model = joblib.load(path)
        logger.info(f"[ML PERF] joblib.load() for Risk model completed in {time.time() - start_load:.4f} seconds")
        logger.info("Risk model loaded and cached in memory.")
    else:
        logger.info("[ML CACHE] Cache HIT: Risk model retrieved from global memory.")

    return rf_model

def get_tree_model():
    global tree_model

    if tree_model is None:
        logger.info("[ML CACHE] Cache MISS: Tree model is not loaded. Starting load...")
        path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "ML Model",
            "models",
            "random_forest_tree.pkl"
        )

        start_exists = time.time()
        exists = os.path.exists(path)
        logger.info(f"[ML PERF] Tree model file check completed in {time.time() - start_exists:.4f} seconds (exists: {exists})")

        if not exists:
            logger.error(f"Tree model file not found at: {path}")
            raise FileNotFoundError(f"Tree model not found at {path}")

        logger.info("Starting joblib.load() for Tree model...")
        start_load = time.time()
        tree_model = joblib.load(path)
        logger.info(f"[ML PERF] joblib.load() for Tree model completed in {time.time() - start_load:.4f} seconds")
        logger.info("Tree model loaded and cached in memory.")
    else:
        logger.info("[ML CACHE] Cache HIT: Tree model retrieved from global memory.")

    return tree_model

def get_label_encoder():
    global label_encoder

    if label_encoder is None:
        logger.info("[ML CACHE] Cache MISS: Label encoder is not loaded. Starting load...")
        path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "ML Model",
            "models",
            "tree_label_encoder.pkl"
        )

        start_exists = time.time()
        exists = os.path.exists(path)
        logger.info(f"[ML PERF] Label encoder file check completed in {time.time() - start_exists:.4f} seconds (exists: {exists})")

        if not exists:
            logger.error(f"Label encoder file not found at: {path}")
            raise FileNotFoundError(f"Label encoder not found at {path}")

        logger.info("Starting joblib.load() for Label encoder...")
        start_load = time.time()
        label_encoder = joblib.load(path)
        logger.info(f"[ML PERF] joblib.load() for Label encoder completed in {time.time() - start_load:.4f} seconds")
        logger.info("Label encoder loaded and cached in memory.")
    else:
        logger.info("[ML CACHE] Cache HIT: Label encoder retrieved from global memory.")

    return label_encoder

def get_cnn_model():
    global cnn_model

    if cnn_model is None:
        logger.info("[ML CACHE] Cache MISS: CNN model is not loaded. Starting load...")
        model_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "ML Model",
            "models",
            "cnn_model.keras"
        )

        start_exists = time.time()
        exists = os.path.exists(model_path)
        logger.info(f"[ML PERF] CNN model file (.keras) check completed in {time.time() - start_exists:.4f} seconds (exists: {exists})")

        if not exists:
            model_path = model_path.replace(".keras", ".h5")
            start_exists_h5 = time.time()
            exists_h5 = os.path.exists(model_path)
            logger.info(f"[ML PERF] CNN model file (.h5) check completed in {time.time() - start_exists_h5:.4f} seconds (exists: {exists_h5})")
            if not exists_h5:
                logger.error(f"CNN model file not found (.keras or .h5) at: {model_path}")
                raise FileNotFoundError(f"CNN model not found at {model_path}")

        # Measure TensorFlow initialization / loading time
        logger.info("Starting tf.keras.models.load_model() for CNN model...")
        start_load = time.time()
        cnn_model = tf.keras.models.load_model(model_path)
        logger.info(f"[ML PERF] tf.keras.models.load_model() for CNN model completed in {time.time() - start_load:.4f} seconds")
        logger.info("CNN model loaded and cached in memory.")
    else:
        logger.info("[ML CACHE] Cache HIT: CNN model retrieved from global memory.")

    return cnn_model

@app.get("/health")
async def health_check(response: Response):
    """Health check endpoint"""
    if not models_loaded:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "healthy" if models_loaded else "unhealthy",
        "models_loaded": models_loaded,
        "rf_model_loaded": rf_model is not None,
        "cnn_model_loaded": cnn_model is not None
    }

@app.post("/predict/rf", response_model=InferenceResponse)
async def predict_random_forest(request: InferenceRequest):
    """Random Forest inference endpoint"""
    try:
        # Extract features from request data
        data = request.data

        # Handle different data formats
        if 'features' in data:
            features = data['features']
        elif isinstance(data, list):
            # Legacy list format
            features = {
                'Air_Temp': data[0] if len(data) > 0 else 25.0,
                'Rainfall': data[1] if len(data) > 1 else 100.0,
                'Soil_Moisture': data[2] if len(data) > 2 else 40.0,
                'NDVI': data[3] if len(data) > 3 else 0.5
            }
        else:
            features = data

        # Prepare feature array for model
        feature_order = ['NDVI', 'EVI', 'LST', 'Rainfall', 'Air_Temp', 'Soil_Moisture', 'Elevation', 'Soil_Type']
        
        # Build dictionaries for DataFrame and for Response
        feature_dict = {}
        importance_dict = {}
        for feature in feature_order:
            value = features.get(feature, 0.0)
            if isinstance(value, str):
                try:
                    value = float(value)
                except Exception:
                    value = 0.0
            feature_dict[feature] = [value]
            importance_dict[feature] = float(value)
            
        df_features = pd.DataFrame(feature_dict)

        # Make prediction
        logger.info("Timing Log: Starting risk prediction...")
        start_risk = time.time()
        model = get_risk_model()
        if hasattr(model, 'predict_proba'):
            prediction = model.predict_proba(df_features)[0]
            risk_score = float(prediction[1])  # Probability of positive class
        else:
            prediction = model.predict(df_features)[0]
            risk_score = float(prediction)
        end_risk = time.time()
        logger.info(f"Timing Log: Finished risk prediction in {end_risk - start_risk:.4f} seconds")

        # Get thresholds
        thresholds = request.thresholds or {'high': 0.7, 'medium': 0.4}
        high_threshold = thresholds.get('high', 0.7)
        medium_threshold = thresholds.get('medium', 0.4)

        # Determine risk level
        if risk_score >= high_threshold:
            risk_level = "High"
        elif risk_score >= medium_threshold:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # Calculate risk model confidence
        overall_confidence = min(0.95, abs(risk_score - 0.5) * 2 + 0.5)

        # --- Tree Species Prediction ---
        recommended_tree = "General Reforestation"
        rec_confidence = 0.5
        
        # Check environment flag to temporarily disable tree prediction logic
        disable_tree = os.getenv("DISABLE_TREE_PREDICTION", "false").lower() in ("true", "1", "yes")
        
        if disable_tree:
            logger.info("Timing Log: Skipping tree prediction logic as DISABLE_TREE_PREDICTION=true")
        else:
            try:
                logger.info("Timing Log: Starting tree model loading...")
                start_load_tree = time.time()
                tree_model_instance = get_tree_model()
                end_load_tree = time.time()
                logger.info(f"Timing Log: Finished tree model loading in {end_load_tree - start_load_tree:.4f} seconds")

                logger.info("Timing Log: Starting label encoder loading...")
                start_load_encoder = time.time()
                label_encoder_instance = get_label_encoder()
                end_load_encoder = time.time()
                logger.info(f"Timing Log: Finished label encoder loading in {end_load_encoder - start_load_encoder:.4f} seconds")
            except Exception as e:
                logger.error(f"Failed to load tree model or label encoder: {e}")
                tree_model_instance = None
                label_encoder_instance = None

            logger.info(f"Tree Model Status: {tree_model_instance is not None}, Label Encoder Status: {label_encoder_instance is not None}")
            
            if tree_model_instance is not None and label_encoder_instance is not None:
                # Map features to tree model order
                tree_features = ['avg_temperature', 'annual_rainfall', 'elevation', 'soil_type', 'soil_moisture', 'humidity']
                tree_dict = {
                    'avg_temperature': [features.get('Air_Temp', 25.0)],
                    'annual_rainfall': [features.get('Rainfall', 100.0)],
                    'elevation': [features.get('Elevation', 500.0)],
                    'soil_type': [features.get('Soil_Type', 1)],
                    'soil_moisture': [features.get('Soil_Moisture', 30.0)],
                    'humidity': [features.get('Humidity', 50.0)]
                }
                df_tree = pd.DataFrame(tree_dict)
                df_tree = df_tree[tree_features] # Ensure order
                
                # Predict
                model = get_tree_model()
                encoder = get_label_encoder()
                
                logger.info("Timing Log: Starting tree prediction...")
                start_tree_predict = time.time()
                prediction = model.predict(df_tree)
                species = encoder.inverse_transform(prediction)
                recommended_tree = species[0]
                
                # Confidence
                tree_probs = model.predict_proba(df_tree)[0]
                raw_rec_conf = float(max(tree_probs))
                
                # Normalization logic matching risk_analysis.py
                n_classes = len(encoder.classes_)
                chance = 1.0 / n_classes
                if raw_rec_conf > chance:
                     norm_conf = 0.5 + (0.45 * (np.log(raw_rec_conf / chance) / np.log(0.2 / chance)))
                     rec_confidence = max(0.6, min(0.98, norm_conf))
                else:
                     rec_confidence = raw_rec_conf * 10
                end_tree_predict = time.time()
                logger.info(f"Timing Log: Finished tree prediction in {end_tree_predict - start_tree_predict:.4f} seconds")

        # Create Response with UI-friendly formatting
        logger.info("Timing Log: Starting response creation...")
        start_response = time.time()
        response = InferenceResponse(
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=overall_confidence,
            recommended_tree=recommended_tree,
            recommendation_confidence=rec_confidence,
            trends=[
                {"year": 2024, "risk": round(risk_score, 2)},
                {"year": 2025, "risk": round(min(1.0, risk_score * 1.05), 2)},
                {"year": 2026, "risk": round(min(1.0, risk_score * 1.10), 2)}
            ],
            reforestation_recommendations=[
                f"{recommended_tree}: Suitability Confidence: {round(rec_confidence * 100)}%"
            ],
            feature_importance=importance_dict # Use the actual input features as importance proxy
        )
        end_response = time.time()
        logger.info(f"Timing Log: Finished response creation in {end_response - start_response:.4f} seconds")

        return response

    except Exception as e:
        logger.error(f"Random Forest prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.post("/predict/cnn", response_model=CNNInferenceResponse)
async def predict_cnn(request: InferenceRequest):
    """CNN inference endpoint"""
    try:
        model = get_cnn_model()
        data = request.data

        # Check if image data is available
        if 'image_path' not in data and 'image_data' not in data:
            # Return fallback response
            return CNNInferenceResponse(
                forest_loss_probability=0.5,
                confidence=0.7
            )

        # For now, return mock CNN results since we don't have actual image processing
        # In a real implementation, you would:
        # 1. Load and preprocess the image
        # 2. Run CNN inference
        # 3. Return actual results

        return CNNInferenceResponse(
            forest_loss_probability=0.45,
            confidence=0.85
        )

    except Exception as e:
        logger.error(f"CNN prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"CNN prediction failed: {str(e)}")

def get_script_path(script_name: str) -> str:
    # Try absolute path first
    abs_path = os.path.join("/app/ML Model/scripts", script_name)
    if os.path.exists(abs_path):
        return abs_path
    # Fallback to relative path from this file
    rel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ML Model", "scripts", script_name))
    if os.path.exists(rel_path):
        return rel_path
    raise FileNotFoundError(f"Script {script_name} not found at {abs_path} or {rel_path}")

@app.post("/collect-data")
async def collect_data():
    try:
        script_path = get_script_path("data_collector.py")
        cwd = os.path.abspath(os.path.join(os.path.dirname(script_path), ".."))
        logger.info(f"[ML Service] Executing data collector: {script_path}")
        
        result = subprocess.run(
            [sys.executable, script_path],
            check=True,
            capture_output=True,
            text=True,
            cwd=cwd
        )
        
        logger.info(f"[ML Service] Data collector stdout:\n{result.stdout}")
        if result.stderr:
            logger.warning(f"[ML Service] Data collector stderr:\n{result.stderr}")
            
        return {
            "success": True,
            "message": "Data collection completed",
            "stdout": result.stdout,
            "stderr": result.stderr
        }
    except subprocess.CalledProcessError as e:
        error_msg = f"Data collector failed: {e.stderr or str(e)}"
        logger.error(f"[ML Service] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        error_msg = f"Data collection error: {str(e)}"
        logger.error(f"[ML Service] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

@app.post("/retrain")
async def retrain():
    if not retrain_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=409,
            detail="Retraining already in progress"
        )
        
    try:
        steps_completed = []
        
        # Step 1: data_collector.py
        try:
            script_path = get_script_path("data_collector.py")
            cwd = os.path.abspath(os.path.join(os.path.dirname(script_path), ".."))
            logger.info(f"[ML Service] Retrain Step 1: Executing data collector: {script_path}")
            subprocess.run(
                [sys.executable, script_path],
                check=True,
                capture_output=True,
                text=True,
                cwd=cwd
            )
            steps_completed.append("data collection completed")
        except subprocess.CalledProcessError as e:
            error_msg = f"Retrain Step 1 (Data collection) failed: {e.stderr or str(e)}"
            logger.error(f"[ML Service] {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
            
        # Step 2: train_random_forest.py
        try:
            script_path = get_script_path("train_random_forest.py")
            cwd = os.path.abspath(os.path.join(os.path.dirname(script_path), ".."))
            logger.info(f"[ML Service] Retrain Step 2: Executing RF training: {script_path}")
            subprocess.run(
                [sys.executable, script_path],
                check=True,
                capture_output=True,
                text=True,
                cwd=cwd
            )
            steps_completed.append("rf training completed")
        except subprocess.CalledProcessError as e:
            error_msg = f"Retrain Step 2 (RF training) failed: {e.stderr or str(e)}"
            logger.error(f"[ML Service] {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
            
        # Step 3: train_cnn.py
        try:
            script_path = get_script_path("train_cnn.py")
            cwd = os.path.abspath(os.path.join(os.path.dirname(script_path), ".."))
            logger.info(f"[ML Service] Retrain Step 3: Executing CNN training: {script_path}")
            subprocess.run(
                [sys.executable, script_path],
                check=True,
                capture_output=True,
                text=True,
                cwd=cwd
            )
            steps_completed.append("cnn training completed")
            
            # Copy cnn_model_multispectral.keras to cnn_model.keras
            models_dir = os.path.join(cwd, "models")
            multispectral_path = os.path.join(models_dir, "cnn_model_multispectral.keras")
            cnn_model_path = os.path.join(models_dir, "cnn_model.keras")
            if os.path.exists(multispectral_path):
                shutil.copy2(multispectral_path, cnn_model_path)
                logger.info(f"[ML Service] Successfully copied {multispectral_path} to {cnn_model_path}")
            else:
                logger.warning(f"[ML Service] Expected multispectral model file not found at {multispectral_path}")
        except subprocess.CalledProcessError as e:
            error_msg = f"Retrain Step 3 (CNN training) failed: {e.stderr or str(e)}"
            logger.error(f"[ML Service] {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
            
        # Step 4: reload all models in memory
        try:
            logger.info("[ML Service] Retrain Step 4: Reloading models in memory...")
            global rf_model, tree_model, label_encoder, cnn_model
            rf_model = None
            tree_model = None
            label_encoder = None
            cnn_model = None
            
            get_risk_model()
            get_tree_model()
            get_label_encoder()
            get_cnn_model()
            
            steps_completed.append("models reloaded")
        except Exception as e:
            error_msg = f"Retrain Step 4 (Model reload) failed: {str(e)}"
            logger.error(f"[ML Service] {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
            
        return {
            "success": True,
            "steps": steps_completed
        }
        
    finally:
        retrain_lock.release()

@app.post("/reload-models")
async def reload_models():
    """Reload models endpoint"""
    global rf_model, tree_model, label_encoder, cnn_model
    try:
        rf_model = None
        tree_model = None
        label_encoder = None
        cnn_model = None
        
        get_risk_model()
        get_tree_model()
        get_label_encoder()
        get_cnn_model()
        
        return {"status": "models reloaded successfully"}
    except Exception as e:
        logger.error(f"[ML Service] Model reload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model reload failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)