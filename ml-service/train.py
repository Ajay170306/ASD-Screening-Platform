import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.neural_network import MLPClassifier

def train_and_export():
    dataset_path = "asd_toddlers.csv"
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset not found at {dataset_path}")

    # Load and clean headers
    df = pd.read_csv(dataset_path)
    df.columns = df.columns.str.strip()

    # Drop non-predictive administrative columns
    drop_candidates = ['Case_No', 'Who completed the test']
    df = df.drop(columns=[col for col in drop_candidates if col in df.columns])

    # Standardize target: 'Yes' -> 1, 'No' -> 0
    target_col = 'Class/ASD Traits'
    df[target_col] = df[target_col].astype(str).str.strip().str.lower().map({'yes': 1, 'no': 0})
    df = df.dropna(subset=[target_col])

    # Normalize categorical columns
    df['Sex'] = df['Sex'].astype(str).str.strip().str.lower().map({'m': 1, 'f': 0, '1': 1, '0': 0})
    df['Jaundice'] = df['Jaundice'].astype(str).str.strip().str.lower().map({'yes': 1, 'no': 0})
    df['Family_mem_with_ASD'] = df['Family_mem_with_ASD'].astype(str).str.strip().str.lower().map({'yes': 1, 'no': 0})
    df['Ethnicity'] = df['Ethnicity'].astype(str).str.strip().str.lower()

    X = df.drop(columns=[target_col])
    y = df[target_col].astype(int)

    categorical_features = ['Ethnicity']
    numeric_features = [
        'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10',
        'Age_Mons', 'Qchat-10-Score', 'Sex', 'Jaundice', 'Family_mem_with_ASD'
    ]

    # Preprocessor artifact
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), categorical_features)
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    # Scikit-Learn Multilayer Perceptron (ANN)
    mlp = MLPClassifier(
        hidden_layer_sizes=(64, 32),
        activation='relu',
        solver='adam',
        alpha=0.001,
        max_iter=300,
        random_state=42,
        early_stopping=True,
        n_iter_no_change=15
    )

    print("Training Multilayer Perceptron (ANN)...")
    mlp.fit(X_train_proc, y_train)

    accuracy = mlp.score(X_test_proc, y_test)
    print(f"\nFinal Test Accuracy: {accuracy * 100:.2f}%")

    os.makedirs("models_prod", exist_ok=True)
    joblib.dump(preprocessor, "models_prod/preprocessor.joblib")
    joblib.dump(mlp, "models_prod/asd_mlp_model.joblib")
    print("Export complete: Artifacts saved to 'models_prod/' folder.")

if __name__ == "__main__":
    train_and_export()