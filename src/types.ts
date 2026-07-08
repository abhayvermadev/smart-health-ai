export interface Medicine {
  id: string;
  name: string;
  stock: number;
  minThreshold: number;
  unit: string;
  category: string;
}

export interface Facility {
  id: string;
  name: string;
  type: "PHC" | "CHC";
  distance: number;
  inventory: Record<string, number>;
}

export interface Bed {
  department: "General" | "ICU" | "Pediatric" | "Maternity";
  total: number;
  occupied: number;
}

export interface Doctor {
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

export interface Patient {
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

export interface Ambulance {
  id: string;
  plateNumber: string;
  status: "Available" | "En-Route" | "Maintenance";
  location: string;
  assignedPatientId: string | null;
}

export interface AIWarning {
  facilityId: string;
  facilityName: string;
  medId: string;
  medicineName: string;
  qtyLeft: number;
  status: "Critical" | "Moderate";
  daysLeft: number;
}

export interface AIRedistribution {
  sourceFacilityId: string;
  sourceName: string;
  targetFacilityId: string;
  targetName: string;
  medId: string;
  medicineName: string;
  transferQty: number;
  rationale: string;
}

export interface AIFlag {
  facilityId: string;
  facilityName: string;
  type: string;
  severity: "High" | "Medium" | "Low";
  reason: string;
}

export interface AIForecast {
  medicineName: string;
  trend: "Increasing" | "Stable" | "Decreasing";
  pctIncrease: number;
  reason: string;
}

export interface DistrictAnalytics {
  districtHealthIndex: number;
  warnings: AIWarning[];
  redistributions: AIRedistribution[];
  flags: AIFlag[];
  forecasts: AIForecast[];
}

// Full Multilingual localization dictionary for Hackathon Showcase
export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: "Smart Health Platform",
    subtitle: "AI-Driven Health Center & Supply Chain Management",
    roleSelect: "Select Dashboard Role",
    patientRole: "Patient Access",
    doctorRole: "Doctor / Medical Staff",
    adminRole: "District Administration",
    language: "Language",
    // Patient
    bookTicket: "Book Online OPD Ticket",
    symptomsPlace: "Describe your health issues, pain, fever, duration etc...",
    speakSymptoms: "Tap and Speak Symptoms (AI Audio)",
    submitting: "Analyzing Symptoms with AI...",
    successTicket: "OPD Ticket Booked Successfully!",
    ticketNum: "Ticket Number",
    deptAssigned: "Assigned Department",
    urgency: "Urgency Level",
    assignedDoctor: "Assigned Doctor",
    testsRecommended: "Pre-OPD Tests Prescribed",
    advisory: "AI Medical Advisory",
    myReports: "My Diagnostic Reports",
    noReports: "No active diagnostic tests matching this profile.",
    patientAge: "Age",
    patientGender: "Gender",
    patientName: "Full Name",
    selectPHC: "Select Primary Health Center (PHC)",
    genderM: "Male",
    genderF: "Female",
    genderO: "Other",
    // Doctor
    doctorPortal: "Doctor Duty Portal",
    attendanceTitle: "WiFi Attendance System",
    connectedWifi: "Connected network:",
    clockIn: "Morning Duty Clock In",
    clockOut: "Evening Duty Clock Out",
    notClocked: "Attendance Pending",
    myPatients: "Active Patient Queue",
    prescribeMed: "Prescribe Medication",
    crossReferral: "Emergency Cross-Hospital Referral",
    referBed: "Refer & Book Bed",
    targetCenter: "Target Higher Center / Hospital",
    referReason: "Clinical Referral Reason",
    ambulanceDispatch: "Ambulance Status",
    bedsAvailable: "Bed Occupancy",
    // Admin
    adminPortal: "District Control Dashboard",
    districtOverview: "District Health Index",
    medInventory: "Medicine Supply Chain Inventory",
    stockStatus: "Stock Levels",
    lowStockWarn: "AI-Driven Low Stock warnings",
    redistributePlan: "AI Supply Redistribution recommendations",
    underresourcedFlags: "Critical Facility Intervention Flags",
    demandForecasts: "AI-Driven 30-Day Demand Forecasts",
    recalculateAI: "Refresh AI Demand Analytics",
    distance: "Distance",
    statusReady: "Ready",
    statusPending: "Pending"
  },
  hi: {
    title: "स्मार्ट हेल्थ प्लेटफॉर्म",
    subtitle: "एआई-संचालित स्वास्थ्य केंद्र और आपूर्ति श्रृंखला प्रबंधन",
    roleSelect: "डैशबोर्ड भूमिका चुनें",
    patientRole: "मरीज पहुंच",
    doctorRole: "डॉक्टर / चिकित्सा कर्मचारी",
    adminRole: "जिला प्रशासन",
    language: "भाषा",
    // Patient
    bookTicket: "ऑनलाइन ओपीडी टिकट बुक करें",
    symptomsPlace: "अपनी स्वास्थ्य समस्याओं, दर्द, बुखार, अवधि आदि का वर्णन करें...",
    speakSymptoms: "टैप करें और अपनी समस्या बोलें (एआई ऑडियो)",
    submitting: "एआई के साथ लक्षणों का विश्लेषण कर रहा है...",
    successTicket: "ओपीडी टिकट सफलतापूर्वक बुक किया गया!",
    ticketNum: "टिकट संख्या",
    deptAssigned: "आवंटित विभाग",
    urgency: "आपातकालीन स्तर",
    assignedDoctor: "आवंटित डॉक्टर",
    testsRecommended: "ओपीडी से पहले के परीक्षण",
    advisory: "एआई चिकित्सा सलाह",
    myReports: "मेरी नैदानिक रिपोर्ट",
    noReports: "इस प्रोफाइल से मेल खाने वाली कोई सक्रिय रिपोर्ट नहीं है।",
    patientAge: "उम्र",
    patientGender: "लिंग",
    patientName: "पूरा नाम",
    selectPHC: "प्राथमिक स्वास्थ्य केंद्र (PHC) चुनें",
    genderM: "पुरुष",
    genderF: "महिला",
    genderO: "अन्य",
    // Doctor
    doctorPortal: "डॉक्टर ड्यूटी पोर्टल",
    attendanceTitle: "वाईफाई उपस्थिति प्रणाली",
    connectedWifi: "कनेक्टेड नेटवर्क:",
    clockIn: "सुबह की ड्यूटी क्लॉक इन",
    clockOut: "शाम की ड्यूटी क्लॉक आउट",
    notClocked: "उपस्थिति लंबित",
    myPatients: "सक्रिय मरीज कतार",
    prescribeMed: "दवा लिखें",
    crossReferral: "आपातकालीन अस्पताल रेफरल",
    referBed: "रेफर और बेड बुक करें",
    targetCenter: "लक्षित उच्च केंद्र / अस्पताल",
    referReason: "रेफरल का नैदानिक कारण",
    ambulanceDispatch: "एम्बुलेंस की स्थिति",
    bedsAvailable: "बिस्तरों की उपलब्धता",
    // Admin
    adminPortal: "जिला नियंत्रण डैशबोर्ड",
    districtOverview: "जिला स्वास्थ्य सूचकांक",
    medInventory: "दवा आपूर्ति श्रृंखला सूची",
    stockStatus: "स्टॉक का स्तर",
    lowStockWarn: "एआई-संचालित कम स्टॉक चेतावनी",
    redistributePlan: "एआई आपूर्ति पुनर्वितरण सिफारिशें",
    underresourcedFlags: "महत्वपूर्ण केंद्र हस्तक्षेप झंडे",
    demandForecasts: "एआई-संचालित 30-दिवसीय मांग पूर्वानुमान",
    recalculateAI: "एआई मांग विश्लेषण ताज़ा करें",
    distance: "दूरी",
    statusReady: "तैयार",
    statusPending: "लंबित"
  },
  mr: {
    title: "स्मार्ट हेल्थ प्लॅटफॉर्म",
    subtitle: "एआय-चालित आरोग्य केंद्र आणि पुरवठा साखळी व्यवस्थापन",
    roleSelect: "डॅशबोर्ड भूमिका निवडा",
    patientRole: "रुग्ण प्रवेश",
    doctorRole: "डॉक्टर / वैद्यकीय कर्मचारी",
    adminRole: "जिल्हा प्रशासन",
    language: "भाषा",
    // Patient
    bookTicket: "ऑनलाइन ओपीडी तिकीट बुक करा",
    symptomsPlace: "तुमच्या आरोग्याच्या समस्या, वेदना, ताप, कालावधी इत्यादींचे वर्णन करा...",
    speakSymptoms: "टॅप करा आणि समस्या बोला (एआय ऑडिओ)",
    submitting: "एआय सह लक्षणांचे विश्लेषण करत आहे...",
    successTicket: "ओपीडी तिकीट यशस्वीरित्या बुक झाले!",
    ticketNum: "तिकीट क्रमांक",
    deptAssigned: "नियुक्त विभाग",
    urgency: "तातडीची पातळी",
    assignedDoctor: "नियुक्त डॉक्टर",
    testsRecommended: "ओपीडी पूर्वीच्या चाचण्या",
    advisory: "एआय वैद्यकीय सल्ला",
    myReports: "माझे निदान अहवाल",
    noReports: "या प्रोफाईलशी जुळणारे कोणतेही सक्रिय अहवाल नाहीत.",
    patientAge: "वय",
    patientGender: "लिंग",
    patientName: "पूर्ण नाव",
    selectPHC: "प्राथमिक आरोग्य केंद्र (PHC) निवडा",
    genderM: "पुरुष",
    genderF: "महिला",
    genderO: "इतर",
    // Doctor
    doctorPortal: "डॉक्टर ड्युटी पोर्टल",
    attendanceTitle: "वायफाय उपस्थिती प्रणाली",
    connectedWifi: "कनेक्ट केलेले नेटवर्क:",
    clockIn: "सकाळची ड्युटी क्लॉक इन",
    clockOut: "संध्याकाळची ड्युटी क्लॉक आउट",
    notClocked: "उपस्थिती प्रलंबित",
    myPatients: "सक्रिय रुग्ण रांग",
    prescribeMed: "औषधोपचार लिहून द्या",
    crossReferral: "आणीबाणी रुग्णालय संदर्भ (रेफरल)",
    referBed: "रेफर करा आणि बेड बुक करा",
    targetCenter: "लक्षित उच्च केंद्र / रुग्णालय",
    referReason: "वैद्यकीय संदर्भाचे कारण",
    ambulanceDispatch: "रुग्णवाहिका स्थिती",
    bedsAvailable: "बेडची उपलब्धता",
    // Admin
    adminPortal: "जिल्हा नियंत्रण डॅशबोर्ड",
    districtOverview: "जिल्हा आरोग्य निर्देशांक",
    medInventory: "औषध पुरवठा साखळी यादी",
    stockStatus: "स्टॉक पातळी",
    lowStockWarn: "एआय-चालित कमी स्टॉक चेतावणी",
    redistributePlan: "एआय पुरवठा पुनर्वितरण शिफारसी",
    underresourcedFlags: "महत्वपूर्ण आरोग्य केंद्र हस्तक्षेप इशारे",
    demandForecasts: "एआय-चालित ३०-दिवसीय मागणी अंदाज",
    recalculateAI: "एआय मागणी विश्लेषण रिफ्रेश करा",
    distance: "अंतर",
    statusReady: "तयार",
    statusPending: "प्रलंबित"
  }
};
