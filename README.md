# Smart Health — AI-Driven Health Centre & Supply Chain Management

Smart Health is a multilingual, AI-powered platform for real-time management of Primary
and Community Health Centres (PHCs/CHCs). It replaces manual tracking of medicine stock,
patient footfall, bed availability, doctor attendance, and diagnostic test availability
with a live, role-based system — and gives district administrators the visibility to
catch problems before they become shortages.

Built with [Google AI Studio](https://aistudio.google.com/).

---

## The Problem

PHCs and CHCs face recurring operational gaps — medicine stock-outs, unmanaged patient
footfall, bed unavailability, and unpredictable doctor attendance — all tracked manually
with no real-time visibility. This leads to shortages, overcrowding, and under-resourced
facilities that district administrators only find out about after the fact.

## The Solution

Smart Health provides four connected, role-based dashboards, backed by AI for triage,
forecasting, anomaly detection, and resource redistribution.

---

## Dashboards & Features

### 🧑‍🤝‍🧑 Patient Dashboard
- Multilingual interface with a persistent language selector
- Book same-day or next-day OPD tickets, department-wise, with live queue position
- **Voice-based triage**: tap a speaker icon to describe symptoms aloud — AI classifies
  the issue and auto-generates the correct department's OPD ticket (built for illiterate
  or low-literacy patients), with a manual override always available
- View and download diagnostic test reports and past visit history
- Check which diagnostic tests are available at their PHC/CHC before visiting

### 🩺 Doctor Dashboard
- Secure Wi-Fi-verified attendance: doctors can only check in/out while connected to the
  hospital's registered network, reducing unaccounted absences
- View assigned/admitted patients, treatment status, and linked lab reports
- Check department-wise bed availability at their own facility and at nearby
  higher-referral centres, for faster emergency referrals
- e-Prescriptions automatically deduct from live facility medicine inventory

### 🏥 Facility Administrator Dashboard
- Real-time medicine stock and inventory management with low-stock alerts
- AI-driven demand forecasting to predict upcoming stock-outs
- Patient footfall analytics (daily, department-wise, time-of-day)
- Bed occupancy tracking, department-wise
- Doctor attendance tracking (on-time, late, absent, incomplete shifts)
- Ambulance availability and live location tracking
- Diagnostic test availability audits

### 🏛️ District Administrator / Command Centre Dashboard
- District-wide map/list view of every PHC/CHC with a live "Health Centre Score"
  (green/yellow/red) combining stock health, attendance, bed occupancy, and footfall
- Auto-flagging of underperforming or at-risk facilities into a "Needs Attention" queue
- **Smart Resource Redistribution Engine**: recommends specific medicine transfers between
  facilities based on surplus, shortage, and distance
- Outbreak signal detection via symptom-cluster analysis across nearby facilities
- Cross-facility comparison charts, exportable as PDF/CSV

---

## What Makes This Unique

- **Voice-first accessibility** for illiterate and low-literacy patients — no reading or
  typing required to get to the right department
- **District-level command centre** that closes the loop the brief asks for: not just
  facility-level dashboards, but automatic flagging and redistribution across an entire
  district's PHCs/CHCs
- **Smart Resource Redistribution Engine** that turns stock-out warnings into an
  actionable, one-click transfer recommendation instead of just an alert
- **Outbreak signal detection** built from routine footfall and symptom data, with no
  extra reporting burden on staff
- Designed for real deployment conditions: multilingual by default, high-contrast and
  large-tap-target UI, and considerations for low-connectivity/offline use

---

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **AI**: Google Gemini API (via `@google/genai`) for symptom triage, forecasting, and
  redistribution recommendations
- **Styling**: CSS / Tailwind (adjust based on what AI Studio generated)
- **Data**: Mock/in-memory or local JSON for the prototype (no external DB required for
  demo purposes)


## Contributing

Contributions, issues, and feature
suggestions are welcome — feel free to open an issue or submit a pull request.

---

## License

MIT License 
