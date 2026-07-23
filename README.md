
# 🏥 Smart Health
 
**An AI-powered platform for real-time management of Primary and Community Health Centres (PHCs/CHCs) in India.**
 
Smart Health brings together medicine stock forecasting, patient flow tracking, doctor attendance verification, and diagnostic audits into one role-based, multilingual dashboard — built for the realities of India's public healthcare infrastructure.
 
---
 
## 🚀 Overview
 
India's PHCs and CHCs are often the first (and only) point of contact for healthcare in rural and semi-urban areas, yet they're commonly run with paper registers, manual stock counts, and no real-time visibility into staffing or patient load. Smart Health digitizes this workflow with a single, AI-assisted system that gives administrators, doctors, and patients a live view of what's happening on the ground.
 
Built as a hackathon project, the app is powered by the Gemini API for AI-driven insights and forecasting.
 
## ✨ Key Features
 
- **💊 Medicine Stock Monitoring** — Real-time inventory tracking with AI-based demand forecasting to reduce stockouts and overstocking.
- **🛏️ Patient Footfall & Bed Availability** — Live tracking of patient inflow and bed occupancy to help staff plan capacity.
- **📶 Wi-Fi–Verified Doctor Attendance** — Secure, location-aware attendance verification to ensure accountability at facilities.
- **🧪 Diagnostic Test Audits** — Tracking and auditing of diagnostic tests to improve transparency and turnaround.
- **👥 Role-Based Dashboards** — Tailored views and permissions for Patients, Doctors, and Administrators.
- **🌐 Multilingual Support** — Designed for accessibility across India's diverse linguistic landscape.
## 🛠️ Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Express, tsx, esbuild |
| AI | Google Gemini API (`@google/genai`) |
| Data Viz | D3.js, Recharts |
| UI/Animation | lucide-react, Motion |
 
This project was scaffolded from Google AI Studio and is fully runnable locally.
 
## 📦 Getting Started
 
### Prerequisites
 
- [Node.js](https://nodejs.org/) (LTS recommended)
- A [Gemini API key](https://aistudio.google.com/apikey)
### Installation
 
1. **Clone the repository**
```bash
   git clone https://github.com/abhayvermadev/smart-health-ai.git
   cd smart-health-ai
```
 
2. **Install dependencies**
```bash
   npm install
```
 
3. **Configure environment variables**
   Create a `.env.local` file in the project root (see `.env.example` for reference) and add your Gemini API key:
```
   GEMINI_API_KEY=your_api_key_here
```
 
4. **Run the app locally**
```bash
   npm run dev
```
 
### Other Scripts
 
| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build the client and bundle the server for production |
| `npm start` | Run the production build |
| `npm run lint` | Type-check the project with `tsc` |
| `npm run clean` | Remove build artifacts |
 
## 📁 Project Structure
 
```
smart-health-ai/
├── src/              # Frontend application source
├── server.ts         # Express backend entry point
├── index.html        # App entry HTML
├── vite.config.ts     # Vite configuration
├── .env.example        # Environment variable template
└── package.json
```
 
## 🎯 Use Case
 
Smart Health was built to address a real gap in India's public health system: the lack of real-time, data-driven visibility at the PHC/CHC level. By combining low-friction digitization with AI forecasting, it aims to help small facilities operate with the same situational awareness as larger hospitals — without requiring heavy infrastructure or training overhead.
 
## 🤝 Contributing
 
This project started as a hackathon build and is open to further development. Issues and pull requests are welcome.
 
## 📄 License
 
No license has been specified yet. If you intend for others to reuse this code, consider adding a license file (e.g., MIT).
 
---
 
*Built by [Abhay Verma](https://github.com/abhayvermadev).*
