import React, { useState } from "react";
import { motion } from "motion/react";
import { HeartPulse, ShieldAlert, KeyRound, User, Stethoscope, ShieldCheck, Globe, Fingerprint, ScanFace } from "lucide-react";
import { TRANSLATIONS, Doctor } from "../types";

interface LoginPortalProps {
  doctors: Doctor[];
  language: "en" | "hi" | "mr";
  setLanguage: (lang: "en" | "hi" | "mr") => void;
  onLoginSuccess: (
    session:
      | { role: "patient" }
      | { role: "doctor"; doctorId: string }
      | { role: "admin" }
  ) => void;
  logoutNotice?: string | null;
  setLogoutNotice?: (val: string | null) => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  doctors,
  language,
  setLanguage,
  onLoginSuccess,
  logoutNotice,
  setLogoutNotice,
}) => {
  const t = TRANSLATIONS[language];

  // Selected role tab for login UI
  const [activeRole, setActiveRole] = useState<"patient" | "doctor" | "admin">("patient");

  // Doctor credentials form state
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || "");
  const [doctorPin, setDoctorPin] = useState("");
  const [doctorError, setDoctorError] = useState("");

  // Admin credentials form state
  const [adminPin, setAdminPin] = useState("");
  const [adminError, setAdminError] = useState("");

  // Biometric shift login placeholder simulation state
  const [biometricRole, setBiometricRole] = useState<"doctor" | "admin" | null>(null);
  const [biometricScanState, setBiometricScanState] = useState<"idle" | "scanning" | "success" | "failed">("idle");
  const [biometricProgress, setBiometricProgress] = useState(0);

  const startBiometricLogin = (role: "doctor" | "admin") => {
    setBiometricRole(role);
    setBiometricScanState("scanning");
    setBiometricProgress(0);

    let currentProg = 0;
    const interval = setInterval(() => {
      currentProg += 8;
      if (currentProg > 100) currentProg = 100;
      setBiometricProgress(currentProg);

      if (currentProg >= 100) {
        clearInterval(interval);
        setBiometricScanState("success");
        
        try {
          const textToSpeak = role === "doctor"
            ? "Biometric identity verified. Welcome back doctor."
            : "Administrator biometric security clearance approved. Welcome.";
          const speechMsg = new SpeechSynthesisUtterance(textToSpeak);
          speechMsg.rate = 0.95;
          window.speechSynthesis.speak(speechMsg);
        } catch (e) {
          // Speak fallback
        }

        setTimeout(() => {
          if (role === "doctor") {
            onLoginSuccess({ role: "doctor", doctorId: selectedDoctorId || doctors[0]?.id });
          } else {
            onLoginSuccess({ role: "admin" });
          }
          setBiometricRole(null);
          setBiometricScanState("idle");
        }, 1200);
      }
    }, 120);
  };

  const handlePatientEntry = () => {
    onLoginSuccess({ role: "patient" });
  };

  const handleDoctorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorError("");

    if (!selectedDoctorId) {
      setDoctorError("Please select a doctor profile.");
      return;
    }

    // Passcode check
    if (doctorPin === "1234") {
      onLoginSuccess({ role: "doctor", doctorId: selectedDoctorId });
    } else {
      setDoctorError(
        language === "hi"
          ? "गलत पासकोड! कृपया '1234' दर्ज करें।"
          : language === "mr"
          ? "चुकीचा पासकोड! कृपया '1234' प्रविष्ट करा."
          : "Invalid Passcode. Please enter '1234' for demo validation."
      );
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");

    if (adminPin === "9999") {
      onLoginSuccess({ role: "admin" });
    } else {
      setAdminError(
        language === "hi"
          ? "गलत पासकोड! कृपया '9999' दर्ज करें।"
          : language === "mr"
          ? "चुकीचा पासकोड! कृपया '9999' प्रविष्ट करा."
          : "Invalid Passcode. Please enter '9999' for demo validation."
      );
    }
  };

  // Helper translations for LoginPortal specifically
  const localTranslation: Record<string, Record<string, string>> = {
    en: {
      selectRoleText: "Who is accessing the system today?",
      patientCardDesc: "Direct diagnostic routing & OPD ticketing console. No clinical credential required for public patients.",
      doctorCardDesc: "WiFi-secured morning/evening clinic attendance logging, real-time prescription dispense, and patient referral.",
      adminCardDesc: "District healthcare indexes, automated pharmaceutical redistribution plans, and 30-day forecast models.",
      enterPatient: "Open Patient Dashboard (No Login Required)",
      enterDoctor: "Verify & Launch Doctor Console",
      enterAdmin: "Verify & Open District Console",
      selectDocProfile: "Select On-Duty Doctor Profile",
      enterPasscode: "Enter Secure Passcode",
      demoPasscodeLabel: "Demo Passcode",
      wrongPasscode: "Invalid passcode. Please try again."
    },
    hi: {
      selectRoleText: "आज सिस्टम का उपयोग कौन कर रहा है?",
      patientCardDesc: "मरीजों के लिए तत्काल ओपीडी टिकट बुकिंग और नैदानिक परीक्षण रिपोर्ट देखने के लिए। कोई लॉगिन आवश्यक नहीं है।",
      doctorCardDesc: "वाईफाई-सत्यापित उपस्थिति प्रणाली, मरीजों का नुस्खा विवरण, और अस्पतालों के बीच आपातकालीन रेफ़रल प्रबंधन।",
      adminCardDesc: "जिला स्तर की आपूर्ति श्रृंखला पूर्वानुमान, गंभीर औषधि कमी चेतावनी, और स्वास्थ्य सूचकांक विश्लेषण।",
      enterPatient: "मरीज डैशबोर्ड खोलें (कोई लॉगिन आवश्यक नहीं)",
      enterDoctor: "सत्यापित करें और डॉक्टर कंसोल खोलें",
      enterAdmin: "सत्यापित करें और जिला कंसोल खोलें",
      selectDocProfile: "ऑन-ड्यूटी डॉक्टर प्रोफ़ाइल चुनें",
      enterPasscode: "सुरक्षित पासकोड दर्ज करें",
      demoPasscodeLabel: "डेमो पासकोड",
      wrongPasscode: "गलत पासकोड। कृपया पुनः प्रयास करें।"
    },
    mr: {
      selectRoleText: "आज सिस्टम कोण वापरत आहे?",
      patientCardDesc: "रुग्णांसाठी तात्काळ ओपीडी तिकीट बुकिंग आणि वैद्यकीय अहवाल पाहण्यासाठी. लॉगिन आवश्यक नाही.",
      doctorCardDesc: "वायफाय-सत्यापित उपस्थिती नोंदवणे, औषधोपचार लिहून देणे, आणि रुग्णालयांच्या दरम्यान रेफ़रल व्यवस्थापन करणे.",
      adminCardDesc: "जिल्हास्तरीय औषध पुरवठा साखळी अंदाज, साठा टंचाई इशारा आणि आरोग्य निर्देशांक विश्लेषण.",
      enterPatient: "रुग्ण डॅशबोर्ड उघडा (लॉगिन आवश्यक नाही)",
      enterDoctor: "सत्यापित करा आणि डॉक्टर कन्सोल उघडा",
      enterAdmin: "सत्यापित करा आणि जिल्हा कन्सोल उघडा",
      selectDocProfile: "ऑन-ड्यूटी डॉक्टर प्रोफाइल निवडा",
      enterPasscode: "सुरक्षित पासकोड प्रविष्ट करा",
      demoPasscodeLabel: "डेमो पासकोड",
      wrongPasscode: "चुकीचा पासकोड. कृपया पुन्हा प्रयत्न करा."
    }
  };

  const lt = localTranslation[language] || localTranslation.en;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16 flex flex-col justify-center min-h-[80vh]" id="login-portal-container">
      
      {/* Inactivity Security Warn banner */}
      {logoutNotice === "inactivity" && (
        <div className="max-w-md w-full mx-auto mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-md animate-fadeIn" id="inactivity-warning-banner">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs">
            <h5 className="font-extrabold text-amber-900">
              {language === "hi" ? "सुरक्षा कारणों से सत्र समाप्त" : language === "mr" ? "सुरक्षा कारणास्तव सत्र समाप्त" : "Session Expired"}
            </h5>
            <p className="text-amber-800 mt-1 leading-relaxed">
              {language === "hi"
                ? "15 मिनट की निष्क्रियता के कारण जिला सुरक्षा मानकों के तहत आपका सत्र समाप्त कर दिया गया है। कृपया फिर से लॉग इन करें।"
                : language === "mr"
                ? "15 मिनिटांच्या निष्क्रियतेमुळे जिल्हा सुरक्षा मानकांवर आधारित तुमचे सत्र समाप्त केले आहे. कृपया पुन्हा लॉगिन करा."
                : "You have been logged out due to 15 minutes of inactivity under district health data security standards. Please log in again."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLogoutNotice?.(null)}
            className="text-amber-500 hover:text-amber-700 font-extrabold text-sm ml-auto cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Brand Header */}
      <div className="text-center mb-8 sm:mb-12">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/25 mb-4"
        >
          <HeartPulse className="h-9 w-9" />
        </motion.div>
        
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
          MED-INTEL CONNECT
        </h2>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto font-medium">
          {t.subtitle}
        </p>

        {/* Language Selection inside portal */}
        <div className="mt-4 flex items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 px-3 shadow-xs inline-flex mx-auto">
          <Globe className="h-4 w-4 text-slate-400" />
          <select
            id="login-language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "mr")}
            className="bg-transparent text-xs text-slate-600 outline-none font-bold cursor-pointer py-0.5 border-0 focus:ring-0"
          >
            <option value="en">English (US)</option>
            <option value="hi">हिन्दी (IN)</option>
            <option value="mr">मराठी (IN)</option>
          </select>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-100 p-2 gap-1">
          <button
            id="login-tab-patient"
            type="button"
            onClick={() => setActiveRole("patient")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3.5 px-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeRole === "patient"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span>{t.patientRole}</span>
          </button>
          
          <button
            id="login-tab-doctor"
            type="button"
            onClick={() => {
              setActiveRole("doctor");
              if (!selectedDoctorId && doctors.length > 0) {
                setSelectedDoctorId(doctors[0].id);
              }
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3.5 px-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeRole === "doctor"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Stethoscope className="h-4 w-4 shrink-0" />
            <span>{t.doctorRole}</span>
          </button>

          <button
            id="login-tab-admin"
            type="button"
            onClick={() => setActiveRole("admin")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3.5 px-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeRole === "admin"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{t.adminRole}</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 sm:p-10">
          
          {biometricRole ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto py-8 text-center space-y-6 flex flex-col items-center justify-center font-sans"
            >
              <div className="relative flex items-center justify-center">
                {/* Glowing pulse rings */}
                <span className="absolute inline-flex h-24 w-24 rounded-full bg-indigo-500/10 animate-ping"></span>
                <span className="absolute inline-flex h-32 w-32 rounded-full bg-teal-500/5 animate-pulse"></span>
                
                <div className="relative h-20 w-20 bg-slate-900 border-2 border-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  {biometricScanState === "scanning" ? (
                    <Fingerprint className="h-10 w-10 text-teal-400 animate-pulse" />
                  ) : (
                    <ScanFace className="h-10 w-10 text-emerald-400 animate-bounce" />
                  )}
                  {/* High-tech scanner laser line */}
                  {biometricScanState === "scanning" && (
                    <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-md shadow-red-500/80 animate-bounce top-1/2"></div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  {biometricScanState === "scanning" 
                    ? "BIOMETRIC AUTHENTICATION" 
                    : "CLEARANCE AUTHORIZED!"}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {biometricScanState === "scanning"
                    ? `Place finger on clinic pad or align face with the camera scanner...`
                    : "Identity securely verified with local central directory. Initializing shift dashboard..."}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 font-bold">
                  <span>SCANNING SEQUENCE</span>
                  <span>{biometricProgress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-100" 
                    style={{ width: `${biometricProgress}%` }}
                  ></div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBiometricRole(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold border border-slate-200 rounded-lg px-3 py-1 cursor-pointer hover:bg-slate-50"
              >
                Cancel Biometric Check
              </button>
            </motion.div>
          ) : (
            <>
              {/* Patient Access Tab */}
              {activeRole === "patient" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 text-center"
                >
                  <div className="max-w-md mx-auto space-y-3">
                    <h3 className="text-xl font-bold text-slate-800 font-sans">
                      {t.patientRole}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lt.patientCardDesc}
                    </p>
                  </div>

                  <div className="py-2">
                    <button
                      id="patient-portal-launch-btn"
                      onClick={handlePatientEntry}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 px-8 rounded-2xl text-sm transition shadow-lg shadow-indigo-600/25 cursor-pointer max-w-md w-full inline-block"
                    >
                      {lt.enterPatient}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Doctor Login Tab */}
              {activeRole === "doctor" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-md mx-auto space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-800 font-sans">
                      {t.doctorRole}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lt.doctorCardDesc}
                    </p>
                  </div>

                  <form onSubmit={handleDoctorLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {lt.selectDocProfile}
                      </label>
                      <select
                        id="doctor-login-select"
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition cursor-pointer font-semibold"
                      >
                        {doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.specialty})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {lt.enterPasscode}
                      </label>
                      <div className="relative">
                        <input
                          id="doctor-passcode-input"
                          type="password"
                          required
                          value={doctorPin}
                          onChange={(e) => setDoctorPin(e.target.value)}
                          placeholder="••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-indigo-500 focus:bg-white transition"
                        />
                        <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                      </div>
                    </div>

                    {doctorError && (
                      <div className="p-3 bg-red-50 border border-red-150 text-red-600 rounded-xl text-xs flex items-start gap-2 font-medium">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{doctorError}</span>
                      </div>
                    )}

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-700 font-medium">
                      💡 {lt.demoPasscodeLabel}: <strong className="font-bold font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200/50">1234</strong>
                    </div>

                    <button
                      id="doctor-login-submit"
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      {lt.enterDoctor}
                    </button>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">OR BIOMETRICS</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startBiometricLogin("doctor")}
                      className="w-full bg-slate-900 hover:bg-slate-950 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer border border-slate-800 font-mono tracking-wider"
                    >
                      <Fingerprint className="h-4 w-4 text-emerald-400 animate-pulse" />
                      <span>TOUCH FINGERPRINT / FACE ID</span>
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Administrator Login Tab */}
              {activeRole === "admin" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-md mx-auto space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-slate-800 font-sans">
                      {t.adminRole}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {lt.adminCardDesc}
                    </p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {lt.enterPasscode}
                      </label>
                      <div className="relative">
                        <input
                          id="admin-passcode-input"
                          type="password"
                          required
                          value={adminPin}
                          onChange={(e) => setAdminPin(e.target.value)}
                          placeholder="••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-indigo-500 focus:bg-white transition"
                        />
                        <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                      </div>
                    </div>

                    {adminError && (
                      <div className="p-3 bg-red-50 border border-red-150 text-red-600 rounded-xl text-xs flex items-start gap-2 font-medium">
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{adminError}</span>
                      </div>
                    )}

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-700 font-medium">
                      💡 {lt.demoPasscodeLabel}: <strong className="font-bold font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200/50">9999</strong>
                    </div>

                    <button
                      id="admin-login-submit"
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      {lt.enterAdmin}
                    </button>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-extrabold uppercase tracking-widest font-mono">OR BIOMETRICS</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => startBiometricLogin("admin")}
                      className="w-full bg-slate-900 hover:bg-slate-950 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer border border-slate-800 font-mono tracking-wider"
                    >
                      <Fingerprint className="h-4 w-4 text-emerald-400 animate-pulse" />
                      <span>SCAN FINGERPRINT / FACE ID</span>
                    </button>
                  </form>
                </motion.div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};
