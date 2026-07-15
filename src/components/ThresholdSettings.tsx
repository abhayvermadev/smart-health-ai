import React, { useState, useMemo } from "react";
import { Facility, Medicine } from "../types";
import { 
  Sliders, 
  Save, 
  RotateCcw, 
  ShieldAlert, 
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from "lucide-react";

interface ThresholdSettingsProps {
  facilities: Facility[];
  medicines: Record<string, Medicine>;
  customThresholds: Record<string, number>;
  onSaveThresholds: (thresholds: Record<string, number>) => void;
  language: "en" | "hi" | "mr";
}

export const ThresholdSettings: React.FC<ThresholdSettingsProps> = ({
  facilities,
  medicines,
  customThresholds,
  onSaveThresholds,
  language
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "critical">("general");
  const [localThresholds, setLocalThresholds] = useState<Record<string, number>>({ ...customThresholds });
  const [showSavedNotification, setShowSavedNotification] = useState<boolean>(false);

  const labels = {
    en: {
      title: "Logistics Safety & Low-Stock Warning Configurator",
      subtitle: "Establish custom safety triggers and warning thresholds across district inventories live.",
      generalTab: "Standard Formulations",
      criticalTab: "Critical Life-Saving Drugs",
      item: "Drug / Formulation",
      category: "Therapeutic Class",
      defaultVal: "Default Min",
      customVal: "Warning Threshold Trigger",
      alertsPreview: "Triggered Clinics Preview",
      saveBtn: "Apply Custom Safety Thresholds",
      resetBtn: "Restore Factory Defaults",
      savedSuccess: "Safety thresholds updated successfully! Alert monitors recalculated.",
      explanation: "Low-stock warnings determine when automated procurement, redistribution alerts, and clinic dispatch recommendations are flagged. Fine-tune thresholds to adjust for seasonal surges."
    },
    hi: {
      title: "लॉजिस्टिक्स सुरक्षा और कम-स्टॉक चेतावनी कॉन्फिगरेटर",
      subtitle: "जिला क्लीनिकों के लिए कस्टम सुरक्षा सीमा और चेतावनी ट्रिगर लाइव सेट करें।",
      generalTab: "सामान्य दवाएं",
      criticalTab: "महत्वपूर्ण जीवन रक्षक दवाएं",
      item: "दवा / फॉर्मूलेशन",
      category: "उपचार श्रेणी",
      defaultVal: "डिफ़ॉल्ट न्यूनतम",
      customVal: "चेतावनी सीमा स्तर",
      alertsPreview: "सक्रिय चेतावनी क्लीनिक",
      saveBtn: "कस्टम सुरक्षा स्तर लागू करें",
      resetBtn: "मूल डिफ़ॉल्ट पर सेट करें",
      savedSuccess: "सुरक्षा चेतावनी सीमाएँ सफलतापूर्वक सहेजी गईं!",
      explanation: "स्टॉक की कमी की चेतावनियाँ स्वचालित खरीद और क्लीनिकों के बीच दवा वितरण के लिए अलर्ट ट्रिगर करती हैं।"
    },
    mr: {
      title: "लॉजिस्टिक्स सुरक्षा आणि कमी-स्टॉक चेतावणी कॉन्फिगरेटर",
      subtitle: "जिल्हा रुग्णालयांसाठी सानुकूल सुरक्षा मर्यादा आणि चेतावणी ट्रिगर थेट सेट करा.",
      generalTab: "सामान्य औषधे",
      criticalTab: "महत्त्वाचे जीवनरक्षक औषध",
      item: "औषध / फॉर्म्युलेशन",
      category: "श्रेणी",
      defaultVal: "डिफॉल्ट किमान",
      customVal: "चेतावणी मर्यादा पातळी",
      alertsPreview: "सक्रिय चेतावणी रुग्णालये",
      saveBtn: "सानुकूल सुरक्षा मर्यादा लागू करा",
      resetBtn: "मूळ पूर्वावस्थेत आणा",
      savedSuccess: "सुरक्षा चेतावणी मर्यादा यशस्वीरित्या जतन केल्या आहेत!",
      explanation: "स्टॉक कमी झाल्याची चेतावणी स्वयंचलित खरेदी आणि रुग्णालयांच्या औषध वितरणासाठी अलर्ट ट्रिगर करते."
    }
  }[language];

  // Critical drugs list helper (extracted from facilities to allow unified config)
  const CRITICAL_DRUGS_MASTER = [
    { id: "crit-1", name: "Adrenaline 1mg Injection", category: "Sympathomimetic", defaultMin: 25, unit: "units" },
    { id: "crit-2", name: "Atropine 0.6mg Injection", category: "Anticholinergic", defaultMin: 20, unit: "units" },
    { id: "crit-3", name: "Insulin Soluble 40 IU/ml", category: "Hormone", defaultMin: 20, unit: "units" },
    { id: "crit-4", name: "Oxytocin 5 IU Injection", category: "Uterotonic", defaultMin: 20, unit: "units" },
    { id: "crit-5", name: "Hydrocortisone 100mg", category: "Corticosteroid", defaultMin: 25, unit: "units" }
  ];

  const handleSliderChange = (id: string, value: number) => {
    setLocalThresholds(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSave = () => {
    onSaveThresholds(localThresholds);
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 4000);
  };

  const handleReset = () => {
    const defaults: Record<string, number> = {};
    // Load standard medicine defaults
    (Object.values(medicines) as Medicine[]).forEach(m => {
      defaults[m.id] = m.minThreshold;
    });
    // Load critical drug defaults
    CRITICAL_DRUGS_MASTER.forEach(c => {
      defaults[c.id] = c.defaultMin;
    });

    setLocalThresholds(defaults);
    onSaveThresholds(defaults);
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 4000);
  };

  // Preview how many facilities would trigger low stock given the current threshold
  const getTriggerCount = (id: string, isCritical: boolean) => {
    let triggerCount = 0;
    const threshold = localThresholds[id] !== undefined ? localThresholds[id] : (isCritical ? (CRITICAL_DRUGS_MASTER.find(c => c.id === id)?.defaultMin || 20) : (medicines[id]?.minThreshold || 100));

    facilities.forEach(fac => {
      if (isCritical) {
        const drug = fac.criticalInventory?.[id];
        if (drug && drug.stock <= threshold) {
          triggerCount++;
        }
      } else {
        const stock = fac.inventory[id] || 0;
        if (stock <= threshold) {
          triggerCount++;
        }
      }
    });

    return triggerCount;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-100 gap-4">
        <div className="space-y-1 font-sans">
          <div className="flex items-center gap-2">
            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-amber-200/50 font-mono uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <Sliders className="h-3 w-3" />
              Logistics Controls
            </span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-indigo-200/50 font-mono uppercase">
              Live Threshold overrides
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">{labels.title}</h3>
          <p className="text-xs text-slate-400">{labels.subtitle}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 font-sans">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition grow md:grow-0 justify-center"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {labels.resetBtn}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer transition grow md:grow-0 justify-center"
          >
            <Save className="h-3.5 w-3.5" />
            {labels.saveBtn}
          </button>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex items-start gap-3 text-left font-sans text-xs">
        <HelpCircle className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-slate-500 leading-relaxed">
          {labels.explanation}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-black font-sans justify-center self-center w-max">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "general" 
              ? "bg-white text-slate-800 shadow-xs" 
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {labels.generalTab}
        </button>
        <button
          onClick={() => setActiveTab("critical")}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === "critical" 
              ? "bg-white text-slate-800 shadow-xs" 
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {labels.criticalTab}
        </button>
      </div>

      {/* Configuration Grid */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">
                <th className="py-3 px-4">{labels.item}</th>
                <th className="py-3 px-4">{labels.category}</th>
                <th className="py-3 px-4 text-center">{labels.defaultVal}</th>
                <th className="py-3 px-6 w-[280px]">{labels.customVal}</th>
                <th className="py-3 px-4 text-center">{labels.alertsPreview}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === "general" ? (
                (Object.values(medicines) as Medicine[]).map((med) => {
                  const currentValue = localThresholds[med.id] !== undefined ? localThresholds[med.id] : med.minThreshold;
                  const triggers = getTriggerCount(med.id, false);

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/30 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800">💊 {med.name}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">{med.category}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {med.minThreshold} {med.unit}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="10"
                            max="800"
                            step="10"
                            value={currentValue}
                            onChange={(e) => handleSliderChange(med.id, Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                          />
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded text-[11px] shrink-0 w-20 text-center">
                            {currentValue} {med.unit}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {triggers > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                            <ShieldAlert className="h-3 w-3" />
                            {triggers} clinics
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            All safe
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                CRITICAL_DRUGS_MASTER.map((drug) => {
                  const currentValue = localThresholds[drug.id] !== undefined ? localThresholds[drug.id] : drug.defaultMin;
                  const triggers = getTriggerCount(drug.id, true);

                  return (
                    <tr key={drug.id} className="hover:bg-slate-50/30 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800">🩸 {drug.name}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">{drug.category}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {drug.defaultMin} {drug.unit}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="5"
                            max="150"
                            step="5"
                            value={currentValue}
                            onChange={(e) => handleSliderChange(drug.id, Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                          />
                          <span className="font-mono font-black text-rose-700 bg-rose-50 border border-rose-100/50 px-2 py-0.5 rounded text-[11px] shrink-0 w-20 text-center">
                            {currentValue} {drug.unit}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {triggers > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 font-bold px-2 py-0.5 rounded-full text-[10px] animate-pulse">
                            <ShieldAlert className="h-3 w-3" />
                            {triggers} clinics
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            All safe
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Notification */}
      {showSavedNotification && (
        <div className="flex items-center gap-2.5 bg-emerald-900 text-white rounded-2xl p-4.5 font-sans text-xs border border-emerald-800 animate-slideUp">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-semibold leading-relaxed">{labels.savedSuccess}</span>
        </div>
      )}

    </div>
  );
};
