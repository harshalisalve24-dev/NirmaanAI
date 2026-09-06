from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from risk_score import calculate_risk_score

# Load the trained model
model = joblib.load(
    r"models\NirmaanAI_Final_RF_Regression (1).pkl"
)

# Load the exact feature list used during training
features = joblib.load(
    r"models\NirmaanAI_ML_Features (1).pkl"
)

app = FastAPI(
    title="NirmaanAI Risk Prediction API",
    description="AI-powered infrastructure project delay and risk score prediction",
    version="1.0"
)

origins = [
    "http://localhost:8443",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProjectData(BaseModel):
    original_cost: float
    expenditure: float
    physical_progress: float
    expenditure_percent: float
    remaining_budget: float
    progress_gap: float
    planned_duration_days: float
    sector_name: str
    line_ministry: str
    implementing_agency: str


@app.get("/")
def home():
    return {
        "message": "NirmaanAI Risk Prediction API is running"
    }


@app.post("/predict")
def predict(project: ProjectData):

    input_data = pd.DataFrame([{
        "Original Cost\n(in cr.)": project.original_cost,
        "Expenditure\n(in cr.)": project.expenditure,
        "Physical Progress\n(in %)": project.physical_progress,
        "Expenditure %": project.expenditure_percent,
        "Remaining Budget\n(in cr.)": project.remaining_budget,
        "Progress Gap": project.progress_gap,
        "Planned Duration Days": project.planned_duration_days,
        "Sector Name": project.sector_name,
        "Line Ministry": project.line_ministry,
        "Implementing Agency": project.implementing_agency
    }])

    # Ensure columns are in the exact training order
    input_data = input_data[features]

    predicted_delay = float(model.predict(input_data)[0])

    # Calculate composite Risk Score & Risk Level using REVISED formula
    risk_score, risk_level = calculate_risk_score(
        predicted_delay_months=predicted_delay,
        expenditure_percent=project.expenditure_percent,
        physical_progress=project.physical_progress,
    )

    return {
        "predicted_delay_months": round(predicted_delay, 2),
        "risk_score": risk_score,
        "risk_level": risk_level
    }