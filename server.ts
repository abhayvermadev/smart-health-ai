import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK safely
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY is not defined. AI features will fallback to deterministic rules.");
}

// Helper to call Gemini with a fallback model if the primary is busy/rate-limited
async function generateTextWithFallback(
  aiInstance: GoogleGenAI,
  contents: string,
  responseMimeType?: string
): Promise<string> {
  const models = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await aiInstance.models.generateContent({
        model,
        contents,
        config: responseMimeType ? { responseMimeType } : undefined,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Warn] Model ${model} generation failed: ${err?.message || err}`);
    }
  }
  throw lastError || new Error("All fallback models failed.");
}

// Global In-Memory Stateful DB for Hackathon Demo
interface Medicine {
  id: string;
  name: string;
  stock: number;
  minThreshold: number;
  unit: string;
  category: string;
}

interface Facility {
  id: string;
  name: string;
  type: "PHC" | "CHC";
  distance: number; // in km from Central CHC
  inventory: Record<string, number>; // medId -> stock count
}

interface Bed {
  department: "General" | "ICU" | "Pediatric" | "Maternity";
  total: number;
  occupied: number;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  facilityId: string;
  wifiSsid: string;
  attendance: {
    clockIn: string | null;
    clockOut: string | null;
    wifiVerified: boolean;
  };
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  facilityId: string;
  department: string;
  doctorId: string | null;
  status: "OPD_Pending" | "OPD_Treated" | "Admitted" | "Discharged" | "Referred";
  ticketNumber: string;
  date: string;
  symptoms: string;
  language: string;
  reports: {
    testName: string;
    date: string;
    result: string;
    status: "Pending" | "Ready";
    pdfUrl?: string;
  }[];
  prescribedMeds: {
    medId: string;
    name: string;
    dosage: string;
    duration: string;
  }[];
}

interface Ambulance {
  id: string;
  plateNumber: string;
  status: "Available" | "En-Route" | "Maintenance";
  location: string;
  assignedPatientId: string | null;
}

// Master Medicines list
const MEDICINES: Record<string, Medicine> = {
  "med-1": { id: "med-1", name: "Paracetamol 500mg", stock: 1200, minThreshold: 300, unit: "Tablets", category: "Analgesic" },
  "med-2": { id: "med-2", name: "Amoxicillin 250mg", stock: 800, minThreshold: 200, unit: "Capsules", category: "Antibiotic" },
  "med-3": { id: "med-3", name: "Ibuprofen 400mg", stock: 600, minThreshold: 150, unit: "Tablets", category: "Analgesic" },
  "med-4": { id: "med-4", name: "Cetirizine 10mg", stock: 1000, minThreshold: 250, unit: "Tablets", category: "Antihistamine" },
  "med-5": { id: "med-5", name: "Metformin 500mg", stock: 950, minThreshold: 200, unit: "Tablets", category: "Antidiabetic" },
  "med-6": { id: "med-6", name: "ORS Hydration Powder", stock: 1500, minThreshold: 400, unit: "Sachets", category: "Electrolytes" },
  "med-7": { id: "med-7", name: "Azithromycin 500mg", stock: 150, minThreshold: 100, unit: "Tablets", category: "Antibiotic" },
  "med-8": { id: "med-8", name: "Salbutamol Inhaler", stock: 45, minThreshold: 30, unit: "Inhalers", category: "Bronchodilator" },
  "med-9": { id: "med-9", name: "Artesunate Injection", stock: 30, minThreshold: 25, unit: "Vials", category: "Antimalarial" },
};

// Initial Seed Data
const INITIAL_FACILITIES: Facility[] = [
  {
    id: "fac-1",
    name: "Central CHC (Community Health Centre)",
    type: "CHC",
    distance: 0,
    inventory: { "med-1": 650, "med-2": 450, "med-3": 350, "med-4": 550, "med-5": 500, "med-6": 800, "med-7": 90, "med-8": 25, "med-9": 20 }
  },
  {
    id: "fac-2",
    name: "North PHC (Primary Health Centre)",
    type: "PHC",
    distance: 12,
    inventory: { "med-1": 150, "med-2": 80, "med-3": 40, "med-4": 150, "med-5": 120, "med-6": 300, "med-7": 10, "med-8": 5, "med-9": 2 } // critical shortage
  },
  {
    id: "fac-3",
    name: "East PHC (Primary Health Centre)",
    type: "PHC",
    distance: 18,
    inventory: { "med-1": 320, "med-2": 210, "med-3": 180, "med-4": 220, "med-5": 250, "med-6": 320, "med-7": 40, "med-8": 12, "med-9": 6 }
  },
  {
    id: "fac-4",
    name: "South PHC (Primary Health Centre)",
    type: "PHC",
    distance: 25,
    inventory: { "med-1": 80, "med-2": 60, "med-3": 30, "med-4": 80, "med-5": 80, "med-6": 80, "med-7": 10, "med-8": 3, "med-9": 2 } // critical stock-out alerts
  }
];

const INITIAL_BEDS: Record<string, Bed[]> = {
  "fac-1": [
    { department: "General", total: 40, occupied: 32 },
    { department: "ICU", total: 8, occupied: 6 },
    { department: "Pediatric", total: 10, occupied: 5 },
    { department: "Maternity", total: 12, occupied: 9 }
  ],
  "fac-2": [
    { department: "General", total: 6, occupied: 5 },
    { department: "Pediatric", total: 2, occupied: 1 },
    { department: "Maternity", total: 4, occupied: 3 }
  ],
  "fac-3": [
    { department: "General", total: 8, occupied: 4 },
    { department: "Pediatric", total: 3, occupied: 1 },
    { department: "Maternity", total: 4, occupied: 2 }
  ],
  "fac-4": [
    { department: "General", total: 6, occupied: 6 }, // Full
    { department: "Pediatric", total: 2, occupied: 2 }, // Full
    { department: "Maternity", total: 3, occupied: 2 }
  ]
};

const INITIAL_DOCTORS: Doctor[] = [
  { id: "doc-1", name: "Dr. Ananya Sharma", specialty: "General Medicine", department: "General OPD", facilityId: "fac-1", wifiSsid: "Central_CHC_Staff_Secure", attendance: { clockIn: "08:15 AM", clockOut: null, wifiVerified: true } },
  { id: "doc-2", name: "Dr. Rajesh Varma", specialty: "Pediatrics", department: "Pediatric OPD", facilityId: "fac-1", wifiSsid: "Central_CHC_Staff_Secure", attendance: { clockIn: "08:30 AM", clockOut: null, wifiVerified: true } },
  { id: "doc-3", name: "Dr. Kabir Malhotra", specialty: "Gynecology & Maternity", department: "Maternity OPD", facilityId: "fac-1", wifiSsid: "Central_CHC_Staff_Secure", attendance: { clockIn: null, clockOut: null, wifiVerified: false } },
  { id: "doc-4", name: "Dr. Suresh Patil", specialty: "Primary Care / Generalist", department: "General OPD", facilityId: "fac-2", wifiSsid: "North_PHC_Secure_WiFi", attendance: { clockIn: "08:02 AM", clockOut: null, wifiVerified: true } },
  { id: "doc-5", name: "Dr. Meera Deshmukh", specialty: "Primary Care / Pediatrics", department: "General OPD", facilityId: "fac-3", wifiSsid: "East_PHC_Guest_WiFi", attendance: { clockIn: null, clockOut: null, wifiVerified: false } },
  { id: "doc-6", name: "Dr. Robert D'Souza", specialty: "General Medicine", department: "General OPD", facilityId: "fac-4", wifiSsid: "South_PHC_Internal", attendance: { clockIn: "09:12 AM", clockOut: null, wifiVerified: true } }
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: "pat-1",
    name: "Ramesh Kumar",
    age: 42,
    gender: "Male",
    facilityId: "fac-1",
    department: "General OPD",
    doctorId: "doc-1",
    status: "OPD_Treated",
    ticketNumber: "OPD-1024",
    date: "2026-07-08",
    symptoms: "High fever for 3 days, body aches, shivering, headache.",
    language: "en",
    reports: [
      { testName: "Complete Blood Count (CBC)", date: "2026-07-08", result: "Platelets: 160k (Normal), WBC: 8.5k (Normal)", status: "Ready" },
      { testName: "Rapid Malaria & Dengue Test", date: "2026-07-08", result: "Dengue NS1 Antigen: POSITIVE", status: "Ready" }
    ],
    prescribedMeds: [
      { medId: "med-1", name: "Paracetamol 500mg", dosage: "1-1-1 (After Meals)", duration: "5 days" },
      { medId: "med-6", name: "ORS Hydration Powder", dosage: "1 packet in 1L water (drink slowly)", duration: "3 days" }
    ]
  },
  {
    id: "pat-2",
    name: "Sunita Devi",
    age: 29,
    gender: "Female",
    facilityId: "fac-2",
    department: "Maternity OPD",
    doctorId: null,
    status: "OPD_Pending",
    ticketNumber: "OPD-1025",
    date: "2026-07-08",
    symptoms: "Routine 3rd-trimester pregnancy checkup, mild lower back pain.",
    language: "hi",
    reports: [
      { testName: "Obstetric Ultrasound", date: "2026-07-07", result: "Normal fetal growth, 32 weeks gestation, adequate amniotic fluid.", status: "Ready" }
    ],
    prescribedMeds: []
  },
  {
    id: "pat-3",
    name: "Aarav Sharma",
    age: 6,
    gender: "Male",
    facilityId: "fac-1",
    department: "Pediatric OPD",
    doctorId: "doc-2",
    status: "Admitted",
    ticketNumber: "OPD-1026",
    date: "2026-07-08",
    symptoms: "Severe vomiting, diarrhea, dry lips, lethargy.",
    language: "en",
    reports: [
      { testName: "Serum Electrolytes Test", date: "2026-07-08", result: "Sodium: 132 mEq/L (Low), Potassium: 3.2 mEq/L (Low)", status: "Ready" }
    ],
    prescribedMeds: [
      { medId: "med-6", name: "ORS Hydration Powder", dosage: "Ad libitum, continuous sips", duration: "2 days" },
      { medId: "med-2", name: "Amoxicillin 250mg", dosage: "1-0-1 (Liquid suspension 5ml)", duration: "5 days" }
    ]
  },
  {
    id: "pat-4",
    name: "Mohammad Ali",
    age: 56,
    gender: "Male",
    facilityId: "fac-4",
    department: "General OPD",
    doctorId: "doc-6",
    status: "OPD_Pending",
    ticketNumber: "OPD-1027",
    date: "2026-07-08",
    symptoms: "Chest congestion, chronic cough, shortness of breath on exertion.",
    language: "en",
    reports: [
      { testName: "Sputum AFB", date: "2026-07-08", result: "Negative for Acid Fast Bacilli", status: "Ready" }
    ],
    prescribedMeds: []
  }
];

const INITIAL_AMBULANCES: Ambulance[] = [
  { id: "amb-1", plateNumber: "MH-12-HE-5512", status: "Available", location: "Central CHC (Community Health Centre)", assignedPatientId: null },
  { id: "amb-2", plateNumber: "MH-12-HE-9944", status: "En-Route", location: "North PHC -> Central CHC", assignedPatientId: "pat-2" },
  { id: "amb-3", plateNumber: "MH-12-HE-3311", status: "Available", location: "South PHC (Primary Health Centre)", assignedPatientId: null }
];

// Active State
let db = {
  facilities: JSON.parse(JSON.stringify(INITIAL_FACILITIES)) as Facility[],
  beds: JSON.parse(JSON.stringify(INITIAL_BEDS)) as Record<string, Bed[]>,
  doctors: JSON.parse(JSON.stringify(INITIAL_DOCTORS)) as Doctor[],
  patients: JSON.parse(JSON.stringify(INITIAL_PATIENTS)) as Patient[],
  ambulances: JSON.parse(JSON.stringify(INITIAL_AMBULANCES)) as Ambulance[],
  medicines: JSON.parse(JSON.stringify(MEDICINES)) as Record<string, Medicine>
};

// API Route: Reset State
app.post("/api/state/reset", (req, res) => {
  db = {
    facilities: JSON.parse(JSON.stringify(INITIAL_FACILITIES)),
    beds: JSON.parse(JSON.stringify(INITIAL_BEDS)),
    doctors: JSON.parse(JSON.stringify(INITIAL_DOCTORS)),
    patients: JSON.parse(JSON.stringify(INITIAL_PATIENTS)),
    ambulances: JSON.parse(JSON.stringify(INITIAL_AMBULANCES)),
    medicines: JSON.parse(JSON.stringify(MEDICINES))
  };
  res.json({ message: "Database reset to initial demo seeds successfully", db });
});

// API Route: Get State
app.get("/api/state", (req, res) => {
  res.json(db);
});

// API Route: Patient OPD ticket booking (AI symptom classification & translation)
app.post("/api/patient/book-opd", async (req, res) => {
  const { name, age, gender, facilityId, symptoms, language } = req.body;

  if (!name || !facilityId || !symptoms) {
    return res.status(400).json({ error: "Missing required booking details." });
  }

  const facility = db.facilities.find(f => f.id === facilityId);
  const facilityName = facility ? facility.name : "Selected Hospital";

  const nextIdNum = db.patients.length + 1;
  const patientId = `pat-${nextIdNum}`;
  const ticketNumber = `OPD-${1024 + nextIdNum}`;

  let assignedDept = "General OPD";
  let suggestedDoctorId: string | null = null;
  let urgency: "Routine" | "Moderate" | "Emergency" = "Routine";
  let aiInsights = "Symptom analysis is complete.";
  let suggestedTests: string[] = [];

  if (ai) {
    try {
      const prompt = `
        Analyze the following patient health complaints and symptoms.
        Patient Name: ${name}
        Age: ${age}
        Gender: ${gender}
        Symptoms: "${symptoms}"
        Preferred Language Code: ${language || "en"}
        
        Assign the most relevant hospital department from these options: 
        ["General OPD", "Pediatric OPD", "Maternity OPD", "Gynecology OPD", "Orthopedic OPD", "Dermatology OPD", "Ophthalmology OPD", "ENT OPD", "Cardiology OPD"].
        
        Based on the severity, designate Urgency as "Routine", "Moderate", or "Emergency".
        List 1-3 diagnostic tests that should be advised before seeing the doctor based on these symptoms.
        
        CRITICAL MULTILINGUAL INSTRUCTION:
        Analyze the "Symptoms" and the "Preferred Language Code".
        - If the Symptoms are written in Hindi (using Devanagari script or containing phrases like 'दर्द', 'बुखार', 'उल्टी') OR the Preferred Language Code is "hi", you MUST write the "advisory" response strictly in Devanagari Hindi (हिन्दी).
        - If the Symptoms are written in Marathi (using Devanagari script or containing phrases like 'ताप', 'दुखणे') OR the Preferred Language Code is "mr", you MUST write the "advisory" response strictly in Devanagari Marathi (मराठी).
        - Otherwise, write the "advisory" in English.
        Provide a warm, reassuring, and professional 1-2 sentence supportive clinical advisory message in that language.
        (Do NOT translate the "department" or "suggestedTests" string values to keep the database classifications consistent; only translate the "advisory" message).

        Return ONLY a JSON object with this EXACT structure (no other markdown or text wrapping):
        {
          "department": "assigned department here",
          "urgency": "Routine/Moderate/Emergency",
          "suggestedTests": ["Test 1", "Test 2"],
          "advisory": "Supportive patient guidance in Hindi, Marathi, or English here"
        }
      `;

      const text = await generateTextWithFallback(ai, prompt, "application/json");

      const responseText = text.trim() || "{}";
      const parsedAi = JSON.parse(responseText);

      if (parsedAi.department) assignedDept = parsedAi.department;
      if (parsedAi.urgency) urgency = parsedAi.urgency;
      if (parsedAi.suggestedTests) suggestedTests = parsedAi.suggestedTests;
      if (parsedAi.advisory) aiInsights = parsedAi.advisory;
    } catch (err: any) {
      console.log("[Info] Gemini OPD routing fallback active. Using local clinical heuristics.");
      // Fallback deterministic logic
      if (age <= 12) assignedDept = "Pediatric OPD";
      else if (gender === "Female" && (symptoms.toLowerCase().includes("pregnant") || symptoms.toLowerCase().includes("maternity") || symptoms.toLowerCase().includes("pregnancy"))) {
        assignedDept = "Maternity OPD";
      } else if (symptoms.toLowerCase().includes("heart") || symptoms.toLowerCase().includes("chest pain")) {
        assignedDept = "Cardiology OPD";
        urgency = "Emergency";
      }
    }
  } else {
    // Deterministic fallback if API key is not ready
    if (age <= 12) assignedDept = "Pediatric OPD";
    else if (gender === "Female" && (symptoms.toLowerCase().includes("pregnant") || symptoms.toLowerCase().includes("pregnancy") || symptoms.toLowerCase().includes("maternity"))) {
      assignedDept = "Maternity OPD";
    }
    suggestedTests = ["Vitals Check-up (Blood Pressure, Temp, HR)"];
    aiInsights = "Please check in at the counter. A doctor will attend to you shortly.";
  }

  // Find a doctor in that department at the facility, or fallback
  const availableDocs = db.doctors.filter(d => d.facilityId === facilityId && d.attendance.clockIn !== null);
  if (availableDocs.length > 0) {
    // Match department if possible
    const deptDoc = availableDocs.find(d => d.department.toLowerCase().includes(assignedDept.split(" ")[0].toLowerCase()));
    suggestedDoctorId = deptDoc ? deptDoc.id : availableDocs[0].id;
  } else {
    // Assign any doctor registered to this facility
    const facilityDocs = db.doctors.filter(d => d.facilityId === facilityId);
    suggestedDoctorId = facilityDocs.length > 0 ? facilityDocs[0].id : null;
  }

  const reports = suggestedTests.map(test => ({
    testName: test,
    date: new Date().toISOString().split("T")[0],
    result: "Pending lab sample collection",
    status: "Pending" as const
  }));

  const newPatient: Patient = {
    id: patientId,
    name,
    age: parseInt(age) || 30,
    gender,
    facilityId,
    department: assignedDept,
    doctorId: suggestedDoctorId,
    status: "OPD_Pending",
    ticketNumber,
    date: new Date().toISOString().split("T")[0],
    symptoms,
    language: language || "en",
    reports,
    prescribedMeds: []
  };

  db.patients.push(newPatient);

  res.json({
    success: true,
    patient: newPatient,
    urgency,
    aiInsights,
    doctor: db.doctors.find(d => d.id === suggestedDoctorId) || null
  });
});

// API Route: Convert audio simulation to text & get symptoms
app.post("/api/speech-to-symptoms", async (req, res) => {
  const { sampleId, language } = req.body;

  // Since we are running in an environment where speech input might be simulated,
  // we provide rich pre-recorded localized symptom texts for the user to hear/test.
  const AUDIO_SAMPLES: Record<string, Record<string, string>> = {
    sample1: {
      en: "My child is running a very high fever since yesterday night and is continuously coughing and refusing to eat anything.",
      hi: "मेरे बच्चे को कल रात से बहुत तेज बुखार है, वह लगातार खांस रहा है और कुछ भी खाने से मना कर रहा है।",
      mr: "माझ्या मुलाला काल रात्रीपासून खूप ताप आला आहे, तो सतत खोकत आहे आणि काहीही खाण्यास नकार देत आहे।"
    },
    sample2: {
      en: "I am feeling severe stomach pain and dizziness for the last few hours, and I have vomited twice.",
      hi: "मुझे पिछले कुछ घंटों से पेट में तेज दर्द और चक्कर आ रहे हैं, और दो बार उल्टी भी हो चुकी है।",
      mr: "मला गेल्या काही तासांपासून पोटात तीव्र वेदना आणि चक्कर येत आहेत, आणि दोनदा उलट्या झाल्या आहेत।"
    },
    sample3: {
      en: "I am eight months pregnant and having mild chest congestion, but I want to make sure my routine baby checkup is on schedule.",
      hi: "मैं आठ महीने की गर्भवती हूं और मुझे छाती में हल्का जमाव महसूस हो रहा है, लेकिन मैं यह सुनिश्चित करना चाहती हूं कि मेरे बच्चे की नियमित जांच समय पर हो।",
      mr: "मी आठ महिन्यांची गरोदर आहे आणि छातीत थोडी जळजळ होत आहे, परंतु मला खात्री करायची आहे की माझ्या बाळाची नियमित तपासणी वेळेवर होईल।"
    }
  };

  const text = AUDIO_SAMPLES[sampleId]?.[language || "en"] || "I am feeling unwell.";
  res.json({ text });
});

// API Route: Doctor Wifi Attendance
app.post("/api/doctor/attendance", (req, res) => {
  const { doctorId, wifiSsid, action } = req.body; // action: 'clockIn' | 'clockOut'

  if (!doctorId || !wifiSsid) {
    return res.status(400).json({ error: "Missing doctor or network configuration." });
  }

  const doctor = db.doctors.find(d => d.id === doctorId);
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found." });
  }

  // Attendance is strictly secured over the specific hospital staff wifi network
  const isWifiVerified = wifiSsid === doctor.wifiSsid;

  const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (action === "clockIn") {
    doctor.attendance.clockIn = timeString;
    doctor.attendance.wifiVerified = isWifiVerified;
  } else {
    doctor.attendance.clockOut = timeString;
    doctor.attendance.wifiVerified = isWifiVerified;
  }

  res.json({
    success: true,
    doctor,
    isWifiVerified,
    message: isWifiVerified 
      ? `Successfully authenticated over ${wifiSsid}!` 
      : `Verification Warning: SSID '${wifiSsid}' does not match security protocol '${doctor.wifiSsid}'. Attendance marked with unverified badge.`
  });
});

// API Route: Doctor Prescribe Meds (Updates stock in real-time)
app.post("/api/doctor/prescribe", (req, res) => {
  const { patientId, prescriptions } = req.body; // prescriptions: [{ medId, dosage, duration }]

  if (!patientId || !prescriptions || !Array.isArray(prescriptions)) {
    return res.status(400).json({ error: "Missing prescription fields." });
  }

  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: "Patient not found." });
  }

  const facility = db.facilities.find(f => f.id === patient.facilityId);
  if (!facility) {
    return res.status(404).json({ error: "Facility not found." });
  }

  const resultPrescriptions = [];

  for (const item of prescriptions) {
    const med = db.medicines[item.medId];
    if (!med) continue;

    // Real-time stock update
    const currentStock = facility.inventory[item.medId] || 0;
    const qtyToDeduct = 15; // default pack count for prescription
    const newStock = Math.max(0, currentStock - qtyToDeduct);
    facility.inventory[item.medId] = newStock;

    // Maintain global total stock tally for demo
    med.stock = Math.max(0, med.stock - qtyToDeduct);

    const prescDetails = {
      medId: item.medId,
      name: med.name,
      dosage: item.dosage,
      duration: item.duration
    };

    resultPrescriptions.push(prescDetails);
    patient.prescribedMeds.push(prescDetails);
  }

  patient.status = "OPD_Treated";

  res.json({
    success: true,
    patient,
    facilityInventory: facility.inventory,
    message: "Prescription recorded and pharmacy inventory decremented in real-time."
  });
});

// API Route: Mark Patient as Seen (OPD_Treated)
app.post("/api/doctor/mark-seen", (req, res) => {
  const { patientId } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: "Missing patientId." });
  }

  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: "Patient not found." });
  }

  patient.status = "OPD_Treated";

  res.json({
    success: true,
    patient,
    message: "Patient successfully marked as seen and treated."
  });
});

// API Route: AI Medicine Dosage Suggestion Tool
app.post("/api/doctor/suggest-dosage", async (req, res) => {
  const { age, weight, medicineName, symptoms, history } = req.body;
  
  let suggestedDosage = "1-0-1 (After meals)";
  let suggestedDuration = "5 days";
  let explanation = "Standard dose based on generic clinical guidelines.";

  if (ai) {
    try {
      const prompt = `
        You are an AI clinical pharmacology advisor. 
        Recommend a safe and standard dosage frequency and duration for:
        Medicine: ${medicineName}
        Patient Age: ${age} years old
        Patient Weight: ${weight ? weight + " kg" : "Not provided"}
        Symptoms: ${symptoms}
        Medical History / Chronic Conditions: ${history || "None reported"}

        Ensure the dosage is safe for pediatric patients (if age <= 12) or geriatric patients (if age >= 65), taking into account the weight if provided.
        Return ONLY a JSON response in this EXACT format (no other text, markdown blocks, or backticks):
        {
          "dosage": "dosage frequency e.g. 1-0-1 (after meals)",
          "duration": "duration e.g. 5 days",
          "explanation": "A very brief 1-sentence clinical explanation for this recommendation."
        }
      `;

      const text = await generateTextWithFallback(ai, prompt, "application/json");
      const parsed = JSON.parse(text.trim() || "{}");
      if (parsed.dosage) suggestedDosage = parsed.dosage;
      if (parsed.duration) suggestedDuration = parsed.duration;
      if (parsed.explanation) explanation = parsed.explanation;
    } catch (err: any) {
      console.log("[Info] Dosage suggestions AI fallback active.");
    }
  }

  // Local expert clinical ruleset fallback
  if (!ai || suggestedDosage === "1-0-1 (After meals)") {
    const medLower = (medicineName || "").toLowerCase();
    const isPediatric = parseInt(age) <= 12;
    const patientWeight = parseFloat(weight) || (isPediatric ? 20 : 60);

    if (medLower.includes("paracetamol")) {
      if (isPediatric) {
        const mg = Math.round(15 * patientWeight);
        suggestedDosage = `${mg}mg liquid syrup (as needed, max 4 times daily)`;
        suggestedDuration = "3 days";
        explanation = `Pediatric dosage of 15mg/kg calculated for child weighing ${patientWeight}kg.`;
      } else {
        suggestedDosage = "500mg tablet (1-0-1, or SOS every 6 hours after meals)";
        suggestedDuration = "3-5 days";
        explanation = "Standard adult antipyretic dose for fever or pain management.";
      }
    } else if (medLower.includes("amoxicillin") || medLower.includes("azithromycin") || medLower.includes("cefixime")) {
      if (isPediatric) {
        suggestedDosage = "125mg/5ml suspension (1-0-1, twice daily after meals)";
        suggestedDuration = "5 days";
        explanation = "Pediatric antibiotic dosage tailored to pediatric safety standards.";
      } else {
        suggestedDosage = "500mg capsule (1-0-1, or once daily if Azithromycin)";
        suggestedDuration = "5 days";
        explanation = "Full adult antibacterial course for acute infections.";
      }
    } else if (medLower.includes("salbutamol") || medLower.includes("cetirizine")) {
      if (isPediatric) {
        suggestedDosage = "1 puff / 2.5ml syrup once daily at night";
        suggestedDuration = "5 days";
        explanation = "Low dose antihistamine/bronchodilator for pediatric respiratory comfort.";
      } else {
        suggestedDosage = "1 tablet (0-0-1) at night before sleep";
        suggestedDuration = "7 days";
        explanation = "Adult antihistamine dose to manage allergic rhinitis with minimal daytime drowsiness.";
      }
    } else if (medLower.includes("iron") || medLower.includes("folic")) {
      suggestedDosage = "1 tablet (1-0-0) daily in the morning after breakfast";
      suggestedDuration = "30 days";
      explanation = "Nutritional replenishment dose for anemia management.";
    } else if (medLower.includes("metformin")) {
      suggestedDosage = "500mg tablet (1-0-1) with meals";
      suggestedDuration = "30 days";
      explanation = "Standard maintenance dose for glycemic control. Monitor blood sugar regularly.";
    }
  }

  res.json({
    success: true,
    dosage: suggestedDosage,
    duration: suggestedDuration,
    explanation
  });
});

// API Route: Patient QR Code Check-In
app.post("/api/patient/check-in", (req, res) => {
  const { patientId } = req.body;
  if (!patientId) {
    return res.status(400).json({ error: "Missing patientId for check-in." });
  }

  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: "Patient not found." });
  }

  patient.status = "OPD_Pending";
  (patient as any).arrived = true;
  (patient as any).checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  res.json({
    success: true,
    patient,
    message: "Check-in successful! Status updated to 'Arrived' on doctor dashboard."
  });
});

// API Route: Service Worker dynamic script
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    const CACHE_NAME = 'smart-health-offline-cache-v1';
    const urlsToCache = [
      '/',
      '/index.html',
      '/src/main.tsx',
      '/src/index.css',
      '/src/App.tsx'
    ];

    self.addEventListener('install', event => {
      event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
          return cache.addAll(urlsToCache).catch(err => {
            console.log("Service Worker caching initial urls failed:", err);
          });
        })
      );
    });

    self.addEventListener('fetch', event => {
      event.respondWith(
        fetch(event.request).catch(() => {
          return caches.match(event.request).then(response => {
            if (response) {
              return response;
            }
            if (event.request.url.includes('/api/state')) {
              return new Response(JSON.stringify({ offline: true }), {
                headers: { 'Content-Type': 'application/json' }
              });
            }
          });
        })
      );
    });
  `);
});

// API Route: Cross-hospital Referral & Bed Booking
app.post("/api/doctor/refer", (req, res) => {
  const { patientId, targetFacilityId, targetDepartment, reason } = req.body;

  if (!patientId || !targetFacilityId || !targetDepartment) {
    return res.status(400).json({ error: "Missing referral details." });
  }

  const patient = db.patients.find(p => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: "Patient not found." });
  }

  const sourceFacility = db.facilities.find(f => f.id === patient.facilityId);
  const targetFacility = db.facilities.find(f => f.id === targetFacilityId);

  if (!sourceFacility || !targetFacility) {
    return res.status(404).json({ error: "Hospital facility configuration invalid." });
  }

  // Book bed at higher center
  const targetBeds = db.beds[targetFacilityId];
  if (!targetBeds) {
    return res.status(400).json({ error: "No bed configuration for target hospital." });
  }

  const bedCategory = targetBeds.find(b => b.department === targetDepartment || b.department === "General");
  if (!bedCategory || bedCategory.occupied >= bedCategory.total) {
    return res.status(400).json({ error: `Referral Failed: Bed unavailable in ${targetDepartment} at ${targetFacility.name}.` });
  }

  // Decrement bed in current hospital (if admitted)
  if (patient.status === "Admitted") {
    const sourceBeds = db.beds[patient.facilityId];
    if (sourceBeds) {
      const sourceBedCat = sourceBeds.find(b => b.department === "General");
      if (sourceBedCat && sourceBedCat.occupied > 0) sourceBedCat.occupied--;
    }
  }

  // Increment bed in target hospital
  bedCategory.occupied++;

  // Dispatch available ambulance
  const ambulance = db.ambulances.find(a => a.status === "Available") || db.ambulances[0];
  if (ambulance) {
    ambulance.status = "En-Route";
    ambulance.location = `${sourceFacility.name} -> ${targetFacility.name}`;
    ambulance.assignedPatientId = patient.id;
  }

  // Update patient details
  patient.facilityId = targetFacilityId;
  patient.status = "Admitted";
  patient.department = `${targetDepartment} Ward`;
  patient.doctorId = null; // To be assigned at target center

  res.json({
    success: true,
    patient,
    ambulance,
    targetBedStatus: db.beds[targetFacilityId],
    message: `Patient referred successfully. Admitted to ${targetFacility.name} (${targetDepartment} Ward). Ambulance dispatched.`
  });
});

// API Route: AI-Driven Supply Chain Forecast & Redistribution Recommendations (Admin)
app.post("/api/admin/forecast", async (req, res) => {
  if (ai) {
    try {
      // Feed live in-memory stock lists & capacity into Gemini to get perfect forecasting
      const payload = {
        facilities: db.facilities.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          distance: f.distance,
          inventory: Object.entries(f.inventory).map(([medId, qty]) => ({
            name: db.medicines[medId]?.name || medId,
            id: medId,
            qty,
            threshold: db.medicines[medId]?.minThreshold || 100
          }))
        })),
        patientsCount: db.patients.length,
        bedOccupancy: Object.entries(db.beds).map(([facId, bList]) => ({
          name: db.facilities.find(f => f.id === facId)?.name || facId,
          total: bList.reduce((sum, b) => sum + b.total, 0),
          occupied: bList.reduce((sum, b) => sum + b.occupied, 0)
        })),
        doctorAttendance: db.doctors.map(d => ({
          name: d.name,
          facility: db.facilities.find(f => f.id === d.facilityId)?.name || d.facilityId,
          active: d.attendance.clockIn !== null && d.attendance.clockOut === null
        }))
      };

      const prompt = `
        You are the Chief AI Logistics and Supply Chain officer for a District Health Administration.
        Analyze the following live healthcare system snapshot data:
        ${JSON.stringify(payload, null, 2)}

        Tasks:
        1. Identify any critical medical stock-outs or early stock-out warnings (predicted days-of-stock remaining < 5 days).
        2. Generate smart resource redistribution recommendations (e.g. transfer X units of Medicine Y from CHC A to PHC B due to surplus at A and critical shortage/high demand at B). Make sure recommendations calculate relative distances (km) for logistics.
        3. Flag any underperforming or under-resourced centers (e.g. bed occupancy is 100%, high patient density, or doctor attendance is low).
        4. Provide demand forecasting trends (predicted next 30 days based on patient loads).

        Return ONLY a JSON response matching the following TypeScript structure (no markdown wrapper, no backticks, purely valid JSON):
        {
          "districtHealthIndex": 0 to 100 score,
          "warnings": [
            { "facilityId": "fac-X", "facilityName": "Name", "medId": "med-Y", "medicineName": "Paracetamol", "qtyLeft": 10, "status": "Critical/Moderate", "daysLeft": 3 }
          ],
          "redistributions": [
            { "sourceFacilityId": "fac-1", "sourceName": "Central CHC", "targetFacilityId": "fac-4", "targetName": "South PHC", "medId": "med-1", "medicineName": "Paracetamol", "transferQty": 200, "rationale": "Transfer from Central CHC surplus to prevent impending stockout at South PHC (distance 25km)." }
          ],
          "flags": [
            { "facilityId": "fac-X", "facilityName": "Name", "type": "Bed Shortage / Staffing", "severity": "High/Medium", "reason": "Reason detail" }
          ],
          "forecasts": [
            { "medicineName": "Paracetamol 500mg", "trend": "Increasing/Stable/Decreasing", "pctIncrease": 15, "reason": "Monsoon fever season surge" }
          ]
        }
      `;

      const text = await generateTextWithFallback(ai, prompt, "application/json");

      const responseText = text.trim() || "{}";
      const parsedForecast = JSON.parse(responseText);
      return res.json({ success: true, ...parsedForecast });
    } catch (err: any) {
      console.log("[Info] Gemini supply chain forecast offline, activating logistical forecasting fallback engine.");
    }
  }

  // High-quality hardcoded fallback forecasts aligned with seed state
  const mockForecast = {
    success: true,
    districtHealthIndex: 72,
    warnings: [
      { facilityId: "fac-4", facilityName: "South PHC (Primary Health Centre)", medId: "med-1", medicineName: "Paracetamol 500mg", qtyLeft: 80, status: "Critical", daysLeft: 2 },
      { facilityId: "fac-2", facilityName: "North PHC (Primary Health Centre)", medId: "med-7", medicineName: "Azithromycin 500mg", qtyLeft: 10, status: "Critical", daysLeft: 4 },
      { facilityId: "fac-4", facilityName: "South PHC (Primary Health Centre)", medId: "med-8", medicineName: "Salbutamol Inhaler", qtyLeft: 3, status: "Critical", daysLeft: 3 }
    ],
    redistributions: [
      { sourceFacilityId: "fac-1", sourceName: "Central CHC", targetFacilityId: "fac-4", targetName: "South PHC (Primary Health Centre)", medId: "med-1", medicineName: "Paracetamol 500mg", transferQty: 250, rationale: "Transfer 250 units of Paracetamol from Central CHC (650 in stock) to South PHC (only 80 units left) to resolve impending stock-out (Distance: 25km)." },
      { sourceFacilityId: "fac-1", sourceName: "Central CHC", targetFacilityId: "fac-2", targetName: "North PHC (Primary Health Centre)", medId: "med-2", medicineName: "Amoxicillin 250mg", transferQty: 150, rationale: "Redistribute 150 units of Amoxicillin to North PHC to support recent respiratory/cough OPD surge (Distance: 12km)." }
    ],
    flags: [
      { facilityId: "fac-4", facilityName: "South PHC (Primary Health Centre)", type: "Bed Shortage", severity: "High", reason: "General Ward and Pediatric Ward beds are at 100% capacity due to high localized patient footfall." },
      { facilityId: "fac-3", facilityName: "East PHC (Primary Health Centre)", type: "Staffing Shortage", severity: "Medium", reason: "Dr. Meera Deshmukh is currently absent without WiFi attendance verification." }
    ],
    forecasts: [
      { medicineName: "Paracetamol 500mg", trend: "Increasing", pctIncrease: 25, reason: "Surge in viral fever and Dengue cases across North & South zones." },
      { medicineName: "Amoxicillin 250mg", trend: "Increasing", pctIncrease: 12, reason: "Monsoon respiratory tract infections showing upward trend." },
      { medicineName: "ORS Hydration Powder", trend: "Stable", pctIncrease: 5, reason: "Sustained requirement for summer diarrhea management." }
    ]
  };

  res.json(mockForecast);
});

// Serve frontend assets or integrate with Vite development middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Health backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
