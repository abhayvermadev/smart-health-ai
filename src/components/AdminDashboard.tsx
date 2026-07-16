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
import { SymptomHeatmap } from "./SymptomHeatmap";
import { TrendAnalysis } from "./TrendAnalysis";
import { ThresholdSettings } from "./ThresholdSettings";
import { OfficialPublicHealthIndicators } from "./OfficialPublicHealthIndicators";

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

  // Dynamic Live State Management
  const [localFacilities, setLocalFacilities] = useState<Facility[]>(facilities);
  const [localProcurements, setLocalProcurements] = useState<any[]>([]);
  const [localDistrictStore, setLocalDistrictStore] = useState<Record<string, number>>({});
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);
  const [replenishingId, setReplenishingId] = useState<string | null>(null);

  // Lab parameters inline editing state
  const [editingLabTest, setEditingLabTest] = useState<{ facilityId: string; testId: string } | null>(null);
  const [editLabStatus, setEditLabStatus] = useState("Available");
  const [editMachineStatus, setEditMachineStatus] = useState("Operational");
  const [editReagent, setEditReagent] = useState("Adequate");
  const [editSamples, setEditSamples] = useState(5);
  const [savingLab, setSavingLab] = useState(false);

  // Procurement creation state
  const [procureFacilityId, setProcureFacilityId] = useState("");
  const [procureMedId, setProcureMedId] = useState("");
  const [procureQty, setProcureQty] = useState(250);
  const [procureIsCritical, setProcureIsCritical] = useState(false);
  const [procuring, setProcuring] = useState(false);

  // Custom Low Stock warning thresholds loaded from localStorage
  const [customThresholds, setCustomThresholds] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("custom_warning_thresholds");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    const defaults: Record<string, number> = {};
    if (medicines) {
      Object.values(medicines).forEach((m: any) => {
        defaults[m.id] = m.minThreshold;
      });
    }
    defaults["crit-1"] = 25;
    defaults["crit-2"] = 20;
    defaults["crit-3"] = 20;
    defaults["crit-4"] = 20;
    defaults["crit-5"] = 25;
    return defaults;
  });

  const handleUpdateThresholds = (updated: Record<string, number>) => {
    setCustomThresholds(updated);
    try {
      localStorage.setItem("custom_warning_thresholds", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyCalibration = (medId: string, value: number) => {
    const updated = { ...customThresholds, [medId]: value };
    handleUpdateThresholds(updated);
  };

  const refreshLocalState = async () => {
    try {
      const res = await fetch("/api/state");
      const data = await res.json();
      if (data) {
        setLocalFacilities(data.facilities || facilities);
        setLocalProcurements(data.procurementOrders || []);
        setLocalDistrictStore(data.districtStore || {});
        setLocalNotifications(data.systemNotifications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissNotification = async (notifId: string) => {
    try {
      const res = await fetch("/api/admin/dismiss-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifId })
      });
      const data = await res.json();
      if (data.success) {
        setLocalNotifications(data.db.systemNotifications || []);
        // Trigger local state reload to catch newly updated orders/stocks
        await refreshLocalState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshLocalState();
    if (!analyticsData) {
      onRefreshAnalytics();
    }
  }, [facilities]);

  const handleReplenishCritical = async (facilityId: string, drugId: string, qty: number) => {
    setReplenishingId(`${facilityId}-${drugId}`);
    try {
      const res = await fetch("/api/admin/replenish-critical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId, drugId, qty })
      });
      const data = await res.json();
      if (data.success) {
        refreshLocalState();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Replenishment Completed", {
            body: data.message,
          });
        }
      } else {
        window.alert(data.error || "Replenishment failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReplenishingId(null);
    }
  };

  const handleCreateProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procureFacilityId || !procureMedId || !procureQty) return;
    setProcuring(true);
    try {
      const res = await fetch("/api/admin/create-procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: procureFacilityId,
          medicineId: procureMedId,
          quantity: Number(procureQty),
          isCritical: procureIsCritical
        })
      });
      const data = await res.json();
      if (data.success) {
        refreshLocalState();
        setProcureMedId("");
        setProcureQty(250);
        setProcureIsCritical(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcuring(false);
    }
  };

  const handleUpdateProcurement = async (orderId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/update-procurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status })
      });
      const data = await res.json();
      if (data.success) {
        refreshLocalState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveLabStatus = async () => {
    if (!editingLabTest) return;
    setSavingLab(true);
    try {
      const res = await fetch("/api/admin/update-lab-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: editingLabTest.facilityId,
          testId: editingLabTest.testId,
          status: editLabStatus,
          machineStatus: editMachineStatus,
          reagentAvailability: editReagent,
          pendingSamples: Number(editSamples)
        })
      });
      const data = await res.json();
      if (data.success) {
        refreshLocalState();
        setEditingLabTest(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLab(false);
    }
  };

  // State and Handlers for Admin Direct Supply Chain Optimization Hub
  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleDispatchFromStore = async (facilityId: string, medicineId: string, qty: number) => {
    setActioningId(`${facilityId}-${medicineId}-dispatch`);
    try {
      const res = await fetch("/api/admin/dispatch-from-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId, medicineId, quantity: qty })
      });
      const data = await res.json();
      if (data.success) {
        refreshLocalState();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Supply Dispatched", {
            body: data.message,
          });
        }
      } else {
        window.alert(data.error || "Store dispatch failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  const handleDirectPurchase = async (facilityId: string, medicineId: string, qty: number) => {
    setActioningId(`${facilityId}-${medicineId}-purchase`);
    try {
      const res = await fetch("/api/admin/direct-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId, medicineId, quantity: qty })
      });
      const data = await res.json();
      if (data.success) {
        refreshLocalState();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Direct Purchase Complete", {
            body: data.message,
          });
        }
      } else {
        window.alert(data.error || "Direct purchase failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActioningId(null);
    }
  };

  const [interventionLoadingId, setInterventionLoadingId] = useState<string | null>(null);

  const handleIntervention = async (facilityId: string, actionType: string) => {
    const loadingKey = `${facilityId}-${actionType}`;
    setInterventionLoadingId(loadingKey);

    let endpoint = "";
    const bodyPayload: any = { facilityId };

    if (actionType === "deploy-doctor") {
      endpoint = "/api/admin/deploy-doctor-backup";
    } else if (actionType === "deploy-reagents") {
      endpoint = "/api/admin/deploy-reagents";
    } else if (actionType === "deploy-supplies") {
      endpoint = "/api/admin/dispatch-emergency-supply-kit";
      bodyPayload.customThresholds = customThresholds;
    } else if (actionType === "divert-patients") {
      endpoint = "/api/admin/deploy-ambulance-backup";
    }

    if (!endpoint) {
      setInterventionLoadingId(null);
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("AI Admin Intervention Executed", {
            body: data.message,
          });
        }
        await refreshLocalState();
        await onRefreshAnalytics();
        window.alert(`[AI Smart Intervention Successful]\n\n${data.message}`);
      } else {
        window.alert(data.error || "Intervention dispatch failed.");
      }
    } catch (err) {
      console.error("Intervention error:", err);
      window.alert("Network error executing administrative intervention.");
    } finally {
      setInterventionLoadingId(null);
    }
  };

  const handleExportCSV = () => {
    let csv = "MED-INTEL CONNECT - DISTRICT HEALTH & SUPPLY CHAIN ANALYTICS\n";
    csv += `Generated: ${new Date().toLocaleString()}\n`;
    csv += `District Health Index: ${analyticsData?.districtHealthIndex || 72}/100\n\n`;

    csv += "--- DISTRICT CLINICAL BED OCCUPANCY ---\n";
    csv += "Facility,Total Beds,Occupied Beds,Occupancy Rate (%)\n";
    localFacilities.forEach(f => {
      const fList = beds[f.id] || [];
      const total = fList.reduce((sum, b) => sum + b.total, 0);
      const occupied = fList.reduce((sum, b) => sum + b.occupied, 0);
      csv += `"${f.name}",${total},${occupied},${Math.round((occupied/total)*100) || 0}%\n`;
    });
    csv += "\n";

    csv += "--- CRITICAL LIFE SAVING DRUGS (CRITICAL DRUG STOCK) ---\n";
    csv += "Facility,Critical Drug Name,Current Stock,Minimum Threshold,Estimated Remaining Days,Expiry Date,Batch,Supplier\n";
    localFacilities.forEach(f => {
      if (f.criticalInventory) {
        Object.values(f.criticalInventory).forEach((drug: any) => {
          csv += `"${f.name}","${drug.name}",${drug.stock},${drug.minThreshold},${drug.estimatedRemainingDays},"${drug.expiryDate}","${drug.batchNumber}","${drug.supplier}"\n`;
        });
      }
    });
    csv += "\n";

    csv += "--- CLINICAL WORKFORCE LOGS ---\n";
    csv += "Doctor,Specialization,Shift,Clock In,WiFi Verified\n";
    doctors.forEach(doc => {
      const f = localFacilities.find(fac => fac.id === doc.facilityId);
      csv += `"${doc.name}","${doc.specialty}","${f?.name || "N/A"}",${doc.attendance.clockIn || "Absent"},${doc.attendance.wifiVerified ? "Yes" : "No"}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `District_Health_Analytics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDFMock = () => {
    window.print();
  };

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

  const computeLiveFlags = () => {
    const liveFlags: Array<{
      facilityId: string;
      facilityName: string;
      type: string;
      severity: "High" | "Medium" | "Low";
      reason: string;
      actionType: "deploy-doctor" | "deploy-reagents" | "deploy-supplies" | "divert-patients";
      actionLabel: string;
    }> = [];

    localFacilities.forEach(facility => {
      // 1. Staffing Crisis Check
      const activeDoctors = doctors.filter(d => d.facilityId === facility.id && d.attendance.clockIn !== null);
      const pendingPatients = patients.filter(p => p.facilityId === facility.id && p.status === "OPD_Pending");
      const offlineDocsCount = doctors.filter(d => d.facilityId === facility.id && d.attendance.clockIn === null).length;

      if (pendingPatients.length > 0 && activeDoctors.length === 0) {
        liveFlags.push({
          facilityId: facility.id,
          facilityName: facility.name,
          type: "Staffing Deficit Crisis",
          severity: "High",
          reason: `High waiting time bottleneck: ${pendingPatients.length} pending patients queued with 0 doctors currently clocked-in.`,
          actionType: "deploy-doctor",
          actionLabel: offlineDocsCount > 0 ? `Deploy Doctor Backup` : "Deploy Emergency Medical Officer"
        });
      } else if (activeDoctors.length > 0 && (pendingPatients.length / activeDoctors.length) >= 4) {
        liveFlags.push({
          facilityId: facility.id,
          facilityName: facility.name,
          type: "High Patient Overload",
          severity: "Medium",
          reason: `${pendingPatients.length} patients waiting in queue under only ${activeDoctors.length} clocked-in practitioner(s).`,
          actionType: "deploy-doctor",
          actionLabel: "Deploy Staff Reinforcements"
        });
      }

      // 2. Bed Over-occupancy Check
      const fBeds = beds[facility.id] || [];
      fBeds.forEach(bed => {
        const occupancyRate = bed.total > 0 ? (bed.occupied / bed.total) * 100 : 0;
        if (occupancyRate >= 100) {
          liveFlags.push({
            facilityId: facility.id,
            facilityName: facility.name,
            type: `${bed.department} Ward Exhausted`,
            severity: "High",
            reason: `Clinically critical bed shortage: ${bed.department} department is at 100% capacity (${bed.occupied}/${bed.total} beds filled).`,
            actionType: "divert-patients",
            actionLabel: "Dispatch Standby Support Ambulance"
          });
        }
      });

      // 3. Low Stock Check
      let lowMedsCount = 0;
      Object.entries(facility.inventory).forEach(([medId, qty]) => {
        const thresh = customThresholds[medId] !== undefined ? customThresholds[medId] : (medicines[medId]?.minThreshold || 100);
        if (qty <= thresh) {
          lowMedsCount++;
        }
      });

      if (facility.criticalInventory) {
        Object.entries(facility.criticalInventory).forEach(([drugId, drug]: [string, any]) => {
          const thresh = customThresholds[drugId] !== undefined ? customThresholds[drugId] : drug.minThreshold;
          if (drug.stock <= thresh) {
            lowMedsCount++;
          }
        });
      }

      if (lowMedsCount >= 3) {
        liveFlags.push({
          facilityId: facility.id,
          facilityName: facility.name,
          type: "Pharmacy Safety Shortage",
          severity: "High",
          reason: `Supply chain alert: ${lowMedsCount} critical therapies or general drugs are running below warning thresholds.`,
          actionType: "deploy-supplies",
          actionLabel: "Drone-Dispatch Emergency Supply Kit"
        });
      }

      // 4. Lab Supply Blockage
      if (facility.labInvestigations) {
        const brokenLabs = Object.values(facility.labInvestigations).filter((l: any) => l.status === "Unavailable" || l.status === "Reagents Out of Stock");
        if (brokenLabs.length > 0) {
          liveFlags.push({
            facilityId: facility.id,
            facilityName: facility.name,
            type: "Diagnostic Reagent Depletion",
            severity: "Medium",
            reason: `Diagnostic capacity affected: ${brokenLabs.length} investigations (${brokenLabs.map((l: any) => l.name).join(", ")}) out of reagents or equipment offline.`,
            actionType: "deploy-reagents",
            actionLabel: "Expedite Reagents & Calibrate"
          });
        }
      }
    });

    // Merge with analyticsData?.flags if any (avoid duplicate facilityId + type)
    const mergedFlags = [...liveFlags];
    if (analyticsData?.flags) {
      analyticsData.flags.forEach(af => {
        const exists = mergedFlags.some(mf => mf.facilityId === af.facilityId && mf.type.toLowerCase().includes(af.type.toLowerCase().split(" ")[0]));
        if (!exists) {
          let actionType: "deploy-doctor" | "deploy-reagents" | "deploy-supplies" | "divert-patients" = "deploy-supplies";
          let actionLabel = "Drone-Dispatch Emergency Supply Kit";
          
          if (af.type.toLowerCase().includes("staff") || af.type.toLowerCase().includes("doctor") || af.type.toLowerCase().includes("attendance")) {
            actionType = "deploy-doctor";
            actionLabel = "Deploy Doctor Backup";
          } else if (af.type.toLowerCase().includes("bed") || af.type.toLowerCase().includes("capacity") || af.type.toLowerCase().includes("shortage")) {
            actionType = "divert-patients";
            actionLabel = "Dispatch Standby Support Ambulance";
          } else if (af.type.toLowerCase().includes("lab") || af.type.toLowerCase().includes("reagent") || af.type.toLowerCase().includes("investigation")) {
            actionType = "deploy-reagents";
            actionLabel = "Expedite Reagents & Calibrate";
          }
          
          mergedFlags.push({
            facilityId: af.facilityId,
            facilityName: af.facilityName,
            type: af.type,
            severity: af.severity as "High" | "Medium" | "Low",
            reason: af.reason,
            actionType,
            actionLabel
          });
        }
      });
    }

    return mergedFlags;
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8" id="admin-dashboard-container">
      
      {/* Brand & Export Data Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs font-sans">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">District Command & Supply Chain Analytics</h2>
          <p className="text-xs text-slate-500 font-medium">District level medical inventory, workforce attendance, capacity command center & offline backups</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-600/10"
          >
            📥 Export Supply CSV
          </button>
          <button
            onClick={handleExportPDFMock}
            className="bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            📋 Print Health Report (PDF)
          </button>
        </div>
      </div>
      
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

      {/* AI EMERGENCY ACTION CENTER: Automated Procurement Alerts for District Admin */}
      {localNotifications.length > 0 && (
        <div 
          className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-5 shadow-sm space-y-4 font-sans animate-fade-in"
          id="ai-emergency-action-center"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-200 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">
                  AI Emergency Override Center — District Alerts
                </h3>
              </div>
            </div>
            <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-md border border-rose-200 font-mono">
              Action Required: {localNotifications.length} Pending Overrides (showing top 2)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {localNotifications.slice(0, 2).map((notif) => (
              <div 
                key={notif.id} 
                className="bg-white border border-rose-150 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-rose-300 transition shadow-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-rose-600 text-white font-mono font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">
                      Automated Procurement
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-flex flex-wrap">
                    <div>
                      Facility: <span className="text-slate-800 font-bold">{notif.facilityName}</span>
                    </div>
                    <div className="h-3 w-px bg-slate-200"></div>
                    <div>
                      Supply: <span className="text-rose-700 font-bold">{notif.medicineName}</span>
                    </div>
                    <div className="h-3 w-px bg-slate-200"></div>
                    <div>
                      Critical Stock: <span className="text-rose-700 font-black font-mono">{notif.stock} / {notif.threshold} (Threshold)</span>
                    </div>
                    {notif.orderId && (
                      <>
                        <div className="h-3 w-px bg-slate-200"></div>
                        <div>
                          Emergency Order ID: <span className="text-indigo-600 font-bold font-mono">{notif.orderId}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                  <button
                    onClick={() => handleDismissNotification(notif.id)}
                    className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-sans font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-600/10"
                  >
                    Acknowledge & Clear Alert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-rose-600 font-bold">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span className="text-xs uppercase tracking-wide">{t.underresourcedFlags}</span>
              </div>
              <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-150 font-bold px-2 py-0.5 rounded-full font-mono">
                {computeLiveFlags().length} Active Warnings
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {computeLiveFlags().map((flag, idx) => {
                const isLoading = interventionLoadingId === `${flag.facilityId}-${flag.actionType}`;
                return (
                  <div key={idx} className="p-3.5 bg-red-50/20 border border-red-200/50 rounded-xl space-y-2.5 text-xs animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 flex items-center gap-1">🏥 {flag.facilityName}</span>
                      <span className={`font-mono font-black text-[9px] uppercase px-1.5 py-0.5 rounded ${
                        flag.severity === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {flag.severity} RISK
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-600 leading-normal text-[11px] font-sans">
                        <strong className="text-slate-700">{flag.type}</strong> — {flag.reason}
                      </p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleIntervention(flag.facilityId, flag.actionType)}
                        disabled={interventionLoadingId !== null}
                        className={`font-mono text-[9px] font-bold uppercase px-3 py-1.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                          flag.severity === "High" 
                            ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600 hover:border-rose-700 shadow-sm shadow-rose-600/15" 
                            : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isLoading ? "Executing..." : flag.actionLabel}
                      </button>
                    </div>
                  </div>
                );
              })}
              {computeLiveFlags().length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  ✓ No critical underperforming or under-resourced clinic flags active.
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
              {(Object.values(medicines) as Medicine[]).map((med) => {
                const threshold = customThresholds[med.id] !== undefined ? customThresholds[med.id] : med.minThreshold;
                return (
                  <tr key={med.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800">💊 {med.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{med.category}</td>
                    <td className="py-3.5 px-4 font-mono">Min {threshold} {med.unit}</td>
                    {facilities.filter(f => selectedFacilityId === "all" || f.id === selectedFacilityId).map(fac => {
                      const stock = fac.inventory[med.id] || 0;
                      const isLow = stock <= threshold;
                      return (
                        <td key={fac.id} className="py-3.5 px-4 text-center font-mono">
                          <span className={`px-2.5 py-1 rounded-full font-bold ${
                            isLow 
                              ? "bg-red-50 text-red-700 border border-red-100 animate-pulse" 
                              : "bg-slate-50 text-slate-700"
                          }`}>
                            {stock}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3B: CRITICAL / LIFE SAVING DRUG MANAGEMENT (CRITICAL DRUG STOCK) */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="font-sans">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-rose-500 rounded-full animate-ping"></span>
              <h3 className="font-extrabold text-base tracking-tight text-white">Critical Life-Saving Drug Stock</h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">Stricter monitoring for high-priority medicines. <strong>Strict Business Rule:</strong> Critical drugs CANNOT be transferred between facilities.</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl text-[10px] text-red-400 font-mono font-bold uppercase tracking-wider shrink-0">
            🚫 TRANSFERS STRICTLY PROHIBITED
          </div>
        </div>

        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left text-xs text-slate-400 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Drug Name</th>
                <th className="py-3 px-4">Facility / Clinic</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Threshold</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Expiry & Batch</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-right">District replenishment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {localFacilities
                .filter(f => selectedFacilityId === "all" || f.id === selectedFacilityId)
                .flatMap(fac => {
                  if (!fac.criticalInventory) return [];
                  return Object.entries(fac.criticalInventory).map(([drugId, drug]: [string, any]) => {
                    const threshold = customThresholds[drugId] !== undefined ? customThresholds[drugId] : drug.minThreshold;
                    const pct = drug.stock / threshold;
                    let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                    let statusLabel = "Adequate";
                    if (pct <= 1.0) {
                      statusColor = "text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse";
                      statusLabel = "Critical Shortage";
                    } else if (pct <= 1.5) {
                      statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                      statusLabel = "Low Stock";
                    }

                    const isReplenishing = replenishingId === `${fac.id}-${drugId}`;

                    return (
                      <tr key={`${fac.id}-${drugId}`} className="hover:bg-white/5 transition">
                        <td className="py-4 px-4 font-bold text-white">🩸 {drug.name}</td>
                        <td className="py-4 px-4 text-slate-300 font-medium">{fac.name}</td>
                        <td className="py-4 px-4 text-center font-mono text-white font-extrabold">{drug.stock} units</td>
                        <td className="py-4 px-4 text-center font-mono text-slate-500">Min {threshold}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-[10px] text-slate-300">Exp: {drug.expiryDate}</div>
                          <div className="text-[9px] text-slate-500 font-mono font-bold uppercase">Batch: {drug.batchNumber}</div>
                        </td>
                        <td className="py-4 px-4 text-slate-400">
                          <div className="text-[10px]">{drug.supplier}</div>
                          <div className="text-[9px] text-slate-500">Last: {drug.lastSupplyDate}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            type="button"
                            disabled={isReplenishing}
                            onClick={() => handleReplenishCritical(fac.id, drugId, 100)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-700 font-mono font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase cursor-pointer"
                          >
                            {isReplenishing ? "Replenishing..." : "Replenish (100u)"}
                          </button>
                        </td>
                      </tr>
                    );
                  });
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3C: INTELLIGENT MEDICINE PROCUREMENT SYSTEM */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="font-sans">
            <h3 className="font-extrabold text-slate-800 text-base">Intelligent Medicine Procurement Center</h3>
            <p className="text-xs text-slate-400 mt-1">Centralized supply coordination, vendor dispatch, and real-time tracking audits.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold px-2 py-1 rounded">
              District Central Store Stock
            </span>
          </div>
        </div>

        {/* Central Store Stock display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          {Object.entries(localDistrictStore).map(([medId, qty]) => {
            const med = medicines[medId];
            return (
              <div key={medId} className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">CENTRAL STORE</span>
                  <span className="font-bold text-slate-800 block truncate max-w-[120px]">{med?.name || medId}</span>
                </div>
                <span className="text-sm font-black text-indigo-600 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                  {qty}
                </span>
              </div>
            );
          })}
        </div>

        {/* DISTRICT ADMIN SUPPLY CHAIN OPTIMIZATION HUB */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 font-sans text-left">
          <div>
            <span className="bg-rose-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">
              Admin bypass routing active
            </span>
            <h4 className="font-extrabold text-slate-800 text-sm mt-1 flex items-center gap-1.5">
              🚀 District Admin Supply Chain Optimization Hub
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Directly coordinate replenishment from district stores or dispatch directly from manufacturers to clinics, minimizing regional delays and logistics expenses.
            </p>
          </div>

          <div className="space-y-3">
            {(() => {
              const lowStockAlerts: {
                facilityId: string;
                facilityName: string;
                medicineId: string;
                medicineName: string;
                currentStock: number;
                minThreshold: number;
                unit: string;
                isCritical: boolean;
              }[] = [];

              localFacilities.forEach(fac => {
                // Check general medicines
                (Object.entries(medicines) as [string, Medicine][]).forEach(([medId, med]) => {
                  const stock = fac.inventory[medId] || 0;
                  const threshold = customThresholds[medId] !== undefined ? customThresholds[medId] : med.minThreshold;
                  if (stock <= threshold) {
                    lowStockAlerts.push({
                      facilityId: fac.id,
                      facilityName: fac.name,
                      medicineId: medId,
                      medicineName: med.name,
                      currentStock: stock,
                      minThreshold: threshold,
                      unit: med.unit,
                      isCritical: false
                    });
                  }
                });

                // Check critical medicines
                if (fac.criticalInventory) {
                  Object.entries(fac.criticalInventory).forEach(([drugId, drug]: [string, any]) => {
                    const threshold = customThresholds[drugId] !== undefined ? customThresholds[drugId] : drug.minThreshold;
                    if (drug.stock <= threshold) {
                      lowStockAlerts.push({
                        facilityId: fac.id,
                        facilityName: fac.name,
                        medicineId: drugId,
                        medicineName: drug.name,
                        currentStock: drug.stock,
                        minThreshold: threshold,
                        unit: "units",
                        isCritical: true
                      });
                    }
                  });
                }
              });

              if (lowStockAlerts.length === 0) {
                return (
                  <div className="text-center py-6 bg-white border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 italic">
                    🎉 All district PHCs and CHCs are fully stocked! No supply chain bottlenecks detected.
                  </div>
                );
              }

              return lowStockAlerts.slice(0, 4).map((alert, idx) => {
                const storeQty = localDistrictStore[alert.medicineId] || 0;
                const isStoreAvailable = storeQty >= 100;
                const isDispatching = actioningId === `${alert.facilityId}-${alert.medicineId}-dispatch`;
                const isPurchasing = actioningId === `${alert.facilityId}-${alert.medicineId}-purchase`;
                const isAnyLoading = actioningId !== null;

                return (
                  <div key={`${alert.facilityId}-${alert.medicineId}-${alert.isCritical ? "critical" : "general"}`} className="bg-white border border-slate-150 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xs transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-800">
                          🏥 {alert.facilityName}
                        </span>
                        {alert.isCritical ? (
                          <span className="bg-red-50 text-red-700 border border-red-100 text-[8px] font-bold px-1.5 py-0.2 rounded font-mono">
                            CRITICAL SHORTAGE
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-150 text-[8px] font-bold px-1.5 py-0.2 rounded font-mono">
                            LOW SUPPLY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 font-bold">
                        💊 {alert.medicineName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono font-bold">
                        Stock: <span className="text-rose-600 font-extrabold">{alert.currentStock}</span> / Threshold: {alert.minThreshold} {alert.unit}
                      </p>
                    </div>

                    {/* Central Store Availability Check */}
                    <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 px-3 font-mono text-[11px] space-y-1 shrink-0 w-full md:w-auto">
                      <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">District Central Store</span>
                      {isStoreAvailable ? (
                        <div className="text-emerald-700 font-extrabold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span>
                          Available ({storeQty} units)
                        </div>
                      ) : (
                        <div className="text-rose-700 font-extrabold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                          Low Store Stock ({storeQty} units)
                        </div>
                      )}
                    </div>

                    {/* Admin Optimization Decisions */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                      <button
                        type="button"
                        disabled={!isStoreAvailable || isAnyLoading}
                        onClick={() => handleDispatchFromStore(alert.facilityId, alert.medicineId, 100)}
                        className={`font-mono text-[10px] font-extrabold px-3 py-2 rounded-lg uppercase cursor-pointer transition ${
                          isStoreAvailable
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs animate-pulse"
                            : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        }`}
                      >
                        {isDispatching ? "Transferring..." : "Dispatch from Store (100u)"}
                      </button>

                      <button
                        type="button"
                        disabled={isAnyLoading}
                        onClick={() => handleDirectPurchase(alert.facilityId, alert.medicineId, 100)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-200 disabled:text-slate-400 font-mono text-[10px] font-extrabold px-3 py-2 rounded-lg uppercase cursor-pointer transition"
                      >
                        {isPurchasing ? "Purchasing..." : "Direct Purchase & Ship (100u)"}
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Create Procurement Order Form */}
        <form onSubmit={handleCreateProcurement} className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs font-sans">
          <div>
            <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1.5">Destination Facility</label>
            <select
              value={procureFacilityId}
              onChange={(e) => setProcureFacilityId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
              required
            >
              <option value="">Select Target Center</option>
              {localFacilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1.5">Drug Formulation</label>
            <select
              value={procureMedId}
              onChange={(e) => setProcureMedId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
              required
            >
              <option value="">Select Medicine</option>
              {Object.values(medicines).map((med: any) => (
                <option key={med.id} value={med.id}>{med.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-500 uppercase tracking-wider font-bold mb-1.5">Quantity</label>
              <input
                type="number"
                value={procureQty}
                onChange={(e) => setProcureQty(Number(e.target.value))}
                min={50}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none"
                required
              />
            </div>
            <div className="flex items-center justify-center h-full pb-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={procureIsCritical}
                  onChange={(e) => setProcureIsCritical(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                />
                <span>Critical?</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={procuring}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white font-extrabold py-2.5 rounded-xl text-xs transition cursor-pointer"
          >
            {procuring ? "Generating Order..." : "Create Procurement Order"}
          </button>
        </form>

        {/* Procurement Orders Status Logs */}
        <div className="space-y-3 font-sans">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">Active Procurement Orders & Shipping Logs</span>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {localProcurements.map((order) => {
              const fac = localFacilities.find(f => f.id === order.facilityId);
              const med = medicines[order.medicineId];

              return (
                <div key={order.id} className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">📦 Order: {order.id}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        order.priority === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}>
                        Priority Score: {order.priorityScore} ({order.priority})
                      </span>
                    </div>
                    <div className="text-slate-500 font-medium">
                      Medicine: <strong className="text-slate-800">{med?.name || order.medicineId}</strong> • Qty: <strong>{order.quantity} units</strong> • Destination: <strong className="text-slate-700">{fac?.name}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Logistics Status: <strong className="text-indigo-600">{order.status}</strong> • ETA: <strong>{order.eta}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {order.status === "Requested" && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateProcurement(order.id, "Dispatched")}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase cursor-pointer"
                        >
                          Dispatch from Store
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateProcurement(order.id, "Dispatched")}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase cursor-pointer"
                        >
                          Purchase Directly
                        </button>
                      </>
                    )}

                    {order.status === "Dispatched" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateProcurement(order.id, "Delivered")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase cursor-pointer"
                      >
                        Fulfill Delivery
                      </button>
                    )}

                    {order.status === "Delivered" && (
                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-150 text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Fulfill Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {localProcurements.length === 0 && (
              <p className="text-center py-6 text-slate-400 text-xs italic">No active procurement orders logged at this time.</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3D: REAL-TIME LABORATORY INVESTIGATION MONITORING */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="pb-4 border-b border-slate-100">
          <h3 className="font-extrabold text-slate-800 text-base">Real-Time Laboratory Investigations Desk</h3>
          <p className="text-xs text-slate-400 mt-1">Track reagent stock outlevels, clinical machine calibration status, and pending workloads per facility.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
          {localFacilities
            .filter(f => selectedFacilityId === "all" || f.id === selectedFacilityId)
            .flatMap(fac => {
              if (!fac.labs) return [];
              return fac.labs.map((lab: any) => {
                const reagentColor = lab.reagentAvailability === "Adequate"
                  ? "bg-emerald-100 text-emerald-800"
                  : lab.reagentAvailability === "Low"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800 animate-pulse";

                const isOperational = lab.machineStatus === "Operational";

                return (
                  <div key={`${fac.id}-${lab.testId}`} className="border border-slate-150 rounded-xl p-4 space-y-3 bg-slate-50/40 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] text-slate-400 font-mono font-bold block">{fac.name.toUpperCase()}</span>
                        <h5 className="font-extrabold text-slate-800 text-xs">🧪 {lab.testName}</h5>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        isOperational ? "bg-indigo-50 text-indigo-700" : "bg-red-50 text-red-700"
                      }`}>
                        {lab.machineStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-b border-slate-150/50 py-2">
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">REAGENT LEVEL</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 inline-block ${reagentColor}`}>
                          {lab.reagentAvailability}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block font-bold">SAMPLE WORKLOAD</span>
                        <span className="text-slate-800 font-bold block mt-0.5">{lab.pendingSamples} samples pending</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>Availability: <strong className="text-indigo-600">{lab.status}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLabTest({ facilityId: fac.id, testId: lab.testId });
                          setEditLabStatus(lab.status);
                          setEditMachineStatus(lab.machineStatus);
                          setEditReagent(lab.reagentAvailability);
                          setEditSamples(lab.pendingSamples);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-black cursor-pointer uppercase text-[9px]"
                      >
                        Adjust Parameters
                      </button>
                    </div>
                  </div>
                );
              });
            })}
        </div>
      </div>

      {/* Inline Popup modal for adjustments */}
      {editingLabTest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl font-sans space-y-4 animate-scaleUp">
            <h4 className="font-extrabold text-slate-900 text-sm">Adjust Laboratory Status Parameters</h4>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Reagent Level</label>
                <select
                  value={editReagent}
                  onChange={(e) => setEditReagent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="Adequate">Adequate Reagent Stock</option>
                  <option value="Low">Low Reagent Warning</option>
                  <option value="Out of Stock">Out of Stock Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Machine Status</label>
                <select
                  value={editMachineStatus}
                  onChange={(e) => setEditMachineStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="Operational">Operational (Calibrated)</option>
                  <option value="Under Maintenance">Under Maintenance (Offline)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Pending Sample Count</label>
                <input
                  type="number"
                  value={editSamples}
                  onChange={(e) => setEditSamples(Number(e.target.value))}
                  min={0}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">Availability Classification</label>
                <select
                  value={editLabStatus}
                  onChange={(e) => setEditLabStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="Available">Available (Turnaround &lt; 2hr)</option>
                  <option value="Delayed">Delayed (Heavy Workload)</option>
                  <option value="Unavailable">Unavailable (No Reagents / Down)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setEditingLabTest(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingLab}
                onClick={handleSaveLabStatus}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
              >
                {savingLab ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFETY LOGISTICS & LOW STOCK CONFIGURATOR */}
      <ThresholdSettings 
        facilities={facilities}
        medicines={medicines}
        customThresholds={customThresholds}
        onSaveThresholds={handleUpdateThresholds}
        language={language}
      />

      {/* SYMPTOM SURVEILLANCE & OUTBREAK SURVEILLANCE HEATMAP */}
      <SymptomHeatmap 
        facilities={facilities}
        patients={patients}
        language={language}
      />

      {/* OFFICIAL CENSUS & NFHS-5 PUBLIC INDICATORS BASELINE REFERENCE */}
      <OfficialPublicHealthIndicators 
        language={language}
        onApplyThresholdCalibration={handleApplyCalibration}
      />

      {/* RETROSPECTIVE OPERATIONS AND DEPLETION TRENDS */}
      <TrendAnalysis 
        facilities={facilities}
        patients={patients}
        medicines={medicines}
        language={language}
      />

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
