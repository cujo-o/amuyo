
# Amuyo - AI Flood Warning & Evacuation Assistant
**A real-time flood warning system using Gemma 4 to analyze community photos, compute hydrodynamic risk, and multilingual voice warnings.**

![Amuyo Banner](https://img.shields.io/badge/Status-Active_Development-success)
![Model](https://img.shields.io/badge/AI_Engine-Gemma_4-blue)
![Framework](https://img.shields.io/badge/Framework-Next.js_14-black)

Amuyo is a mobile web app built to help people during sudden flood emergencies in vulnerable regions like Kogi and Lagos. Instead of relying on expensive ground sensors that get damaged or do not exist, Amuyo uses crowd-sourced photos to calculate flood depth, water pressure, electrical risks, and dynamic escape routes in real time.

---

## The Problem

Every rainy season, river basins and coastal states submerge within hours. People stranded in their homes face three immediate problems:
1. They cannot accurately judge water depth from a distance.
2. They do not know if underwater power lines or transformers are active and dangerous.
3. They lack immediate, street-level direction on where to evacuate safely.

---

## How It Works

1. **Photo Upload**: The user uploads a picture of the flooded road or building in front of them.
2. **Weather Integration**: The app automatically fetches live local weather data (temperature and rain precipitation) via the Open-Meteo API.
3. **Vision Analysis**: Gemma 4 (26B) analyzes visual reference markers in the image—like fence lines, doorframes, and submerged cars—to calculate:
   * Estimated water depth in meters
   * Hydrostatic pressure on nearby walls in kPa
   * Submerged structural damage percentage
   * Submerged electrical hazard level
4. **Actionable Evacuation Plan**: Gemma 4 generates clear, 8-word safety instructions based on the risk level. If conditions are critical, it prompts the user to call emergency services (112) immediately.
5. **3D Simulation & Hazard Routing**: The app generates a 3D digital twin of the water level and uses device GPS to plot a real-time escape route to higher ground.
6. **Multilingual Voice Broadcast**: The app converts warning text into local spoken dialects across four languages: English, Nigerian Pidgin, Yorùbá, and Igbo.

---

## Tech Stack

* **Frontend**: Next.js (React), TypeScript, Tailwind CSS
* **Mapping**: Leaflet, React-Leaflet, OSRM (Open Source Routing Machine)
* **3D Twin Rendering**: Three.js / Custom WebGL Visualizer
* **AI Model**: Google Gemma 4 26B (`gemma-4-26b-a4b-it`) via REST Endpoints
* **APIs**: Open-Meteo (Weather), Web Speech API (Voice Synthesis)

---

## Getting Started

### Prerequisites
* Node.js 18.x or higher
* npm or pnpm
* A Google Gemini API Key

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/your-username/amuyo.git](https://github.com/your-username/amuyo.git)
   cd amuyo

```

2. Install dependencies:
```bash
npm install

```


3. Set up environment variables:
Create a `.env.local` file in the root directory and add your API key:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_google_api_key_here

```


4. Run the development server:
```bash
npm run dev

```


5. Open `http://localhost:3000` in your browser.

---

## License

Distributed under the MIT License. See `LICENSE` for details.

```

```

   
Contributing:
Amuyo is an open-source initiative designed to scale predictive flooding warning systems globally without the need for expensive proprietary hardware. Pull requests focusing on additional African language synthesis, lighter 3D rendering, and enhanced weather API fallbacks are welcome.


