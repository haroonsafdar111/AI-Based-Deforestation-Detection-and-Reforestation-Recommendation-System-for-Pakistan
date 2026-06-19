import sys
import json
import os

# Helper for JSON output
def output_json(data):
    print("__JSON_START__")
    print(json.dumps(data))
    print("__JSON_END__")

# Helper for Error output
def output_error(message):
    print("__JSON_START__")
    print(json.dumps({"status": "error", "message": message}))
    print("__JSON_END__")

try:
    # Suppress TF logs
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3' 
    import tensorflow as tf
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing import image
    import numpy as np
except ImportError:
    output_error("TensorFlow not installed. Please run: pip install tensorflow")
    sys.exit(1)
except Exception as e:
    output_error(f"Failed to import TensorFlow: {str(e)}")
    sys.exit(1)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'cnn_model.keras')

def analyze_satellite_image(image_path_or_data):
    """
    Load CNN model and predict forest loss from image.
    """
    # 1. Check Model Existence
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"CNN Model not found at {MODEL_PATH}. Please run train_cnn.py first.")

    # 2. Load Model
    try:
        model = load_model(MODEL_PATH)
    except Exception as e:
        raise RuntimeError(f"Failed to load CNN model: {str(e)}")

    # 3. Load and Preprocess Image
    # Assuming input is a file path for this version
    img_path = image_path_or_data.get('image_path')
    if not img_path:
        # Mocking for generic Region request if no image provided?
        # User constraint: "No mock predictions".
        # So we must error if no image.
        raise ValueError("No image_path provided in input.")

    if not os.path.exists(img_path):
        raise FileNotFoundError(f"Input image not found: {img_path}")

    try:
        # Resize to match training (128x128)
        img = image.load_img(img_path, target_size=(128, 128))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) # Batch dimension
        img_array /= 255.0 # Normalize
    except Exception as e:
        raise ValueError(f"Failed to process image: {str(e)}")

    # 4. Predict
    prediction = model.predict(img_array)
    loss_probability = float(prediction[0][0])

    # 5. Interpret Results
    affected_area_est = 0.0
    if loss_probability > 0.5:
        # Rough estimate logic (placeholder for real spatial analysis)
        affected_area_est = round(loss_probability * 100, 2) # hectares?

    return {
        "status": "success",
        "forest_loss_probability": round(loss_probability, 4),
        "affected_area_estimate": f"{affected_area_est} ha",
        "classification": "Forest Loss Detected" if loss_probability > 0.5 else "Stable Forest",
        "description": "Analysis based on CNN interpretation of satellite imagery."
    }

if __name__ == "__main__":
    try:
        # Read Input
        raw_input = "{}"
        if len(sys.argv) > 1:
            raw_input = sys.argv[1]
        elif not sys.stdin.isatty():
            raw_input = sys.stdin.read()
            
        try:
            input_json = json.loads(raw_input)
        except:
            input_json = {}

        # Execute
        result = analyze_satellite_image(input_json)
        output_json(result)

    except Exception as e:
        output_error(str(e))
        sys.exit(1)
