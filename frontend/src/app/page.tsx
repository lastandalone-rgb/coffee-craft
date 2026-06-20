"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Coffee,
  Thermometer,
  Scale,
  MessageSquare,
  Star,
  Trash2,
  Calendar,
  Clock,
  RefreshCw,
  Compass,
  Gauge,
  Sliders,
  ChevronRight
} from "lucide-react";

import { BrewRecord, StatsSummary, ChartDataPoint, StatsResponse } from "../types/coffee";
import { BrewChart } from "../components/BrewChart";
import { BrewHistory } from "../components/BrewHistory";

const POUR_OVER_STAGES = [
  { name: "悶蒸 (Blooming)", duration: 40, color: "border-caramel text-caramel" },
  { name: "第一次注水 (1st Pour)", duration: 50, color: "border-latte text-latte" },
  { name: "第二次注水 (2nd Pour)", duration: 60, color: "border-cream text-cream" },
  { name: "最後萃取 (Final Drawdown)", duration: 60, color: "border-[#8a5a36] text-[#f4eae0]" }
];

const getApiUrl = (path: string) => {
  if (typeof window !== "undefined") {
    if (window.location.port === "3000") {
      return `http://${window.location.hostname}:3001${path}`;
    }
  }
  return path;
};

export default function CoffeeTimerDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  
  // Mode selection: pour_over or espresso
  const [brewType, setBrewType] = useState<"pour_over" | "espresso">("espresso");

  // Input parameters state
  const [beanName, setBeanName] = useState("");
  const [grindSize, setGrindSize] = useState("");
  const [waterTemp, setWaterTemp] = useState("92");
  const [coffeeWeight, setCoffeeWeight] = useState("18"); // default 18g for espresso
  
  // Mode specific inputs
  const [waterWeight, setWaterWeight] = useState("225"); // for pour over
  const [liquidWeight, setLiquidWeight] = useState("36"); // for espresso yield
  const [pressure, setPressure] = useState("9.0"); // for espresso
  const [preinfusionTime, setPreinfusionTime] = useState(""); // optional for espresso

  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");

  // Quick Bean select choices
  const [uniqueBeans, setUniqueBeans] = useState<string[]>([]);

  // Timer states
  const [seconds, setSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // Pour Over Timer specific
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stageTimeLeft, setStageTimeLeft] = useState(POUR_OVER_STAGES[0].duration);

  // Espresso Timer specific: idle, timing, done
  const [espressoSubStage, setEspressoSubStage] = useState<"idle" | "timing" | "done">("idle");
  const [espressoPreinfusionSec, setEspressoPreinfusionSec] = useState<number | null>(null);

  // History & Statistics state
  const [history, setHistory] = useState<BrewRecord[]>([]);
  const [stats, setStats] = useState<StatsResponse>({
    summary: {
      total_brews: 0,
      avg_rating: 0,
      avg_coffee_weight: 0,
      avg_water_weight: 0,
      avg_liquid_weight: 0,
      avg_brew_time: 0,
      avg_preinfusion_time: 0,
      avg_water_temp: 0,
      avg_pressure: 0,
      favorite_bean: "無"
    },
    daily: [],
    weekly: [],
    monthly: []
  });
  const [activeTab, setActiveTab] = useState<"daily" | "weekly" | "monthly">("daily");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Mark mounted on client to prevent SSR hydration mismatch and initialize remote log sender
  useEffect(() => {
    setIsMounted(true);

    // Capture console errors and send to backend for debugging
    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args);
      fetch(getApiUrl("/api/logs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "console_error",
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(" "),
          href: window.location.href,
          userAgent: navigator.userAgent
        })
      }).catch(() => {});
    };

    // Capture window errors
    const handleWindowError = (event: ErrorEvent) => {
      fetch(getApiUrl("/api/logs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "window_error",
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        })
      }).catch(() => {});
    };

    window.addEventListener("error", handleWindowError);
    return () => {
      window.removeEventListener("error", handleWindowError);
    };
  }, []);

  // Default parameters switch on mode toggle
  useEffect(() => {
    if (!isMounted) return;
    if (brewType === "espresso") {
      setCoffeeWeight("18");
      setWaterTemp("92");
    } else {
      setCoffeeWeight("15");
      setWaterTemp("92");
    }
    handleReset();
    fetchData(brewType);
  }, [brewType, isMounted]);

  // Audio effects (wrapped defensively to prevent blocking iOS)
  const playBeep = () => {
    // Disabled on mobile/Safari to prevent WebAudio context threads from locking UI repaints
  };

  // Fetch data
  const fetchData = async (type = brewType) => {
    setIsLoading(true);
    try {
      const historyRes = await fetch(getApiUrl(`/api/brews?brew_type=${type}&limit=50`));
      const historyData = await historyRes.json();
      if (historyData.success) {
        setHistory(historyData.data);
        
        // Extract unique beans for quick select
        const beansSet = new Set<string>();
        historyData.data.forEach((item: BrewRecord) => {
          if (item.bean_name) beansSet.add(item.bean_name);
        });
        setUniqueBeans(Array.from(beansSet).slice(0, 5));
      }

      const statsRes = await fetch(getApiUrl(`/api/brews/stats?brew_type=${type}`));
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast("載入數據失敗，請檢查後端服務是否已啟動", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Core Timer Tick: clean and independent
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive]);

  // 2. Pour Over Stage Tracker: separated from the core timer loop
  useEffect(() => {
    if (isTimerActive && brewType === "pour_over") {
      let accumDuration = 0;
      let targetStageIdx = 0;
      
      for (let i = 0; i < POUR_OVER_STAGES.length; i++) {
        accumDuration += POUR_OVER_STAGES[i].duration;
        if (seconds <= accumDuration) {
          targetStageIdx = i;
          break;
        }
        if (i === POUR_OVER_STAGES.length - 1) {
          targetStageIdx = POUR_OVER_STAGES.length - 1;
        }
      }

      if (targetStageIdx !== currentStageIndex) {
        setTimeout(() => playBeep(), 0);
        setCurrentStageIndex(targetStageIdx);
      }

      let previousStagesDuration = 0;
      for (let i = 0; i < targetStageIdx; i++) {
        previousStagesDuration += POUR_OVER_STAGES[i].duration;
      }
      const elapsedInStage = seconds - previousStagesDuration;
      const timeLeft = Math.max(0, POUR_OVER_STAGES[targetStageIdx].duration - elapsedInStage);
      setStageTimeLeft(timeLeft);
    }
  }, [seconds, isTimerActive, brewType, currentStageIndex]);

  // Espresso-specific timer controls: One-Click flow
  const handleEspressoStart = () => {
    if (!beanName.trim()) {
      showToast("請先輸入或選擇咖啡豆名稱！", "error");
      return;
    }
    setTimeout(() => playBeep(), 0);
    setSeconds(0);
    setEspressoPreinfusionSec(null);
    setEspressoSubStage("timing");
    setIsTimerActive(true);
  };

  const handleEspressoMarkPreinfusionEnd = () => {
    setTimeout(() => playBeep(), 0);
    setEspressoPreinfusionSec(seconds);
    setPreinfusionTime(seconds.toString());
    showToast(`已記錄預浸時間: ${seconds} 秒`, "success");
  };

  const handleEspressoStop = () => {
    setTimeout(() => playBeep(), 0);
    setIsTimerActive(false);
    setEspressoSubStage("done");
  };

  const handleStartPausePourOver = () => {
    if (!beanName.trim()) {
      showToast("請先輸入或選擇咖啡豆名稱！", "error");
      return;
    }
    setIsTimerActive(!isTimerActive);
  };

  const handleReset = () => {
    setIsTimerActive(false);
    setSeconds(0);
    setCurrentStageIndex(0);
    setStageTimeLeft(POUR_OVER_STAGES[0].duration);
    setEspressoSubStage("idle");
    setEspressoPreinfusionSec(null);
    setPreinfusionTime("");
  };

  const handleSaveBrew = async () => {
    if (!beanName.trim()) {
      showToast("請輸入咖啡豆名稱", "error");
      return;
    }

    setIsSaving(true);
    try {
      const isEspresso = brewType === "espresso";
      const bodyPayload = {
        bean_name: beanName,
        grind_size: grindSize || null,
        water_temp: waterTemp ? parseFloat(waterTemp) : null,
        coffee_weight: coffeeWeight ? parseFloat(coffeeWeight) : null,
        brew_time: seconds || null,
        rating: rating,
        notes: notes || null,
        brew_type: brewType,
        // Mode specific parameters
        water_weight: !isEspresso && waterWeight ? parseFloat(waterWeight) : null,
        liquid_weight: isEspresso && liquidWeight ? parseFloat(liquidWeight) : null,
        preinfusion_time: isEspresso && preinfusionTime ? parseInt(preinfusionTime) : null,
        pressure: isEspresso && pressure ? parseFloat(pressure) : null
      };

      const response = await fetch(getApiUrl("/api/brews"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const resData = await response.json();
      if (resData.success) {
        showToast(`☕ ${isEspresso ? "義式" : "手沖"}沖煮紀錄儲存成功！`, "success");
        handleReset();
        setNotes("");
        fetchData(brewType);
      } else {
        showToast(resData.error || "儲存失敗", "error");
      }
    } catch (error) {
      console.error("Save failed:", error);
      showToast("網路錯誤，儲存紀錄失敗", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBrew = async (id: string) => {
    if (!confirm("確定要刪除這筆沖煮紀錄嗎？")) return;

    try {
      const response = await fetch(getApiUrl(`/api/brews/${id}`), {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.success) {
        showToast("已成功刪除該筆沖煮紀錄", "success");
        fetchData(brewType);
      } else {
        showToast(data.error || "刪除失敗", "error");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("網路錯誤，刪除失敗", "error");
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calcRatio = () => {
    const coffee = parseFloat(coffeeWeight);
    if (brewType === "espresso") {
      const liquid = parseFloat(liquidWeight);
      if (!coffee || !liquid) return "1 : --";
      return `1 : ${(liquid / coffee).toFixed(1)}`;
    } else {
      const water = parseFloat(waterWeight);
      if (!coffee || !water) return "1 : --";
      return `1 : ${(water / coffee).toFixed(1)}`;
    }
  };

  // Custom SVG Chart is now handled by components/BrewChart.tsx

  // Safe client-side check to prevent SSR hydration desync in React 19 / Safari
  if (!isMounted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#0f0b09] text-[#f4eae0]">
        <Coffee className="w-12 h-12 animate-bounce text-[#c68642]" />
        <p className="mt-4 text-sm text-zinc-500 font-semibold tracking-wider">載入沖煮工作台中...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl w-full mx-auto gap-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 transition-all duration-300 border ${
            toast.type === "success"
              ? "bg-[#1f1610] text-[#e0b034] border-[#c68642]"
              : "bg-[#251010] text-[#ff8080] border-[#5a1b1b]"
          }`}
        >
          <Coffee className="w-5 h-5 animate-bounce" />
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-[#1a120e] gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4b3621] to-[#c68642] flex items-center justify-center coffee-glow">
            <Coffee className="w-6 h-6 text-[#f4eae0] animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-widest bg-gradient-to-r from-[#f4eae0] to-[#c68642] bg-clip-text text-transparent">
              COFFEE CRAFT
            </h1>
            <p className="text-xs text-zinc-500 font-medium">咖啡沖煮計時器 & 統計儀表板</p>
          </div>
        </div>

        {/* Global Mode Switcher */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex bg-[#140e0b] p-1 rounded-xl border border-[#c68642]/15 w-full sm:w-auto">
            <button
              onClick={() => setBrewType("espresso")}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                brewType === "espresso"
                  ? "bg-[#c68642] text-[#f4eae0] coffee-glow-active"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Gauge className="w-3.5 h-3.5" /> 義式濃縮 (Espresso)
            </button>
            <button
              onClick={() => setBrewType("pour_over")}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                brewType === "pour_over"
                  ? "bg-[#c68642] text-[#f4eae0] coffee-glow-active"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Coffee className="w-3.5 h-3.5" /> 手沖咖啡 (Pour Over)
            </button>
          </div>

          <button
            onClick={() => fetchData(brewType)}
            className="p-2 rounded-xl border border-[#c68642]/20 hover:border-[#c68642] transition-colors hover:bg-[#1a120e] shrink-0"
            title="重新整理數據"
          >
            <RefreshCw className={`w-4 h-4 text-[#c68642] ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Workspace Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Brewing Workspace (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Timer Card */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden z-10">

            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">
              {brewType === "espresso" ? (
                espressoSubStage === "idle" ? "準備就緒" :
                espressoSubStage === "timing" ? (
                  espressoPreinfusionSec === null ? "萃取中 / 自動計時中..." : `已記預浸 ${espressoPreinfusionSec}s，繼續萃取中...`
                ) : "萃取完成"
              ) : (
                POUR_OVER_STAGES[currentStageIndex].name
              )}
            </div>

            {/* Circular Timer Visual */}
            <div className="relative w-48 h-48 flex items-center justify-center mb-6 z-10">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="86"
                  stroke="#1a120e"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="86"
                  stroke={isTimerActive ? "#e0b034" : "#4b3621"}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 86}
                  strokeDashoffset={
                    brewType === "pour_over"
                      ? 2 * Math.PI * 86 * (1 - stageTimeLeft / POUR_OVER_STAGES[currentStageIndex].duration)
                      : 0 // count-up no circular offset fill
                  }
                  strokeLinecap="round"
                  className={brewType === "pour_over" ? "transition-all duration-1000" : ""}
                />
              </svg>
              <div key={seconds} className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold font-mono tracking-tight">
                  {brewType === "espresso" ? `${seconds}s` : formatTime(seconds)}
                </span>
                
                {brewType === "espresso" && (
                  <div className="text-[10px] text-zinc-400 font-semibold mt-1 flex flex-col items-center gap-0.5">
                    {espressoPreinfusionSec !== null ? (
                      <>
                        <span>預浸時間: {espressoPreinfusionSec}s</span>
                        <span>萃取時間: {seconds - espressoPreinfusionSec}s</span>
                      </>
                    ) : (
                      <span>總萃取時間</span>
                    )}
                  </div>
                )}
                {brewType === "pour_over" && (
                  <span className="text-xs text-[#c68642] font-semibold mt-1">
                    剩餘 {stageTimeLeft} 秒
                  </span>
                )}
              </div>
            </div>

            {/* Stage Previews (Pour Over Only) */}
            {brewType === "pour_over" && (
              <div className="w-full flex gap-1 mb-6 text-xs overflow-x-auto z-10">
                {POUR_OVER_STAGES.map((stage, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 py-2 px-1 rounded-lg border transition-all duration-300 ${
                      idx === currentStageIndex
                        ? `${stage.color} bg-[#1a120e] font-bold border-current scale-[1.03]`
                        : "border-transparent text-zinc-600 bg-transparent"
                    }`}
                  >
                    <div className="truncate">{stage.name}</div>
                    <div className="text-[10px] mt-0.5 opacity-75">{stage.duration}s</div>
                  </div>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-col gap-3 w-full relative z-20">
              <div className="flex gap-3 w-full">
                {brewType === "espresso" ? (
                  // ESPRESSO ONE-CLICK CONTROLS
                  <>
                    {espressoSubStage !== "timing" ? (
                      <button
                        onClick={handleEspressoStart}
                        className="flex-1 py-4 px-4 rounded-xl font-bold bg-[#e0b034] text-[#0f0b09] hover:bg-[#c68642] flex items-center justify-center gap-2 transition-all coffee-glow-active cursor-pointer active:scale-95"
                      >
                        <Play className="w-5 h-5 fill-current" /> {seconds > 0 ? "重新開始" : "開始萃取"}
                      </button>
                    ) : (
                      <button
                        onClick={handleEspressoStop}
                        className="flex-1 py-4 px-4 rounded-xl font-bold bg-[#25120a] border border-[#ff8080]/30 hover:border-[#ff8080]/85 text-[#ff8080] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                      >
                        <Pause className="w-5 h-5" /> 停止計時
                      </button>
                    )}
                  </>
                ) : (
                  // POUR OVER CONTROLS
                  <>
                    <button
                      onClick={handleStartPausePourOver}
                      className={`flex-1 py-4 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 ${
                        isTimerActive
                          ? "bg-[#25120a] border border-[#ff8080]/30 hover:border-[#ff8080]/80 text-[#ff8080]"
                          : "bg-[#e0b034] text-[#0f0b09] hover:bg-[#c68642] coffee-glow-active"
                      }`}
                    >
                      {isTimerActive ? (
                        <>
                          <Pause className="w-5 h-5 fill-current" /> 暫停
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 fill-current" /> {seconds > 0 ? "繼續" : "開始沖煮"}
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Reset & Save for both modes */}
                {(brewType === "pour_over" || espressoSubStage === "done") && (
                  <button
                    onClick={handleReset}
                    disabled={seconds === 0}
                    className="p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="重設計清"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={handleSaveBrew}
                  disabled={seconds === 0 || isSaving}
                  className="py-4 px-5 rounded-xl bg-[#c68642] text-[#f4eae0] hover:bg-[#b07536] disabled:opacity-40 disabled:pointer-events-none font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Check className="w-5 h-5" /> 儲存
                </button>
              </div>

              {/* Espresso Optional Sub-action during active timing (to mark pre-infusion) */}
              {brewType === "espresso" && espressoSubStage === "timing" && espressoPreinfusionSec === null && (
                <button
                  onClick={handleEspressoMarkPreinfusionEnd}
                  className="w-full py-3 px-4 rounded-xl font-semibold border border-[#c68642]/30 hover:border-[#c68642] text-[#c68642] hover:bg-[#c68642]/5 text-xs transition-all cursor-pointer"
                >
                  ⏱️ 記錄出咖啡液點 (標記預浸結束)
                </button>
              )}
            </div>
          </div>

          {/* Parameters Input Form */}
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-sm font-bold text-[#e0b034] mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4" /> 沖煮參數配置
            </h2>
            <div className="grid grid-cols-2 gap-4">
              
              {/* Bean name - spans full width */}
              <div className="col-span-2">
                <label className="block text-xs text-zinc-500 font-semibold mb-1">咖啡豆名稱 *</label>
                <input
                  type="text"
                  placeholder="e.g. 耶加雪菲 葛德奧 G1"
                  value={beanName}
                  onChange={(e) => setBeanName(e.target.value)}
                  className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl px-3 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors"
                />
                
                {/* Quick Bean selection from history */}
                {uniqueBeans.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 items-center">
                    <span className="text-[10px] text-zinc-600 font-medium mr-1">常用:</span>
                    {uniqueBeans.map((bean) => (
                      <button
                        key={bean}
                        onClick={() => setBeanName(bean)}
                        className="text-[10px] bg-[#1a120e] hover:bg-[#251a14] border border-[#c68642]/10 hover:border-[#c68642]/30 text-zinc-400 rounded px-2 py-0.5 transition-colors"
                      >
                        {bean}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grind size */}
              <div>
                <label className="block text-xs text-zinc-500 font-semibold mb-1">研磨刻度</label>
                <input
                  type="text"
                  placeholder={brewType === "espresso" ? "e.g. Mazzer 3.2" : "e.g. C40 24格"}
                  value={grindSize}
                  onChange={(e) => setGrindSize(e.target.value)}
                  className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl px-3 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors"
                />
              </div>

              {/* Water Temperature */}
              <div>
                <label className="block text-xs text-zinc-500 font-semibold mb-1">水溫 (°C)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="92"
                    value={waterTemp}
                    onChange={(e) => setWaterTemp(e.target.value)}
                    className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl pl-3 pr-8 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors"
                  />
                  <span className="absolute right-3 top-3 text-xs text-zinc-600">°C</span>
                </div>
              </div>

              {/* Coffee beans weight / Dose */}
              <div>
                <label className="block text-xs text-zinc-500 font-semibold mb-1">咖啡粉重 / 粉量 (g)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder={brewType === "espresso" ? "18" : "15"}
                    step="0.1"
                    value={coffeeWeight}
                    onChange={(e) => setCoffeeWeight(e.target.value)}
                    className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl pl-3 pr-8 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors"
                  />
                  <span className="absolute right-3 top-3 text-xs text-zinc-600">g</span>
                </div>
              </div>

              {/* Mode Specific: Liquid yield (Espresso) OR Water weight (Pour Over) */}
              {brewType === "espresso" ? (
                <>
                  <div>
                    <label className="block text-xs text-zinc-500 font-semibold mb-1">萃取液重 / 出液量 (g)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="36"
                        step="0.1"
                        value={liquidWeight}
                        onChange={(e) => setLiquidWeight(e.target.value)}
                        className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl pl-3 pr-8 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors"
                      />
                      <span className="absolute right-3 top-3 text-xs text-zinc-600">g</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-500 font-semibold mb-1">預浸時間 (秒，選填)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="無"
                        value={preinfusionTime}
                        onChange={(e) => setPreinfusionTime(e.target.value)}
                        className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl pl-3 pr-8 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors"
                      />
                      <span className="absolute right-3 top-3 text-xs text-zinc-600">s</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-zinc-500 font-semibold mb-1">萃取壓力 (bar)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="9.0"
                        step="0.1"
                        value={pressure}
                        onChange={(e) => setPressure(e.target.value)}
                        className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl pl-3 pr-8 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors"
                      />
                      <span className="absolute right-3 top-3 text-xs text-zinc-600">bar</span>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-zinc-500 font-semibold mb-1">總注水量 (g)</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="225"
                      value={waterWeight}
                      onChange={(e) => setWaterWeight(e.target.value)}
                      className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl pl-3 pr-8 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors"
                    />
                    <span className="absolute right-3 top-3 text-xs text-zinc-600">g</span>
                  </div>
                </div>
              )}

              {/* Brew Ratio - Readonly indicator */}
              <div className="col-span-2 bg-[#140e0b] rounded-xl p-3 border border-[#c68642]/10 flex justify-between items-center">
                <span className="text-xs text-zinc-500 font-medium">
                  {brewType === "espresso" ? "粉液比例 (Ratio)" : "粉水比率 (Ratio)"}
                </span>
                <span className="text-sm font-bold text-[#e0b034]">{calcRatio()}</span>
              </div>

              {/* Rating */}
              <div className="col-span-2">
                <label className="block text-xs text-zinc-500 font-semibold mb-1">風味評分 (1-5 星)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? "text-[#e0b034] fill-[#e0b034]"
                            : "text-zinc-700"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Flavor notes */}
              <div className="col-span-2">
                <label className="block text-xs text-zinc-500 font-semibold mb-1">風味與心得筆記</label>
                <textarea
                  placeholder={
                    brewType === "espresso"
                      ? "可填寫：油脂(Crema)厚度、酸甜比、通道效應、流速調整..."
                      : "可填寫：甜感高、酸味明亮、中段柑橘風味..."
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-[#140e0b] border border-[#c68642]/20 rounded-xl px-3 py-2.5 text-base md:text-sm text-[#f4eae0] focus:outline-none focus:border-[#e0b034] transition-colors resize-none"
                />
              </div>

            </div>
          </div>
        </section>

        {/* Right Side: Reports, Stats & Charts (7 cols) */}
        <main className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-zinc-500 text-xs font-semibold">累計沖煮 ({brewType === "espresso" ? "義式" : "手沖"})</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold text-[#e0b034]">
                  {stats.summary.total_brews}
                </span>
                <span className="text-xs text-zinc-500">次</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-zinc-500 text-xs font-semibold">豆用量估算</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold text-[#c68642]">
                  {Math.round(stats.summary.total_brews * (stats.summary.avg_coffee_weight || (brewType === "espresso" ? 18 : 15)))}
                </span>
                <span className="text-xs text-zinc-500">g</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-zinc-500 text-xs font-semibold">
                {brewType === "espresso" ? "平均壓強" : "平均水溫"}
              </span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold text-[#f4eae0]">
                  {brewType === "espresso" ? (stats.summary.avg_pressure || 9.0) : (stats.summary.avg_water_temp || 92)}
                </span>
                <span className="text-xs text-zinc-500">{brewType === "espresso" ? "bar" : "°C"}</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-zinc-500 text-xs font-semibold">平均時間</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold text-amber-200">
                  {brewType === "espresso" ? `${stats.summary.avg_brew_time || 0}s` : formatTime(stats.summary.avg_brew_time || 0)}
                </span>
              </div>
            </div>

          </div>

          {/* Charts Card */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-sm font-bold text-[#e0b034] uppercase tracking-wide">
                  {brewType === "espresso" ? "義式" : "手沖"} 沖煮統計報表
                </h2>
                <p className="text-[10px] text-zinc-500 font-medium">查看該沖煮類型的沖煮頻率與豆粉消耗趨勢</p>
              </div>
            </div>

            {/* SVG Chart Render */}
            <BrewChart stats={stats} activeTab={activeTab} setActiveTab={setActiveTab} />
            
            {/* Bottom summary within charts */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#1a120e] text-center text-xs">
              <div>
                <div className="text-zinc-600 text-[10px]">最愛咖啡豆</div>
                <div className="font-semibold text-zinc-300 truncate mt-0.5">
                  {stats.summary.favorite_bean}
                </div>
              </div>
              <div>
                <div className="text-zinc-600 text-[10px]">
                  {brewType === "espresso" ? "平均出液重" : "平均粉重"}
                </div>
                <div className="font-semibold text-zinc-300 mt-0.5">
                  {brewType === "espresso" ? (stats.summary.avg_liquid_weight || 0) : (stats.summary.avg_coffee_weight || 0)} g
                </div>
              </div>
              <div>
                <div className="text-zinc-600 text-[10px]">平均滿意度</div>
                <div className="font-semibold text-zinc-300 flex items-center justify-center gap-0.5 mt-0.5">
                  {stats.summary.avg_rating || 0} <Star className="w-3 h-3 text-[#e0b034] fill-[#e0b034]" />
                </div>
              </div>
            </div>
          </div>

          {/* History Log Container */}
          <BrewHistory history={history} brewType={brewType} onDeleteBrew={handleDeleteBrew} />
        </main>
        
      </div>
    </div>
  );
}
