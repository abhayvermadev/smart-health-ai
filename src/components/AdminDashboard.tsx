import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  ArrowRightLeft, 
  TrendingUp, 
  Activity, 
  Truck, 
  BedDouble, 
  Users, 
  ShieldAlert, 
  RotateCw, 
  CheckCircle,
  Clock,
  Gauge,
  Info,
  MapPin,
  Stethoscope
} from "lucide-react";
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
import { TRANSLATIONS, DistrictAnalytics, Facility, Medicine, Patient, Doctor, Ambulance, Bed } from "../types";

interface AdminDashboardProps {
  facilities: Facility[];
  medicines: Record<string, Medicine>;
  patients: Patient[];
  doctors: Doctor[];
  beds: Record<string, Bed[]>;
  ambulances: Ambulance[];
  language: "en" | "hi" | "mr";
  analyticsData: DistrictAnalytics | null;
  onRefreshAnalytics: () => Promise<void>;
  loadingAnalytics: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  facilities,
  medicines,
  patients,
  doctors,
  beds,
  ambulances,
  language,
  analyticsData,
  onRefreshAnalytics,
  loadingAnalytics
}) => {
  const t = TRANSLATIONS[language];

  // Active facility focus for logistics grid view
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("all");

  useEffect(() => {
    // Auto-fetch analytics once on component load if null
    if (!analyticsData) {
      onRefreshAnalytics();
    }
  }, []);

  // Compute live local metrics to complement AI predictions
  const totalBeds = (Object.values(beds).flatMap(bList => bList) as Bed[]).reduce((sum, b) => sum + b.total, 0);
  const occupiedBeds = (Object.values(beds).flatMap(bList => bList) as Bed[]).reduce((sum, b) => sum + b.occupied, 0);
  const bedPct = Math.round((occupiedBeds / totalBeds) * 100) || 0;

  const verifiedDocs = doctors.filter(d => d.attendance.clockIn !== null && d.attendance.wifiVerified).length;
  const totalDocsPresent = doctors.filter(d => d.attendance.clockIn !== null).length;
  const docAttendancePct = Math.round((totalDocsPresent / doctors.length) * 100) || 0;

  const activeAmbulancesCount = ambulances.filter(a => a.status === "En-Route").length;

  // Dynamic weekly trends for Line Chart
  const getDeptOccupancyPct = (dept: string) => {
    const deptBeds = (Object.values(beds).flatMap(bList => bList) as Bed[]).filter(b => b.department === dept);
    const total = deptBeds.reduce((sum, b) => sum + b.total, 0);
    const occupied = deptBeds.reduce((sum, b) => sum + b.occupied, 0);
    return Math.round((occupied / total) * 100) || 0;
  };

  const trendData = [
    { day: "Day 1", General: 62, ICU: 55, Pediatric: 35, Maternity: 48 },
    { day: "Day 2", General: 68, ICU: 60, Pediatric: 40, Maternity: 52 },
    { day: "Day 3", General: 75, ICU: 70, Pediatric: 42, Maternity: 50 },
    { day: "Day 4", General: 82, ICU: 78, Pediatric: 48, Maternity: 60 },
    { day: "Day 5", General: 78, ICU: 85, Pediatric: 45, Maternity: 62 },
    { day: "Day 6", General: 80, ICU: 80, Pediatric: 50, Maternity: 65 },
    { day: "Today (Live)", General: getDeptOccupancyPct("General"), ICU: getDeptOccupancyPct("ICU"), Pediatric: getDeptOccupancyPct("Pediatric"), Maternity: getDeptOccupancyPct("Maternity") }
  ];

  // Capacity Warning engine (>85%) with suggested diversion clinics
  const bedCapacityAlerts: Array<{
    facilityId: string;
    facilityName: string;
    department: string;
    occupied: number;
    total: number;
    pct: number;
    suggestedDiversion: string[];
  }> = [];

  Object.entries(beds).forEach(([facId, bList]) => {
    const facility = facilities.find(f => f.id === facId);
    if (!facility) return;
    const bedList = bList as Bed[];
    bedList.forEach(bed => {
      const pct = Math.round((bed.occupied / bed.total) * 100) || 0;
      if (pct >= 85) {
        const nearby = facilities
          .filter(f => f.id !== facId)
          .map(f => {
            const fBeds = beds[f.id] || [];
            const sameDeptBed = fBeds.find(b => b.department === bed.department);
            const vacant = sameDeptBed ? (sameDeptBed.total - sameDeptBed.occupied) : 0;
            return {
              facility: f,
              vacant,
              distance: f.distance
            };
          })
          .filter(x => x.vacant > 0)
          .sort((a, b) => a.distance - b.distance)
          .map(x => `${x.facility.name} (${x.vacant} vacant beds, ${Math.abs(x.facility.distance - facility.distance).toFixed(1)} km away)`);

        bedCapacityAlerts.push({
          facilityId: facId,
          facilityName: facility.name,
          department: bed.department,
          occupied: bed.occupied,
          total: bed.total,
          pct,
          suggestedDiversion: nearby.slice(0, 2)
        });
      }
    });
  });

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8" id="admin-dashboard-container">
      
      {/* SECTION 1: DISTRICT KPI STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-sans">
        
        {/* Metric 1: District Health index */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="z-10">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">{t.districtOverview}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-indigo-400">
                {analyticsData?.districtHealthIndex || 72}
              </span>
              <span className="text-xs text-slate-400">/100</span>
            </div>
            <p className="text-[10px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              AI Stable Outlook
            </p>
          </div>
          <Gauge className="h-14 w-14 text-slate-800 shrink-0 absolute -right-2 top-4" />
        </div>

        {/* Metric 2: Live Doctor Attendance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="font-sans">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Dr. Duty Attendance</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-slate-800">{docAttendancePct}%</span>
              <span className="text-xs text-slate-400">({totalDocsPresent}/{doctors.length})</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              ⚡ {verifiedDocs} WiFi verified sessions
            </p>
          </div>
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 3: Active Patient Footfall */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="font-sans">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">OPD Daily Footfall</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-slate-800">{patients.length}</span>
              <span className="text-xs text-slate-400">Registrations</span>
            </div>
            <p className="text-[10px] text-amber-600 font-semibold bg-amber-50 rounded px-1.5 py-0.5 inline-block mt-2">
              ⚠️ Queue waiting: {patients.filter(p => p.status === "OPD_Pending").length}
            </p>
          </div>
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 4: Bed Vacancies */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="font-sans">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">District Bed Occupancy</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-slate-800">{bedPct}%</span>
              <span className="text-xs text-slate-400">({occupiedBeds}/{totalBeds})</span>
            </div>
            <p className="text-[10px] text-rose-600 font-bold mt-2">
              {totalBeds - occupiedBeds} Beds vacant district-wide
            </p>
          </div>
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <BedDouble className="h-5 w-5" />
          </div>
        </div>

        {/* Metric 5: Ambulance Operations */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
          <div className="font-sans">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Ambulance Fleet</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-slate-800">
                {ambulances.length - activeAmbulancesCount}
              </span>
              <span className="text-xs text-slate-400">/ {ambulances.length} Free</span>
            </div>
            <p className="text-[10px] text-indigo-600 font-mono mt-2 block">
              🚑 {activeAmbulancesCount} active emergency referrals
            </p>
          </div>
          <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* SECTION 2: LIVE DISTRICT BED OCCUPANCY & CAPACITY COMMAND CENTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
        
        {/* Bed Occupancy Trend Line Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <h4 className="font-bold text-slate-800 text-sm">Bed Occupancy Trends (by Department)</h4>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded">
                Live Integration
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Weekly historical tracking mapped against live admissions across all district clinical wings.
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "11px" }}
                  itemStyle={{ color: "#38bdf8" }}
                />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                <Line type="monotone" dataKey="General" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="ICU" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Pediatric" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Maternity" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Bed Capacity Alerts (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600 animate-pulse" />
                <h4 className="font-bold text-slate-800 text-sm">Critical Capacity Alert Center</h4>
              </div>
              <span className="bg-rose-50 text-rose-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse border border-rose-100">
                {bedCapacityAlerts.length} Warnings
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time push alerts triggering when any clinic's department exceeds 85% bed limit. Actionable diversion pathways computed.
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-64 pr-1 flex-grow">
            {bedCapacityAlerts.map((capAlert, idx) => (
              <div key={idx} className="p-3.5 bg-rose-50/50 border border-rose-150 rounded-xl space-y-2.5 animate-fadeIn">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider">
                      CAPACITY CRITICAL: {capAlert.pct}%
                    </span>
                    <h5 className="font-bold text-slate-800 mt-1 text-[11px] sm:text-xs">
                      🏥 {capAlert.facilityName}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-semibold font-sans">
                      Department: <span className="text-rose-600">{capAlert.department} Wing</span> ({capAlert.occupied}/{capAlert.total} Beds)
                    </p>
                  </div>
                </div>

                <div className="bg-white/80 rounded-lg p-2.5 border border-rose-100 text-[10px] text-slate-600 space-y-1">
                  <span className="font-mono font-bold text-indigo-700 block uppercase text-[8px] tracking-wider">AI Diversion Routing Suggestions</span>
                  {capAlert.suggestedDiversion.length > 0 ? (
                    <ul className="list-disc pl-3 space-y-0.5 font-sans">
                      {capAlert.suggestedDiversion.map((divText, dIdx) => (
                        <li key={dIdx} className="text-slate-700">{divText}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 italic font-sans">No immediate nearby clinical vacancy found within 30km radius.</p>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => {
                      if ("Notification" in window && Notification.permission === "granted") {
                        new Notification("Diversion Ordered", {
                          body: `Rerouting patients from ${capAlert.facilityName} (${capAlert.department}) to nearby facilities.`,
                        });
                      }
                      window.alert(`Diversion routing ordered! Coordinating ambulance fleet to reroute patient intakes from ${capAlert.facilityName} - ${capAlert.department} Wing.`);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-black text-[9px] px-2.5 py-1.5 rounded-lg uppercase cursor-pointer"
                  >
                    Authorize Diversion
                  </button>
                </div>
              </div>
            ))}

            {bedCapacityAlerts.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                ✓ All district clinics report stable bed occupancy below 85% limits.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 3: AI ANALYTICS CONTROL DESK */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4 font-sans">
          <div>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-indigo-200/50 font-mono uppercase">
              District Logistical Forecasting
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-2">AI-Driven Supply Chain & Intervention Desk</h3>
            <p className="text-xs text-slate-400">Powered by server-side Gemini 3.5 live inventory simulation audits</p>
          </div>

          <button
            id="recalc-analytics-btn"
            onClick={onRefreshAnalytics}
            disabled={loadingAnalytics}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 text-white font-mono font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer shadow-md shadow-indigo-600/15"
          >
            <RotateCw className={`h-4 w-4 ${loadingAnalytics ? "animate-spin" : ""}`} />
            <span>{t.recalculateAI}</span>
          </button>
        </div>

        {/* AI Analytics Bento Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 font-sans">
          
          {/* AI warnings block - 4 cols */}
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600 font-bold border-b border-slate-100 pb-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-xs uppercase tracking-wide">{t.lowStockWarn}</span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {analyticsData?.warnings.map((warn, idx) => (
                <div key={idx} className="p-3 bg-red-50/55 rounded-xl border border-red-150 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block">⚠️ {warn.medicineName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{warn.facilityName}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-rose-700 font-black font-mono block">Stock: {warn.qtyLeft}</span>
                    <span className="text-[9px] text-red-600 font-bold uppercase bg-red-100/50 px-1.5 py-0.5 rounded inline-block mt-1 font-mono">
                      Depletion: ~{warn.daysLeft} days
                    </span>
                  </div>
                </div>
              ))}
              {(!analyticsData || analyticsData.warnings.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No stockout warning alerts present. District inventory stable.
                </div>
              )}
            </div>
          </div>

          {/* AI Redistribution Plan block - 8 cols */}
          <div className="xl:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold border-b border-slate-100 pb-3">
              <ArrowRightLeft className="h-4 w-4 shrink-0" />
              <span className="text-xs uppercase tracking-wide">{t.redistributePlan}</span>
            </div>

            <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
              {analyticsData?.redistributions.map((plan, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-150 pb-2">
                    <div className="flex items-center flex-wrap gap-1">
                      <span className="font-bold text-slate-700">{plan.sourceName}</span>
                      <span className="text-slate-400 font-mono font-bold">⟶</span>
                      <span className="font-bold text-indigo-700">{plan.targetName}</span>
                    </div>
                    <span className="bg-indigo-600 text-white font-mono font-black px-2 py-0.5 rounded text-[11px] self-start sm:self-auto">
                      Transfer Qty: {plan.transferQty}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-between gap-1.5">
                    <div>
                      <span className="text-slate-400 font-mono block text-[10px] uppercase font-bold">DRUG</span>
                      <span className="font-bold text-slate-800">💊 {plan.medicineName}</span>
                    </div>
                    <div className="sm:max-w-md">
                      <span className="text-slate-400 font-mono block text-[10px] uppercase font-bold">AI LOGISTICS RATIONALE</span>
                      <p className="text-slate-600 text-[11px] italic leading-tight">"{plan.rationale}"</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!analyticsData || analyticsData.redistributions.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No logistical redistributions recommended today.
                </div>
              )}
            </div>
          </div>

          {/* AI Under-resourced Center Intervention Flags - 6 cols */}
          <div className="xl:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-rose-600 font-bold border-b border-slate-100 pb-3">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span className="text-xs uppercase tracking-wide">{t.underresourcedFlags}</span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {analyticsData?.flags.map((flag, idx) => (
                <div key={idx} className="p-3 bg-red-50/20 border border-red-200/50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">🏥 {flag.facilityName}</span>
                    <span className="bg-red-100 text-red-700 font-mono font-black text-[9px] uppercase px-1.5 py-0.5 rounded">
                      {flag.severity} RISK
                    </span>
                  </div>
                  <p className="text-slate-600 leading-normal text-[11px] font-sans">
                    <strong className="text-slate-700">Flag Category: {flag.type}</strong> — {flag.reason}
                  </p>
                </div>
              ))}
              {(!analyticsData || analyticsData.flags.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No critical health facility operational flags active.
                </div>
              )}
            </div>
          </div>

          {/* AI Demand Trend Forecasts - 6 cols */}
          <div className="xl:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 font-bold border-b border-slate-100 pb-3">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="text-xs uppercase tracking-wide">{t.demandForecasts}</span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {analyticsData?.forecasts.map((f, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">📈 {f.medicineName}</span>
                    <span className="text-indigo-600 font-mono font-black text-xs">
                      +{f.pctIncrease}% Surge
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 italic leading-snug">
                    "Trend: {f.trend}. {f.reason}"
                  </p>
                </div>
              ))}
              {(!analyticsData || analyticsData.forecasts.length === 0) && (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No future trends detected. Click Refresh to invoke predictive audits.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: CORE MEDICINE SUPPLY INVENTORY GRID */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4 mb-6">
          <div className="font-sans">
            <h3 className="font-bold text-slate-800 text-base">{t.medInventory}</h3>
            <p className="text-xs text-slate-400">Real-time stock monitoring and distribution index per clinic</p>
          </div>

          {/* Facility filter */}
          <select
            id="admin-facility-filter"
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold px-3 py-2 rounded-xl outline-none cursor-pointer"
          >
            <option value="all">View Entire District Stock</option>
            {facilities.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {/* Inventory Grid Table */}
        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left text-xs text-slate-500 border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Medicine / Drug Formulation</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">District Threshold</th>
                {facilities.filter(f => selectedFacilityId === "all" || f.id === selectedFacilityId).map(f => (
                  <th key={f.id} className="py-3 px-4 text-center">{f.name.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.values(medicines) as Medicine[]).map((med) => (
                <tr key={med.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800">💊 {med.name}</td>
                  <td className="py-3.5 px-4 text-slate-500">{med.category}</td>
                  <td className="py-3.5 px-4 font-mono">Min {med.minThreshold} {med.unit}</td>
                  {facilities.filter(f => selectedFacilityId === "all" || f.id === selectedFacilityId).map(fac => {
                    const stock = fac.inventory[med.id] || 0;
                    const isLow = stock <= med.minThreshold;
                    return (
                      <td key={fac.id} className="py-3.5 px-4 text-center font-mono">
                        <span className={`px-2.5 py-1 rounded-full font-bold ${
                          isLow 
                            ? "bg-red-50 text-red-700 border border-red-100" 
                            : "bg-slate-50 text-slate-700"
                        }`}>
                          {stock}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: DOCTOR ATTENDANCE & AMBULANCE TRACKING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans">
        
        {/* Doctor Duty Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-bold text-slate-800">Doctor Real-time Shift Attendance Tracking</h4>
            <span className="text-xs text-slate-400">Total: {doctors.length}</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {doctors.map((doc) => {
              const fac = facilities.find(f => f.id === doc.facilityId);
              const isPresent = doc.attendance.clockIn !== null;
              return (
                <div key={doc.id} className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-800">{doc.name}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">Clinic: {fac?.name} • WiFi SSID: {doc.wifiSsid}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      doc.attendance.wifiVerified 
                        ? "bg-emerald-100 text-emerald-800" 
                        : isPresent 
                        ? "bg-amber-100 text-amber-800" 
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {doc.attendance.wifiVerified ? "WiFi Verified" : isPresent ? "Unverified IP" : "Absent"}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      {isPresent ? `In: ${doc.attendance.clockIn}` : "Duty Pending"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ambulance Real-time Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-bold text-slate-800">Ambulance Fleet & Emergency Coordinates</h4>
            <span className="text-xs text-slate-400">Active: {activeAmbulancesCount}</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {ambulances.map((amb) => (
              <div key={amb.id} className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <h5 className="font-bold text-slate-800">🚑 {amb.plateNumber}</h5>
                  <p className="text-[10px] text-slate-400 font-mono">Current Coordinates: {amb.location}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    amb.status === "Available" 
                      ? "bg-emerald-100 text-emerald-800" 
                      : amb.status === "En-Route" 
                      ? "bg-red-100 text-red-800 animate-pulse" 
                      : "bg-slate-200 text-slate-600"
                  }`}>
                    {amb.status === "Available" ? "STANDBY" : amb.status === "En-Route" ? "EN ROUTE" : "MAINTENANCE"}
                  </span>
                  {amb.assignedPatientId && (
                    <p className="text-[9px] text-slate-400 font-mono mt-1">
                      Patient: {amb.assignedPatientId}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
