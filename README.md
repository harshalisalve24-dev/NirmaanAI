# NirmaanAI 🏗️

## AI-Powered Infrastructure Risk & Early Warning System

NirmaanAI is an AI/ML-powered platform designed to help monitor large infrastructure projects and identify projects that may be at risk of delays.

Instead of only showing what has already happened, NirmaanAI uses historical project data and current project indicators to **predict expected schedule delay, calculate project risk, prioritize projects, and support early intervention.**

## 🎯 Problem

Large infrastructure projects such as roads, railways, airports, urban transport, energy, and water projects can face delays due to:

- Slow physical progress
- High expenditure compared to physical execution
- Budget pressure
- Long project durations
- Contractor and execution issues

Traditional monitoring is often reactive. NirmaanAI aims to make infrastructure monitoring more **predictive and proactive**.

## 💡 Solution

NirmaanAI provides a centralized infrastructure risk monitoring system that enables officials to:

- Monitor infrastructure projects
- Identify high-risk projects
- Predict expected schedule delay
- Calculate project risk scores
- Compare planned and actual progress
- Analyze budget utilization
- Prioritize projects requiring attention
- Create and track interventions
- Monitor project risk through a centralized dashboard

## 🤖 Machine Learning

The system uses a **Random Forest Regression** model to estimate expected schedule delay.

The model uses historical-safe project features including:

- Original Cost
- Expenditure
- Physical Progress
- Expenditure %
- Remaining Budget
- Progress Gap
- Planned Duration
- Sector
- Line Ministry
- Implementing Agency

### Model Performance

The final model achieved approximately:

- **MAE:** 12.8 months
- **RMSE:** 17.3 months
- **R²:** 0.29

The model is intended as a **prototype decision-support system** and not as an exact forecasting system.

## 📊 Risk Scoring

NirmaanAI combines ML predictions with current project indicators to generate an operational risk score.

| Risk Score | Risk Level |
|---|---|
| 0 – <30 | Low |
| 30 – <50 | Medium |
| 50 – <70 | High |
| 70 – 100 | Critical |

## 🖥️ Key Features

- **Command Center** — Centralized project monitoring dashboard
- **Priority Queue** — Identifies projects requiring immediate attention
- **Risk Map** — Geographic visualization of project risk
- **Project Overview** — Detailed project-level metrics
- **AI Risk Analysis** — ML-based delay and risk analysis
- **Intervention Management** — Create and track corrective actions
- **Project Management** — Add and search infrastructure projects
- **Firebase Integration** — Data storage and authentication infrastructure

## 🏗️ Technology Stack

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts

**Backend**
- Python
- FastAPI
- Scikit-learn
- Pandas
- NumPy
- Joblib

**Database & Authentication**
- Firebase
- Cloud Firestore
- Firebase Authentication

**Machine Learning**
- Random Forest Regression
- Feature Engineering
- Cross-Validation
- Leakage-Aware Model Evaluation

## 🔄 System Workflow

```text
Project Data
     ↓
Data Cleaning & EDA
     ↓
Feature Engineering
     ↓
Machine Learning Model
     ↓
Expected Delay Prediction
     ↓
Risk Scoring
     ↓
Risk Prioritization
     ↓
AI Risk Analysis
     ↓
Early Warning
     ↓
Intervention
     ↓
Continuous Monitoring
