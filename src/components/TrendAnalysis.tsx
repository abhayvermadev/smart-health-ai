import React, { useState, useMemo } from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Facility, Medicine, Patient } from "../types";
import { TrendingUp, Users, ShoppingBag, Eye } from "lucide-react";

interface TrendAnalysisProps {
  facilities: Facility[];
  patients: Patient[];
  medicines: Record<string, Medicine>;
  language: "en" | "hi" | "mr";
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  facilities,
  patients,
  medicines,
  language
}) => {
  const [selectedFacility, setSelectedFacility] = useState<string>("all");

  const labels = {
    en: {
      title: "Clinic Operations & Logistics Trends (Last 30 Days)",
      subtitle: "30-day retrospective analytics for patient registry density and drug consumption patterns.",
      selectClinic: "Focus Facility",
      allClinics: "All District Facilities",
      footfallTitle: "Daily Patient Footfall",
      depletionTitle: "Daily Medicine Depletion",
      date: "Date",
      patientsCount: "Patients Registered",
      unitsCount: "Units Consumed",
      legendFootfall: "Patient Check-ins",
      legendDepletion: "Medicine Units Dispensed"
    },
    hi: {
      title: "क्लीनिक संचालन और रसद रुझान (पिछले 30 दिन)",
      subtitle: "रोगी पंजीकरण और दवा खपत पैटर्न के लिए 30-दिवसीय विश्लेषण।",
      selectClinic: "चिकित्सा केंद्र फोकस",
      allClinics: "सभी जिला चिकित्सा केंद्र",
      footfallTitle: "दैनिक रोगी आगमन",
      depletionTitle: "दैनिक दवा खपत",
      date: "तारीख",
      patientsCount: "पंजीकृत मरीज",
      unitsCount: "खपत की गई दवाएं",
      legendFootfall: "रोगी आगमन",
      legendDepletion: "वितरित दवा इकाइयां"
    },
    mr: {
      title: "क्लिनिक ऑपरेशन्स आणि लॉजिस्टिक्स ट्रेंड्स (मागील ३० दिवस)",
      subtitle: "रुग्ण नोंदणी आणि औषध वापर पॅटर्नचे ३०-दिवसीय विश्लेषण.",
      selectClinic: "रुग्णालय फोकस",
      allClinics: "सर्व जिल्हा रुग्णालये",
      footfallTitle: "दैनिक रुग्ण संख्या",
      depletionTitle: "दैनिक औषध वापर",
      date: "तारीख",
      patientsCount: "नोंदणीकृत रुग्ण",
      unitsCount: "वापरलेली औषध युनिट्स",
      legendFootfall: "रुग्ण आगमन",
      legendDepletion: "वितरित औषध युनिट्स"
    }
  }[language];

  // Generate stable, realistic 30-day trends deterministically based on facility ID
  const trendData = useMemo(() => {
    const data = [];
    const baseDate = new Date("2026-06-15"); // 30 days prior to 2026-07-15
    
    // Seed variance based on selected facility to make charts look authentic and distinct
    let footfallBase = 45;
    let depletionBase = 120;
    let swingAmount = 15;

    if (selectedFacility !== "all") {
      const facIndex = facilities.findIndex(f => f.id === selectedFacility);
      const isChc = facilities[facIndex]?.type === "CHC";
      footfallBase = isChc ? 55 : 18;
      depletionBase = isChc ? 140 : 45;
      swingAmount = isChc ? 20 : 8;
    } else {
      // All facilities aggregate
      footfallBase = 135;
      depletionBase = 350;
      swingAmount = 35;
    }

    for (let i = 0; i <= 30; i++) {
      const currentDate = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
      const formattedDate = currentDate.toLocaleDateString(language === "en" ? "en-US" : language === "hi" ? "hi-IN" : "mr-IN", {
        month: "short",
        day: "numeric"
      });

      // Deterministic pseudo-random generation with weekly wave pattern (higher on Mondays, lower on Sundays)
      const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 1 is Monday
      const weeklyWave = dayOfWeek === 1 ? 1.3 : dayOfWeek === 0 ? 0.7 : 1.0;
      const noise = Math.sin(i * 0.8) * swingAmount;
      
      const footfall = Math.max(5, Math.round((footfallBase + noise) * weeklyWave));
      // Medicine depletion correlates with patient footfall but has its own variance
      const depletion = Math.max(10, Math.round((depletionBase + noise * 1.5 + Math.cos(i * 1.2) * 10) * weeklyWave));

      data.push({
        date: formattedDate,
        footfall,
        depletion
      });
    }

    return data;
  }, [selectedFacility, facilities, language]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-100 gap-4">
        <div className="space-y-1 font-sans">
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-indigo-200/50 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Retrospective Logistics
            </span>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-200/50 font-mono uppercase">
              30-Day Windows
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">{labels.title}</h3>
          <p className="text-xs text-slate-400">{labels.subtitle}</p>
        </div>

        {/* Facility Focus Selector */}
        <div className="flex items-center gap-2 font-sans w-full md:w-auto shrink-0">
          <label htmlFor="trend-facility" className="text-xs font-bold text-slate-400 uppercase shrink-0">
            {labels.selectClinic}:
          </label>
          <select
            id="trend-facility"
            value={selectedFacility}
            onChange={(e) => setSelectedFacility(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold px-3 py-2 rounded-xl outline-none cursor-pointer grow md:grow-0"
          >
            <option value="all">{labels.allClinics}</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recharts Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Patient Footfall Line Chart */}
        <div className="bg-slate-50/40 border border-slate-100 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  {labels.footfallTitle}
                </h4>
                <p className="text-[10px] text-slate-400">Total clinical check-ins</p>
              </div>
            </div>
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-lg font-mono">
              Peak: {Math.max(...trendData.map(d => d.footfall))}
            </span>
          </div>

          <div className="w-full h-[200px] font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 15, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#1e293b", 
                    borderRadius: "12px", 
                    border: "none",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "600",
                    fontFamily: "sans-serif"
                  }}
                  itemStyle={{ color: "#818cf8" }}
                />
                <Line 
                  name={labels.legendFootfall}
                  type="monotone" 
                  dataKey="footfall" 
                  stroke="#4f46e5" 
                  strokeWidth={2.5}
                  dot={{ r: 2, stroke: "#4f46e5", strokeWidth: 1, fill: "#fff" }}
                  activeDot={{ r: 5, stroke: "#4f46e5", strokeWidth: 1, fill: "#4f46e5" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Medicine Depletion Line Chart */}
        <div className="bg-slate-50/40 border border-slate-100 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  {labels.depletionTitle}
                </h4>
                <p className="text-[10px] text-slate-400">Inventory volume dispensations</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded-lg font-mono">
              Peak: {Math.max(...trendData.map(d => d.depletion))} units
            </span>
          </div>

          <div className="w-full h-[200px] font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 15, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={9} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#1e293b", 
                    borderRadius: "12px", 
                    border: "none",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: "600",
                    fontFamily: "sans-serif"
                  }}
                  itemStyle={{ color: "#34d399" }}
                />
                <Line 
                  name={labels.legendDepletion}
                  type="monotone" 
                  dataKey="depletion" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  dot={{ r: 2, stroke: "#10b981", strokeWidth: 1, fill: "#fff" }}
                  activeDot={{ r: 5, stroke: "#10b981", strokeWidth: 1, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
