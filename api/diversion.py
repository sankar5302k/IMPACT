import os
import requests
import json
import re
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

OSRM_URL = "http://router.project-osrm.org/route/v1/driving/"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
GEOCODE_MAPS_URL = "https://geocode.maps.co/reverse"

def get_location_info(lat: float, lon: float):
    headers = {'User-Agent': 'BangaloreTrafficPolicePlanner/1.0'}
    
    # Try Nominatim with high detail
    try:
        params = {
            'lat': lat, 'lon': lon, 'format': 'json', 'addressdetails': 1,
            'zoom': 18, 'namedetails': 1, 'extratags': 1, 'accept-language': 'en'
        }
        r = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=12)
        if r.status_code == 200:
            data = r.json()
            address = data.get('display_name')
            if address and len(address) > 20:
                return address
    except:
        pass

    # Fallback
    try:
        r = requests.get(GEOCODE_MAPS_URL, params={'lat': lat, 'lon': lon}, headers=headers, timeout=10)
        if r.status_code == 200:
            return r.json().get('display_name', f"{lat:.4f}, {lon:.4f}")
    except:
        pass

    return f"{lat:.4f}, {lon:.4f}"


def get_bypass_routes(incident_lat: float, incident_lon: float):
    """Generate sample routes around the incident point"""
    # Create 4 sample points around the incident (approx 3-6 km away)
    offset = 0.03  # ~3km
    sample_points = [
        (incident_lat + offset, incident_lon),      # North
        (incident_lat - offset, incident_lon),      # South
        (incident_lat, incident_lon + offset),      # East
        (incident_lat, incident_lon - offset),      # West
    ]
    
    all_routes = []
    for dest_lat, dest_lon in sample_points:
        try:
            origin = f"{incident_lon},{incident_lat}"
            dest = f"{dest_lon},{dest_lat}"
            r = requests.get(f"{OSRM_URL}{origin};{dest}", 
                           params={'alternatives': 'true', 'steps': 'true'}, timeout=10)
            data = r.json()
            if data.get('code') == 'Ok':
                all_routes.extend(data.get('routes', [])[:2])  # Take top 2 per direction
        except:
            continue
    
    return all_routes[:6]  # Limit total routes


def generate_police_diversion_plan(lat: float, lon: float, incident="Major road blockage / construction", manpower=0, barricades=0):
    address = get_location_info(lat, lon)
    print(f"Incident Location: {address}\n")
    
    routes = get_bypass_routes(lat, lon)
    
    if not routes:
        print("Could not fetch bypass routes.")
        return None

    # Prepare context
    context = f"Incident Location: {address} ({lat:.4f}, {lon:.4f})\nIncident Type: {incident}\n\n"
    for i, route in enumerate(routes[:4]):
        dist = route['distance'] / 1000
        time = route['duration'] / 60
        context += f"Bypass Option {i+1}: {dist:.1f} km ≈ {time:.0f} minutes\n"

    prompt = f"""
You are a senior Bangalore Traffic Police Inspector.

Create a professional **Traffic Diversion Plan** for complete traffic diversion around a single incident point.

Location: {address}
Incident: {incident}

Allocated Resources:
- Personnel: {manpower} officers
- Barricades: {barricades}

Available bypass route data:
{context}

Use this **exact format**:

**TRAFFIC DIVERSION PLAN - SINGLE POINT INCIDENT**

**1. Incident Summary**
- Location: ...
- Reason: ...

**2. Recommended Diversion Strategy**
- Primary Diversion Path: ...
- Secondary Diversion Path: ...

**3. Barricade / Blockage Points** (Where to place police barricades. Maximum {barricades} available)
- Point A: ...
- Point B: ...

**4. Diversion Points** (Where traffic police will stand and guide vehicles)
- Point 1: ...
- Point 2: ...

**5. Police Deployment Plan** (Distribute maximum {manpower} officers across key locations)
- Location | Personnel | Responsibility

**6. Step-by-Step Diversion Instructions** (for sign boards & announcements)
1. ...
2. ...

**7. Important Notes for Bangalore**
- Peak hour impact, nearby sensitive junctions, expected congestion points, etc.

Please be concise. Keep all descriptions short and bullet points brief, avoiding wordy text, to ensure that the entire plan (including the JSON block) fits within the output limits.

At the very end of your response, after Section 7, you MUST output a structured JSON block representing the map coordinates for all specified barricade points and police deployment (diversion) points.
Generate realistic latitude and longitude coordinates for each point. Since you know the incident is at ({lat:.4f}, {lon:.4f}), generate reasonable nearby coordinates (typically within 0.001 to 0.008 degrees of the incident location, e.g. at nearby street intersections or junctions).
The sum of barricade count in your JSON must not exceed {barricades}. The sum of officers in your JSON must not exceed {manpower}.
Format the JSON exactly like this, enclosed in '---JSON START---' and '---JSON END---':

---JSON START---
{{
  "barricades": [
     {{"name": "Richmond Road / Double Road Junction", "lat": 12.9602, "lon": 77.5901, "count": 2}}
  ],
  "police_deployments": [
     {{"name": "Richmond Circle", "lat": 12.9612, "lon": 77.5912, "officers": 3, "responsibility": "Diverting traffic towards Double Road"}}
  ]
}}
---JSON END---

Use real Bangalore road names, junctions, and landmarks. Be practical. DO NOT USE EMOJIS.
"""

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "system", 
                    "content": f"You are an experienced, concise Bangalore Traffic Police officer. You have {manpower} police officers and {barricades} barricades available as resources for the traffic diversion plan. Design the strategy, blockage/diversion points, and deployment plan strictly around these numbers. You must append a valid JSON block containing map markers at the end of the text. Always give clean, concise, professional output. DO NOT USE EMOJIS."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        plan = response.choices[0].message.content.strip()
        try:
            print("\n" + "="*90)
            print(plan)
            print("="*90)
        except Exception:
            try:
                print(plan.encode('ascii', 'ignore').decode('ascii'))
            except Exception:
                pass
        
        # Extract and parse JSON block
        map_data = {"barricades": [], "police_deployments": []}
        plan_text = plan
        
        json_match = re.search(r'---JSON START---(.*?)---JSON END---', plan, re.DOTALL)
        if json_match:
            try:
                json_str = json_match.group(1).strip()
                # Clean code fences if LLM generated them
                json_str = re.sub(r'^```json\s*', '', json_str)
                json_str = re.sub(r'\s*```$', '', json_str)
                map_data = json.loads(json_str)
                # Strip JSON from text plan to keep UI output clean
                plan_text = plan.replace(json_match.group(0), "").strip()
            except Exception as parse_err:
                print("Failed to parse LLM JSON map data:", parse_err)
                
        return {
            "text": plan_text,
            "map_data": map_data
        }
        
    except Exception as e:
        print("Groq Error:", e)
        return {
            "text": None,
            "map_data": {"barricades": [], "police_deployments": []}
        }


# ================== USAGE ==================
if __name__ == "__main__":
    # Your incident location
    lat = 13.125177
    lon = 80.224808

    print("🚨 Generating Police Traffic Diversion Plan (Single Location)...\n")
    
    generate_police_diversion_plan(
        lat=lat,
        lon=lon,
        incident="Major construction ",
        manpower=15,
        barricades=10
    )