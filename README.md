
# Amuyo: Predictive Flooding Warning System
**Crowdsourced Telemetry, 3D Digital Twins, and Multilingual Disaster Dispatch powered by Gemma AI.**

![Amuyo Banner](https://img.shields.io/badge/Status-Active_Development-success)
![Model](https://img.shields.io/badge/AI_Engine-Gemma_4-blue)
![Framework](https://img.shields.io/badge/Framework-Next.js_14-black)

## The Mission
Across the continent, seasonal flooding destroys infrastructure and claims lives, largely due to a lack of predictive telemetry and localized warning systems. Traditional hardware sensors are expensive, sparse, and frequently destroyed during disasters. 

**Amuyo** transforms the citizen smartphone into a decentralized, intelligent monitoring node. By uploading a single photo of a flooded area, Amuyo's spatial engine evaluates the scene, predicts the evacuation window, assesses electrical hazards, renders a 3D digital twin of the environment, and synthesizes an immediate audio warning in the user's native dialect.

## Gemma AI Integration (The Core Engine)
Amuyo relies exclusively on **Gemma 4** (`gemma-4-26b-a4b-it`) as its central hydrological and spatial processing unit. It is not just used for text generation, but as a multimodal engineering tool:

* **Quantitative Hydrodynamics:** Gemma AI acts as a civil engineer, using visual anchors (submerged tires, doorframes) to estimate water depth and calculate hydrostatic pressure ($P = \rho g h$).
* **Electrical Hazard Detection:** Approaching the problem from an Electrical and Electronics Engineering perspective, the AI specifically scans for submerged distribution infrastructure to evaluate immediate electrocution risks.
* **Balanced JSON Extraction:** The system uses a mathematically robust, custom-built extraction algorithm to guarantee Gemma returns strict `application/json` data for the Next.js frontend, bypassing conversational markdown.
* **Native Multilingual Routing:** Gemma simultaneously synthesizes tactical action plans and public warnings in English, Nigerian Pidgin, Yorùbá, and Igbo.

## Technical Architecture & Speed Optimizations
To ensure the system works reliably in low-bandwidth disaster scenarios and bypasses standard serverless timeouts, Amuyo is heavily optimized:

* **Edge Runtime Inference:** The API route operates on Vercel's Edge network, entirely eliminating Node.js cold-start delays.
* **Client-Side Image Compression:** An HTML5 Canvas compressor intercepts the user's photo and reduces payloads by up to 80% *before* network transmission, ensuring rapid Gemma processing.
* **Dynamic 3D Rendering:** Uses React Three Fiber and Three.js to construct an abstract 3D visualizer that dynamically updates based on the water level (`estimatedWaterLevelMeters`) and risk score determined by Gemma.
* **Live Telemetry:** Integrates the Open-Meteo API for real-time precipitation tracking and HTML5 Geolocation to ground the predictive evacuation windows in reality.

## Tech Stack
* **Frontend:** Next.js (App Router), React, Tailwind CSS
* **3D Visualization:** React Three Fiber / Three.js
* **Geospatial Radar:** React-Leaflet & Open Source Routing Machine (OSRM)
* **AI Engine:** Google Gemma 4 via `@google/genai` SDK

## Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/amuyo.git](https://github.com/your-username/amuyo.git)
   cd amuyo

 * Install dependencies:
   npm install

 * Environment Setup:
   Create a .env.local file in the root directory and add your Google AI Studio API key:
   GEMINI_API_KEY="your_google_api_key_here"

 * Run the development server:
   npm run dev

 * Initialize System:
   Open http://localhost:3000 in your browser. Allow location permissions to enable live weather and GPS matrix tracking.
 Usage Guide
 * Launch the application and observe the System Status Matrix to verify GPS and weather uplinks.
 * Tap the upload module and select an image of a flooded environment.
 * The system will compress the image and run the Gemma 4 multimodal analysis.
 * Review the generated Hydrostatic Pressure (\text{kPa}), Electrical Risk, and 3D Visualizer.
 * Toggle the language button (🌐) to instantly switch the tactical action plans and voice broadcasts into Pidgin, Yorùbá, or Igbo.
 * In critical situations, an emergency override will prompt an immediate dialer link to 112.

   
Contributing:
Amuyo is an open-source initiative designed to scale predictive flooding warning systems globally without the need for expensive proprietary hardware. Pull requests focusing on additional African language synthesis, lighter 3D rendering, and enhanced weather API fallbacks are welcome.


