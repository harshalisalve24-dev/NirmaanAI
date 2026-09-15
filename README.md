# NirmaanAI — Infrastructure Risk Early-Warning Platform

> **AI-Powered Early-Warning & Risk Prediction System for Infrastructure Mega-Projects Across India**

[![Frontend](https://img.shields.io/badge/Vercel-Frontend%20Live-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://nirmaan-ai-dusky.vercel.app)
[![Backend](https://img.shields.io/badge/FastAPI-ML%20API%20Live-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://nirmaanai-backend.onrender.com/docs)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)

---

## 📌 Executive Summary

**NirmaanAI** is an enterprise-grade infrastructure risk management command center built for senior ministry officials and project engineers. It monitors **182+ government infrastructure projects** (highways, railways, metro lines, bridges, and power grids) across India, using Machine Learning (Random Forest Regression) to predict schedule delays in months and calculate composite risk scores before costly overruns occur.

---

## ✨ Key Features

- 📊 **Infrastructure Risk Command Center**: Real-time KPI dashboard tracking total projects, critical delay risks, sector overviews, and early warning indicators.
- 🤖 **Machine Learning Delay Prediction**: FastAPI-powered Random Forest Regressor trained on 10 historical project parameters (cost, expenditure %, physical progress, progress gap, sector, agency, planned duration).
- 🧮 **Composite Risk Scoring Formula**: Weighted risk calculation ($0.60 \times R_{\text{delay}} + 0.25 \times R_{\text{gap}} + 0.15 \times R_{\text{budget}}$) categorizing projects into *Low*, *Medium*, *High*, and *Critical*.
- 🎯 **Interactive Summary Card Filtering**: 1-click dashboard summary cards filtering project lists directly by risk severity.
- 🗺️ **Geospatial Risk Map**: Interactive map of India visualizing high-risk project clusters by state and sector.
- 📋 **Priority Queue & Project Deep Dives**: Detailed project profiles with financial metrics, milestone timelines, risk factors, and actionable intervention assignments.
- 🔐 **Firebase Authentication & Access Control**: Secure Email/Password authentication, protected dashboard routes, self-registration mode, and **1-Click Portfolio Demo Access**.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Charts & Data Viz**: Recharts
- **Database & Auth**: Firebase Auth + Cloud Firestore

### Backend & Machine Learning
- **API Framework**: FastAPI + Uvicorn
- **ML Libraries**: Scikit-Learn (`1.6.1`), Joblib, Pandas, NumPy
- **ML Model**: Random Forest Regressor (`NirmaanAI_Final_RF_Regression.pkl`)
- **Python Version**: Python 3.13.1

### Cloud Infrastructure & Hosting
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render (Linux Container)
- **Database Hosting**: Google Cloud Firestore

---

## 📊 Risk Score Formula

The NirmaanAI Risk Score ($0 \text{ to } 100$) is computed dynamically using:

$$\text{Risk Score} = 0.60 \cdot R_{\text{Delay}} + 0.25 \cdot R_{\text{Gap}} + 0.15 \cdot R_{\text{BudgetPressure}}$$

Where:
1. $R_{\text{Delay}} = \min\left(100, \max\left(0, \frac{\text{Predicted Delay Months}}{36} \times 100\right)\right)$
2. $R_{\text{Gap}} = \max\left(0, \min\left(100, \frac{\text{Expenditure \%} - \text{Physical Progress \%}}{30} \times 100\right)\right)$
3. $R_{\text{BudgetPressure}} = \max\left(0, \min\left(100, \frac{\text{Expenditure \%} - 75}{25} \times 100\right)\right)$

### Risk Classifications:
- **Low**: $0 \le \text{Score} < 30$
- **Medium**: $30 \le \text{Score} < 50$
- **High**: $50 \le \text{Score} < 70$
- **Critical**: $70 \le \text{Score} \le 100$

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js `20.x` or later
- Python `3.13.x`
- `pnpm` or `npm`

### 1. Clone Repository
```bash
git clone https://github.com/harshalisalve24-dev/NirmaanAI.git
cd NirmaanAI
```

### 2. Frontend Setup
```bash
pnpm install
pnpm dev
```
The frontend Vite server will launch at `http://localhost:5173` (or `http://localhost:8443`).

### 3. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
The FastAPI backend server will start at `http://localhost:8000`. Test interactive docs at `http://localhost:8000/docs`.

---

## 🔗 Environment Variables Configuration

Create a `.env.local` file in the root directory:

```env
# Firebase Web App Config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Render Backend API URL
VITE_API_BASE_URL=https://nirmaanai-backend.onrender.com
```

---

## 📄 License & Attribution

Developed for **Ministry of Road Transport & Highways (MoRTH)** & Government Infrastructure Monitoring. All rights reserved.
