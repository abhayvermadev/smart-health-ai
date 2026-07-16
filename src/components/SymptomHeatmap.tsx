import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Facility, Patient } from "../types";
import { Activity, ShieldAlert, AlertTriangle, CheckCircle, Info } from "lucide-react";

interface SymptomHeatmapProps {
  facilities: Facility[];
  patients: Patient[];
  language: "en" | "hi" | "mr";
}

interface HeatmapCell {
  facilityId: string;
  facilityName: string;
  symptomId: string;
  symptomLabel: string;
  count: number;
}

export const SymptomHeatmap: React.FC<SymptomHeatmapProps> = ({
  facilities,
  patients,
  language
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(true); // only OPD_Pending or Admitted patients

  // Symptom categories with language translations and mapping keywords
  const SYMPTOM_CATEGORIES = [
    {
      id: "fever",
      label: { en: "Fever / Chills", hi: "बुखार / कंपकंपी", mr: "ताप / थंडी" },
      keywords: ["fever", "shivering", "temperature", "chills", "pyrexia", "cold", "ताप", "बुखार"]
    },
    {
      id: "respiratory",
      label: { en: "Respiratory / Cough", hi: "खांसी / सांस की तकलीफ", mr: "खोकला / दम लागणे" },
      keywords: ["cough", "breath", "throat", "sneeze", "respiratory", "cold", "asthma", "खांसी", "खोकला", "दम"]
    },
    {
      id: "gastro",
      label: { en: "Gastrointestinal", hi: "उल्टी / दस्त / पेट दर्द", mr: "उलट्या / जुलाब / पोटदुखी" },
      keywords: ["vomit", "diarrhea", "stomach", "nausea", "abdomen", "loose motion", "gastro", "उल्टी", "दस्त", "पोट"]
    },
    {
      id: "pain",
      label: { en: "Body Ache / Injury", hi: "बदन दर्द / चोट", mr: "अंगदुखी / दुखापत" },
      keywords: ["pain", "ache", "headache", "migraine", "cramp", "injury", "fracture", "दर्द", "दुखणे"]
    },
    {
      id: "maternity",
      label: { en: "Maternity / Pregnancy", hi: "गर्भावस्था जाँच", mr: "गर्भावस्था तपासणी" },
      keywords: ["pregnancy", "pregnant", "obstetric", "maternity", "fetal", "checkup", "antenatal", "गर्भ", "बाळपण"]
    },
    {
      id: "skin",
      label: { en: "Skin & Infection", hi: "त्वचा / संक्रमण", mr: "त्वचा / संसर्ग" },
      keywords: ["rash", "itch", "skin", "wound", "boil", "infection", "allergy", "खाज", "जखम"]
    },
    {
      id: "others",
      label: { en: "Other Symptoms", hi: "अन्य लक्षण", mr: "इतर लक्षणे" },
      keywords: [] // acts as fallback
    }
  ];

  // Map translations for dashboard UI
  const labels = {
    en: {
      title: "Real-Time Epidemiological Symptom Heatmap",
      subtitle: "D3.js live syndromic surveillance mapping cluster densities to detect localized infectious outbreaks.",
      allPatients: "All Patient Records",
      activePatients: "Active OPD & Admitted Only",
      legendTitle: "Outbreak Intensity Scale",
      outbreaksTitle: "Real-time Epidemic Alerts & Cluster Warnings",
      noOutbreaks: "Syndromic baseline stable. No active outbreak clusters detected in the district.",
      highRisk: "High Infection Alert",
      modRisk: "Moderate Baseline Surge",
      facility: "Facility Name",
      symptom: "Symptom Category",
      count: "Case Count",
      status: "Status Assessment",
      recommendation: "Operational Directive"
    },
    hi: {
      title: "वास्तविक समय रोग लक्षण हीटमैप (Syndromic Heatmap)",
      subtitle: "संक्रामक रोगों के प्रकोप और संकुल (clusters) की पहचान करने के लिए D3.js लाइव मैपिंग।",
      allPatients: "सभी मरीज रिकॉर्ड",
      activePatients: "केवल सक्रिय ओपीडी और भर्ती",
      legendTitle: "प्रकोप तीव्रता स्केल",
      outbreaksTitle: "लाइव महामारी अलर्ट और क्लस्टर चेतावनी",
      noOutbreaks: "सभी लक्षण सामान्य स्तर पर हैं। जिले में कोई प्रकोप संकुल नहीं मिला।",
      highRisk: "उच्च संक्रमण चेतावनी",
      modRisk: "मध्यम स्तर की वृद्धि",
      facility: "चिकित्सा केंद्र",
      symptom: "लक्षण श्रेणी",
      count: "मामलों की संख्या",
      status: "स्थिति मूल्यांकन",
      recommendation: "ऑपरेशनल निर्देश"
    },
    mr: {
      title: "थेट रोग लक्षण उष्णता नकाशा (Syndromic Heatmap)",
      subtitle: "संसर्गजन्य रोगांचा प्रादुर्भाव आणि क्लस्टर ओळखण्यासाठी D3.js लाइव्ह मॅपिंग.",
      allPatients: "सर्व रुग्ण रेकॉर्ड",
      activePatients: "केवळ सक्रिय ओपीडी आणि दाखल",
      legendTitle: "प्रादुर्भाव तीव्रता स्केल",
      outbreaksTitle: "थेट महामारी अलर्ट आणि क्लस्टर चेतावणी",
      noOutbreaks: "सर्व लक्षणे सामान्य पातळीवर आहेत. जिल्ह्यात कोणताही प्रादुर्भाव आढळला नाही.",
      highRisk: "उच्च संसर्ग चेतावणी",
      modRisk: "मध्यम पातळीवरील वाढ",
      facility: "रुग्णालय / केंद्र",
      symptom: "लक्षण श्रेणी",
      count: "रुग्ण संख्या",
      status: "स्थिती मूल्यमापन",
      recommendation: "ऑपरेशनल निर्देश"
    }
  }[language];

  // 1. Process data for the heatmap
  const getHeatmapData = (): HeatmapCell[] => {
    // Filter patients based on toggle
    const filteredPatients = patients.filter(p => {
      if (filterActiveOnly) {
        return p.status === "OPD_Pending" || p.status === "Admitted";
      }
      return true;
    });

    const dataset: HeatmapCell[] = [];

    facilities.forEach(fac => {
      const facPatients = filteredPatients.filter(p => p.facilityId === fac.id);

      SYMPTOM_CATEGORIES.forEach(cat => {
        let count = 0;

        if (cat.id === "others") {
          // Count patients that don't match any other category keywords
          count = facPatients.filter(p => {
            const sym = (p.symptoms || "").toLowerCase();
            return !SYMPTOM_CATEGORIES.filter(c => c.id !== "others").some(c =>
              c.keywords.some(kw => sym.includes(kw))
            );
          }).length;
        } else {
          // Count patients matching any of this category's keywords
          count = facPatients.filter(p => {
            const sym = (p.symptoms || "").toLowerCase();
            return cat.keywords.some(kw => sym.includes(kw));
          }).length;
        }

        dataset.push({
          facilityId: fac.id,
          facilityName: fac.name,
          symptomId: cat.id,
          symptomLabel: cat.label[language],
          count
        });
      });
    });

    return dataset;
  };

  const heatmapData = getHeatmapData();

  // Find any outbreaks (clusters with count >= 3 in a category)
  const activeOutbreaks = heatmapData.filter(cell => cell.count >= 3 && cell.symptomId !== "others" && cell.symptomId !== "maternity");

  // 2. D3 Heatmap Rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous elements
    d3.select(svgRef.current).selectAll("*").remove();

    const margin = { top: 40, right: 20, bottom: 65, left: 160 };
    const width = 680 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 680 300`)
      .attr("width", "100%")
      .attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Extract unique labels for axes
    const facilityNames = Array.from(new Set(heatmapData.map(d => d.facilityName)));
    const symptomLabels = SYMPTOM_CATEGORIES.map(cat => cat.label[language]);

    // Build scales
    const xScale = d3.scaleBand()
      .range([0, width])
      .domain(symptomLabels)
      .padding(0.06);

    const yScale = d3.scaleBand()
      .range([height, 0])
      .domain(facilityNames)
      .padding(0.06);

    // Color Scale: Slate (0) -> Soft Orange (1-2) -> Crimson Red (3+)
    const maxCount = d3.max(heatmapData, d => d.count) || 1;
    
    // Custom color function to ensure a premium look (not default continuous yellow/green)
    const getColor = (count: number) => {
      if (count === 0) return "#f8fafc"; // slate-50
      if (count === 1) return "#e0e7ff"; // indigo-100 (mild baseline case)
      if (count === 2) return "#fde047"; // amber-300 (elevated warning)
      if (count === 3) return "#f97316"; // orange-500 (moderate outbreak cluster)
      return "#dc2626"; // red-600 (critical active cluster)
    };

    // Render Y Axis (Facilities)
    svg.append("g")
      .call(d3.axisLeft(yScale).tickSize(0))
      .select(".domain").remove();

    svg.selectAll(".tick text")
      .attr("class", "text-[10px] font-sans font-bold text-slate-700 fill-slate-700")
      .style("text-anchor", "end");

    // Render X Axis (Symptoms)
    const xAxis = svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickSize(0));
    
    xAxis.select(".domain").remove();

    xAxis.selectAll("text")
      .attr("class", "text-[10px] font-sans font-semibold text-slate-600 fill-slate-600")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-30)");

    // Add grids/rectangles
    const cells = svg.selectAll()
      .data(heatmapData, (d: any) => d.facilityName + ":" + d.symptomLabel)
      .enter()
      .append("rect")
      .attr("x", (d: any) => xScale(d.symptomLabel) || 0)
      .attr("y", (d: any) => yScale(d.facilityName) || 0)
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .style("fill", "#f8fafc") // initial transition state
      .style("stroke", "#e2e8f0")
      .style("stroke-width", "1px")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        setSelectedCell(d);
      });

    // Animate color in
    cells.transition()
      .duration(800)
      .style("fill", (d: any) => getColor(d.count));

    // Hover effect
    cells.on("mouseover", function (event, d) {
      d3.select(this)
        .style("stroke", "#4f46e5")
        .style("stroke-width", "2px")
        .style("filter", "brightness(0.95)");
    })
    .on("mouseleave", function (event, d) {
      d3.select(this)
        .style("stroke", "#e2e8f0")
        .style("stroke-width", "1px")
        .style("filter", "none");
    });

    // Inside Cell count labels
    svg.selectAll()
      .data(heatmapData)
      .enter()
      .append("text")
      .attr("x", (d: any) => (xScale(d.symptomLabel) || 0) + xScale.bandwidth() / 2)
      .attr("y", (d: any) => (yScale(d.facilityName) || 0) + yScale.bandwidth() / 2 + 3.5)
      .attr("text-anchor", "middle")
      .attr("class", (d: any) => {
        if (d.count === 0) return "hidden";
        return `text-[10px] font-mono font-black ${
          d.count >= 3 ? "fill-white" : "fill-slate-800"
        } pointer-events-none`;
      })
      .text((d: any) => d.count);

  }, [heatmapData, language, filterActiveOnly]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-100 gap-4">
        <div className="space-y-1 font-sans">
          <div className="flex items-center gap-2">
            <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-rose-200/50 font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3 w-3 animate-pulse" />
              Syndromic Surveillance
            </span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-indigo-200/50 font-mono uppercase">
              D3.JS Engine Active
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-800">{labels.title}</h3>
          <p className="text-xs text-slate-400">{labels.subtitle}</p>
        </div>

        {/* Dynamic Filters */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0 self-stretch sm:self-auto justify-center">
          <button
            onClick={() => setFilterActiveOnly(true)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterActiveOnly 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {labels.activePatients}
          </button>
          <button
            onClick={() => setFilterActiveOnly(false)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              !filterActiveOnly 
                ? "bg-white text-slate-800 shadow-xs" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {labels.allPatients}
          </button>
        </div>
      </div>

      {/* Main Heatmap Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* SVG Visualization Column */}
        <div ref={containerRef} className="xl:col-span-8 flex flex-col justify-between bg-slate-50/50 border border-slate-150 p-4 rounded-2xl relative">
          <div className="w-full h-auto min-h-[250px] overflow-hidden flex items-center justify-center">
            <svg ref={svgRef} className="w-full h-full max-h-[300px]"></svg>
          </div>

          {/* D3 Heatmap Legends */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 mt-3 border-t border-slate-150 text-[10px] text-slate-500 font-sans">
            <span className="font-extrabold text-slate-700 uppercase tracking-wide">
              🎨 {labels.legendTitle}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-5 bg-slate-100 rounded border border-slate-200 block"></span>
                <span className="font-mono">0 (Baseline)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-5 bg-indigo-100 rounded border border-indigo-200 block"></span>
                <span className="font-mono">1 (Mild case)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-5 bg-yellow-300 rounded border border-yellow-400 block"></span>
                <span className="font-mono">2 (Elevated)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-5 bg-orange-500 rounded border border-orange-600 block animate-pulse"></span>
                <span className="font-mono">3 (Outbreak Cluster)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-5 bg-red-600 rounded border border-red-700 block animate-pulse"></span>
                <span className="font-mono">4+ (Severe Epidemic Warning)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Cell Audit Details Column */}
        <div className="xl:col-span-4 flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-4.5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-indigo-600 font-extrabold text-xs uppercase tracking-wider border-b border-slate-100 pb-2.5">
              <Info className="h-4 w-4" />
              <span>Surveillance Desk Inspector</span>
            </div>

            {selectedCell ? (
              <div className="space-y-3 font-sans">
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">{labels.facility}</span>
                    <span className="font-extrabold text-slate-800 block text-xs">{selectedCell.facilityName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">{labels.symptom}</span>
                    <span className="font-extrabold text-indigo-700 block text-xs">{selectedCell.symptomLabel}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">{labels.count}</span>
                    <span className={`text-sm font-black px-2 py-0.5 rounded-lg ${
                      selectedCell.count >= 3 
                        ? "bg-rose-50 text-rose-700 border border-rose-100" 
                        : selectedCell.count === 2
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-slate-100 text-slate-800"
                    }`}>
                      {selectedCell.count} {selectedCell.count === 1 ? "Patient" : "Patients"}
                    </span>
                  </div>
                </div>

                {/* Analysis and Actionable Guidance */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-2 text-[11px] leading-relaxed font-medium text-slate-700">
                  <div className="flex items-center gap-1.5 text-indigo-800 font-extrabold uppercase text-[10px]">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>{labels.status}</span>
                  </div>
                  <p>
                    {selectedCell.count >= 3 ? (
                      <span className="text-rose-700 font-extrabold">
                        ⚠️ ACTIVE CLUSTER ALERT: Localized outbreak of {selectedCell.symptomLabel} is actively compiling.
                      </span>
                    ) : selectedCell.count === 2 ? (
                      <span className="text-amber-700 font-extrabold">
                        ⚠️ WARNING: Elevated cases of {selectedCell.symptomLabel}. Suggests early infectious build-up.
                      </span>
                    ) : selectedCell.count === 1 ? (
                      <span className="text-slate-600">
                        Stable: Normal isolated case of {selectedCell.symptomLabel}. No clustering pattern detected.
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        Clean: No cases of {selectedCell.symptomLabel} reported.
                      </span>
                    )}
                  </p>
                  
                  {selectedCell.count > 0 && (
                    <div className="pt-2 mt-2 border-t border-indigo-100/50 space-y-1">
                      <span className="font-extrabold text-[10px] text-indigo-900 block uppercase font-sans">{labels.recommendation}:</span>
                      <p className="text-slate-600 italic">
                        {selectedCell.count >= 3 ? (
                          "Dispatched immediate alert to epidemiological teams. Recommend restocking critical antibiotics, antivirals, or IV fluids at this facility. Deploy containment guidelines."
                        ) : selectedCell.count === 2 ? (
                          "Monitor cluster threshold. Ensure lab reagents for target diagnostics (e.g. Dengue, Malaria, viral testing) are fully stocked and operational."
                        ) : (
                          "Routine symptom log, standard surveillance continue."
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs italic font-sans flex flex-col items-center justify-center gap-2">
                <Info className="h-8 w-8 text-slate-300 stroke-1" />
                <span>Hover over or click any grid cell on the heatmap to audit real-time outbreak surveillance details.</span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-[10px] text-slate-400 leading-snug font-mono">
            💡 D3 real-time matrix scans patterns across {patients.length} active logs.
          </div>
        </div>

      </div>

      {/* Real-time Outbreak Flags Alert Panel */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-500" />
            <h4 className="font-black text-xs uppercase tracking-wide text-white">{labels.outbreaksTitle}</h4>
          </div>
          {activeOutbreaks.length > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider font-mono">
              ⚠️ {activeOutbreaks.length} OUTBREAK CLUSTERS ACTIVE (showing top 2)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeOutbreaks.slice(0, 2).map((outbreak, idx) => {
            // Suggest corrective supply inventory
            let recommendedMeds = "Paracetamol & ORS Electrolytes";
            if (outbreak.symptomId === "fever") recommendedMeds = "Paracetamol 500mg, Amoxicillin 500mg, ORS";
            else if (outbreak.symptomId === "gastro") recommendedMeds = "ORS Hydration Powder, Metronidazole 400mg";
            else if (outbreak.symptomId === "respiratory") recommendedMeds = "Amoxicillin 500mg, Cough Syrup (Codeine-free)";

            return (
              <div key={idx} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex gap-3 text-left items-start font-sans">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-100 text-xs">🏥 {outbreak.facilityName}</span>
                    <span className="bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded font-mono">
                      {labels.highRisk}
                    </span>
                  </div>
                  <p className="text-xs text-red-200">
                    A localized density cluster of <strong>{outbreak.count} cases</strong> presenting with <strong>{outbreak.symptomLabel}</strong> has formed. This indicates a high likelihood of a local outbreak (e.g. viral/gastro epidemic).
                  </p>
                  <div className="bg-slate-950 p-2 rounded-lg border border-red-500/10 text-[10px] text-amber-400 font-mono leading-relaxed mt-2">
                    <strong className="text-slate-300 uppercase block text-[8px] mb-1 font-sans">🛡️ Containment Order & Supply Dispatch:</strong>
                    • Priority dispatch of <strong>{recommendedMeds}</strong> required.<br />
                    • Alert on-duty clinicians to isolate patients and perform blood/swab rapid diagnostics.<br />
                    • Dispatch vector control or sanitation teams to the surrounding community.
                  </div>
                </div>
              </div>
            );
          })}

          {activeOutbreaks.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-6 text-center text-slate-400 text-xs italic flex flex-col items-center justify-center gap-1">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <span>{labels.noOutbreaks}</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
