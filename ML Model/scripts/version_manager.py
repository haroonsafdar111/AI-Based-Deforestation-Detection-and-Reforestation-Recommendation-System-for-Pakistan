import json
import os
from datetime import datetime

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), '../models/registry.json')

def log_model_version(model_name, metrics):
    """
    Records a new model version and its performance metrics.
    """
    registry = {}
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH, 'r') as f:
                registry = json.load(f)
        except:
            pass
            
    if model_name not in registry:
        registry[model_name] = []
        
    version_entry = {
        "version": len(registry[model_name]) + 1,
        "timestamp": datetime.now().isoformat(),
        "metrics": metrics
    }
    
    registry[model_name].append(version_entry)
    
    # Keep only last 10 versions
    registry[model_name] = registry[model_name][-10:]
    
    with open(REGISTRY_PATH, 'w') as f:
        json.dump(registry, f, indent=4)
    
    print(f"Registered {model_name} version {version_entry['version']}")

if __name__ == "__main__":
    # Test
    # log_model_version("random_forest", {"rmse": 0.05})
    pass
