import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_squared_error, accuracy_score
import json
from version_manager import log_model_version

# --- Configuration ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# --- 1. Data Loading ---
def load_risk_data():
    csv_path = os.path.join(DATA_DIR, 'dataset.csv')
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")
    df = pd.read_csv(csv_path)
    # Map column names if necessary
    if 'Forest_Loss_Risk' in df.columns and 'forest_loss_risk' not in df.columns:
        df['forest_loss_risk'] = df['Forest_Loss_Risk']
    return df

def load_tree_data():
    """Load tree species dataset from Seeds_Dataset.xlsx with 366+ local varieties."""
    TREE_DATA_FILE = os.path.join(DATA_DIR, 'tree_species_data.csv')
    SEEDS_DATASET = os.path.join(BASE_DIR, 'datasets', 'Seeds_Dataset.xlsx')

    if os.path.exists(SEEDS_DATASET):
        print(f"Loading species parameters from {SEEDS_DATASET}...")
        df_seeds = pd.read_excel(SEEDS_DATASET)
        df_seeds = df_seeds.dropna(subset=['Common Name'])
        
        # Mapping complex soil labels to IDs
        # 1=Hilly/Rocky, 2=Alluvial/Fertile/Loamy, 3=Arid/Sandy/Saline
        def map_soil_to_id(soil_str):
            soil_str = str(soil_str).lower()
            hilly = ['rocky', 'mountain', 'leptosols', 'hilly', 'limestone']
            fertile = ['alluvial', 'loam', 'fertile', 'clay', 'riverine', 'silty']
            arid = ['sandy', 'arid', 'desert', 'saline', 'dry', 'alkaline']
            
            if any(k in soil_str for k in hilly): return 1
            if any(k in soil_str for k in arid): return 3
            return 2 # Default to Alluvial/Loam

        data = []
        for _, row in df_seeds.iterrows():
            name = row['Common Name']
            
            # Use mid-points of provided ranges
            temp_min = float(row.get('Temp Min (°C)', 20))
            temp_max = float(row.get('Temp Max (°C)', 30))
            rain_min = float(row.get('Rain Min (mm)', 500))
            rain_max = float(row.get('Rain Max (mm)', 1000))
            elev_min = float(row.get('Elev Min (m)', 0))
            elev_max = float(row.get('Elev Max (m)', 1000))
            
            temp_mid = (temp_min + temp_max) / 2
            rain_mid = (rain_min + rain_max) / 2
            elev_mid = (elev_min + elev_max) / 2
            
            soil_str = row.get('Soil Type (Multi-label)', 'Alluvial')
            soil_id = map_soil_to_id(soil_str)
            
            # Generate 100 samples per species with noise reflecting the range
            temp_std = (temp_max - temp_min) / 4 # Approx 95% within range
            rain_std = (rain_max - rain_min) / 4
            elev_std = (elev_max - elev_min) / 4
            
            for _ in range(100): # Reduced from 300 to 100 to prevent memory crashes with 366 classes
                data.append({
                    "tree_species": name,
                    "avg_temperature": temp_mid + np.random.normal(0, max(1.5, temp_std * 1.2)),
                    "annual_rainfall": max(0, rain_mid + np.random.normal(0, max(75, rain_std * 1.2))),
                    "elevation": max(0, elev_mid + np.random.normal(0, max(100, elev_std * 1.2))),
                    "soil_type": soil_id,
                    "soil_moisture": 30 + np.random.normal(0, 15),
                    "humidity": 50 + np.random.normal(0, 20)
                })
        
        df = pd.DataFrame(data)
        df.to_csv(TREE_DATA_FILE, index=False)
        print(f"Generated augmented training data for {len(df_seeds)} species (Total: {len(df)} samples).")
        return df

    if os.path.exists(TREE_DATA_FILE):
        return pd.read_csv(TREE_DATA_FILE)
    
    raise FileNotFoundError("Neither Seeds_Dataset.xlsx nor tree_species_data.csv found.")

# --- 2. Training Pipeline ---
def train_models():
    print("--- Starting Deep Model Optimization and Retraining ---")
    
    # 1. RISK MODEL OPTIMIZATION
    df_risk = load_risk_data()
    
    regions = df_risk['Region'].unique()
    train_regs, test_regs = train_test_split(regions, test_size=0.3, random_state=42)
    df_train = df_risk[df_risk['Region'].isin(train_regs)]
    df_test = df_risk[~df_risk['Region'].isin(train_regs)]
    
    features = ['NDVI', 'EVI', 'LST', 'Rainfall', 'Air_Temp', 'Soil_Moisture', 'Elevation', 'Soil_Type']
    X_train = df_train[features]
    y_train = df_train['forest_loss_risk']
    X_test = df_test[features]
    y_test = df_test['forest_loss_risk']
    
    print(f"Optimizing Risk Regressor (Train Regions: {len(train_regs)})")
    
    risk_param_dist = {
        'rf__n_estimators': [100, 200, 300, 400],
        'rf__max_depth': [10, 20, 30, 40, None],
        'rf__min_samples_leaf': [1, 2, 4],
        'rf__min_samples_split': [2, 5, 10],
        'rf__max_features': ['sqrt', 'log2', None]
    }
    
    risk_pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='mean')),
        ('scaler', StandardScaler()),
        ('rf', RandomForestRegressor(random_state=42, n_jobs=-1))
    ])
    
    # Increased iterations for risk
    risk_search = RandomizedSearchCV(risk_pipe, risk_param_dist, n_iter=25, cv=2, random_state=42, n_jobs=-1)
    risk_search.fit(X_train, y_train)
    best_risk_model = risk_search.best_estimator_
    
    rmse = np.sqrt(mean_squared_error(y_test, best_risk_model.predict(X_test)))
    print(f"Risk Model Best Params: {risk_search.best_params_}")
    print(f"Risk Model RMSE: {rmse:.4f}")
    
    # Save Risk Model
    risk_path = os.path.join(MODEL_DIR, 'random_forest_risk.pkl')
    joblib.dump(best_risk_model, risk_path)
    
    # 2. TREE MODEL OPTIMIZATION (THE FOCUS)
    df_tree = load_tree_data()
    tree_features = ['avg_temperature', 'annual_rainfall', 'elevation', 'soil_type', 'soil_moisture', 'humidity']
    le = LabelEncoder()
    y_encoded = le.fit_transform(df_tree['tree_species'])
    
    X_tree_tr, X_tree_te, y_tree_tr, y_tree_te = train_test_split(df_tree[tree_features], y_encoded, test_size=0.2, random_state=42)
    
    print(f"Optimizing Tree Classifier for {len(le.classes_)} Species...")
    
    tree_param_dist = {
        'rf__n_estimators': [200, 300],
        'rf__max_depth': [15, 20, 25], # Capped at 25 to prevent massive 20GB+ models
        'rf__min_samples_leaf': [2, 5],
        'rf__min_samples_split': [5, 10],
        'rf__class_weight': ['balanced', 'balanced_subsample']
    }
    
    tree_pipe = Pipeline([
        ('imputer', SimpleImputer(strategy='mean')),
        ('scaler', StandardScaler()),
        ('rf', RandomForestClassifier(random_state=42, n_jobs=1))
    ])
    
    # Using n_jobs=1 for the search because 366 classes consume too much RAM in parallel
    tree_search = RandomizedSearchCV(tree_pipe, tree_param_dist, n_iter=30, cv=2, random_state=42, n_jobs=1)
    tree_search.fit(X_tree_tr, y_tree_tr)
    best_tree_model = tree_search.best_estimator_
    
    tree_acc = accuracy_score(y_tree_te, best_tree_model.predict(X_tree_te))
    print(f"Tree Model Best Params: {tree_search.best_params_}")
    print(f"Tree Model Accuracy (Optimized): {tree_acc:.4f}")
    
    # Save Tree Model (with compression to save space)
    tree_path = os.path.join(MODEL_DIR, 'random_forest_tree.pkl')
    joblib.dump(best_tree_model, tree_path, compress=3)
    joblib.dump(le, os.path.join(MODEL_DIR, 'tree_label_encoder.pkl'))
    
    # Finalize Metrics and Registry
    metrics = {
        "risk_rmse": float(rmse),
        "tree_accuracy": float(tree_acc) * 100,
        "best_tree_params": tree_search.best_params_
    }
    
    log_model_version("random_forest", metrics)
    
    print("__JSON_START__")
    print(json.dumps(metrics))
    print("__JSON_END__")

if __name__ == "__main__":
    train_models()
