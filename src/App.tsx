/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Header } from "./components/Header";
import { LoginPortal } from "./components/LoginPortal";
import { PatientDashboard } from "./components/PatientDashboard";
import { DoctorDashboard } from "./components/DoctorDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { 
  Facility, 
  Bed, 
  Doctor, 
  Patient, 
  Ambulance, 
  Medicine, 
  DistrictAnalytics, 
  TRANSLATIONS 
} from "./types";
import { Activity, HeartPulse, Sparkles, Languages } from "lucide-react";

export default function App() {
  // Global View Session Configuration (null = Login Gate at startup)
  const [session, setSession] = useState<{
    role: "patient" | "doctor" | "admin";
    doctorId?: string;
  } | null>(null);

  // Derive role for downward compatibility
  const role = session ? session.role : null;
  const [language, setLanguage] = useState<"en" | "hi" | "mr">("en");

  // 15-minute inactivity auto-logout timer for doctor & admin sessions
  const [inactiveSeconds, setInactiveSeconds] = useState(0);
  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!session || (session.role !== "doctor" && session.role !== "admin")) {
      setInactiveSeconds(0);
      return;
    }

    const resetInactivity = () => {
      setInactiveSeconds(0);
    };

    // Listen for user interactions to reset timer
    window.addEventListener("mousemove", resetInactivity);
    window.addEventListener("keydown", resetInactivity);
    window.addEventListener("mousedown", resetInactivity);
    window.addEventListener("scroll", resetInactivity);
    window.addEventListener("touchstart", resetInactivity);

    const interval = setInterval(() => {
      setInactiveSeconds((prev) => {
        const next = prev + 1;
        // 15 minutes is 900 seconds
        if (next >= 900) {
          setSession(null);
          setLogoutNotice("inactivity");
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      window.removeEventListener("mousemove", resetInactivity);
      window.removeEventListener("keydown", resetInactivity);
      window.removeEventListener("mousedown", resetInactivity);
      window.removeEventListener("scroll", resetInactivity);
      window.removeEventListener("touchstart", resetInactivity);
      clearInterval(interval);
    };
  }, [session]);

  // Shared Server State Mirror
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [medicines, setMedicines] = useState<Record<string, Medicine>>({});
  const [beds, setBeds] = useState<Record<string, Bed[]>>({});
  
  // Analytics
  const [analytics, setAnalytics] = useState<DistrictAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // General Loading & Action States
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [booking, setBooking] = useState(false);

  // Synchronize state with backend
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (data) {
        setFacilities(data.facilities || []);
        setDoctors(data.doctors || []);
        setPatients(data.patients || []);
        setAmbulances(data.ambulances || []);
        setMedicines(data.medicines || {});
        setBeds(data.beds || {});
      }
    } catch (err) {
      console.error("Failed to synchronize state with server:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(() => {
      fetchState();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Action: Reset State
  const handleResetState = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/state/reset", { method: "POST" });
      const data = await res.json();
      if (data && data.db) {
        setFacilities(data.db.facilities);
        setDoctors(data.db.doctors);
        setPatients(data.db.patients);
        setAmbulances(data.db.ambulances);
        setMedicines(data.db.medicines);
        setBeds(data.db.beds);
        setAnalytics(null); // Clear analytics to be re-computed on fresh seed
      }
    } catch (err) {
      console.error("Failed to reset database:", err);
    } finally {
      setResetting(false);
    }
  };

  // Action: Patient OPD Ticket Booking
  const handleBookOPD = async (bookingData: {
    name: string;
    age: number;
    gender: string;
    facilityId: string;
    symptoms: string;
    language: string;
  }) => {
    setBooking(true);
    try {
      const res = await fetch("/api/patient/book-opd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });
      const data = await res.json();
      if (data && data.success) {
        await fetchState(); // Sync complete queue
        return data;
      }
    } catch (err) {
      console.error("Failed to book OPD Ticket:", err);
    } finally {
      setBooking(false);
    }
    return null;
  };

  // Action: Doctor Wifi Clock-in / Out
  const handleClockIn = async (doctorId: string, wifiSsid: string, action: "clockIn" | "clockOut") => {
    try {
      const res = await fetch("/api/doctor/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, wifiSsid, action })
      });
      const data = await res.json();
      if (data && data.success) {
        await fetchState(); // Sync new attendance log
        return data;
      }
    } catch (err) {
      console.error("Failed to log attendance:", err);
    }
    return null;
  };

  // Action: Doctor Prescribe Meds (Pharmacy decrement)
  const handlePrescribeMeds = async (patientId: string, prescriptions: any[]) => {
    try {
      const res = await fetch("/api/doctor/prescribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, prescriptions })
      });
      const data = await res.json();
      if (data && data.success) {
        await fetchState(); // Sync medicine levels
        return data;
      }
    } catch (err) {
      console.error("Failed to dispense prescription:", err);
    }
    return null;
  };

  // Action: Doctor Mark Patient as Seen
  const handleMarkSeen = async (patientId: string) => {
    try {
      const res = await fetch("/api/doctor/mark-seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId })
      });
      const data = await res.json();
      if (data && data.success) {
        await fetchState(); // Sync patient status change
        return data;
      }
    } catch (err) {
      console.error("Failed to mark patient as seen:", err);
    }
    return null;
  };

  // Action: Doctor Emergency Hospital referral
  const handleReferral = async (referralData: {
    patientId: string;
    targetFacilityId: string;
    targetDepartment: string;
    reason: string;
  }) => {
    try {
      const res = await fetch("/api/doctor/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(referralData)
      });
      
      if (!res.ok) {
        const errorText = await res.json();
        throw errorText.error || "Referral failed.";
      }

      const data = await res.json();
      if (data && data.success) {
        await fetchState(); // Sync beds and ambulance fleet
        return data;
      }
    } catch (err) {
      console.error("Hospital referral bed check failure:", err);
      throw err;
    }
    return null;
  };

  // Action: Administrator Invoke Supply Chain Analytics
  const handleRefreshAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/admin/forecast", { method: "POST" });
      const data = await res.json();
      if (data && data.success) {
        setAnalytics({
          districtHealthIndex: data.districtHealthIndex,
          warnings: data.warnings,
          redistributions: data.redistributions,
          flags: data.flags,
          forecasts: data.forecasts
        });
      }
    } catch (err) {
      console.error("AI Analytics forecasting failed:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const t = TRANSLATIONS[language];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased text-slate-800 selection:bg-teal-500/25 selection:text-teal-900" id="smarthealth-app-root">
      
      {/* Platform Navigation Header */}
      <Header
        currentRole={role}
        activeDoctorName={session?.role === "doctor" ? doctors.find(d => d.id === session.doctorId)?.name : undefined}
        onLogout={() => setSession(null)}
        language={language}
        setLanguage={setLanguage}
        onReset={handleResetState}
        resetting={resetting}
        inactiveSeconds={inactiveSeconds}
      />

      {/* Main Core Viewport Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 font-sans text-slate-400">
            <HeartPulse className="h-12 w-12 text-teal-500 animate-pulse" />
            <p className="text-sm font-medium">Powering up secure healthcare node...</p>
          </div>
        ) : !session ? (
          <LoginPortal
            doctors={doctors}
            language={language}
            setLanguage={setLanguage}
            logoutNotice={logoutNotice}
            setLogoutNotice={setLogoutNotice}
            onLoginSuccess={(newSession) => {
              setLogoutNotice(null);
              setInactiveSeconds(0);
              setSession(newSession);
            }}
          />
        ) : (
          <motion.div
            key={role || "auth"}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {role === "patient" && (
              <PatientDashboard
                patients={patients}
                facilities={facilities}
                doctors={doctors}
                language={language}
                onBookOPD={handleBookOPD}
                booking={booking}
              />
            )}

            {role === "doctor" && (
              <DoctorDashboard
                doctors={doctors}
                patients={patients}
                facilities={facilities}
                medicines={medicines}
                beds={beds}
                language={language}
                onClockIn={handleClockIn}
                onPrescribe={handlePrescribeMeds}
                onRefer={handleReferral}
                onMarkSeen={handleMarkSeen}
                activeDoctorId={session.doctorId}
              />
            )}

            {role === "admin" && (
              <AdminDashboard
                facilities={facilities}
                medicines={medicines}
                patients={patients}
                doctors={doctors}
                beds={beds}
                ambulances={ambulances}
                language={language}
                analyticsData={analytics}
                onRefreshAnalytics={handleRefreshAnalytics}
                loadingAnalytics={loadingAnalytics}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* Subtle, Non-Larping, Minimal footer info for Hackathon showcase */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-sans mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1">
            <span>🛡️ Secured with Role-Based Access Controls</span>
            <span>•</span>
            <span className="text-teal-600 font-bold">Multilingual Localization Active</span>
          </p>
          <p className="font-mono text-[10px]">
            Smart Health Center Management Systems © 2026
          </p>
        </div>
      </footer>

    </div>
  );
}
