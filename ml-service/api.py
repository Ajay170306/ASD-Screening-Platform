from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import joblib
import pandas as pd

app = FastAPI(
    title="Toddler ASD Screening Inference Engine",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load production artifacts
try:
    preprocessor = joblib.load("models_prod/preprocessor.joblib")
    model = joblib.load("models_prod/asd_mlp_model.joblib")
except Exception as e:
    print(f"Warning: Artifacts not yet loaded ({e}). Run train.py first.")

class ScreeningPayload(BaseModel):
    a1: int = Field(..., ge=0, le=1)
    a2: int = Field(..., ge=0, le=1)
    a3: int = Field(..., ge=0, le=1)
    a4: int = Field(..., ge=0, le=1)
    a5: int = Field(..., ge=0, le=1)
    a6: int = Field(..., ge=0, le=1)
    a7: int = Field(..., ge=0, le=1)
    a8: int = Field(..., ge=0, le=1)
    a9: int = Field(..., ge=0, le=1)
    a10: int = Field(..., ge=0, le=1)
    age_months: int = Field(..., ge=12, le=60)
    sex: str = Field(..., pattern="^(m|f)$")
    ethnicity: str
    jaundice: str = Field(..., pattern="^(yes|no)$")
    family_mem_with_asd: str = Field(..., pattern="^(yes|no)$")

@app.get("/api/v1/health")
def health_check():
    return {"status": "online", "service": "asd-mlp-inference"}

@app.post("/api/v1/screen")
def screen_toddler(payload: ScreeningPayload):
    try:
        qchat_sum = sum([
            payload.a1, payload.a2, payload.a3, payload.a4, payload.a5,
            payload.a6, payload.a7, payload.a8, payload.a9, payload.a10
        ])

        raw_input = {
            "A1": [payload.a1],
            "A2": [payload.a2],
            "A3": [payload.a3],
            "A4": [payload.a4],
            "A5": [payload.a5],
            "A6": [payload.a6],
            "A7": [payload.a7],
            "A8": [payload.a8],
            "A9": [payload.a9],
            "A10": [payload.a10],
            "Age_Mons": [payload.age_months],
            "Qchat-10-Score": [qchat_sum],
            "Sex": [1 if payload.sex == "m" else 0],
            "Ethnicity": [payload.ethnicity.strip().lower()],
            "Jaundice": [1 if payload.jaundice == "yes" else 0],
            "Family_mem_with_ASD": [1 if payload.family_mem_with_asd == "yes" else 0]
        }

        df_input = pd.DataFrame(raw_input)
        scaled_features = preprocessor.transform(df_input)
        
        # Predict probability for Class 1 (ASD Traits)
        raw_prob = float(model.predict_proba(scaled_features)[0][1])

        if raw_prob >= 0.65:
            tier = "Elevated Likelihood"
            rec = "Comprehensive evaluation with a developmental pediatrician is strongly advised."
        elif raw_prob >= 0.40:
            tier = "Moderate Likelihood"
            rec = "Active milestone monitoring and a re-screening within 3 to 6 months is recommended."
        else:
            tier = "Low Likelihood"
            rec = "Responses reflect neurotypical developmental milestone progression."

        return {
            "status": "success",
            "qchat_score": qchat_sum,
            "asd_probability": round(raw_prob, 4),
            "risk_tier": tier,
            "clinical_recommendation": rec
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))