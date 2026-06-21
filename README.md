# IMPACT: Intelligent Mobility Prediction and Control Technology

IMPACT is an AI-driven traffic decision-support system designed to forecast the severity of urban traffic bottlenecks and recommend optimized deployment solutions for personnel (manpower), barricades, and diversion plans in real-time.

---

##  Problem Statement

In fast-growing cities, sudden disruptions—such as political rallies, sports games, religious processions, road construction, water-logging, or VIP movements—trigger catastrophic gridlocks. Today's traffic response suffers from three major flaws:
1. **Unquantified Severity:** Control centers cannot anticipate the exact traffic volume delay and geographical footprint of a new incident.
2. **Experience-Driven Resource Allocation:** The distribution of traffic police and barricades is handled manually based on instinct, leading to chronic under- or over-deployment.
3. **No Continuous Learning:** Post-incident deployment metrics are rarely collected and used to retrain routing and resource models.

---

##  Key Features

- **Event Severity Quantification:** Computes a custom **Event Impact Index (EII)** to immediately bucket events into Moderate, High, or Critical threat levels.
- **Resource Forecasting Models:** High-accuracy Machine Learning models (Random Forest algorithms) forecast the exact traffic officers and barricades needed.
- **Interactive Spatial Visualizations:** Renders Leaflet-based coordinates representing the epicenter, police checkpoints, and barricading blocker locations.
- **AI-Generated Diversion Strategies:** Interfaces with state-of-the-art Large Language Models (via the Groq API) to generate structured public detour guides.
- **Continuous Learning & Model Retraining:** Features bulk data ingestion (Excel/CSV upload) and an active ML retraining module protected by an automated model evaluation Quality Gate.

---

##  Event Impact Index (EII) Formulation

The **Event Impact Index (EII)** ranges from $0$ to $100$ and is computed as a weighted combination of five traffic disruption indicators:

$$\text{EII} = 100 \times \left(0.40 \cdot EF + 0.25 \cdot RCF + 0.15 \cdot PHF + 0.10 \cdot CF + 0.10 \cdot JF\right)$$

### 1. Event Factor ($EF$)
Determined by the incident cause based on historical congestion weight:
- VIP Movement: `0.80`
- Public Event: `0.452`
- Protest: `0.428`
- Tree Fall: `0.364`
- Procession: `0.263`
- Construction: `0.251`
- Debris: `0.153`
- Road Conditions: `0.123`
- Water Logging: `0.085`
- Vehicle Breakdown: `0.042`
- Congestion: `0.037`
- Accident: `0.027`
- Pot Holes: `0.024`
- Others (Default): `0.086`

### 2. Road Closure Factor ($RCF$)
- $RCF = 1$ if the event requires blocking traffic lanes (road closure).
- $RCF = 0$ if lanes remain open.

### 3. Peak Hour Factor ($PHF$)
- $PHF = 1$ if the event's start time falls during peak traffic windows (`07:00 - 10:00` or `17:00 - 20:00`).
- $PHF = 0$ otherwise.

### 4. Corridor Factor ($CF$)
- $CF = 1.0$ if the incident occurs on a major named city corridor.
- $CF = 0.2$ otherwise.

### 5. Junction Factor ($JF$)
- $JF = 1.0$ if the incident falls near a critical junction/intersection.
- $JF = 0.2$ otherwise.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React, Vite, Vanilla CSS (fully responsive), React Leaflet (maps), Recharts (data visualizations).
- **Backend:** FastAPI, Python, Scikit-learn (ML), Pandas, Uvicorn.
- **LLM Integration:** Groq API (Llama models) for structured markdown text diversion strategy synthesis.
- **Containerization:** Docker (`python:3.11-slim`).

---

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.11+)
- [Docker Desktop](https://www.docker.com/) (Optional, for containerized run)

---

### Method 1: Local Development Setup

#### 1. Backend Setup (API)
Navigate to the `api` folder and create a virtual environment:
```bash
# Navigate to api directory
cd api

# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install python dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `api/` directory with your Groq API key:
```env
GROQ_API_KEY=your_actual_groq_api_key_here
```

Run the backend server:
```bash
python main.py
```
The backend API will start at `http://localhost:8000`. You can inspect the interactive docs at `http://localhost:8000/docs`.

#### 2. Frontend Setup
Navigate to the `frontend` folder and install dependencies:
```bash
# Navigate to frontend directory
cd ../frontend

# Install npm packages
npm install
```

Create a `.env` file in the `frontend/` directory pointing to the local API:
```env
VITE_API_URL=http://localhost:8000
```

Run the React development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

### Method 2: Docker Setup (Containerized Backend)

You can build and package the backend API into a self-contained Docker container.

#### 1. Build the Docker Image
From the root directory, run:
```bash
docker build -t impact-api ./api
```

#### 2. Run the Container
Start the container, passing the Groq API key and forwarding port `8000`:
```bash
docker run -d -p 8000:8000 --env-file ./api/.env impact-api
```
The API is now running inside Docker at `http://localhost:8000`. You can launch the local frontend to communicate with this containerized endpoint.
