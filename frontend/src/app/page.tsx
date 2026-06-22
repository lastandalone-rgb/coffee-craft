"use client";

import React, { useState, useEffect } from "react";
import {
  Coffee,
  Star,
  RefreshCw,
  Gauge,
  Database
} from "lucide-react";

import { BrewRecord, StatsResponse, CoffeeBean, TelemetryPoint } from "../types/coffee";
import { BrewChart } from "../components/BrewChart";
import { BrewHistory } from "../components/BrewHistory";
import { CoffeeScaleBluetooth } from "../utils/bluetooth";

import { EspressoDashboard } from "../components/EspressoDashboard";
import { PourOverDashboard } from "../components/PourOverDashboard";
import { ParametersForm } from "../components/ParametersForm";
import { CoffeeBeanInventory } from "../components/CoffeeBeanInventory";
import { MobileBottomNavbar } from "../components/MobileBottomNavbar";
import { MobileSpecialDashboard } from "../components/MobileSpecialDashboard";

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

  // Bluetooth Scale States
  const [bluetoothScale, setBluetoothScale] = useState<CoffeeScaleBluetooth | null>(null);
  const [connectedScaleName, setConnectedScaleName] = useState<string | null>(null);
  const [scaleWeight, setScaleWeight] = useState<number>(0);
  const [isScaleConnecting, setIsScaleConnecting] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);

  // Bean Inventory States
  const [activeBeans, setActiveBeans] = useState<CoffeeBean[]>([]);
  const [selectedBeanId, setSelectedBeanId] = useState<string>("");
  const [isAddBeanModalOpen, setIsAddBeanModalOpen] = useState(false);
  const [espressoLayout, setEspressoLayout] = useState<"standard" | "chart_first" | "radial_gauge" | "split_screen">("standard");
  const [mobileActiveTab, setMobileActiveTab] = useState<"timer" | "history" | "inventory" | "stats">("timer");

  const isMobileRunning = mobileActiveTab === "timer" && (brewType === "espresso" ? espressoSubStage === "timing" : isTimerActive);

  // Preserve scroll position when entering/exiting mobile focus mode
  const scrollPositionRef = React.useRef<number>(0);
  const [isVisualFocus, setIsVisualFocus] = useState(false);
  const [transitionState, setTransitionState] = useState<"idle" | "fading-in-enter" | "fading-in-exit" | "fading-out">("idle");

  useEffect(() => {
    const handleScroll = () => {
      if (!isVisualFocus) {
        scrollPositionRef.current = window.scrollY;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isVisualFocus]);

  // Handle entering/exiting transitions driven by timer state
  useEffect(() => {
    if (isMobileRunning) {
      if (!isVisualFocus && transitionState === "idle") {
        setTransitionState("fading-in-enter");
      }
    } else {
      if (isVisualFocus && transitionState === "idle") {
        setTransitionState("fading-in-exit");
      }
    }
  }, [isMobileRunning, isVisualFocus, transitionState]);

  // Robust timer-driven transition state machine to avoid fragile onTransitionEnd events on iOS Safari
  useEffect(() => {
    if (transitionState === "fading-in-enter") {
      const timer = setTimeout(() => {
        setIsVisualFocus(true);
        setTransitionState("fading-out");
      }, 180); // Transition duration is 150ms + safety buffer
      return () => clearTimeout(timer);
    }
    
    if (transitionState === "fading-in-exit") {
      const timer = setTimeout(() => {
        setIsVisualFocus(false);
      }, 180); // Transition duration is 150ms + safety buffer
      return () => clearTimeout(timer);
    }

    if (transitionState === "fading-out") {
      const timer = setTimeout(() => {
        setTransitionState("idle");
      }, 180); // Transition duration is 150ms + safety buffer
      return () => clearTimeout(timer);
    }
  }, [transitionState]);

  // Restores scroll position in a DOM-updated layout cycle before fading out the mask
  useEffect(() => {
    if (!isVisualFocus && transitionState === "fading-in-exit") {
      const targetScrollY = scrollPositionRef.current;
      let attempts = 0;
      
      const performScroll = () => {
        window.scrollTo({
          top: targetScrollY,
          behavior: "instant"
        });
        
        const currentScrollY = window.scrollY;
        // Verify if we reached the target or hit max attempts
        if (Math.abs(currentScrollY - targetScrollY) <= 2 || attempts >= 20) {
          setTimeout(() => {
            setTransitionState("fading-out");
          }, 40);
        } else {
          attempts++;
          requestAnimationFrame(performScroll);
        }
      };
      
      requestAnimationFrame(performScroll);
    }
  }, [isVisualFocus, transitionState]);

  // New Bean Form States
  const [newBeanName, setNewBeanName] = useState("");
  const [newBeanRoaster, setNewBeanRoaster] = useState("");
  const [newBeanRoastDate, setNewBeanRoastDate] = useState("");
  const [newBeanRoastLevel, setNewBeanRoastLevel] = useState<"light" | "medium" | "dark">("medium");
  const [newBeanOrigin, setNewBeanOrigin] = useState("");
  const [newBeanProcess, setNewBeanProcess] = useState("");
  const [newBeanWeight, setNewBeanWeight] = useState("250");

  // Mark mounted on client to prevent SSR hydration mismatch and initialize remote log sender
  useEffect(() => {
    // Restore parameter states on client mount
    if (typeof window !== "undefined") {
      const savedBrewType = localStorage.getItem("coffee_timer_brew_type") as "pour_over" | "espresso";
      const activeType = savedBrewType || "espresso";
      if (savedBrewType) {
        setBrewType(savedBrewType);
      }
      
      const savedGrind = localStorage.getItem(`coffee_timer_${activeType}_grind_size`);
      if (savedGrind) setGrindSize(savedGrind);
      
      const savedTemp = localStorage.getItem(`coffee_timer_${activeType}_water_temp`);
      if (savedTemp) setWaterTemp(savedTemp);
      
      const savedCoffee = localStorage.getItem(`coffee_timer_${activeType}_coffee_weight`);
      if (savedCoffee) setCoffeeWeight(savedCoffee);
      
      const savedWater = localStorage.getItem("coffee_timer_pour_over_water_weight");
      if (savedWater) setWaterWeight(savedWater);
      
      const savedLiquid = localStorage.getItem("coffee_timer_espresso_liquid_weight");
      if (savedLiquid) setLiquidWeight(savedLiquid);
      
      const savedPressure = localStorage.getItem("coffee_timer_espresso_pressure");
      if (savedPressure) setPressure(savedPressure);
      
      const savedPreinfusion = localStorage.getItem("coffee_timer_espresso_preinfusion_time");
      if (savedPreinfusion) setPreinfusionTime(savedPreinfusion);

      const savedBeanId = localStorage.getItem("coffee_timer_selected_bean_id");
      if (savedBeanId) setSelectedBeanId(savedBeanId);

      const savedBeanName = localStorage.getItem("coffee_timer_bean_name");
      if (savedBeanName) setBeanName(savedBeanName);

      const savedEspressoLayout = localStorage.getItem("coffee_timer_espresso_layout") as any;
      if (savedEspressoLayout) setEspressoLayout(savedEspressoLayout);
    }

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

  // Save parameters to localStorage when they change
  useEffect(() => {
    if (!isMounted) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("coffee_timer_brew_type", brewType);
      localStorage.setItem(`coffee_timer_${brewType}_grind_size`, grindSize);
      localStorage.setItem(`coffee_timer_${brewType}_water_temp`, waterTemp);
      localStorage.setItem(`coffee_timer_${brewType}_coffee_weight`, coffeeWeight);
      localStorage.setItem("coffee_timer_selected_bean_id", selectedBeanId);
      localStorage.setItem("coffee_timer_bean_name", beanName);
      localStorage.setItem("coffee_timer_espresso_layout", espressoLayout);
      if (brewType === "espresso") {
        localStorage.setItem("coffee_timer_espresso_liquid_weight", liquidWeight);
        localStorage.setItem("coffee_timer_espresso_pressure", pressure);
        localStorage.setItem("coffee_timer_espresso_preinfusion_time", preinfusionTime);
      } else {
        localStorage.setItem("coffee_timer_pour_over_water_weight", waterWeight);
      }
    }
  }, [brewType, grindSize, waterTemp, coffeeWeight, selectedBeanId, beanName, espressoLayout, liquidWeight, pressure, preinfusionTime, waterWeight, isMounted]);

  // Synchronize beanName if activeBeans list loads/changes
  useEffect(() => {
    if (selectedBeanId && activeBeans.length > 0) {
      const selected = activeBeans.find(b => b.id === selectedBeanId);
      if (selected) {
        setBeanName(selected.name);
      }
    }
  }, [selectedBeanId, activeBeans]);

  // Parameters restore on mode toggle
  useEffect(() => {
    if (!isMounted) return;
    if (typeof window !== "undefined") {
      const savedGrind = localStorage.getItem(`coffee_timer_${brewType}_grind_size`);
      const savedTemp = localStorage.getItem(`coffee_timer_${brewType}_water_temp`);
      const savedCoffee = localStorage.getItem(`coffee_timer_${brewType}_coffee_weight`);
      
      setGrindSize(savedGrind || (brewType === "espresso" ? "3.5" : "24"));
      setWaterTemp(savedTemp || "92");
      setCoffeeWeight(savedCoffee || (brewType === "espresso" ? "18" : "15"));
    }
    handleReset();
    fetchData(brewType);
  }, [brewType, isMounted]);

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

      // Fetch active coffee beans inventory
      const beansRes = await fetch(getApiUrl("/api/inventory/beans/active"));
      const beansData = await beansRes.json();
      if (beansData.success) {
        setActiveBeans(beansData.data);
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

  // Bluetooth Scale Actions
  const handleConnectScale = async (simulated = false) => {
    setIsScaleConnecting(true);
    try {
      const scale = new CoffeeScaleBluetooth();
      const name = await scale.connect(
        (weight) => {
          setScaleWeight(weight);
        },
        () => {
          setConnectedScaleName(null);
          showToast("藍牙秤連線已中斷", "error");
        },
        simulated
      );
      setBluetoothScale(scale);
      setConnectedScaleName(name);
      showToast(`已成功連接: ${name}`, "success");
    } catch (err: any) {
      console.error("Scale connection failed:", err);
      showToast(err.message || "連線失敗，請重試", "error");
    } finally {
      setIsScaleConnecting(false);
    }
  };

  const handleDisconnectScale = () => {
    if (bluetoothScale) {
      bluetoothScale.disconnect();
      setBluetoothScale(null);
      setConnectedScaleName(null);
      setScaleWeight(0);
      showToast("藍牙秤已中斷連接", "success");
    }
  };

  // 1. Core Timer Tick: populates mock telemetry once a second if no scale is connected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const nextSec = prev + 0.05;
          
          if (!connectedScaleName) {
            // Only update telemetry once a second
            if (Math.floor(nextSec) !== Math.floor(prev)) {
              const displaySec = Math.floor(nextSec);
              setTelemetry(prevTel => {
                const targetY = parseFloat(brewType === "espresso" ? liquidWeight.toString() : waterWeight.toString()) || 36;
                const duration = brewType === "espresso" ? 30 : 180;
                const currentY = Math.min(targetY, (displaySec / duration) * targetY);
                
                let flow = displaySec > 4 ? currentY / displaySec : 0;
                flow = Math.max(0, parseFloat(flow.toFixed(2)));

                let currentPressure = 0;
                if (brewType === "espresso") {
                  if (espressoPreinfusionSec === null) {
                    currentPressure = Math.min(2.0, displaySec * 0.5);
                  } else {
                    const postPreinfusionTime = displaySec - espressoPreinfusionSec;
                    if (postPreinfusionTime < 2) {
                      currentPressure = 2.0 + (postPreinfusionTime / 2) * 7.0;
                    } else {
                      currentPressure = 9.0 - Math.min(1.5, (postPreinfusionTime - 2) * 0.05);
                    }
                  }
                }
                currentPressure = parseFloat(currentPressure.toFixed(1));

                return [
                  ...prevTel,
                  {
                    time: displaySec,
                    yield: parseFloat(currentY.toFixed(1)),
                    flow,
                    pressure: currentPressure > 0 ? currentPressure : undefined
                  }
                ];
              });
            }
          }

          return parseFloat(nextSec.toFixed(2));
        });
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, connectedScaleName, brewType, liquidWeight, waterWeight, espressoPreinfusionSec]);

  // 2. High-precision Bluetooth telemetry listener (10Hz updates)
  useEffect(() => {
    if (isTimerActive && connectedScaleName) {
      const nowSec = seconds + (Date.now() % 1000) / 1000;
      
      let flow = 0;
      if (telemetry.length > 0) {
        const lastPt = telemetry[telemetry.length - 1];
        const deltaT = nowSec - lastPt.time;
        const deltaW = scaleWeight - lastPt.yield;
        if (deltaT > 0) {
          flow = deltaW / deltaT;
          if (telemetry.length >= 2) {
            const prev2 = telemetry[telemetry.length - 2];
            const flow1 = (lastPt.yield - prev2.yield) / (lastPt.time - prev2.time);
            flow = (flow + lastPt.flow + flow1) / 3;
          }
        }
      }
      flow = Math.max(0, parseFloat(flow.toFixed(2)));

      let currentPressure = 0;
      if (brewType === "espresso") {
        if (espressoPreinfusionSec === null) {
          currentPressure = Math.min(2.0, nowSec * 0.5);
        } else {
          const postPreinfusionTime = nowSec - espressoPreinfusionSec;
          if (postPreinfusionTime < 2) {
            currentPressure = 2.0 + (postPreinfusionTime / 2) * 7.0;
          } else {
            currentPressure = 9.0 - Math.min(1.5, (postPreinfusionTime - 2) * 0.05);
          }
        }
      }
      currentPressure = parseFloat(currentPressure.toFixed(1));

      setTelemetry(prev => [
        ...prev,
        {
          time: parseFloat(nowSec.toFixed(2)),
          yield: scaleWeight,
          flow,
          pressure: currentPressure > 0 ? currentPressure : undefined
        }
      ]);
    }
  }, [scaleWeight, isTimerActive]);

  // 2. Pour Over Stage Tracker
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
    setSeconds(0);
    setEspressoPreinfusionSec(null);
    setEspressoSubStage("timing");
    setIsTimerActive(true);
  };

  const handleEspressoMarkPreinfusionEnd = () => {
    setEspressoPreinfusionSec(seconds);
    setPreinfusionTime(seconds.toString());
    showToast(`已記錄預浸時間: ${seconds} 秒`, "success");
  };

  const handleEspressoStop = () => {
    setIsTimerActive(false);
    setEspressoSubStage("done");
  };

  const handleEspressoResume = () => {
    setIsTimerActive(true);
    setEspressoSubStage("timing");
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
    setTelemetry([]);
    setScaleWeight(0);
  };

  const handleBeanChange = (beanId: string) => {
    setSelectedBeanId(beanId);
    if (beanId === "") {
      setBeanName("");
      return;
    }
    const selected = activeBeans.find(b => b.id === beanId);
    if (selected) {
      setBeanName(selected.name);
    }
  };

  const handleCreateBean = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBeanName.trim() || !newBeanRoastDate) {
      showToast("咖啡豆名稱與烘焙日期為必填項", "error");
      return;
    }
    try {
      const response = await fetch(getApiUrl("/api/inventory/beans"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBeanName,
          roaster: newBeanRoaster,
          roast_date: newBeanRoastDate,
          roast_level: newBeanRoastLevel,
          origin: newBeanOrigin,
          process: newBeanProcess,
          initial_weight: newBeanWeight ? parseFloat(newBeanWeight) : null
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast("📦 咖啡豆成功登記至庫存！", "success");
        setIsAddBeanModalOpen(false);
        setNewBeanName("");
        setNewBeanRoaster("");
        setNewBeanRoastDate("");
        setNewBeanOrigin("");
        setNewBeanProcess("");
        fetchData(brewType);
      } else {
        showToast(data.error || "登記失敗", "error");
      }
    } catch (err) {
      console.error("Register bean failed:", err);
      showToast("網路錯誤，登記失敗", "error");
    }
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
        bean_id: selectedBeanId || null,
        grind_size: grindSize || null,
        water_temp: waterTemp ? parseFloat(waterTemp) : null,
        coffee_weight: coffeeWeight ? parseFloat(coffeeWeight) : null,
        brew_time: seconds || null,
        rating: rating,
        notes: notes || null,
        brew_type: brewType,
        water_weight: !isEspresso && waterWeight ? parseFloat(waterWeight) : null,
        liquid_weight: isEspresso && liquidWeight ? parseFloat(liquidWeight) : null,
        preinfusion_time: isEspresso && preinfusionTime ? parseInt(preinfusionTime) : null,
        pressure: isEspresso && pressure ? parseFloat(pressure) : null,
        telemetry: telemetry.length > 0 ? telemetry : null
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

  const handleUpdateBrew = async (id: string, notes: string, rating: number, params: any) => {
    try {
      const response = await fetch(getApiUrl(`/api/brews/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, rating, ...params })
      });
      const data = await response.json();
      if (data.success) {
        showToast("📝 沖煮紀錄與參數已成功更新！", "success");
        fetchData(brewType);
      } else {
        showToast(data.error || "更新失敗", "error");
      }
    } catch (error) {
      console.error("Update brew failed:", error);
      showToast("網路錯誤，更新紀錄失敗", "error");
    }
  };

  const handleUpdateBean = async (id: string, updates: any) => {
    try {
      const response = await fetch(getApiUrl(`/api/inventory/beans/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        showToast("📦 咖啡豆資訊更新成功！", "success");
        fetchData(brewType);
      } else {
        showToast(data.error || "更新失敗", "error");
      }
    } catch (error) {
      console.error("Update bean failed:", error);
      showToast("網路錯誤，更新庫存失敗", "error");
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const ms = Math.floor((totalSeconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
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

  if (!isMounted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#0A0706] text-[#F5EFEB]">
        <Coffee className="w-12 h-12 animate-bounce text-[#c68642]" />
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-zinc-500">Initializing Workspace...</p>
      </div>
    );
  }

  return (
    <div 
      id="page-wrapper" 
      className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-4 md:p-8 gap-6 pb-24 lg:pb-8"
    >
      {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          className={`fixed top-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 transition-all duration-300 border ${
            toast.type === "success"
              ? "bg-[#130E0C] text-[#e0b034] border-[#c68642]/20 shadow-[#e0b034]/5"
              : "bg-[#251010] text-[#ff8080] border-[#5a1b1b]/30 shadow-red-950/20"
          }`}
        >
          <Coffee className="w-4 h-4 text-[#e0b034]" />
          <span className="text-xs font-bold uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header 
        id="main-header" 
        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 gap-4 pb-5 mb-0 ${
          isVisualFocus ? "hidden lg:flex" : "flex animate-fade-in"
        }`}
      >
        <div id="header-logo-section" className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#130E0C] border border-white/5 flex items-center justify-center shadow-lg">
            <Coffee className="w-5 h-5 text-[#e0b034] drop-shadow-[0_0_4px_rgba(224,176,52,0.4)]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-widest text-[#F5EFEB] font-outfit uppercase">
              COFFEE CRAFT
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">PRO BREW WORKSPACE</p>
          </div>
        </div>

        {/* Global Mode Switcher */}
        <div id="header-controls-section" className="flex items-center gap-3 w-full sm:w-auto">
          <div id="brew-type-switcher" className="flex bg-[#130E0C]/80 p-1 rounded-2xl border border-white/5 w-full sm:w-auto shadow-inner">
            <button
              id="btn-switch-espresso"
              onClick={() => setBrewType("espresso")}
              className={`flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                brewType === "espresso"
                  ? "bg-[#c68642] text-[#F5EFEB] shadow-md shadow-[#c68642]/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Gauge className="w-3.5 h-3.5" /> Espresso
            </button>
            <button
              id="btn-switch-pourover"
              onClick={() => setBrewType("pour_over")}
              className={`flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                brewType === "pour_over"
                  ? "bg-[#c68642] text-[#F5EFEB] shadow-md shadow-[#c68642]/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Coffee className="w-3.5 h-3.5" /> Pour Over
            </button>
          </div>

          <button
            id="btn-refresh-data"
            onClick={() => fetchData(brewType)}
            className="p-3 rounded-2xl border border-white/5 hover:border-[#c68642]/30 transition-all hover:bg-[#130E0C] cursor-pointer shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-[#c68642] ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Workspace Bento Grid */}
      <div id="main-bento-grid" className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
        
        {/* Left Column (Brewing Workspace) */}
        <section id="left-workspace-column" className={`lg:col-span-5 flex flex-col gap-6 ${mobileActiveTab === "timer" || mobileActiveTab === "inventory" ? "flex flex-1" : "hidden lg:flex"}`}>
          
          {/* Timer Card / Active Extraction Panel (Desktop View) */}
          <div id="desktop-timer-container" className="hidden lg:block w-full">
            {brewType === "espresso" ? (
              <EspressoDashboard
                connectedScaleName={connectedScaleName}
                scaleWeight={scaleWeight}
                isScaleConnecting={isScaleConnecting}
                handleConnectScale={handleConnectScale}
                handleDisconnectScale={handleDisconnectScale}
                espressoLayout={espressoLayout}
                setEspressoLayout={setEspressoLayout}
                espressoSubStage={espressoSubStage}
                seconds={seconds}
                pressure={pressure}
                liquidWeight={liquidWeight}
                preinfusionTime={preinfusionTime}
                telemetry={telemetry}
                historyLength={history.length}
                beanName={beanName}
                handleEspressoStart={handleEspressoStart}
                handleEspressoStop={handleEspressoStop}
                handleEspressoMarkPreinfusionEnd={handleEspressoMarkPreinfusionEnd}
                handleReset={handleReset}
                handleSaveBrew={handleSaveBrew}
                isSaving={isSaving}
                espressoPreinfusionSec={espressoPreinfusionSec}
              />
            ) : (
              <PourOverDashboard
                isTimerActive={isTimerActive}
                seconds={seconds}
                stageTimeLeft={stageTimeLeft}
                currentStageIndex={currentStageIndex}
                POUR_OVER_STAGES={POUR_OVER_STAGES}
                handleStartPausePourOver={handleStartPausePourOver}
                handleReset={handleReset}
                handleSaveBrew={handleSaveBrew}
                isSaving={isSaving}
                connectedScaleName={connectedScaleName}
                scaleWeight={scaleWeight}
                isScaleConnecting={isScaleConnecting}
                handleConnectScale={handleConnectScale}
                handleDisconnectScale={handleDisconnectScale}
                formatTime={formatTime}
              />
            )}
          </div>

          {/* Special Custom Dial & Sliders (Mobile View) */}
          <div id="mobile-timer-container" className={mobileActiveTab === "timer" ? "block lg:hidden w-full animate-fade-in" : "hidden"}>
            <MobileSpecialDashboard
              isVisualFocus={isVisualFocus}
              brewType={brewType}
              grindSize={grindSize}
              setGrindSize={setGrindSize}
              waterTemp={waterTemp}
              setWaterTemp={setWaterTemp}
              coffeeWeight={coffeeWeight}
              setCoffeeWeight={setCoffeeWeight}
              waterWeight={waterWeight}
              setWaterWeight={setWaterWeight}
              liquidWeight={liquidWeight}
              setLiquidWeight={setLiquidWeight}
              preinfusionTime={preinfusionTime}
              setPreinfusionTime={setPreinfusionTime}
              pressure={pressure}
              setPressure={setPressure}
              seconds={seconds}
              isTimerActive={isTimerActive}
              espressoSubStage={espressoSubStage}
              handleStartPausePourOver={handleStartPausePourOver}
              handleEspressoStart={handleEspressoStart}
              handleEspressoStop={handleEspressoStop}
              handleEspressoResume={handleEspressoResume}
              handleReset={handleReset}
              handleSaveBrew={handleSaveBrew}
              isSaving={isSaving}
              connectedScaleName={connectedScaleName}
              scaleWeight={scaleWeight}
              isScaleConnecting={isScaleConnecting}
              handleConnectScale={handleConnectScale}
              handleDisconnectScale={handleDisconnectScale}
              formatTime={formatTime}
            />
          </div>

          {/* Parameters Input Form */}
          <div 
            id="mobile-parameters-container" 
            className={
              mobileActiveTab === "timer" 
                ? (isVisualFocus ? "hidden lg:block w-full" : "flex flex-1 flex-col w-full animate-fade-in") 
                : "hidden lg:block w-full"
            }
          >
            <ParametersForm
              brewType={brewType}
              selectedBeanId={selectedBeanId}
              beanName={beanName}
              activeBeans={activeBeans}
              uniqueBeans={uniqueBeans}
              grindSize={grindSize}
              waterTemp={waterTemp}
              coffeeWeight={coffeeWeight}
              waterWeight={waterWeight}
              liquidWeight={liquidWeight}
              preinfusionTime={preinfusionTime}
              pressure={pressure}
              rating={rating}
              notes={notes}
              setIsAddBeanModalOpen={setIsAddBeanModalOpen}
              handleBeanChange={handleBeanChange}
              setBeanName={setBeanName}
              setSelectedBeanId={setSelectedBeanId}
              setGrindSize={setGrindSize}
              setWaterTemp={setWaterTemp}
              setCoffeeWeight={setCoffeeWeight}
              setWaterWeight={setWaterWeight}
              setLiquidWeight={setLiquidWeight}
              setPreinfusionTime={setPreinfusionTime}
              setPressure={setPressure}
              setRating={setRating}
              setNotes={setNotes}
              calcRatio={calcRatio}
            />
          </div>

          {/* Coffee Bean Inventory Card */}
          <div id="mobile-inventory-container" className={mobileActiveTab === "inventory" ? "flex flex-1 flex-col w-full animate-fade-in" : "hidden lg:block w-full"}>
            <CoffeeBeanInventory
              activeBeans={activeBeans}
              setIsAddBeanModalOpen={setIsAddBeanModalOpen}
              onUpdateBean={handleUpdateBean}
            />
          </div>
        </section>

        {/* Right Column (Reports, Stats & Charts) */}
        <main id="right-stats-column" className={`lg:col-span-7 flex flex-col gap-6 ${mobileActiveTab === "stats" || mobileActiveTab === "history" ? "flex flex-1" : "hidden lg:flex"}`}>
          
          {/* Quick Stats Grid & Charts */}
          <div id="stats-dashboard-container" className={mobileActiveTab === "stats" ? "flex flex-1 flex-col gap-6 w-full animate-fade-in" : "hidden lg:flex lg:flex-col lg:gap-6 lg:w-full"}>
            <div id="stats-overview-bento" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              
              <div id="stat-card-total-brews" className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 relative overflow-hidden">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Brews</span>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-2xl font-black text-[#e0b034] font-outfit">
                    {stats.summary.total_brews}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">shots</span>
                </div>
              </div>

              <div id="stat-card-beans-consumed" className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 relative overflow-hidden">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Beans Consumed</span>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-2xl font-black text-[#c68642] font-outfit">
                    {Math.round(stats.summary.total_brews * (stats.summary.avg_coffee_weight || (brewType === "espresso" ? 18 : 15)))}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">grams</span>
                </div>
              </div>

              <div id="stat-card-avg-pressure-temp" className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 relative overflow-hidden">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  {brewType === "espresso" ? "Avg Pressure" : "Avg Temp"}
                </span>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-2xl font-black text-[#F5EFEB] font-outfit">
                    {brewType === "espresso" ? (stats.summary.avg_pressure || 9.0) : (stats.summary.avg_water_temp || 92)}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">{brewType === "espresso" ? "bar" : "°C"}</span>
                </div>
              </div>

              <div id="stat-card-avg-time" className="glass-panel rounded-2xl p-4 flex flex-col justify-between border border-white/5 relative overflow-hidden">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Avg Time</span>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-2xl font-black text-[#e0b034] font-outfit">
                    {brewType === "espresso" ? `${stats.summary.avg_brew_time || 0}s` : formatTime(stats.summary.avg_brew_time || 0)}
                  </span>
                </div>
              </div>

            </div>

            {/* Charts Card */}
            <div id="charts-card-panel" className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xs font-black text-[#e0b034] uppercase tracking-widest font-outfit">
                    Brew Analytics Report
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Consistency and usage trends over time</p>
                </div>
              </div>

              {/* SVG Chart Render */}
              <BrewChart stats={stats} activeTab={activeTab} setActiveTab={setActiveTab} />
              
              {/* Bottom summary within charts */}
              <div id="charts-summary-footer" className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/5 text-center text-xs">
                <div>
                  <div className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Favorite Coffee Bean</div>
                  <div className="font-bold text-[#F5EFEB] truncate mt-1">
                    {stats.summary.favorite_bean}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">
                    {brewType === "espresso" ? "Avg Liquid Yield" : "Avg Dry Dose"}
                  </div>
                  <div className="font-bold text-[#F5EFEB] mt-1">
                    {brewType === "espresso" ? (stats.summary.avg_liquid_weight || 0) : (stats.summary.avg_coffee_weight || 0)} g
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Satisfaction</div>
                  <div className="font-bold text-[#e0b034] flex items-center justify-center gap-1 mt-1 font-outfit">
                    {stats.summary.avg_rating || 0} <Star className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History Log Container */}
          <div id="mobile-history-container" className={mobileActiveTab === "history" ? "flex flex-1 flex-col w-full animate-fade-in" : "hidden lg:block w-full"}>
            <BrewHistory 
              history={history} 
              brewType={brewType} 
              onDeleteBrew={handleDeleteBrew} 
              onUpdateBrew={handleUpdateBrew} 
            />
          </div>
        </main>
        
      </div>

      {/* Mobile Bottom Navbar (Visible only on mobile) */}
      <div className={isVisualFocus ? "hidden" : "animate-fade-in"}>
        <MobileBottomNavbar
          mobileActiveTab={mobileActiveTab}
          setMobileActiveTab={setMobileActiveTab}
        />
      </div>

      {/* Add Coffee Bean Modal */}
      {isAddBeanModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#130E0C] border border-white/5 rounded-3xl p-6 md:p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-base font-black text-[#e0b034] uppercase tracking-widest mb-6 flex items-center gap-2.5 font-outfit">
              <Database className="w-5 h-5 text-[#c68642]" /> Register Coffee Beans
            </h3>
            
            <form onSubmit={handleCreateBean} className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Bean Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ethiopia Yirgacheffe Aricha"
                  value={newBeanName}
                  onChange={(e) => setNewBeanName(e.target.value)}
                  className="w-full bg-[#0A0706] border border-[#c68642]/20 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Roaster</label>
                  <input
                    type="text"
                    placeholder="e.g. Onyx Lab"
                    value={newBeanRoaster}
                    onChange={(e) => setNewBeanRoaster(e.target.value)}
                    className="w-full bg-[#0A0706] border border-[#c68642]/20 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Roast Date *</label>
                  <input
                    type="date"
                    required
                    value={newBeanRoastDate}
                    onChange={(e) => setNewBeanRoastDate(e.target.value)}
                    className="w-full bg-[#0A0706] border border-[#c68642]/20 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Roast Level</label>
                  <select
                    value={newBeanRoastLevel}
                    onChange={(e) => setNewBeanRoastLevel(e.target.value as "light" | "medium" | "dark")}
                    className="w-full bg-[#0A0706] border border-[#c68642]/20 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] transition-all font-medium cursor-pointer"
                  >
                    <option value="light">Light Roast</option>
                    <option value="medium">Medium Roast</option>
                    <option value="dark">Dark Roast</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Package Weight (g)</label>
                  <input
                    type="number"
                    placeholder="250"
                    value={newBeanWeight}
                    onChange={(e) => setNewBeanWeight(e.target.value)}
                    className="w-full bg-[#0A0706] border border-[#c68642]/20 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Origin</label>
                  <input
                    type="text"
                    placeholder="e.g. Ethiopia"
                    value={newBeanOrigin}
                    onChange={(e) => setNewBeanOrigin(e.target.value)}
                    className="w-full bg-[#0A0706] border border-[#c68642]/20 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">Process</label>
                  <input
                    type="text"
                    placeholder="e.g. Natural"
                    value={newBeanProcess}
                    onChange={(e) => setNewBeanProcess(e.target.value)}
                    className="w-full bg-[#0A0706] border border-[#c68642]/20 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddBeanModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-xl hover:bg-zinc-950 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-[#c68642] text-[#F5EFEB] hover:bg-[#b07536] rounded-xl cursor-pointer transition-all shadow-md shadow-[#c68642]/10"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Global Transition Mask Overlay */}
      <div 
        className={`fixed inset-0 bg-[#0A0706] z-[9999] pointer-events-none transition-opacity duration-150 ${
          transitionState === "fading-in-enter" || transitionState === "fading-in-exit"
            ? "opacity-100"
            : "opacity-0"
        }`}
      />
    </div>
  );
}
