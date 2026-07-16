import React, { useState, useEffect } from "react";
import { 
  User, 
  Calendar, 
  Mic, 
  Volume2, 
  VolumeX,
  FileText, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Award,
  ListFilter,
  Check,
  Stethoscope,
  ChevronRight,
  Plus,
  PhoneCall,
  Navigation,
  Truck,
  X,
  WifiOff,
  QrCode,
  ShieldCheck
} from "lucide-react";
import { TRANSLATIONS, Patient, Facility, Doctor } from "../types";

interface PatientDashboardProps {
  patients: Patient[];
  facilities: Facility[];
  doctors: Doctor[];
  language: "en" | "hi" | "mr";
  onBookOPD: (data: {
    name: string;
    age: number;
    gender: string;
    facilityId: string;
    symptoms: string;
    language: string;
  }) => Promise<{
    success: boolean;
    patient: Patient;
    urgency: string;
    aiInsights: string;
    doctor: Doctor | null;
  } | null>;
  booking: boolean;
  patientPhone?: string;
  patientAbhaId?: string;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  patients,
  facilities,
  doctors,
  language,
  onBookOPD,
  booking,
  patientPhone,
  patientAbhaId,
}) => {
  const t = TRANSLATIONS[language];

  // OPD Booking Form State
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState("Male");
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || "fac-1");
  const [symptoms, setSymptoms] = useState("");

  const getTicketQueueDetails = (ticket: Patient) => {
    const facId = ticket.facilityId;
    const activeDocs = doctors.filter(
      d => d.facilityId === facId && d.attendance.clockIn !== null && d.attendance.clockOut === null
    );
    const activeDocsCount = activeDocs.length;

    // Filter all patients at the same facility who are still waiting (status === "OPD_Pending")
    const waitingPatients = patients.filter(
      p => p.facilityId === facId && p.status === "OPD_Pending"
    );

    // Sort by ticketNumber to get a stable queue order
    const sortedWaiting = [...waitingPatients].sort((a, b) => a.ticketNumber.localeCompare(b.ticketNumber));

    // Find the index of this ticket in the waiting queue
    const index = sortedWaiting.findIndex(p => p.id === ticket.id);
    const positionInQueue = index >= 0 ? index + 1 : 0; // 1-based index

    const avgConsultationMinutes = 10;
    let estWaitMinutes = 0;
    if (positionInQueue > 0) {
      if (activeDocsCount > 0) {
        estWaitMinutes = Math.ceil(((positionInQueue - 1) * avgConsultationMinutes) / activeDocsCount);
      } else {
        estWaitMinutes = positionInQueue * 20;
      }
    }

    const arrivalOffsetMinutes = Math.max(5, estWaitMinutes - 10);
    const now = new Date();
    const recommendedArrivalTime = new Date(now.getTime() + arrivalOffsetMinutes * 60000);
    const formattedArrival = recommendedArrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      position: positionInQueue,
      totalInQueue: waitingPatients.length,
      activeDocsCount,
      estimatedWaitMinutes: estWaitMinutes,
      arrivalOffsetMinutes,
      formattedArrival
    };
  };

  const getFacilityQueueDetails = (targetFacilityId: string) => {
    const activeDocs = doctors.filter(
      d => d.facilityId === targetFacilityId && d.attendance.clockIn !== null && d.attendance.clockOut === null
    );
    const activeDocsCount = activeDocs.length;

    const waitingPatients = patients.filter(
      p => p.facilityId === targetFacilityId && p.status === "OPD_Pending"
    );
    const queueSize = waitingPatients.length;

    const avgConsultationMinutes = 10;
    let estWaitMinutes = 0;
    if (activeDocsCount > 0) {
      estWaitMinutes = Math.ceil((queueSize * avgConsultationMinutes) / activeDocsCount);
    } else {
      estWaitMinutes = (queueSize + 1) * 20;
    }

    const arrivalOffsetMinutes = Math.max(5, estWaitMinutes - 15);
    const now = new Date();
    const recommendedArrivalTime = new Date(now.getTime() + arrivalOffsetMinutes * 60000);
    const formattedArrival = recommendedArrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      queueSize,
      activeDocsCount,
      estimatedWaitMinutes: estWaitMinutes,
      arrivalOffsetMinutes,
      formattedArrival
    };
  };
  
  // Simulated Voice Input State
  const [showMicModal, setShowMicModal] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Active Selected Patient for Medical Reports viewer
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patients[0]?.id || "");
  
  // Track booked IDs from local storage for patient booking history
  const [bookedIds, setBookedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("booked_patient_ticket_ids");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Offline detection state
  const [offlineStatus, setOfflineStatus] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOfflineStatus(false);
    const handleOffline = () => setOfflineStatus(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // QR Check-In States
  const [qrPatientId, setQrPatientId] = useState<string | null>(null);
  const [qrScanningActive, setQrScanningActive] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<string | null>(null);

  const handleSimulatedQRScan = async (patientId: string) => {
    setQrPatientId(patientId);
    setQrScanningActive(true);
    setCheckInStatus(null);

    // Simulate scanning delay of 2 seconds with animation
    setTimeout(async () => {
      try {
        const res = await fetch("/api/patient/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId }),
        });
        const data = await res.json();
        if (data && data.success) {
          setCheckInStatus("SUCCESS");
          speakText("Successfully checked in! Your appointment status is updated to Arrived on the doctor's dashboard.");
        } else {
          setCheckInStatus("FAILED");
        }
      } catch (err) {
        setCheckInStatus("OFFLINE_MOCK");
        speakText("Offline check in completed! Your ticket will synchronize once you are re-connected.");
      } finally {
        setQrScanningActive(false);
      }
    }, 2000);
  };

  const [newTicketResult, setNewTicketResult] = useState<{
    patient: Patient;
    urgency: string;
    aiInsights: string;
    doctor: Doctor | null;
  } | null>(null);

  const [viewingReport, setViewingReport] = useState<{
    testName: string;
    patientName: string;
    age: number;
    gender: string;
    date: string;
    result: string;
    abhaId?: string;
  } | null>(null);

  // Automatically save newly booked ticket IDs to localStorage
  useEffect(() => {
    if (newTicketResult?.patient?.id) {
      setBookedIds(prev => {
        if (prev.includes(newTicketResult.patient.id)) return prev;
        const updated = [newTicketResult.patient.id, ...prev];
        localStorage.setItem("booked_patient_ticket_ids", JSON.stringify(updated));
        return updated;
      });
    }
  }, [newTicketResult]);

  const [downloadedReport, setDownloadedReport] = useState<string | null>(null);

  // Inclusivity and Audio Voice-over states
  const [isVoiceOverEnabled, setIsVoiceOverEnabled] = useState(false);

  // Emergency SOS Dashboard overlays
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<string>("");
  const [retrievingGps, setRetrievingGps] = useState<boolean>(false);
  const [sosDispatched, setSosDispatched] = useState<boolean>(false);
  const [ambulanceRequested, setAmbulanceRequested] = useState<boolean>(false);
  const [dispatchedAmbulancePlate, setDispatchedAmbulancePlate] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState(480); // 8 minutes countdown

  useEffect(() => {
    let interval: any = null;
    if (ambulanceRequested && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [ambulanceRequested, secondsLeft]);

  const formattedEta = `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`;

  // Audio Speech synthesis logic
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSpeakDoctors = () => {
    const selectedFacility = facilities.find(f => f.id === facilityId) || facilities[0];
    const docs = doctors.filter(d => d.facilityId === selectedFacility?.id);
    if (docs.length === 0) {
      speakText(
        language === "hi" 
          ? `इस केंद्र में कोई डॉक्टर उपलब्ध नहीं हैं।` 
          : language === "mr" 
          ? `या केंद्रात डॉक्टर उपलब्ध नाहीत.` 
          : `No doctors are currently available at this center.`
      );
      return;
    }
    const docNames = docs.map(d => `${d.name}, specialized in ${d.specialty}`).join(". ");
    const introText = language === "hi"
      ? `${selectedFacility?.name} में उपलब्ध डॉक्टर हैं: ${docs.map(d => `${d.name}, विशेषज्ञ ${d.specialty}`).join(", ")}`
      : language === "mr"
      ? `${selectedFacility?.name} मधील डॉक्टर आहेत: ${docs.map(d => `${d.name}, तज्ञ ${d.specialty}`).join(", ")}`
      : `Available doctors at ${selectedFacility?.name} are: ${docNames}`;
    speakText(introText);
  };

  const handleSpeakTicket = () => {
    if (!newTicketResult) return;
    const pat = newTicketResult.patient;
    const docText = newTicketResult.doctor ? `Your assigned doctor is ${newTicketResult.doctor.name}` : `Consultant will be assigned soon.`;
    const details = language === "hi"
      ? `आपका ओपीडी टिकट सफलतापूर्वक बुक हो गया है। टिकट संख्या है ${pat.ticketNumber}। आवंटित विभाग है ${pat.department}। ${newTicketResult.doctor ? `आपके डॉक्टर हैं ${newTicketResult.doctor.name}` : ""}`
      : language === "mr"
      ? `तुमचे ओपीडी तिकीट यशस्वीरित्या बुक झाले आहे. तिकीट क्रमांक आहे ${pat.ticketNumber}. विभाग आहे ${pat.department}. ${newTicketResult.doctor ? `तुमचे डॉक्टर आहेत ${newTicketResult.doctor.name}` : ""}`
      : `Your OPD Ticket was successfully booked. Ticket number is ${pat.ticketNumber}. Assigned department is ${pat.department}. ${docText}. AI Advisory says: ${newTicketResult.aiInsights}`;
    speakText(details);
  };

  useEffect(() => {
    if (newTicketResult && isVoiceOverEnabled) {
      handleSpeakTicket();
    }
  }, [newTicketResult, isVoiceOverEnabled]);

  const handleTriggerSOS = () => {
    setShowSOSModal(true);
    setRetrievingGps(true);
    setSosDispatched(false);
    setAmbulanceRequested(false);
    setSecondsLeft(480); // Reset to 8 mins

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoordinates(`${position.coords.latitude.toFixed(6)}° N, ${position.coords.longitude.toFixed(6)}° E`);
          setRetrievingGps(false);
        },
        (error) => {
          console.warn("Geolocation API blocked or failed, using Regional CHC Coordinates.");
          setGpsCoordinates("19.076090° N, 72.877726° E");
          setRetrievingGps(false);
        },
        { timeout: 6000 }
      );
    } else {
      setGpsCoordinates("19.076090° N, 72.877726° E");
      setRetrievingGps(false);
    }
  };

  const handleDownloadReport = (testName: string) => {
    setDownloadedReport(testName);
    setTimeout(() => {
      setDownloadedReport(null);
    }, 4000);
  };

  // Pre-configured audio/vocal scripts for hackathon demo
  const voiceSamples = [
    {
      id: "sample1",
      label: language === "hi" ? "शिशु बुखार (Child Fever)" : language === "mr" ? "बाळाचा ताप (Child Fever)" : "Pediatric Symptom Sample",
      desc: language === "hi" ? '"मेरे बच्चे को कल रात से तेज बुखार और खांसी है..."' : language === "mr" ? '"माझ्या बाळाला ताप आणि खोकला आहे..."' : '"My child has high fever & cough since last night..."'
    },
    {
      id: "sample2",
      label: language === "hi" ? "गंभीर पेट दर्द (Severe Stomach Pain)" : language === "mr" ? "पोटात तीव्र वेदना (Severe Stomach Pain)" : "Severe Abdominal Pain",
      desc: language === "hi" ? '"मेरे पेट में तेज दर्द हो रहा है और चक्कर आ रहे हैं..."' : language === "mr" ? '"माझ्या पोटात खूप दुखत आहे आणि चक्कर येत आहे..."' : '"Severe stomach pain with nausea and dizziness..."'
    },
    {
      id: "sample3",
      label: language === "hi" ? "गर्भावस्था जांच (Pregnancy Checkup)" : language === "mr" ? "गरोदरपणाची तपासणी (Pregnancy Checkup)" : "Maternity Consultation",
      desc: language === "hi" ? '"मैं आठ महीने की गर्भवती हूं और नियमित जांच चाहती हूं..."' : language === "mr" ? '"मी आठ महिन्यांची गरोदर असून माझी नियमित तपासणी हवी आहे..."' : '"Routine 8-month pregnancy antenatal checkup..."'
    }
  ];

  // Real Speech Recognition States
  const [realSpeechError, setRealSpeechError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [isRealListening, setIsRealListening] = useState(false);

  const handleLiveSpeech = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRealSpeechError(
        language === "hi" 
          ? "आपके ब्राउज़र में वास्तविक भाषण पहचान समर्थित नहीं है। कृपया नीचे दिए गए उदाहरणों का उपयोग करें।" 
          : language === "mr"
          ? "तुमच्या ब्राउझरमध्ये प्रत्यक्ष भाषण ओळख समर्थित नाही. कृपया खालील नमुने वापरा."
          : "Speech recognition is not supported in this browser. Please use the simulated samples below."
      );
      return;
    }

    setRealSpeechError(null);
    setIsRealListening(true);
    setLiveTranscript("");

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";

    recognition.onstart = () => {
      setLiveTranscript(
        language === "hi" 
          ? "सुन रहा हूँ... बोलना शुरू करें" 
          : language === "mr" 
          ? "ऐकत आहे... बोलायला सुरुवात करा" 
          : "Listening... Start speaking your symptoms"
      );
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRealListening(false);
      if (event.error === "not-allowed") {
        setRealSpeechError(
          language === "hi"
            ? "माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया माइक्रोफ़ोन की अनुमति दें या नीचे उदाहरण का उपयोग करें।"
            : language === "mr"
            ? "मायक्रोफोन परवानगी नाकारली. कृपया परवानगी द्या किंवा खालील नमुने वापरा."
            : "Microphone permission denied. Please allow microphone access or use the pre-recorded samples."
        );
      } else {
        setRealSpeechError(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRealListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setSymptoms(transcript);
        setShowMicModal(false);
      }
    };

    recognition.start();
  };

  const handleSimulateSpeech = async (sampleId: string) => {
    setIsListening(true);
    setRealSpeechError(null);
    setLiveTranscript("");
    // Simulate speech-to-text processing time
    setTimeout(async () => {
      try {
        const response = await fetch("/api/speech-to-symptoms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sampleId, language })
        });
        const data = await response.json();
        if (data.text) {
          setSymptoms(data.text);
        }
      } catch (err) {
        console.error("Speech transcription simulation failed", err);
      } finally {
        setIsListening(false);
        setShowMicModal(false);
      }
    }, 1500);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symptoms.trim()) return;

    const result = await onBookOPD({
      name,
      age,
      gender,
      facilityId,
      symptoms,
      language
    });

    if (result && result.success) {
      setNewTicketResult({
        patient: result.patient,
        urgency: result.urgency,
        aiInsights: result.aiInsights,
        doctor: result.doctor
      });
      setSelectedPatientId(result.patient.id);
      // Clear form
      setName("");
      setSymptoms("");
    }
  };

  // Filter patients based on logged in credentials
  const filteredPatients = React.useMemo(() => {
    if (!patientPhone && !patientAbhaId) {
      return patients;
    }
    // If logged in, find if any patient matches
    let matched = patients.filter(p => 
      (patientPhone && p.phone === patientPhone) || 
      (patientAbhaId && p.abhaId === patientAbhaId)
    );
    if (matched.length === 0) {
      // No patient found, dynamically bind pat-1 to the logged-in session for seamless presentation
      const pat1 = patients.find(p => p.id === "pat-1");
      if (pat1) {
        matched = [{
          ...pat1,
          phone: patientPhone || pat1.phone,
          abhaId: patientAbhaId || pat1.abhaId
        }];
      } else if (patients.length > 0) {
        matched = [{
          ...patients[0],
          phone: patientPhone || patients[0].phone,
          abhaId: patientAbhaId || patients[0].abhaId
        }];
      }
    }
    return matched;
  }, [patients, patientPhone, patientAbhaId]);

  useEffect(() => {
    if ((patientPhone || patientAbhaId) && filteredPatients.length > 0) {
      setSelectedPatientId(filteredPatients[0].id);
    }
  }, [patientPhone, patientAbhaId, filteredPatients]);

  const activePatient = filteredPatients.find(p => p.id === selectedPatientId) || filteredPatients[0];
  const selectedFacility = facilities.find(f => f.id === facilityId);
  const bookedTickets = filteredPatients.filter(p => bookedIds.includes(p.id));

  // Whenever bookedTickets changes, cache them locally for offline resilience
  useEffect(() => {
    if (bookedTickets.length > 0) {
      localStorage.setItem("cached_booked_tickets", JSON.stringify(bookedTickets));
    }
  }, [bookedTickets]);

  const displayedTickets = (() => {
    if (offlineStatus) {
      try {
        const cached = localStorage.getItem("cached_booked_tickets");
        if (cached) {
          const parsed = JSON.parse(cached) as Patient[];
          return (patientPhone || patientAbhaId) ? parsed.filter(t => filteredPatients.some(fp => fp.id === t.id)) : parsed;
        }
      } catch {
        // Fallback
      }
    }
    if (patientPhone || patientAbhaId) {
      return filteredPatients;
    }
    return bookedTickets;
  })();

  // Pre-configured diagnostic tests list present in each facility
  const availableTests = [
    { id: "cbc", name: "Complete Blood Count (CBC)", dept: "Pathology", charge: "₹50 (Free under scheme)" },
    { id: "lft", name: "Liver Function Test (LFT)", dept: "Biochemistry", charge: "₹150 (Free under scheme)" },
    { id: "kft", name: "Kidney Function Test (KFT)", dept: "Biochemistry", charge: "₹150 (Free under scheme)" },
    { id: "dengue", name: "Dengue NS1 Antigen Test", dept: "Microbiology", charge: "₹100 (Free under scheme)" },
    { id: "malaria", name: "Malaria Smear Test", dept: "Microbiology", charge: "₹100 (Free under scheme)" },
    { id: "sugar", name: "Blood Sugar (HbA1c)", dept: "Biochemistry", charge: "₹40 (Free under scheme)" },
    { id: "ultrasound", name: "Maternity Obstetric Ultrasound", dept: "Radiology", charge: "₹250 (Free under scheme)" }
  ];

  const closestFacility = facilities[0] || { name: "Central CHC", distance: 0 };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8" id="patient-dashboard-root-wrapper">
      <style>{`
        @keyframes soundwave-bar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        .soundwave-indicator {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 18px;
        }
        .soundwave-bar {
          width: 3px;
          height: 100%;
          background-color: #ef4444;
          border-radius: 9999px;
          animation: soundwave-bar 1s ease-in-out infinite;
          transform-origin: bottom;
        }
        .soundwave-bar-1 { animation-delay: 0.1s; }
        .soundwave-bar-2 { animation-delay: 0.3s; }
        .soundwave-bar-3 { animation-delay: 0.5s; }
        .soundwave-bar-4 { animation-delay: 0.2s; }
        .soundwave-bar-5 { animation-delay: 0.4s; }
      `}</style>
      
      {offlineStatus && (
        <div className="bg-amber-500 text-white border-b border-amber-600 px-4 py-3 rounded-2xl flex items-center justify-between shadow-md animate-fadeIn font-sans">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 animate-pulse shrink-0" />
            <div>
              <span className="font-extrabold text-xs block uppercase tracking-wider">OFFLINE MODE ACTIVE</span>
              <span className="text-[10px] opacity-90 leading-tight">You are currently disconnected. Displaying safely cached ticket entries and clinic schedules. New requests will be synchronized when network is restored.</span>
            </div>
          </div>
          <span className="bg-amber-600 font-extrabold text-[9px] px-2 py-0.5 rounded border border-amber-400 shrink-0 uppercase tracking-widest font-mono">
            LOCAL BACKUP
          </span>
        </div>
      )}

      {/* PATIENT SESSION AUTHENTICATION STATUS BANNER */}
      {(patientPhone || patientAbhaId) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans shadow-sm animate-fadeIn border-l-4 border-l-indigo-600" id="patient-auth-session-banner">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <ShieldCheck className="h-5 w-5 shrink-0" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm tracking-tight uppercase">
                {language === "hi" ? "सत्यापित मरीज सत्र" : language === "mr" ? "सत्यापित रुग्ण सत्र" : "Verified Patient Session"}
              </h4>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5 font-medium">
                <span>{language === "hi" ? "लॉगिन माध्यम:" : language === "mr" ? "लॉगिन माध्यम:" : "Identity Method:"}</span>
                {patientPhone ? (
                  <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md font-bold font-mono text-[11px] border border-indigo-100">
                    📞 +91 {patientPhone}
                  </span>
                ) : (
                  <span className="bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-md font-bold font-mono text-[11px] border border-teal-100">
                    💳 ABHA: {patientAbhaId}
                  </span>
                )}
                <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {language === "hi" ? "सक्रिय" : language === "mr" ? "सक्रिय" : "Active & Encrypted"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-slate-400 font-medium sm:text-right">
            <span>
              {language === "hi" 
                ? "आयुष्मान भारत डिजिटल मिशन (ABDM) द्वारा सुरक्षित" 
                : language === "mr" 
                ? "आयुष्मान भारत डिजिटल मिशन (ABDM) द्वारे सुरक्षित" 
                : "Secured under Ayushman Bharat Digital Mission (ABDM)"}
            </span>
          </div>
        </div>
      )}
      
      {/* VOICE-OVER INCLUSIVITY INTERFACE (Elderly & Visually Impaired Assistance) */}
      <div className="bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-100 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans shadow-xs animate-fadeIn">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${isVoiceOverEnabled ? "bg-teal-500 text-white animate-pulse" : "bg-indigo-100 text-indigo-600"}`}>
            {isVoiceOverEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Assisted Audio Voice-Over Assistance</h4>
            <p className="text-xs text-slate-500">Inclusivity assistant for visually impaired and elderly citizens.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              const newState = !isVoiceOverEnabled;
              setIsVoiceOverEnabled(newState);
              if (newState) {
                speakText(
                  language === "hi"
                    ? "ऑडियो सहायता सक्रिय है। उपलब्ध डॉक्टरों की सूची सुनने के लिए 'डॉक्टरों की सूची बोलें' पर क्लिक करें।"
                    : language === "mr"
                    ? "ऑडिओ सहाय्यक सक्रिय आहे. उपलब्ध डॉक्टरांची यादी ऐकण्यासाठी 'डॉक्टरांची यादी बोला' वर क्लिक करा."
                    : "Voice-over assistant active. Click Speak Doctors List to hear details, or select and book your ticket to have details read aloud."
                );
              } else {
                if ("speechSynthesis" in window) {
                  window.speechSynthesis.cancel();
                }
              }
            }}
            id="voiceover-toggle-btn"
            className={`font-mono text-xs font-bold px-4 py-2 rounded-xl border cursor-pointer transition ${
              isVoiceOverEnabled 
                ? "bg-teal-600 text-white border-teal-600 shadow-sm" 
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {isVoiceOverEnabled ? "✓ Voice-Over Active" : "Enable Audio Voice-Over"}
          </button>

          {isVoiceOverEnabled && (
            <button
              type="button"
              onClick={handleSpeakDoctors}
              id="speak-doctors-btn"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Speak Doctors</span>
            </button>
          )}

          {isVoiceOverEnabled && newTicketResult && (
            <button
              type="button"
              onClick={handleSpeakTicket}
              id="speak-ticket-btn"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Speak Ticket Details</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="patient-dashboard-grid">
      
      {/* LEFT COLUMN: OPD Ticket Booking - 7 cols */}
      <div className="lg:col-span-7 space-y-8">
        
        {/* New Ticket Booking Result Alert */}
        {newTicketResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-slate-800 animate-fadeIn shadow-md" id="booking-success-card">
            <div className="flex items-center space-x-3 text-emerald-700 mb-4">
              <CheckCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold font-sans">{t.successTicket}</h3>
            </div>

            <div className="bg-white border border-emerald-100 rounded-xl p-5 shadow-inner">
              <div className="flex justify-between items-center pb-3 border-b border-dashed border-slate-200 mb-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">OPD PATIENT TICKET</span>
                  <p className="text-xl font-black text-slate-900 font-mono">{newTicketResult.patient.ticketNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold">{t.urgency}</span>
                  <p className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                    newTicketResult.urgency === "Emergency" 
                      ? "bg-red-100 text-red-700" 
                      : newTicketResult.urgency === "Moderate" 
                      ? "bg-amber-100 text-amber-700" 
                      : "bg-indigo-100 text-indigo-700"
                  }`}>{newTicketResult.urgency}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4 font-sans">
                <div>
                  <span className="text-xs text-slate-400 block">{t.patientName}</span>
                  <span className="font-bold text-slate-800">{newTicketResult.patient.name}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">{t.patientAge} / {t.patientGender}</span>
                  <span className="font-medium text-slate-800">{newTicketResult.patient.age} Yrs / {newTicketResult.patient.gender}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">{t.deptAssigned}</span>
                  <span className="font-bold text-indigo-600 flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4 shrink-0 text-indigo-500" />
                    {newTicketResult.patient.department}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">{t.assignedDoctor}</span>
                  <span className="font-medium text-slate-800">
                    {newTicketResult.doctor ? newTicketResult.doctor.name : "On-Duty Consultant"}
                  </span>
                </div>
              </div>

              {/* AI Pre-OPD Diagnostic Recommendations */}
              <div className="mb-4 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide block mb-1.5">{t.testsRecommended}:</span>
                <div className="flex flex-wrap gap-2">
                  {newTicketResult.patient.reports.map((r, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-800 text-xs px-2.5 py-1 rounded-lg border border-indigo-100 font-medium">
                      🧪 {r.testName}
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Supportive Text Message */}
              <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 flex items-start gap-2">
                <Volume2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide block">{t.advisory}</span>
                  <p className="text-xs text-slate-700 italic">{newTicketResult.aiInsights}</p>
                </div>
              </div>

              {/* Smart Arrival & Queue Slot Forecast */}
              {(() => {
                const qDetails = getTicketQueueDetails(newTicketResult.patient);
                
                const arrivalTitle = language === "hi" 
                  ? "स्मार्ट आगमन एवं कतार स्लॉट" 
                  : language === "mr" 
                  ? "स्मार्ट आगमन आणि रांग स्लॉट" 
                  : "Smart Arrival & Queue Details";

                const turnText = language === "hi"
                  ? `आपकी कतार संख्या: #${qDetails.position} (कुल कतार आकार: ${qDetails.totalInQueue})`
                  : language === "mr"
                  ? `तुमची रांग क्रमांक: #${qDetails.position} (एकूण रांग आकार: ${qDetails.totalInQueue})`
                  : `Your Queue Position: #${qDetails.position} (Total Waiting: ${qDetails.totalInQueue})`;

                const waitEstimateText = language === "hi"
                  ? `डॉक्टर परामर्श के लिए अनुमानित प्रतीक्षा समय: ~${qDetails.estimatedWaitMinutes} मिनट`
                  : language === "mr"
                  ? `डॉक्टर सल्लामसलत करण्यासाठी अंदाजित प्रतीक्षा वेळ: ~${qDetails.estimatedWaitMinutes} मिनिटे`
                  : `Estimated Time to See Doctor: ~${qDetails.estimatedWaitMinutes} mins`;

                const rushPreventionAdvice = language === "hi"
                  ? `भीड़-भाड़ से बचने के लिए, कृपया अस्पताल/क्लीनिक में ${qDetails.formattedArrival} बजे तक पहुँचें।`
                  : language === "mr"
                  ? `गर्दी टाळण्यासाठी, कृपया रुग्णालय/क्लिनिकमध्ये ${qDetails.formattedArrival} वाजेपर्यंत पोहोचा.`
                  : `To minimize waiting room congestion and avoid long lines, please arrive at the facility by ${qDetails.formattedArrival}.`;

                return (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wide block">
                      ⏰ {arrivalTitle}
                    </span>
                    <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-3 space-y-1.5 text-left font-sans">
                      <p className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse shrink-0"></span>
                        {turnText}
                      </p>
                      <p className="text-[11px] text-slate-700 font-medium leading-normal">
                        ⏱ {waitEstimateText}
                      </p>
                      <p className="text-[11px] text-slate-600 bg-white border border-teal-50 rounded-lg p-2 leading-relaxed">
                        💡 <strong>Crowd Control Arrival Time:</strong> {rushPreventionAdvice}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            <button
              onClick={() => setNewTicketResult(null)}
              className="mt-4 w-full bg-slate-900 hover:bg-slate-850 text-white font-medium py-2 rounded-xl text-xs transition cursor-pointer"
            >
              Book Another Ticket
            </button>
          </div>
        )}

        {/* OPD Ticket Form */}
        {!newTicketResult && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-6">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 font-sans">{t.bookTicket}</h3>
                <p className="text-xs text-slate-400">Powered by Gemini 3.5 Specialty Classification</p>
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-5">
              {/* Patient Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.patientName}</label>
                  <input
                    id="patient-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.patientAge}</label>
                  <input
                    id="patient-age-input"
                    type="number"
                    min="1"
                    max="115"
                    required
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 30)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.patientGender}</label>
                  <select
                    id="patient-gender-select"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="Male">{t.genderM}</option>
                    <option value="Female">{t.genderF}</option>
                    <option value="Other">{t.genderO}</option>
                  </select>
                </div>
              </div>

              {/* Hospital Location Selection */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t.selectPHC}</label>
                  <select
                    id="booking-facility-select"
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer font-medium"
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} {f.type === "CHC" ? "(District Hub)" : `(PHC, ${f.distance}km)`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Smart Arrival Advisory & Queue Forecast */}
                {(() => {
                  const details = getFacilityQueueDetails(facilityId);
                  const selectedFacName = facilities.find(f => f.id === facilityId)?.name || "Clinic";
                  
                  const headerText = language === "hi" ? "लाइव कतार एवं आगमन पूर्वानुमान" : language === "mr" ? "थेट रांग आणि आगमन अंदाज" : "Live Queue & Arrival Forecast";
                  const docsText = language === "hi" ? "ऑन-ड्यूटी डॉक्टर" : language === "mr" ? "ऑन-ड्यूटी डॉक्टर" : "On-Duty Doctors";
                  const waitingText = language === "hi" ? "कतार में मरीज" : language === "mr" ? "रांगेत रुग्ण" : "Patients in Queue";
                  const waitTimeText = language === "hi" ? "अनुमानित प्रतीक्षा" : language === "mr" ? "अंदाजित प्रतीक्षा" : "Est. Wait Time";
                  const smartArrivalText = language === "hi" ? "स्मार्ट आगमन सलाह (भीड़ नियंत्रण)" : language === "mr" ? "स्मार्ट आगमन सल्ला (गर्दी नियंत्रण)" : "Smart Arrival Advisory (Crowd Control)";
                  
                  const adviceText = language === "hi"
                    ? `ओपीडी में लंबी कतारों और भीड़ से बचने के लिए, कृपया ${details.formattedArrival} बजे (अगले ${details.arrivalOffsetMinutes} मिनट में) पहुँचें।`
                    : language === "mr"
                    ? `ओपीडीमध्ये लांब रांगा आणि गर्दी टाळण्यासाठी, कृपया ${details.formattedArrival} वाजता (पुढील ${details.arrivalOffsetMinutes} मिनिटांत) पोहोचा.`
                    : `To bypass unnecessary crowding and waiting outside the OPD, we recommend arriving at ${selectedFacName} by ${details.formattedArrival} (in approx. ${details.arrivalOffsetMinutes} mins).`;

                  return (
                    <div className="bg-gradient-to-r from-indigo-50/60 to-teal-50/40 border border-indigo-100 rounded-xl p-4 space-y-3 font-sans animate-fadeIn">
                      <div className="flex justify-between items-center pb-2 border-b border-indigo-50">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-600 animate-pulse" />
                          <span className="font-extrabold text-[11px] text-indigo-900 uppercase tracking-wider">
                            {headerText}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                          <span className="text-[9px] font-mono font-bold text-emerald-700 uppercase">Live OPD Feed</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white/80 p-2 rounded-lg border border-indigo-50">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{docsText}</span>
                          <span className="text-sm font-black text-slate-800">{details.activeDocsCount}</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-indigo-50">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{waitingText}</span>
                          <span className="text-sm font-black text-indigo-600">{details.queueSize}</span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-indigo-50">
                          <span className="text-[9px] text-slate-400 block uppercase font-bold">{waitTimeText}</span>
                          <span className="text-sm font-black text-rose-600">~{details.estimatedWaitMinutes}m</span>
                        </div>
                      </div>

                      <div className="bg-white border border-indigo-100 rounded-lg p-2.5 flex items-start gap-2.5">
                        <span className="bg-indigo-100 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0 mt-0.5 font-mono">
                          RECOMMENDED ARRIVAL
                        </span>
                        <div>
                          <span className="text-[10px] font-extrabold text-slate-700 block mb-0.5">
                            {smartArrivalText}
                          </span>
                          <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                            {adviceText}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Symptoms Input and Speech trigger */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Symptoms / Complaints</label>
                  
                  {/* Illiterate Audio Trigger Button */}
                  <button
                    id="tap-speak-btn"
                    type="button"
                    onClick={() => setShowMicModal(true)}
                    className="flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold px-3 py-1 rounded-full text-xs transition cursor-pointer animate-pulse"
                  >
                    <Mic className="h-3 w-3 shrink-0" />
                    <span>{t.speakSymptoms}</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    id="patient-symptoms-textarea"
                    required
                    rows={4}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder={t.symptomsPlace}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition"
                  ></textarea>
                  {(isRealListening || isListening) && (
                    <div className="absolute right-3 bottom-3 flex items-center gap-2 bg-red-50 border border-red-150 py-1.5 px-3 rounded-full shadow-xs z-10 animate-pulse">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping"></span>
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider font-mono">
                        {isRealListening ? "Live Mic Recording..." : "Processing Audio..."}
                      </span>
                      <div className="soundwave-indicator shrink-0">
                        <div className="soundwave-bar soundwave-bar-1"></div>
                        <div className="soundwave-bar soundwave-bar-2"></div>
                        <div className="soundwave-bar soundwave-bar-3"></div>
                        <div className="soundwave-bar soundwave-bar-4"></div>
                        <div className="soundwave-bar soundwave-bar-5"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                id="book-opd-submit"
                type="submit"
                disabled={booking}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {booking ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    <span>{t.submitting}</span>
                  </>
                ) : (
                  <span>Book OPD Ticket ({language === "en" ? "Today / Tomorrow" : "आज / उद्या"})</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Diagnostic Test Reports Viewer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {downloadedReport && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Report PDF downloaded successfully for: <strong>{downloadedReport}</strong></span>
            </div>
          )}

          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 font-sans">{t.myReports}</h3>
            </div>
            {/* Quick Profile Toggle for Hackathon demo */}
            <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200">
              <ListFilter className="h-3 w-3 text-slate-400 ml-1" />
              <select
                id="patient-profile-toggle"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="bg-transparent text-xs text-slate-600 font-bold outline-none pr-1.5 cursor-pointer"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                ))}
              </select>
            </div>
          </div>

          {activePatient ? (
            <div className="space-y-4 font-sans" id="patient-report-card">
              {/* Mini Health Identity Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800">{activePatient.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">ID: {activePatient.id} • {activePatient.age} Yrs • {activePatient.gender}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block font-mono">CURRENT OPD STATUS</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full inline-block ${
                    activePatient.status === "Admitted" 
                      ? "bg-red-100 text-red-700"
                      : activePatient.status === "OPD_Pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {activePatient.status === "OPD_Pending" ? "Awaiting Doctor" : activePatient.status === "OPD_Treated" ? "OPD Consultation Done" : activePatient.status}
                  </span>
                </div>
              </div>

              {/* Lab Reports List */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Diagnostics Laboratoy Reports</span>
                {activePatient.reports.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs border border-slate-100 rounded-xl border-dashed">
                    {t.noReports}
                  </div>
                ) : (
                  activePatient.reports.map((rep, index) => (
                    <div key={index} className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3.5 flex justify-between items-center transition shadow-xs">
                      <div>
                        <p className="text-sm font-bold text-slate-800">🔬 {rep.testName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Sample collected: {rep.date}</p>
                        {rep.status === "Ready" && (
                          <div className="bg-slate-50 border border-slate-200 text-xs text-slate-600 px-2.5 py-1.5 rounded-lg mt-2 font-mono">
                            <span className="font-bold block text-[10px] uppercase text-slate-400">LAB CLINICAL CONCLUSION:</span>
                            {rep.result}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                           rep.status === "Ready" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}>
                          {rep.status === "Ready" ? t.statusReady : t.statusPending}
                        </span>
                        {rep.status === "Ready" && (
                          <div className="flex items-center gap-2 mt-2 justify-end">
                            <button 
                              onClick={() => setViewingReport({
                                testName: rep.testName,
                                patientName: activePatient.name,
                                age: activePatient.age,
                                gender: activePatient.gender,
                                date: rep.date,
                                result: rep.result,
                                abhaId: activePatient.abhaId
                              })}
                              className="text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              👁️ View Report
                            </button>
                            <button 
                              onClick={() => handleDownloadReport(rep.testName)}
                              className="text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg text-[11px] font-bold transition border border-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              📥 Download PDF
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Doctor's Consultation Notes (Diagnosis & Complaints) */}
              {(activePatient.diagnosis || activePatient.complaints) && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 font-sans mt-4">
                  <span className="text-[10px] font-black text-indigo-600 block uppercase tracking-wider font-mono">🩺 Doctor Consultation Notes</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {activePatient.complaints && (
                      <div className="space-y-1">
                        <span className="font-bold text-slate-400 block text-[10px] uppercase">Recorded Complaints:</span>
                        <p className="text-slate-700 bg-white border border-slate-100 p-2.5 rounded-lg italic">
                          "{activePatient.complaints}"
                        </p>
                      </div>
                    )}
                    {activePatient.diagnosis && (
                      <div className="space-y-1">
                        <span className="font-bold text-slate-400 block text-[10px] uppercase">Official Diagnosis:</span>
                        <p className="text-slate-800 bg-white border border-slate-100 p-2.5 rounded-lg font-semibold">
                          {activePatient.diagnosis}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Prescribed Medications */}
              {activePatient.prescribedMeds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Prescribed Active Pharmacy Dosage</span>
                  <div className="space-y-1.5">
                    {activePatient.prescribedMeds.map((med, index) => (
                      <div key={index} className="flex justify-between items-center text-xs text-slate-700 bg-indigo-50/40 p-2.5 rounded-lg border border-indigo-50">
                        <span className="font-bold text-slate-800">💊 {med.name}</span>
                        <span className="text-slate-500 font-mono text-[10px] bg-white border border-slate-100 px-2 py-0.5 rounded">
                          {med.dosage} • {med.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">
              No Patient Profiles available. Book an OPD Ticket to create one!
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Doctor Attendance Schedule & Diagnostic Services list - 5 cols */}
      <div className="lg:col-span-5 space-y-8">
        
        {/* Doctor Attendance & Status Checklist */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <Stethoscope className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 font-sans">On-Duty Doctor Availability</h3>
          </div>
          
          <div className="space-y-3">
            {doctors.filter(d => d.facilityId === facilityId).map((doc) => {
              const isPresent = doc.attendance.clockIn !== null && doc.attendance.clockOut === null;
              return (
                <div key={doc.id} className="flex justify-between items-center p-3 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition font-sans">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{doc.name}</h4>
                    <p className="text-xs text-slate-400">{doc.specialty}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">Specialty: {doc.department}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPresent ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {isPresent ? "AVAILABLE" : "AWAY"}
                    </span>
                    <p className="text-[9px] font-mono text-slate-400 mt-1">
                      {isPresent ? `Clock-in: ${doc.attendance.clockIn}` : "Absent"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Booked OPD Tickets History */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <Calendar className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 font-sans">
              {language === "hi" ? "बुक किए गए ओपीडी टिकट इतिहास" : language === "mr" ? "बुक केलेले ओपीडी तिकीट इतिहास" : "Your Booked OPD Tickets"}
            </h3>
          </div>

          {displayedTickets.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs border border-slate-100 border-dashed rounded-xl">
              {language === "hi" 
                ? "इस डिवाइस पर कोई बुक किया गया टिकट नहीं मिला।" 
                : language === "mr" 
                ? "या उपकरणावर कोणतेही बुक केलेले तिकीट आढळले नाही." 
                : "No booked tickets found on this device."}
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {displayedTickets.map((ticket) => {
                const assignedDoc = doctors.find(d => d.id === ticket.doctorId);
                const isSeen = ticket.status !== "OPD_Pending";
                return (
                  <div key={ticket.id} className="p-3.5 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 transition font-sans text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-indigo-600 text-sm">{ticket.ticketNumber}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSeen ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {isSeen 
                          ? (language === "hi" ? "देखा गया (Seen)" : language === "mr" ? "तपासले (Seen)" : "Seen") 
                          : (language === "hi" ? "अदृष्ट (Unseen)" : language === "mr" ? "प्रतिक्षा (Unseen)" : "Unseen")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Patient</span>
                        <span className="font-semibold text-slate-800">{ticket.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Department</span>
                        <span className="font-medium text-slate-800">{ticket.department}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-100 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase">Consulting Doctor</span>
                          <p className="font-semibold text-slate-700">{assignedDoc ? assignedDoc.name : "Waiting allocation..."}</p>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">{ticket.date}</span>
                      </div>
                    </div>

                    {/* Live Turn & Waiting Time Indicators */}
                    {!isSeen && (
                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5 space-y-1.5 text-xs text-left">
                        {(() => {
                          const qDetails = getTicketQueueDetails(ticket);
                          
                          const positionLabel = language === "hi" 
                            ? `आपकी कतार संख्या (OPD Queue):` 
                            : language === "mr" 
                            ? `तुमची रांग क्रमांक (OPD Queue):` 
                            : "Your Queue Number:";

                          const waitTimeLabel = language === "hi"
                            ? `अनुमानित प्रतीक्षा समय:`
                            : language === "mr"
                            ? `अंदाजित प्रतीक्षा वेळ:`
                            : "Est. Wait to Turn:";

                          const crowdLabel = language === "hi"
                            ? `प्रस्तावित आगमन समय:`
                            : language === "mr"
                            ? `सुचविलेले आगमन वेळ:`
                            : "Advised Arrival:";

                          return (
                            <>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-bold">{positionLabel}</span>
                                <span className="font-black text-indigo-700 bg-indigo-100/80 px-1.5 py-0.5 rounded font-mono">
                                  #{qDetails.position} of {qDetails.totalInQueue}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[11px]">
                                <span className="text-slate-500 font-bold">{waitTimeLabel}</span>
                                <span className="font-bold text-rose-600 font-mono">
                                  ~{qDetails.estimatedWaitMinutes} mins
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-indigo-50 text-[10px]">
                                <span className="text-slate-400 uppercase font-bold tracking-wider">{crowdLabel}</span>
                                <span className="font-extrabold text-teal-700 bg-white px-2 py-0.5 border border-teal-100 rounded shadow-2xs font-mono">
                                  {qDetails.formattedArrival}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* QR Code Check-In Section */}
                    {!isSeen && (
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
                        {(ticket as any).arrived ? (
                          <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-2.5 flex items-center justify-between text-[11px] animate-fadeIn text-emerald-800">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                              <span className="font-extrabold uppercase text-[9px] tracking-wide">Checked-In & Arrived</span>
                            </div>
                            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                              {(ticket as any).checkInTime || "Just now"}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {qrPatientId === ticket.id && qrScanningActive ? (
                              <div className="bg-slate-950 text-white rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden h-24 border border-slate-800 animate-pulse">
                                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 shadow-md shadow-red-500/50 animate-bounce"></div>
                                <QrCode className="h-7 w-7 text-indigo-400 animate-spin" />
                                <span className="text-[9px] text-indigo-300 font-mono font-bold uppercase tracking-widest mt-2">
                                  SIMULATING CLINIC QR SCAN...
                                </span>
                              </div>
                            ) : qrPatientId === ticket.id && checkInStatus ? (
                              <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-2.5 text-indigo-800 text-[10px] leading-relaxed animate-fadeIn">
                                <p className="font-bold">✓ Check-In Confirmed!</p>
                                <p className="text-[9px] text-slate-500 mt-0.5">
                                  Your status is now updated to <strong>'Arrived'</strong> on the medical staff terminal. Please take a seat in the waiting bay.
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-150 transition">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <QrCode className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-[9px] text-slate-400 uppercase font-bold block leading-none">Health Center</span>
                                    <span className="text-[10px] text-slate-700 font-bold block truncate">Self Check-In</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSimulatedQRScan(ticket.id)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] transition cursor-pointer shrink-0 uppercase tracking-wider font-mono"
                                >
                                  Scan QR Kiosk
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Diagnostic Services Inventory Checklist */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 font-sans">Diagnostic Tests Present At {selectedFacility?.name || "PHC"}</h3>
          </div>

          <div className="space-y-2.5">
            {availableTests.map((test, idx) => {
              const liveTest = selectedFacility?.labInvestigations?.[test.id];

              return (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-slate-150 transition text-xs font-sans">
                  <div>
                    <span className="font-bold text-slate-800 block">{test.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Department: {test.dept}</span>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    <span className="text-[10px] font-bold text-indigo-600 block">{test.charge}</span>
                    {(() => {
                      if (!liveTest) {
                        return (
                          <span className="text-[9px] text-slate-400 font-semibold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block mt-1">
                            ✓ Available
                          </span>
                        );
                      }

                      if (liveTest.status === "Available") {
                        return (
                          <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mt-1 animate-fadeIn">
                            ✓ Available
                          </span>
                        );
                      } else if (liveTest.status === "Limited Slots") {
                        return (
                          <span className="text-[9px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 inline-block mt-1 animate-fadeIn">
                            ⚠ Limited Slots
                          </span>
                        );
                      } else {
                        return (
                          <div className="flex flex-col items-end gap-1 mt-1">
                            <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-150 inline-block uppercase font-mono">
                              🚫 {liveTest.status}
                            </span>
                            {liveTest.expectedAvailabilityTime && (
                              <span className="text-[8px] text-indigo-700 font-black font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 block max-w-[170px] text-right">
                                ⏳ AI Forecast: {liveTest.expectedAvailabilityTime}
                              </span>
                            )}
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AUDIO RECORDING/ILLITERATE SIMULATION MODAL */}
      {showMicModal && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="speech-modal">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl relative font-sans">
            
            {/* Modal Dismiss Button */}
            <button
              type="button"
              onClick={() => {
                setShowMicModal(false);
                setRealSpeechError(null);
                setLiveTranscript("");
              }}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 h-8 w-8 rounded-full flex items-center justify-center transition cursor-pointer font-bold text-sm"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="flex flex-col items-center text-center">
              {/* Glowing Pulse Microphone */}
              <div className="relative mb-5 mt-2">
                <div className={`absolute inset-0 bg-red-400 rounded-full animate-ping opacity-25 ${isListening || isRealListening ? "block" : "hidden"}`}></div>
                <button
                  id="live-record-mic-trigger"
                  type="button"
                  onClick={handleLiveSpeech}
                  disabled={isListening || isRealListening}
                  className={`h-20 w-20 rounded-full flex items-center justify-center text-white relative shadow-lg transition duration-300 transform active:scale-95 cursor-pointer ${
                    isRealListening 
                      ? "bg-red-600 shadow-red-600/30" 
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
                  }`}
                >
                  {isListening || isRealListening ? (
                    <Volume2 className="h-9 w-9 animate-bounce" />
                  ) : (
                    <Mic className="h-9 w-9" />
                  )}
                </button>
              </div>

              <h4 className="text-lg font-black text-slate-900 tracking-tight font-sans">
                {isRealListening 
                  ? (language === "hi" ? "आपकी आवाज़ सुन रहे हैं..." : language === "mr" ? "तुमचा आवाज ऐकत आहे..." : "Listening to Your Voice...")
                  : (language === "hi" ? "बोलने के लिए टैप करें" : language === "mr" ? "बोलण्यासाठी टॅप करा" : "Tap Microphone to Speak")}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1.5 mb-5 leading-relaxed">
                {language === "hi" 
                  ? "माइक्रोफ़ोन दबाएं और अपने लक्षणों को हिंदी या अपनी पसंदीदा भाषा में बोलें। एआई उसी भाषा में उत्तर देगा।" 
                  : language === "mr"
                  ? "मायक्रोफोन दाबा आणि आपले लक्षणे मराठी किंवा आपल्या पसंतीच्या भाषेत बोला. एआय त्याच भाषेत उत्तर देईल."
                  : "Tap the microphone, say your symptoms in any language you prefer, and the AI will analyze and respond in that same language."}
              </p>

              {(isRealListening || isListening) && (
                <div className="flex flex-col items-center gap-1.5 my-3">
                  <div className="soundwave-indicator h-10 gap-1 bg-indigo-50/50 border border-indigo-100 rounded-2xl px-6 py-2">
                    <div className="soundwave-bar soundwave-bar-1 !bg-indigo-600 w-1"></div>
                    <div className="soundwave-bar soundwave-bar-2 !bg-indigo-600 w-1"></div>
                    <div className="soundwave-bar soundwave-bar-3 !bg-indigo-600 w-1"></div>
                    <div className="soundwave-bar soundwave-bar-4 !bg-indigo-600 w-1"></div>
                    <div className="soundwave-bar soundwave-bar-5 !bg-indigo-600 w-1"></div>
                    <div className="soundwave-bar soundwave-bar-2 !bg-indigo-600 w-1"></div>
                    <div className="soundwave-bar soundwave-bar-1 !bg-indigo-600 w-1"></div>
                    <div className="soundwave-bar soundwave-bar-4 !bg-indigo-600 w-1"></div>
                    <div className="soundwave-bar soundwave-bar-3 !bg-indigo-600 w-1"></div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest font-mono animate-pulse">
                    {isRealListening ? "Voice Input Active" : "Analyzing Speech Semantics"}
                  </span>
                </div>
              )}

              {/* Live Transcript Bubble */}
              {liveTranscript && (
                <div className="w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5 text-indigo-900 text-xs font-semibold animate-pulse italic leading-relaxed">
                  🗣️ "{liveTranscript}"
                </div>
              )}

              {/* Error messages */}
              {realSpeechError && (
                <div className="w-full bg-rose-50 border border-rose-150 rounded-2xl p-3.5 mb-5 text-rose-700 text-xs font-semibold leading-relaxed text-left">
                  ⚠️ {realSpeechError}
                </div>
              )}

              {/* Divider for Fallback simulation */}
              <div className="relative w-full flex items-center justify-center my-4">
                <div className="absolute inset-x-0 border-t border-slate-150"></div>
                <span className="relative bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                  {language === "hi" ? "या लिखित उदाहरण चुनें" : language === "mr" ? "किंवा लेखी नमुना निवडा" : "Or Select Pre-Recorded Sample"}
                </span>
              </div>

              {/* Sample Scripts Selection */}
              <div className="space-y-2.5 w-full mb-6">
                {voiceSamples.map((samp) => (
                  <button
                    key={samp.id}
                    onClick={() => handleSimulateSpeech(samp.id)}
                    disabled={isListening || isRealListening}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all font-sans cursor-pointer group disabled:opacity-50"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">{samp.label}</span>
                      <Volume2 className="h-3 w-3 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                    <p className="text-xs text-slate-500 italic line-clamp-1">
                      {samp.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => {
                  setShowMicModal(false);
                  setRealSpeechError(null);
                  setLiveTranscript("");
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl text-xs transition cursor-pointer"
              >
                {language === "hi" ? "रद्द करें" : language === "mr" ? "रद्द करा" : "Close Portal"}
              </button>
            </div>
          </div>
        </div>
      )}

      </div> {/* End of grid grid-cols-12 */}

      {/* EMERGENCY SOS FLOATING ACTION BUTTON */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          id="emergency-sos-btn"
          onClick={handleTriggerSOS}
          className="h-16 w-16 bg-red-650 hover:bg-red-700 text-white rounded-full flex flex-col items-center justify-center shadow-2xl hover:scale-105 transition-all cursor-pointer relative group border-2 border-white animate-pulse"
          title="EMERGENCY SOS"
        >
          <AlertCircle className="h-7 w-7" />
          <span className="text-[9px] font-black tracking-tighter uppercase font-mono mt-0.5">SOS</span>
          
          {/* Glowing pulse rings */}
          <span className="absolute -inset-1.5 bg-red-500 rounded-full animate-ping opacity-25 -z-10"></span>
        </button>
      </div>

      {/* EMERGENCY SOS FULLSCREEN BACKDROP MODAL */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="emergency-sos-modal">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl relative font-sans max-h-[95vh] overflow-y-auto">
            
            {/* Top-Right Dismiss Button */}
            <button
              type="button"
              onClick={() => setShowSOSModal(false)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 p-2 rounded-full transition cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Pulsing hazard lights backdrop effect */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-red-650 animate-pulse"></div>

            <div className="flex flex-col items-center text-center">
              {/* Emergency Radar Animation */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-25"></div>
                <div className="h-20 w-20 bg-red-650 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/35 relative border-4 border-red-100">
                  <AlertCircle className="h-9 w-9 text-white animate-pulse" />
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight uppercase">
                EMERGENCY SOS COMMAND
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Initiating immediate secure link with regional trauma coordination cells and live ambulance dispatch.
              </p>

              {/* GPS Tracker Container */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full my-5 text-left space-y-3">
                <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider flex items-center gap-1">
                    <Navigation className="h-3 w-3 text-indigo-600" />
                    High-Precision GPS Location
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">LATITUDE & LONGITUDE</span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {retrievingGps ? "Retrieving satellite coordinates..." : gpsCoordinates}
                    </span>
                  </div>
                  {!retrievingGps && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-100 font-mono">
                      GPS LOCK
                    </span>
                  )}
                </div>

                <div className="border-t border-slate-150 pt-2.5">
                  <span className="text-[10px] text-slate-400 block font-mono">RESPONDING FACILITY</span>
                  <span className="text-xs font-bold text-indigo-700">
                    🏥 {closestFacility.name} (Nearest facility, distance {closestFacility.distance} km)
                  </span>
                </div>
              </div>

              {/* Live Tracking Status Flow */}
              {sosDispatched && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 w-full text-left space-y-3 mb-5 animate-slideUp">
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <Check className="h-4.5 w-4.5 bg-emerald-100 text-emerald-850 rounded-full p-0.5" />
                    <span className="text-xs font-bold">Emergency Signal Sent successfully</span>
                  </div>
                  <p className="text-[11px] text-slate-650 leading-normal">
                    The duty manager at <strong>{closestFacility.name}</strong> has received your physical distress ping. An emergency trauma coordinator is actively on-duty.
                  </p>

                  {ambulanceRequested ? (
                    <div className="border-t border-emerald-200/50 pt-3 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Truck className="h-4 w-4 text-emerald-700 animate-bounce" />
                          Ambulance Dispatch Info:
                        </span>
                        <span className="font-mono bg-indigo-100 text-indigo-800 text-[10px] font-black px-2 py-0.5 rounded">
                          {dispatchedAmbulancePlate}
                        </span>
                      </div>
                      
                      {/* Countdown Visual */}
                      <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-mono uppercase font-bold">Estimated Arrival Time (ETA)</span>
                          <span className="text-sm font-black font-mono text-emerald-750 animate-pulse">{formattedEta}</span>
                        </div>
                        <span className="h-2 w-12 bg-emerald-200 rounded-full overflow-hidden relative">
                          <span className="absolute left-0 top-0 bottom-0 bg-emerald-600 animate-pulse w-2/3"></span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAmbulanceRequested(true);
                        setSecondsLeft(480); // 8 minutes
                        setDispatchedAmbulancePlate(`MH-12-EM-${Math.floor(1000 + Math.random() * 9000)}`);
                      }}
                      id="request-ambulance-btn"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer uppercase tracking-wider"
                    >
                      Request Ambulance Dispatch & ETA
                    </button>
                  )}
                </div>
              )}

              {/* SOS Main Trigger buttons */}
              {!sosDispatched && (
                <div className="w-full space-y-3 mb-6">
                  <button
                    type="button"
                    disabled={retrievingGps}
                    onClick={() => {
                      setSosDispatched(true);
                      if ("speechSynthesis" in window && isVoiceOverEnabled) {
                        speakText("Emergency signal dispatched. Nearest medical facility has been alerted.");
                      }
                    }}
                    id="confirm-sos-btn"
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-mono font-black py-3 rounded-2xl text-xs transition cursor-pointer flex items-center justify-center gap-2 uppercase shadow-lg shadow-red-600/25"
                  >
                    <PhoneCall className="h-4 w-4 animate-bounce" />
                    <span>Confirm & Alert Emergency Team</span>
                  </button>
                </div>
              )}

              {/* Close/Dismiss Controls */}
              <button
                type="button"
                onClick={() => setShowSOSModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Close SOS Panel
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Dynamic Digital Lab Report Viewer Modal */}
      {viewingReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn" id="lab-report-modal">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-indigo-900 text-white p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🏛️</span>
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider font-mono">Government Clinical Labs</h3>
                  <p className="text-[10px] text-indigo-200">National Digital Health Locker Integrated</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingReport(null)}
                className="bg-indigo-850 hover:bg-indigo-800 text-indigo-200 hover:text-white p-1 rounded-lg transition text-xs font-bold font-mono px-2"
              >
                ✕ Close
              </button>
            </div>

            {/* Document Content */}
            <div className="p-6 overflow-y-auto space-y-6 font-sans text-xs text-slate-800 flex-1">
              {/* Document Header */}
              <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                <h4 className="text-sm font-bold tracking-tight uppercase text-slate-900">Official Diagnostics Report</h4>
                <p className="text-[10px] text-slate-400 font-mono">Document Hash: ABHA-SEC-{Math.floor(100000 + Math.random() * 900000)}</p>
              </div>

              {/* Patient Meta Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold">PATIENT NAME</span>
                  <span className="font-bold text-slate-800">{viewingReport.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold">ABHA ID / HEALTH ID</span>
                  <span className="font-bold text-slate-850">{viewingReport.abhaId || "Not Linked"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold">AGE / GENDER</span>
                  <span className="font-bold text-slate-800">{viewingReport.age} Yrs / {viewingReport.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-bold">TESTING DATE</span>
                  <span className="font-bold text-slate-800">{viewingReport.date}</span>
                </div>
              </div>

              {/* Lab Parameters Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">LABORATORY RESULTS</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 p-2 border-b border-slate-200 grid grid-cols-3 font-bold text-slate-600 text-[10px] font-mono">
                    <span>TEST PARAMETER</span>
                    <span className="text-center">OBSERVED VALUE</span>
                    <span className="text-right">REFERENCE RANGE</span>
                  </div>
                  <div className="p-3 bg-white space-y-3">
                    <div className="grid grid-cols-3 font-bold text-slate-800">
                      <span>{viewingReport.testName}</span>
                      <span className="text-center text-indigo-700">{viewingReport.result.split(",")[0] || viewingReport.result}</span>
                      <span className="text-right text-slate-400 font-normal">Normal Range</span>
                    </div>
                    {viewingReport.result.includes(",") && (
                      <div className="grid grid-cols-3 text-slate-700 pt-1.5 border-t border-slate-100 font-mono text-[10px]">
                        <span>Secondary Marker</span>
                        <span className="text-center text-indigo-600">{viewingReport.result.split(",")[1]}</span>
                        <span className="text-right text-slate-400">-</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clinician Stamp & Verification */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 font-mono text-[10px]">
                  <span>🟢</span>
                  <span className="font-bold">ABHA Verified Secure</span>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="font-bold text-slate-800 text-[10px]">Dr. R. K. Mahajan, MD</p>
                  <p className="text-[9px] text-slate-400 font-mono">Authorized Signatory Stamp</p>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 shrink-0">
              <button
                onClick={() => {
                  handleDownloadReport(viewingReport.testName);
                  setViewingReport(null);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                📥 Download PDF Document
              </button>
              <button
                onClick={() => setViewingReport(null)}
                className="px-4 bg-white hover:bg-slate-100 text-slate-600 font-bold py-2 rounded-xl text-xs transition border border-slate-200 cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
