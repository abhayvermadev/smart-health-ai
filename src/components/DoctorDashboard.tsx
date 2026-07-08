import React, { useState, useEffect } from "react";
import { 
  Wifi, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  FileText, 
  Plus, 
  Truck, 
  BedDouble, 
  FilePlus, 
  ShieldCheck,
  Building,
  Activity,
  ArrowRight,
  Brain,
  Sparkles,
  Bell,
  Mic,
  MicOff,
  Volume2
} from "lucide-react";
import { TRANSLATIONS, Doctor, Patient, Facility, Medicine } from "../types";

interface DoctorDashboardProps {
  doctors: Doctor[];
  patients: Patient[];
  facilities: Facility[];
  medicines: Record<string, Medicine>;
  beds: Record<string, any[]>;
  language: "en" | "hi" | "mr";
  onClockIn: (doctorId: string, wifiSsid: string, action: "clockIn" | "clockOut") => Promise<any>;
  onPrescribe: (patientId: string, prescriptions: any[]) => Promise<any>;
  onRefer: (data: {
    patientId: string;
    targetFacilityId: string;
    targetDepartment: string;
    reason: string;
  }) => Promise<any>;
  onMarkSeen: (patientId: string) => Promise<any>;
  activeDoctorId?: string;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctors,
  patients,
  facilities,
  medicines,
  beds,
  language,
  onClockIn,
  onPrescribe,
  onRefer,
  onMarkSeen,
  activeDoctorId
}) => {
  const t = TRANSLATIONS[language];

  // Active Doctor profile selection
  const [selectedDocId, setSelectedDocId] = useState(activeDoctorId || doctors[0]?.id || "doc-1");
  
  // Wi-Fi configuration simulation
  const [connectedSsid, setConnectedSsid] = useState("Central_CHC_Staff_Secure");
  const [clocking, setClocking] = useState(false);
  const [clockInNotice, setClockInNotice] = useState<{ type: "success" | "warning"; msg: string } | null>(null);

  // Active Selected Patient for consultation
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [queueTab, setQueueTab] = useState<"awaiting" | "completed">("awaiting");

  // Real-time toast system for new/triaged patient arrivals
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "arrival" | "triage" }[]>([]);
  const [prevPatientsList, setPrevPatientsList] = useState<Patient[]>([]);

  // Prescription Dosage Suggester States
  const [patientWeight, setPatientWeight] = useState("65");
  const [patientHistory, setPatientHistory] = useState("");
  const [suggestedDosageAdvisory, setSuggestedDosageAdvisory] = useState<{
    dosage: string;
    duration: string;
    explanation: string;
  } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Prescriptions input form list
  const [selectedMedId, setSelectedMedId] = useState(Object.keys(medicines)[0] || "");
  const [dosage, setDosage] = useState("1-0-1 (After Meals)");
  const [duration, setDuration] = useState("5 days");
  const [prescriptionList, setPrescriptionList] = useState<{ medId: string; dosage: string; duration: string }[]>([]);
  const [prescribing, setPrescribing] = useState(false);
  const [markingSeen, setMarkingSeen] = useState(false);

  // Referral Desk Form state
  const [targetFacilityId, setTargetFacilityId] = useState(facilities[0]?.id || "");
  const [targetDepartment, setTargetDepartment] = useState("General");
  const [referralReason, setReferralReason] = useState("");
  const [referring, setReferring] = useState(false);
  const [referralSuccessMsg, setReferralSuccessMsg] = useState<string | null>(null);
  
  const [prescriptionSuccess, setPrescriptionSuccess] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);

  // Global Voice Command Interface States
  const [voiceActive, setVoiceActive] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const [speechFeedback, setSpeechFeedback] = useState("");
  const [recognitionObj, setRecognitionObj] = useState<any>(null);

  const speakFeedback = (text: string) => {
    setSpeechFeedback(text);
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.log("SpeechSynthesis failed:", e);
    }
  };

  const executeVoiceCommand = (commandText: string) => {
    const command = commandText.toLowerCase().trim();
    setSpeechTranscript(commandText);

    if (
      command.includes("show my patients") || 
      command.includes("show patients") || 
      command.includes("show awaiting") || 
      command.includes("view patients")
    ) {
      setQueueTab("awaiting");
      speakFeedback("Showing your awaiting patient queue.");
      return true;
    }
    if (
      command.includes("show completed") || 
      command.includes("completed patients") || 
      command.includes("view completed")
    ) {
      setQueueTab("completed");
      speakFeedback("Displaying completed consultation logs.");
      return true;
    }
    if (
      command.includes("clock me out") || 
      command.includes("clock out") || 
      command.includes("sign out")
    ) {
      handleClockAction("clockOut");
      speakFeedback("Clocking you out of shift secure session.");
      return true;
    }
    if (
      command.includes("clock me in") || 
      command.includes("clock in") || 
      command.includes("sign in")
    ) {
      handleClockAction("clockIn");
      speakFeedback("Verifying secure WiFi. Clocking you in to active OPD shift.");
      return true;
    }
    if (
      command.includes("select patient") || 
      command.includes("next patient") || 
      command.includes("open patient") || 
      command.includes("choose patient")
    ) {
      if (awaitingPatients.length > 0) {
        setSelectedPatientId(awaitingPatients[0].id);
        speakFeedback(`Selected patient ${awaitingPatients[0].name}. Displaying diagnostic history.`);
      } else {
        speakFeedback("No awaiting patients in the queue to select.");
      }
      return true;
    }

    return false;
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && voiceActive) {
      try {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => {
          setSpeechTranscript("Listening for clinical voice command...");
        };

        rec.onresult = (event: any) => {
          const lastResultIndex = event.results.length - 1;
          const text = event.results[lastResultIndex][0].transcript;
          const matched = executeVoiceCommand(text);
          if (!matched) {
            setSpeechTranscript(`"${text}" (Command not recognized)`);
          }
        };

        rec.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setSpeechTranscript("Microphone permission blocked. Use the manual command triggers below.");
          }
        };

        rec.onend = () => {
          if (voiceActive) {
            try {
              rec.start();
            } catch (e) {
              // ignore restart collision
            }
          }
        };

        rec.start();
        setRecognitionObj(rec);

        return () => {
          rec.onend = null;
          rec.stop();
        };
      } catch (err) {
        console.warn("Failed starting SpeechRecognition:", err);
      }
    } else {
      if (recognitionObj) {
        try {
          recognitionObj.stop();
        } catch (e) {}
        setRecognitionObj(null);
      }
    }
  }, [voiceActive]);

  const activeDoc = doctors.find(d => d.id === selectedDocId) || doctors[0];
  const docFacility = facilities.find(f => f.id === activeDoc?.facilityId);

  // Filter patients currently waiting or treated by this doctor at his/her current facility
  const docPatients = patients.filter(p => 
    p.facilityId === activeDoc?.facilityId && 
    (p.doctorId === activeDoc?.id || p.doctorId === null)
  );

  // Symptom analyzer score helper (Safety Rule Classifier representing dynamic suggestions engine)
  const getSymptomPriorityScore = (symptoms: string) => {
    const sym = (symptoms || "").toLowerCase();
    
    // Critical
    if (
      sym.includes("chest pain") || 
      sym.includes("breathlessness") || 
      sym.includes("breathing") || 
      sym.includes("unconscious") || 
      sym.includes("unresponsive") || 
      sym.includes("heart attack") || 
      sym.includes("severe bleeding") || 
      sym.includes("head injury") ||
      sym.includes("poison") ||
      sym.includes("choking") ||
      sym.includes("gasping") ||
      sym.includes("shock")
    ) {
      return {
        score: 4,
        label: "CRITICAL" as const,
        bg: "bg-rose-100 text-rose-800 border-rose-200",
        indicator: "bg-rose-500"
      };
    }
    
    // Urgent
    if (
      sym.includes("high fever") || 
      sym.includes("vomiting") || 
      sym.includes("diarrhea") || 
      sym.includes("fracture") || 
      sym.includes("asthma") || 
      sym.includes("severe abdominal") || 
      sym.includes("intense pain") || 
      sym.includes("burn") ||
      sym.includes("dehydration") ||
      sym.includes("bleeding") ||
      sym.includes("dengue") ||
      sym.includes("malaria") ||
      sym.includes("shivering")
    ) {
      return {
        score: 3,
        label: "URGENT" as const,
        bg: "bg-amber-100 text-amber-800 border-amber-200",
        indicator: "bg-amber-500"
      };
    }

    // Standard
    if (
      sym.includes("fever") || 
      sym.includes("cough") || 
      sym.includes("cold") || 
      sym.includes("pain") || 
      sym.includes("headache") || 
      sym.includes("throat") || 
      sym.includes("rash") || 
      sym.includes("itching") || 
      sym.includes("injury") || 
      sym.includes("allergy")
    ) {
      return {
        score: 2,
        label: "STANDARD" as const,
        bg: "bg-blue-100 text-blue-800 border-blue-200",
        indicator: "bg-blue-500"
      };
    }

    // Routine
    return {
      score: 1,
      label: "ROUTINE" as const,
      bg: "bg-slate-100 text-slate-800 border-slate-200",
      indicator: "bg-slate-400"
    };
  };

  // Enhance patient list queue automatically sorted by priority based on their symptoms analysis
  const awaitingPatients = docPatients
    .filter(p => p.status === "OPD_Pending")
    .sort((a, b) => {
      return getSymptomPriorityScore(b.symptoms).score - getSymptomPriorityScore(a.symptoms).score;
    });

  const completedPatients = docPatients.filter(p => p.status !== "OPD_Pending");

  const activePatient = docPatients.find(p => p.id === selectedPatientId);

  // Reset dosage advice on patient change
  useEffect(() => {
    setSuggestedDosageAdvisory(null);
    if (activePatient) {
      if (activePatient.age <= 2) setPatientWeight("12");
      else if (activePatient.age <= 5) setPatientWeight("18");
      else if (activePatient.age <= 12) setPatientWeight("32");
      else setPatientWeight("65");

      const prevMeds = activePatient.prescribedMeds.map(m => m.name).join(", ");
      setPatientHistory(prevMeds || "None registered");
    }
  }, [selectedPatientId]);

  // Real-time comparison for patient changes
  useEffect(() => {
    if (prevPatientsList.length === 0) {
      setPrevPatientsList(docPatients);
      return;
    }

    const newArrivals = docPatients.filter(
      p => !prevPatientsList.some(prev => prev.id === p.id)
    );

    const newlyArrived = docPatients.filter(p => {
      const prev = prevPatientsList.find(x => x.id === p.id);
      return prev && !(prev as any).arrived && (p as any).arrived;
    });

    const totalNew = [...newArrivals, ...newlyArrived];

    if (totalNew.length > 0) {
      totalNew.forEach(p => {
        const toastId = Math.random().toString(36).substring(2);
        const text = (p as any).arrived
          ? `Patient ${p.name} checked in via QR Code and arrived in queue.`
          : `New Patient ${p.name} triaged to your ${p.department} queue.`;

        setToasts(prev => [
          ...prev,
          { id: toastId, message: text, type: (p as any).arrived ? "triage" : "arrival" }
        ]);

        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 6000);
      });
    }

    setPrevPatientsList(docPatients);
  }, [patients]);

  const fetchDosageSuggestion = async () => {
    if (!activePatient) return;
    setLoadingSuggestion(true);
    setSuggestedDosageAdvisory(null);
    try {
      const selectedMedicineName = medicines[selectedMedId]?.name || "Paracetamol";
      const res = await fetch("/api/doctor/suggest-dosage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: activePatient.age,
          weight: patientWeight,
          medicineName: selectedMedicineName,
          symptoms: activePatient.symptoms,
          history: patientHistory
        })
      });
      const data = await res.json();
      if (data && data.success) {
        setSuggestedDosageAdvisory({
          dosage: data.dosage,
          duration: data.duration,
          explanation: data.explanation
        });
      }
    } catch (err) {
      console.error("Failed to get dosage recommendation", err);
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleClockAction = async (action: "clockIn" | "clockOut") => {
    setClocking(true);
    setClockInNotice(null);
    try {
      const res = await onClockIn(selectedDocId, connectedSsid, action);
      if (res && res.success) {
        setClockInNotice({
          type: res.isWifiVerified ? "success" : "warning",
          msg: res.message
        });
      }
    } catch (err) {
      console.error("Attendance submission failed", err);
    } finally {
      setClocking(false);
    }
  };

  const handleAddPrescriptionRow = () => {
    if (!selectedMedId) return;
    setPrescriptionList(prev => [...prev, { medId: selectedMedId, dosage, duration }]);
  };

  const handleClearPrescriptionRows = () => {
    setPrescriptionList([]);
  };

  const handleSubmitPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || prescriptionList.length === 0) return;

    setPrescribing(true);
    setPrescriptionSuccess(null);
    try {
      const res = await onPrescribe(activePatient.id, prescriptionList);
      if (res && res.success) {
        setPrescriptionList([]);
        setPrescriptionSuccess("Prescription added and stock updated in real-time successfully!");
        setTimeout(() => setPrescriptionSuccess(null), 5000);
      }
    } catch (err) {
      console.error("Prescription submit failed", err);
    } finally {
      setPrescribing(false);
    }
  };

  const handleReferralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !targetFacilityId || !targetDepartment) return;

    setReferring(true);
    setReferralSuccessMsg(null);
    setReferralError(null);
    try {
      const res = await onRefer({
        patientId: activePatient.id,
        targetFacilityId,
        targetDepartment,
        reason: referralReason || "Urgent specialized care required."
      });
      if (res && res.success) {
        setReferralSuccessMsg(res.message);
        setReferralReason("");
        setSelectedPatientId(""); // clear
        setTimeout(() => setReferralSuccessMsg(null), 6000);
      }
    } catch (err: any) {
      setReferralError(err?.message || err || "Referral failed due to unavailable bed spaces at selected center.");
      setTimeout(() => setReferralError(null), 6000);
    } finally {
      setReferring(false);
    }
  };

  // Preset typical WiFi Networks list
  const wifiNetworks = [
    "Central_CHC_Staff_Secure",
    "North_PHC_Secure_WiFi",
    "East_PHC_Secure_Net",
    "South_PHC_Internal",
    "PHC_Public_Guest_WiFi",
    "Doctor_Home_WiFi_5G"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-6 lg:p-8" id="doctor-dashboard-grid">
      
      {/* TOP/ROLE TOGGLE BAR FOR TESTING - 12 cols */}
      <div className="lg:col-span-12 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3">
          <Building className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="font-bold">
              {activeDoctorId ? "Verified Clinical Session" : "Active On-Duty Doctor Profile"}
            </h3>
            <p className="text-xs text-slate-400">
              {activeDoctorId 
                ? `Logged in as ${activeDoc?.name} (${activeDoc?.specialty})`
                : "Select which doctor profile to clock-in or write prescriptions"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {activeDoctorId ? (
            <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SESSION SECURED
            </div>
          ) : (
            <select
              id="doctor-profile-select"
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                setSelectedPatientId(""); // reset patient queue focus
                setClockInNotice(null);
              }}
              className="bg-slate-800 text-sm text-slate-200 border border-slate-700 px-3 py-2 rounded-xl outline-none cursor-pointer w-full md:w-60"
            >
              {doctors.map(d => {
                const fac = facilities.find(f => f.id === d.facilityId);
                return (
                  <option key={d.id} value={d.id}>{d.name} ({fac ? fac.name.split(" ")[0] : "PHC"})</option>
                );
              })}
            </select>
          )}

          <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
            Current Hospital: <span className="text-indigo-400 font-bold">{docFacility?.name || "HOSPITAL"}</span>
          </div>
        </div>
      </div>

      {/* GLOBAL CLINICAL VOICE COMMANDS ASSISTANT */}
      <div className="lg:col-span-12 bg-white border border-slate-200 shadow-sm rounded-2xl p-5 font-sans relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
          <div className="flex items-start md:items-center gap-3.5">
            <div className={`p-3.5 rounded-xl flex items-center justify-center transition-all ${
              voiceActive ? "bg-rose-50 border border-rose-100 text-rose-600 animate-pulse" : "bg-slate-50 border border-slate-100 text-slate-400"
            }`}>
              {voiceActive ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-800 text-sm tracking-tight">🎙️ Hands-Free Clinical Voice Assistant</h4>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                  voiceActive ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 text-slate-500"
                }`}>
                  {voiceActive ? "LISTENING" : "STBY"}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                Activate the microphone to navigate using real voice triggers. Speak clearly: <span className="font-bold text-indigo-600">"Show my patients"</span>, <span className="font-bold text-indigo-600">"Show completed"</span>, <span className="font-bold text-indigo-600 font-mono">"Select patient"</span>, <span className="font-bold text-indigo-600 font-mono">"Clock me in"</span>, or <span className="font-bold text-indigo-600">"Clock me out"</span>.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Live status transcripts */}
            {(speechTranscript || speechFeedback) && (
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5 px-4 text-xs space-y-1 max-w-sm">
                {speechTranscript && (
                  <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[10px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                    <span className="uppercase font-bold tracking-wider text-slate-400">Heard:</span>
                    <span>"{speechTranscript}"</span>
                  </div>
                )}
                {speechFeedback && (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-mono text-[10px] font-bold">
                    <Volume2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 animate-bounce" />
                    <span className="uppercase tracking-wider">Replied:</span>
                    <span>{speechFeedback}</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const act = !voiceActive;
                setVoiceActive(act);
                if (act) {
                  speakFeedback("Hands free voice command channel active.");
                } else {
                  speakFeedback("Voice command interface paused.");
                }
              }}
              className={`font-black tracking-wide py-3 px-4 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border uppercase ${
                voiceActive 
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200" 
                  : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-md shadow-indigo-600/10"
              }`}
            >
              {voiceActive ? (
                <>
                  <MicOff className="h-3.5 w-3.5" />
                  <span>Pause Voice Listen</span>
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  <span>Activate Hands-Free</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo Voice Command Simulation Shortcuts */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Simulate Command:</span>
          {[
            { label: "Show Patients", text: "Show my patients" },
            { label: "Show Completed", text: "Show completed patients" },
            { label: "Select Patient", text: "Select patient" },
            { label: "Clock In", text: "Clock me in" },
            { label: "Clock Out", text: "Clock me out" }
          ].map((cmd, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => executeVoiceCommand(cmd.text)}
              className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-600 transition cursor-pointer"
            >
              💬 "{cmd.label}"
            </button>
          ))}
        </div>
      </div>

      {/* LEFT COLUMN: Attendance WiFi Panel & Patient Selection - 4 cols */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Daily Clinical Summary */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border border-indigo-950 rounded-2xl p-6 shadow-md relative overflow-hidden font-sans">
          <div className="absolute right-[-10px] top-[-10px] text-white/5 font-bold text-7xl select-none uppercase font-sans">
            STATS
          </div>
          <div className="flex items-center space-x-2 pb-3 border-b border-white/10 mb-4 relative z-10">
            <Activity className="h-5 w-5 text-indigo-400" />
            <h3 className="font-extrabold tracking-tight text-white">
              {language === "hi" ? "दैनिक नैदानिक सारांश" : language === "mr" ? "दैनिक वैद्यकीय सारांश" : "Daily Clinical Summary"}
            </h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">
                {language === "hi" ? "कुल देखे गए मरीज" : language === "mr" ? "एकूण तपासलेले रुग्ण" : "Seen Patients Today"}
              </span>
              <span className="text-2xl font-black text-indigo-300 mt-1 block">
                {completedPatients.length} <span className="text-xs font-normal text-slate-400">/{completedPatients.length + awaitingPatients.length}</span>
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider">
                {language === "hi" ? "प्रतीक्षारत मरीज" : language === "mr" ? "प्रतीक्षा यादी" : "Pending Queue"}
              </span>
              <span className="text-2xl font-black text-amber-300 mt-1 block">
                {awaitingPatients.length} <span className="text-xs font-normal text-slate-400">waiting</span>
              </span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-xs space-y-1.5 relative z-10">
            <span className="text-[10px] font-bold text-indigo-300 block uppercase tracking-wider">
              {language === "hi" ? "आगामी पाली (शिफ्ट)" : language === "mr" ? "पुढील शिफ्ट" : "Shift Schedule & Logs"}
            </span>
            <div className="flex items-center justify-between text-slate-300">
              <span>Status:</span>
              {activeDoc?.attendance.clockIn && !activeDoc?.attendance.clockOut ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                  ON-DUTY
                </span>
              ) : (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                  OFF-DUTY
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px] pt-1 border-t border-white/5">
              <span>{language === "hi" ? "वर्तमान पाली" : language === "mr" ? "सध्याची शिफ्ट" : "Current Shift"}:</span>
              <span className="font-mono text-white font-bold">
                {activeDoc?.attendance.clockIn && !activeDoc?.attendance.clockOut ? "Morning OPD (09:00 - 13:00)" : "Off-Duty"}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300 text-[11px]">
              <span>{language === "hi" ? "आगामी पाली" : language === "mr" ? "पुढील शिफ्ट" : "Upcoming Shift"}:</span>
              <span className="font-mono text-indigo-200 font-bold">
                {activeDoc?.attendance.clockIn && !activeDoc?.attendance.clockOut ? "Evening Round (17:00 - 19:00)" : "Morning OPD (09:00 - 13:00)"}
              </span>
            </div>
          </div>
        </div>
        
        {/* Attendance Panel with strict Wifi verification */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
            <Wifi className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 font-sans">{t.attendanceTitle}</h3>
          </div>

          <div className="space-y-4 font-sans">
            <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-xs space-y-2">
              <p className="font-bold text-slate-700">{t.connectedWifi}</p>
              
              {/* WiFi SSID Selector for Testing */}
              <select
                id="connected-wifi-selector"
                value={connectedSsid}
                onChange={(e) => setConnectedSsid(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 font-mono px-2 py-1.5 rounded outline-none cursor-pointer"
              >
                {wifiNetworks.map(net => (
                  <option key={net} value={net}>📶 {net}</option>
                ))}
              </select>
              
              <div className="text-[10px] text-slate-400 mt-2 font-mono">
                Security Protocol: Only marks duty as "Wifi Verified" if connected to: <span className="text-indigo-600 font-bold">{activeDoc?.wifiSsid}</span>
              </div>
            </div>

            {/* Shift Logs Status */}
            <div className="flex justify-between text-xs font-mono bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 block text-[9px] font-bold uppercase">MORNING SHIFT</span>
                <span className="font-bold text-slate-800">{activeDoc?.attendance.clockIn || t.notClocked}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[9px] font-bold uppercase">EVENING SHIFT</span>
                <span className="font-bold text-slate-800">{activeDoc?.attendance.clockOut || t.notClocked}</span>
              </div>
            </div>

            {/* Attendance verification Badge */}
            {activeDoc?.attendance.clockIn && (
              <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                activeDoc.attendance.wifiVerified 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                  : "bg-amber-50 border-amber-100 text-amber-800"
              }`}>
                {activeDoc.attendance.wifiVerified ? (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>Verified on-site: <span className="font-bold">{activeDoc.wifiSsid}</span></p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>Clocked in outside secure hospital network. Duty status unverified.</p>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="clock-in-btn"
                onClick={() => handleClockAction("clockIn")}
                disabled={clocking}
                className="bg-slate-900 hover:bg-slate-850 text-white font-semibold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                {t.clockIn}
              </button>
              <button
                id="clock-out-btn"
                onClick={() => handleClockAction("clockOut")}
                disabled={clocking}
                className="bg-slate-100 hover:bg-slate-250 text-slate-700 font-semibold py-2 rounded-xl text-xs transition border border-slate-200 cursor-pointer"
              >
                {t.clockOut}
              </button>
            </div>

            {clockInNotice && (
              <div className={`p-3 rounded-xl border text-xs animate-fadeIn ${
                clockInNotice.type === "success" 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                  : "bg-amber-50 border-amber-100 text-amber-700"
              }`}>
                {clockInNotice.msg}
              </div>
            )}
          </div>
        </div>

        {/* Patients queue list */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 font-sans">{t.myPatients}</h3>
            </div>
            <span className="bg-slate-100 text-slate-600 font-mono text-xs px-2 py-0.5 rounded-full font-bold">
              {docPatients.length}
            </span>
          </div>

          {/* Tab switches for Awaiting vs Completed */}
          <div className="flex border-b border-slate-100 mb-4 text-xs font-semibold">
            <button
              onClick={() => setQueueTab("awaiting")}
              className={`flex-1 pb-2.5 text-center transition-all border-b-2 cursor-pointer ${
                queueTab === "awaiting"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Awaiting See ({awaitingPatients.length})
            </button>
            <button
              onClick={() => setQueueTab("completed")}
              className={`flex-1 pb-2.5 text-center transition-all border-b-2 cursor-pointer ${
                queueTab === "completed"
                  ? "border-indigo-600 text-indigo-600 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Completed ({completedPatients.length})
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {(queueTab === "awaiting" ? awaitingPatients : completedPatients).length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic border border-slate-100 border-dashed rounded-xl">
                {queueTab === "awaiting" 
                  ? "No patients awaiting consultation." 
                  : "No completed patients in this session."}
              </div>
            ) : (
              (queueTab === "awaiting" ? awaitingPatients : completedPatients).map(pat => (
                <button
                  key={pat.id}
                  onClick={() => {
                    setSelectedPatientId(pat.id);
                    setReferralSuccessMsg(null);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    activePatient?.id === pat.id 
                      ? "bg-indigo-50/55 border-indigo-300 shadow-xs" 
                      : "bg-slate-50/50 border-slate-150 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-sans space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-slate-800">{pat.name}</p>
                      {pat.status === "OPD_Pending" && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                          getSymptomPriorityScore(pat.symptoms).bg
                        }`}>
                          {getSymptomPriorityScore(pat.symptoms).label}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">{pat.age} Yrs • {pat.gender}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <p className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded-full font-bold">
                        {pat.department}
                      </p>
                      {/* Arrived indicator from QR code check-in */}
                      {(pat as any).arrived && (
                        <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-1.5 py-0.5 rounded-full font-bold">
                          ARRIVED {(pat as any).checkInTime ? `(${ (pat as any).checkInTime })` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right font-sans shrink-0">
                    <span className="text-[10px] font-black text-slate-900 block font-mono">{pat.ticketNumber}</span>
                    <span className={`text-[9px] font-bold ${
                      pat.status === "OPD_Pending" ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {pat.status === "OPD_Pending" ? "WAITING" : "SEEN"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Active Patient Consultation & Prescriptions / Cross Referral - 8 cols */}
      <div className="lg:col-span-8 space-y-6">
        
        {activePatient ? (
          <div className="space-y-6">
            
            {/* Patient Header Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 mb-4 gap-3">
                <div className="font-sans">
                  <span className="text-[10px] text-indigo-600 font-bold uppercase font-mono bg-indigo-50 px-2 py-0.5 rounded">PATIENT RECORD IN FOCUS</span>
                  <h3 className="text-lg font-bold text-slate-800 mt-1">{activePatient.name}</h3>
                  <p className="text-xs text-slate-400">Age: {activePatient.age} Yrs • Gender: {activePatient.gender} • Language: {activePatient.language.toUpperCase()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {activePatient.status === "OPD_Pending" && (
                    <button
                      type="button"
                      disabled={markingSeen}
                      onClick={async () => {
                        setMarkingSeen(true);
                        try {
                          await onMarkSeen(activePatient.id);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setMarkingSeen(false);
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{markingSeen ? "Processing..." : "Mark as Patient Seen"}</span>
                    </button>
                  )}
                  {activePatient.status === "OPD_Treated" && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600 animate-pulse" />
                      <span>Patient Seen & Treated</span>
                    </span>
                  )}
                  <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-right font-mono">
                    <span className="text-[9px] text-slate-400 block font-bold">OPD TICKET</span>
                    <span className="text-sm font-black text-slate-900">{activePatient.ticketNumber}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 font-sans text-xs text-slate-700">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Symptom Statement / Complaints:</span>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8 bg-slate-50 border border-slate-150 rounded-xl p-4 text-slate-700 italic flex items-center justify-start text-[13px]">
                      "{activePatient.symptoms}"
                    </div>
                    
                    {/* Triage Safety Board */}
                    <div className="md:col-span-4 bg-slate-900 text-white rounded-xl p-4 flex flex-col justify-between border border-slate-800 shadow-xs">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                        <Brain className="h-4 w-4 text-teal-400 shrink-0" />
                        <span>AI Triage Advisor</span>
                      </div>
                      
                      <div className="my-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border tracking-wide ${
                          getSymptomPriorityScore(activePatient.symptoms).bg
                        }`}>
                          {getSymptomPriorityScore(activePatient.symptoms).label} PRIORITY
                        </span>
                        <div className="text-[11px] text-slate-300 font-medium leading-relaxed mt-3 italic">
                          "Parsed emergency safety rating: {getSymptomPriorityScore(activePatient.symptoms).score}/4. Scheduled first in high-priority clinical queue."
                        </div>
                      </div>
                      
                      <div className="text-[9px] text-teal-400 font-mono font-black uppercase tracking-wider">
                        ● AUTO-SORTED
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                  {/* Lab reports for diagnosis verification */}
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Lab diagnostics & vitals:</span>
                    <div className="space-y-1.5">
                      {activePatient.reports.map((rep, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex justify-between items-center text-[11px]">
                          <span>🧪 {rep.testName}</span>
                          <span className={`font-semibold ${
                            rep.status === "Ready" ? "text-emerald-600" : "text-amber-500"
                          }`}>{rep.status === "Ready" ? "Result Ready" : "Pending Collection"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bed availability lookups */}
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Hospital ward availability:</span>
                    <div className="space-y-1.5">
                      {beds[activeDoc?.facilityId]?.map((b, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex justify-between items-center text-[11px] font-mono">
                          <span>{b.department} Ward</span>
                          <span className="font-bold">{b.occupied} / {b.total} Beds Occupied</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action panel toggle: Prescribe Meds vs Cross-referral Bed booking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Write Prescription Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
                  <FilePlus className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 font-sans">{t.prescribeMed}</h4>
                </div>

                <form onSubmit={handleSubmitPrescription} className="space-y-4 font-sans text-xs">
                  <div>
                    <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1">Select Medicine & Quantity (Real-time)</label>
                    <select
                      id="med-select"
                      value={selectedMedId}
                      onChange={(e) => setSelectedMedId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                    >
                      {(Object.values(medicines) as Medicine[]).map((med) => {
                        const facilityStock = docFacility?.inventory[med.id] || 0;
                        const isLow = facilityStock <= med.minThreshold;
                        return (
                          <option key={med.id} value={med.id}>
                            {med.name} (Stock: {facilityStock} {med.unit}) {isLow ? "⚠️ LOW" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* AI Smart Dosage Assistant */}
                  <div className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-indigo-150/70 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Brain className="h-4 w-4 text-indigo-600 animate-pulse" />
                        <span className="font-extrabold text-indigo-900 text-[11px] uppercase tracking-wider">AI Dosage Assistant</span>
                      </div>
                      <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">SAFETY ENGINE</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Weight (kg)</label>
                        <input
                          type="number"
                          value={patientWeight}
                          onChange={(e) => setPatientWeight(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 outline-none"
                          placeholder="e.g. 65"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-bold mb-1">Medical History</label>
                        <input
                          type="text"
                          value={patientHistory}
                          onChange={(e) => setPatientHistory(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 outline-none"
                          placeholder="e.g. Hypertension, Asthma"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={loadingSuggestion}
                      onClick={fetchDosageSuggestion}
                      className="w-full bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold py-1.5 rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{loadingSuggestion ? "Analyzing Safety Thresholds..." : "Generate AI Dosage & Duration"}</span>
                    </button>

                    {suggestedDosageAdvisory && (
                      <div className="bg-white border border-indigo-100 p-2.5 rounded-lg text-[10px] space-y-1.5 animate-fadeIn">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[9px] text-slate-400 block font-bold uppercase">AI Recommended Regimen</span>
                            <span className="font-bold text-slate-800">{suggestedDosageAdvisory.dosage} ({suggestedDosageAdvisory.duration})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setDosage(suggestedDosageAdvisory.dosage);
                              setDuration(suggestedDosageAdvisory.duration);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-2 py-1 rounded text-[9px] transition cursor-pointer shrink-0"
                          >
                            Apply Dose
                          </button>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-relaxed italic border-t border-slate-100 pt-1">
                          {suggestedDosageAdvisory.explanation}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1">Dosage Frequency</label>
                      <input
                        id="dosage-input"
                        type="text"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        placeholder="e.g. 1-0-1 (After meals)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1">Duration</label>
                      <input
                        id="duration-input"
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        placeholder="e.g. 5 days"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleAddPrescriptionRow}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
                    >
                      + Add to Receipt
                    </button>
                    {prescriptionList.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearPrescriptionRows}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-xl text-xs transition cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Added Prescriptions Review List */}
                  {prescriptionList.length > 0 && (
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                      <span className="font-bold text-slate-500 block uppercase text-[10px]">PRESCRIPTION LIST FOR DISPENSARY:</span>
                      {prescriptionList.map((item, idx) => {
                        const med = medicines[item.medId];
                        return (
                          <div key={idx} className="flex justify-between items-center text-[10px] text-slate-700 border-b border-slate-200 pb-1.5 last:border-0 last:pb-0">
                            <span>💊 {med?.name}</span>
                            <span className="font-mono text-slate-400">{item.dosage} ({item.duration})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    id="submit-prescription-btn"
                    type="submit"
                    disabled={prescribing || prescriptionList.length === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    {prescribing ? "Updating Pharmacy Stock..." : "Authorize & Dispense Drugs"}
                  </button>
                </form>

                {prescriptionSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 mt-3 animate-fadeIn text-[11px] font-sans flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>{prescriptionSuccess}</p>
                  </div>
                )}
              </div>

              {/* Cross-Hospital Emergency Referral Booking */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center space-x-2 pb-4 border-b border-slate-100 mb-4">
                  <Truck className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-800 font-sans">{t.crossReferral}</h4>
                </div>

                <form onSubmit={handleReferralSubmit} className="space-y-4 font-sans text-xs">
                  <div>
                    <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1">{t.targetCenter}</label>
                    <select
                      id="referral-target-select"
                      value={targetFacilityId}
                      onChange={(e) => setTargetFacilityId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                    >
                      {facilities.filter(f => f.id !== activeDoc?.facilityId).map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.distance}km away)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1">Target Specialized Ward</label>
                    <select
                      id="referral-ward-select"
                      value={targetDepartment}
                      onChange={(e) => setTargetDepartment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                    >
                      <option value="General">General Ward Bed</option>
                      <option value="ICU">Critical Care / ICU Bed</option>
                      <option value="Pediatric">Pediatric Ward Bed</option>
                      <option value="Maternity">Maternity/Gynecology Bed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1">{t.referReason}</label>
                    <textarea
                      id="referral-reason-input"
                      rows={2}
                      value={referralReason}
                      onChange={(e) => setReferralReason(e.target.value)}
                      placeholder="Specify critical symptoms justifying higher center bed allocation"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                    ></textarea>
                  </div>

                  <button
                    id="submit-referral-btn"
                    type="submit"
                    disabled={referring || !targetFacilityId}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {referring ? (
                      <>
                        <Activity className="h-4 w-4 animate-spin" />
                        <span>Securing Bed Space...</span>
                      </>
                    ) : (
                      <>
                        <span>{t.referBed}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                {referralSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-3 mt-3 animate-fadeIn text-[11px] font-sans flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p>{referralSuccessMsg}</p>
                  </div>
                )}

                {referralError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-3 mt-3 animate-fadeIn text-[11px] font-sans flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <p>{referralError}</p>
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-sans italic text-sm">
            Please select a patient from the "Active Patient Queue" on the left column to begin diagnostics, write prescriptions, or issue emergency referrals.
          </div>
        )}

      </div>

      {/* Real-time Triage & Arrival Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 space-y-3 max-w-sm w-full pointer-events-none" id="doctor-toast-notifications-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-4 shadow-xl flex items-start gap-3 animate-slideIn pointer-events-auto"
          >
            <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400">
              <Bell className="h-4 w-4 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold font-sans">Real-time Dashboard Alert</p>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-medium font-sans">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};
