import React from "react";
import { Globe, RefreshCw, HeartPulse } from "lucide-react";
import { TRANSLATIONS } from "../types";

interface HeaderProps {
  currentRole: "patient" | "doctor" | "admin" | null;
  activeDoctorName?: string;
  onLogout: () => void;
  language: "en" | "hi" | "mr";
  setLanguage: (lang: "en" | "hi" | "mr") => void;
  onReset: () => void;
  resetting: boolean;
  inactiveSeconds?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  activeDoctorName,
  onLogout,
  language,
  setLanguage,
  onReset,
  resetting,
  inactiveSeconds
}) => {
  const t = TRANSLATIONS[language];

  // Helper translations for logout/session info
  const logoutTranslation: Record<string, string> = {
    en: "Logout / Exit",
    hi: "लॉगआउट / बाहर निकलें",
    mr: "लॉगआउट / बाहेर पडा"
  };

  const currentSessionLabel = () => {
    if (currentRole === "patient") {
      return language === "hi" ? "👤 मरीज पोर्टल" : language === "mr" ? "👤 रुग्ण पोर्टल" : "👤 Patient Portal";
    }
    if (currentRole === "doctor") {
      return `🩺 ${activeDoctorName || "Doctor"}`;
    }
    if (currentRole === "admin") {
      return language === "hi" ? "📊 जिला प्रशासन कंसोल" : language === "mr" ? "📊 जिल्हा प्रशासन कन्सोल" : "📊 District Admin Console";
    }
    return "";
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 md:h-16 gap-4">
          {/* Logo Title Section */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/10 shrink-0">
              <HeartPulse className="h-6 w-6 text-white" id="app-logo-icon" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 flex items-center gap-1.5 font-sans uppercase">
                MED-INTEL <span className="text-indigo-600 text-xs font-bold font-mono">v2.4</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                {t.subtitle}
              </p>
            </div>
          </div>

          {/* Active Session info or portal placeholder */}
          <div className="flex items-center justify-center">
            {currentRole ? (
              <div className="flex flex-wrap items-center gap-2 bg-slate-100 border border-slate-200 p-1.5 px-3 rounded-2xl justify-center">
                <span className="text-xs font-bold text-slate-700 font-sans tracking-wide">
                  {currentSessionLabel()}
                </span>
                
                {currentRole !== "patient" && inactiveSeconds !== undefined && (
                  <>
                    <span className="h-4 w-[1px] bg-slate-300"></span>
                    <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping"></span>
                      <span>Lock: {Math.floor((900 - inactiveSeconds) / 60)}m {(900 - inactiveSeconds) % 60}s</span>
                    </span>
                  </>
                )}

                <span className="h-4 w-[1px] bg-slate-300"></span>
                <button
                  id="logout-session-btn"
                  onClick={onLogout}
                  className="text-xs text-rose-600 hover:text-rose-800 font-extrabold transition cursor-pointer hover:underline uppercase tracking-wider text-[10px]"
                >
                  🚪 {logoutTranslation[language] || "Logout"}
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-medium tracking-wide">
                🔐 {language === "hi" ? "सुरक्षित पहुंच गेटवे" : language === "mr" ? "सुरक्षित प्रवेश गेटवे" : "SECURE ENTRY PORTAL"}
              </div>
            )}
          </div>

          {/* Controls: Language, Reset */}
          <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 px-2">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi" | "mr")}
                className="bg-transparent text-xs text-slate-600 outline-none font-semibold cursor-pointer py-0.5 border-0 focus:ring-0"
              >
                <option value="en">English (US)</option>
                <option value="hi">हिन्दी (IN)</option>
                <option value="mr">मराठी (IN)</option>
              </select>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>

            {/* Reset State Button */}
            <button
              id="reset-db-btn"
              onClick={onReset}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 text-xs font-mono text-rose-600 transition-all cursor-pointer disabled:opacity-50 font-bold"
              title="Reset state data to initial seed demo values"
            >
              <RefreshCw className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`} />
              <span>Reset Data</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

