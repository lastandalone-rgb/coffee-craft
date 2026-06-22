import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Check, Bluetooth, Layers, Coffee } from "lucide-react";

interface MobileSpecialDashboardProps {
  brewType: "pour_over" | "espresso";
  grindSize: string;
  setGrindSize: (val: string) => void;
  waterTemp: string;
  setWaterTemp: (val: string) => void;
  coffeeWeight: string;
  setCoffeeWeight: (val: string) => void;
  waterWeight: string;
  setWaterWeight: (val: string) => void;
  liquidWeight: string;
  setLiquidWeight: (val: string) => void;
  preinfusionTime: string;
  setPreinfusionTime: (val: string) => void;
  pressure: string;
  setPressure: (val: string) => void;
  
  // Timer control props
  seconds: number;
  isTimerActive: boolean;
  espressoSubStage: "idle" | "timing" | "done";
  handleStartPausePourOver: () => void;
  handleEspressoStart: () => void;
  handleEspressoStop: () => void;
  handleEspressoResume: () => void;
  handleReset: () => void;
  handleSaveBrew: () => void;
  isSaving: boolean;
  
  isVisualFocus: boolean;
  
  // Scale props
  connectedScaleName: string | null;
  scaleWeight: number;
  isScaleConnecting: boolean;
  handleConnectScale: (simulated: boolean) => void;
  handleDisconnectScale: () => void;
  formatTime: (totalSeconds: number) => string;
}

export const MobileSpecialDashboard: React.FC<MobileSpecialDashboardProps> = ({
  brewType,
  grindSize,
  setGrindSize,
  waterTemp,
  setWaterTemp,
  coffeeWeight,
  setCoffeeWeight,
  waterWeight,
  setWaterWeight,
  liquidWeight,
  setLiquidWeight,
  preinfusionTime,
  setPreinfusionTime,
  pressure,
  setPressure,
  seconds,
  isTimerActive,
  espressoSubStage,
  handleStartPausePourOver,
  handleEspressoStart,
  handleEspressoStop,
  handleEspressoResume,
  handleReset,
  handleSaveBrew,
  isSaving,
  isVisualFocus,
  connectedScaleName,
  scaleWeight,
  isScaleConnecting,
  handleConnectScale,
  handleDisconnectScale,
  formatTime
}) => {
  const [layoutMode, setLayoutMode] = useState<"option_1" | "option_4">("option_1");
  const [alertStyle, setAlertStyle] = useState<"color_shift" | "tick_extend" | "heartbeat" | "collision" | "drainage">("color_shift");
  const isEspresso = brewType === "espresso";

  // Restore states from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLayout = localStorage.getItem("coffee_timer_layout_mode");
      if (savedLayout === "option_1" || savedLayout === "option_4") {
        setLayoutMode(savedLayout);
      }
      const savedAlert = localStorage.getItem("coffee_timer_alert_style");
      if (
        savedAlert === "color_shift" ||
        savedAlert === "tick_extend" ||
        savedAlert === "heartbeat" ||
        savedAlert === "collision" ||
        savedAlert === "drainage"
      ) {
        setAlertStyle(savedAlert);
      }
    }
  }, []);

  const handleLayoutModeChange = (mode: "option_1" | "option_4") => {
    setLayoutMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("coffee_timer_layout_mode", mode);
    }
  };

  const handleAlertStyleChange = (style: "color_shift" | "tick_extend" | "heartbeat" | "collision" | "drainage") => {
    setAlertStyle(style);
    if (typeof window !== "undefined") {
      localStorage.setItem("coffee_timer_alert_style", style);
    }
  };

  const doseNum = parseFloat(coffeeWeight) || 18.0;
  const tempNum = parseFloat(waterTemp) || 92;
  const grindNum = parseFloat(grindSize) || (brewType === "espresso" ? 3.5 : 24);
  const targetWeight = brewType === "espresso" ? (parseFloat(liquidWeight) || 36.0) : (parseFloat(waterWeight) || 225);

  const minDose = 10, maxDose = 25;
  const minTemp = 80, maxTemp = 100;
  const minGrind = brewType === "espresso" ? 1.0 : 10;
  const maxGrind = brewType === "espresso" ? 10.0 : 40;
  const minWeight = brewType === "espresso" ? 15 : 100;
  const maxWeight = brewType === "espresso" ? 80 : 500;

  const handleTempIncrement = () => {
    const newVal = Math.min(maxTemp, tempNum + 1);
    setWaterTemp(newVal.toString());
  };

  const handleTempDecrement = () => {
    const newVal = Math.max(minTemp, tempNum - 1);
    setWaterTemp(newVal.toString());
  };

  const handleWeightIncrement = () => {
    const step = brewType === "espresso" ? 0.5 : 5;
    const currentVal = targetWeight;
    const newVal = Math.min(maxWeight, currentVal + step);
    const formatted = newVal.toFixed(brewType === "espresso" ? 1 : 0);
    if (brewType === "espresso") {
      setLiquidWeight(formatted);
    } else {
      setWaterWeight(formatted);
    }
  };

  const handleWeightDecrement = () => {
    const step = brewType === "espresso" ? 0.5 : 5;
    const currentVal = targetWeight;
    const newVal = Math.max(minWeight, currentVal - step);
    const formatted = newVal.toFixed(brewType === "espresso" ? 1 : 0);
    if (brewType === "espresso") {
      setLiquidWeight(formatted);
    } else {
      setWaterWeight(formatted);
    }
  };

  const svgRef = useRef<SVGSVGElement | null>(null);

  const calculateAngleValue = (clientX: number, clientY: number, min: number, max: number, step: number) => {
    if (!svgRef.current) return min;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
    let angleDeg = angleRad * (180 / Math.PI);
    
    let angle = angleDeg + 90;
    if (angle < 0) angle += 360;
    
    const percent = Math.min(1, Math.max(0, angle / 360));
    const rawVal = min + percent * (max - min);
    return Math.round(rawVal / step) * step;
  };

  const handleSvgInteraction = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>, type: "grind" | "temp" | "weight") => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    let min = minGrind, max = maxGrind, step = brewType === "espresso" ? 0.1 : 1;
    let setter = setGrindSize;

    if (type === "temp") {
      min = minTemp; max = maxTemp; step = 1;
      setter = setWaterTemp;
    } else if (type === "weight") {
      min = minWeight; max = maxWeight; step = brewType === "espresso" ? 0.5 : 5;
      setter = brewType === "espresso" ? setLiquidWeight : setWaterWeight;
    }

    const val = calculateAngleValue(clientX, clientY, min, max, step);
    setter(val.toFixed(step % 1 === 0 ? 0 : 1));
  };

  const getCoordinatesForValue = (radius: number, currentVal: number, min: number, max: number) => {
    const percentage = Math.min(1, Math.max(0, (currentVal - min) / (max - min)));
    const angle = percentage * 360;
    const angleRad = ((angle - 90) * Math.PI) / 180;
    return {
      x: 140 + radius * Math.cos(angleRad),
      y: 140 + radius * Math.sin(angleRad)
    };
  };

  const getArcPath = (radius: number, currentVal: number, min: number, max: number) => {
    const percentage = Math.min(1, Math.max(0, (currentVal - min) / (max - min)));
    const angle = percentage * 359.99;
    const startAngle = -90;
    const endAngle = startAngle + angle;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = 140 + radius * Math.cos(startRad);
    const y1 = 140 + radius * Math.sin(startRad);
    const x2 = 140 + radius * Math.cos(endRad);
    const y2 = 140 + radius * Math.sin(endRad);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  // Coordinates for Knobs (Option 4)
  const grindKnob = getCoordinatesForValue(115, grindNum, minGrind, maxGrind);
  const tempKnob = getCoordinatesForValue(90, tempNum, minTemp, maxTemp);
  const weightKnob = getCoordinatesForValue(65, targetWeight, minWeight, maxWeight);

  // Generate Ticking dial marks for Option 1
  const renderDialTicks = () => {
    const ticks = [];
    const size = 200;
    const center = size / 2;
    const outerRadius = center - 14;
    const currentSecondSweep = seconds % 60;
    
    for (let i = 0; i < 60; i++) {
      // 0 represents 12 o'clock, rotating clockwise
      const angle = (i * 6 * Math.PI) / 180 - Math.PI / 2;
      const isMajor = i % 5 === 0;
      
      // Default geometries
      let r1 = outerRadius;
      let tickLength = isMajor ? 10 : 5;
      
      // 1. Style 2: "tick_extend"
      if (isEspresso && alertStyle === "tick_extend" && seconds >= 20 && i >= 20 && i <= 25) {
        r1 += 6; // extend outward by 6px
        tickLength = isMajor ? 14 : 9; // grow longer
      }
      
      let r2 = r1 - tickLength;
      const x1 = center + r1 * Math.cos(angle);
      const y1 = center + r1 * Math.sin(angle);
      const x2 = center + r2 * Math.cos(angle);
      const y2 = center + r2 * Math.sin(angle);
      
      // Standard highlight logic
      const isHighlighted = seconds > 0 && i <= currentSecondSweep;
      
      // 2. Style 5: "drainage"
      let isExtinguished = false;
      if (isEspresso && alertStyle === "drainage" && seconds >= 22 && i >= 22 && i <= 25 && i <= currentSecondSweep) {
        isExtinguished = true;
      }
      
      // 3. Style 4: "collision"
      let isReverseHighlighted = false;
      if (isEspresso && alertStyle === "collision" && seconds >= 15 && seconds < 25) {
        const reverseThreshold = Math.round(25 - (seconds - 15));
        if (i >= reverseThreshold && i <= 25) {
          isReverseHighlighted = true;
        }
      }
      
      // Pre-mark target 25s tick in collision style
      const isTargetMark = isEspresso && alertStyle === "collision" && i === 25;
      
      // Calculate stroke color
      let strokeColor = "rgba(255, 255, 255, 0.25)"; // default minor tick
      if (isMajor) {
        strokeColor = "rgba(224, 176, 52, 0.75)"; // default major tick
      }
      
      let strokeWidth = isMajor ? 1.5 : 1;
      
      // Apply alert states
      if (isExtinguished) {
        strokeColor = "rgba(255, 255, 255, 0.03)";
      } else if (isTargetMark) {
        strokeColor = "#ffffff";
        strokeWidth = 3;
      } else if (isReverseHighlighted) {
        strokeColor = "#ff4500"; // bright orangered for reverse sweep
        strokeWidth = isMajor ? 2.5 : 1.5;
      } else if (isHighlighted) {
        strokeColor = isMajor ? "#e0b034" : "#c68642";
        strokeWidth = isMajor ? 2.5 : 1.5;
        
        // 4. Style 1: "color_shift"
        if (isEspresso && alertStyle === "color_shift" && seconds >= 22 && i >= 22 && i <= 25) {
          const isFlashing = seconds >= 25;
          const flashOn = !isFlashing || (Math.floor(seconds * 10) % 2 === 0);
          strokeColor = flashOn ? "#ff3b30" : "rgba(255, 59, 48, 0.15)";
        }
      }
      
      // Inline styles for filter glows
      let filterStyle = undefined;
      if (isTargetMark) {
        filterStyle = "drop-shadow(0 0 5px #ffffff)";
      } else if (isReverseHighlighted) {
        filterStyle = "drop-shadow(0 0 3px rgba(255, 69, 0, 0.95))";
      } else if (isHighlighted && !isExtinguished) {
        if (isEspresso && alertStyle === "color_shift" && seconds >= 22 && i >= 22 && i <= 25) {
          filterStyle = "drop-shadow(0 0 4.5px rgba(255, 59, 48, 0.95))";
        } else {
          filterStyle = isMajor
            ? "drop-shadow(0 0 4px rgba(224, 176, 52, 0.95))"
            : "drop-shadow(0 0 2.5px rgba(198, 134, 66, 0.85))";
        }
      }

      ticks.push(
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{
            filter: filterStyle
          }}
          className="transition-colors duration-200"
        />
      );
    }
    return ticks;
  };

  const isTimerRunning = isVisualFocus;
  const isTimerRunningReal = brewType === "espresso" ? espressoSubStage === "timing" : isTimerActive;
  const isTimerPaused = brewType === "espresso" ? espressoSubStage === "done" : (seconds > 0 && !isTimerActive);
  const isTimerIdle = brewType === "espresso" ? espressoSubStage === "idle" : (seconds === 0 && !isTimerActive);

  const displayWeight = connectedScaleName 
    ? scaleWeight 
    : (() => {
        if (seconds === 0) return 0;
        const targetY = parseFloat(brewType === "espresso" ? liquidWeight.toString() : waterWeight.toString()) || 36;
        const duration = brewType === "espresso" ? 30 : 180;
        return Math.min(targetY, (seconds / duration) * targetY);
      })();

  const handleDialClick = () => {
    if (isTimerRunningReal) {
      if (brewType === "espresso") {
        handleEspressoStop();
      } else {
        handleStartPausePourOver();
      }
    } else {
      if (brewType === "espresso") {
        if (isTimerPaused) {
          handleEspressoResume();
        } else {
          handleEspressoStart();
        }
      } else {
        handleStartPausePourOver();
      }
    }
  };

  return (
    <div 
      id="mobile-special-dashboard-panel" 
      key={isTimerRunning ? "running" : "idle"}
      className={`glass-panel flex flex-col items-center w-full animate-fade-in ${
        isTimerRunning 
          ? "fixed inset-0 z-50 bg-[#0A0706] p-6 justify-center rounded-none border-0 shadow-none" 
          : "rounded-3xl p-6 border border-white/5 shadow-2xl relative"
      }`}
    >
      {/* Switcher Header */}
      {!isTimerRunning && (
        <div 
          id="mobile-special-header" 
          className="w-full flex flex-col gap-3.5 border-b border-white/5 mb-6 pb-4"
        >
          <div className="w-full flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#e0b034]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 font-outfit">手機版型配置 / MOBILE LAYOUT</span>
            </div>
            <div id="mobile-layout-mode-switcher" className="flex bg-[#0A0706] p-1 rounded-xl border border-white/5 shadow-inner">
              <button
                id="btn-layout-option-1"
                onClick={() => handleLayoutModeChange("option_1")}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  layoutMode === "option_1" ? "bg-[#c68642] text-[#F5EFEB]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                版型 1 (對稱)
              </button>
              <button
                id="btn-layout-option-4"
                onClick={() => handleLayoutModeChange("option_4")}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  layoutMode === "option_4" ? "bg-[#c68642] text-[#F5EFEB]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                版型 4 (圓弧)
              </button>
            </div>
          </div>

          {/* 25s Espresso Alert Settings Row */}
          {layoutMode === "option_1" && brewType === "espresso" && (
            <div className="w-full flex flex-col gap-2 pt-3.5 border-t border-white/5 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500">25秒最佳萃取提示樣式 / 25S TARGET ALERT</span>
                <span className="text-[9px] font-black text-[#e0b034] uppercase font-mono bg-[#e0b034]/10 px-1.5 py-0.5 rounded border border-[#e0b034]/20">
                  {alertStyle === "color_shift" && "黃金區間變色"}
                  {alertStyle === "tick_extend" && "琴鍵波浪伸展"}
                  {alertStyle === "heartbeat" && "臨界心跳震動"}
                  {alertStyle === "collision" && "雙向對撞閃光"}
                  {alertStyle === "drainage" && "流沙漸進熄滅"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 bg-[#0A0706] p-1 rounded-xl border border-white/5">
                {[
                  { id: "color_shift", label: "變色" },
                  { id: "tick_extend", label: "伸展" },
                  { id: "heartbeat", label: "心跳" },
                  { id: "collision", label: "對撞" },
                  { id: "drainage", label: "流沙" }
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleAlertStyleChange(style.id as any)}
                    className={`py-1.5 text-[9px] font-black rounded-lg transition-all cursor-pointer text-center active:scale-95 ${
                      alertStyle === style.id 
                        ? "bg-[#c68642] text-[#F5EFEB] shadow-md shadow-[#c68642]/10" 
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-[#130E0C]/40"
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bluetooth scale wrapper */}
      {!isTimerRunning && (
        <div 
          id="mobile-scale-connection-bar" 
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#0A0706]/90 border border-[#c68642]/10 shadow-inner mb-6"
        >
          <div className="flex items-center gap-2">
            <Bluetooth className={`w-4 h-4 ${connectedScaleName ? "text-[#e0b034] drop-shadow-[0_0_4px_rgba(224,176,52,0.6)]" : "text-zinc-600"}`} />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              {connectedScaleName ? `已連線: ${connectedScaleName}` : "藍牙電子秤未連線"}
            </span>
          </div>
          <div className="flex gap-2">
            {!connectedScaleName ? (
              <button
                id="btn-connect-scale-mobile"
                onClick={() => handleConnectScale(true)}
                className="text-[9px] font-black bg-[#1C1512] hover:bg-[#c68642]/20 text-[#e0b034] px-2.5 py-1.5 rounded-lg border border-[#c68642]/25 cursor-pointer uppercase tracking-wider transition-all"
              >
                模擬連接
              </button>
            ) : (
              <button
                id="btn-disconnect-scale-mobile"
                onClick={handleDisconnectScale}
                className="text-[9px] font-black bg-red-950/20 hover:bg-red-950/40 text-red-400 px-2.5 py-1.5 rounded-lg border border-red-500/20 cursor-pointer uppercase tracking-wider transition-all"
              >
                斷開
              </button>
            )}
          </div>
        </div>
      )}
      {/* LAYOUT 1: Symmetric Dial + Left/Right vertical sliders */}
      {layoutMode === "option_1" && (
        <div id="layout-mobile-option-1" className="w-full flex flex-col items-center gap-6">
          <div id="mobile-option-1-controls-row" className="w-full flex items-center justify-between gap-4 mt-2">
            
            {/* Left Vertical Sliders (Temp) */}
            {!isTimerRunning && (
              <div 
                id="mobile-option-1-left-slider-card" 
                className="flex flex-col items-center gap-2 w-[60px] bg-[#0E0A09] py-3 px-2 rounded-2xl border border-[#c68642]/10 shadow-inner select-none"
              >
                <span id="mobile-option-1-temp-label" className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Temp</span>
                <span id="mobile-option-1-temp-value" className="text-[13px] font-black text-[#e0b034] font-outfit">{waterTemp}°</span>
                
                <button
                  id="btn-temp-increment-mobile"
                  type="button"
                  onClick={handleTempIncrement}
                  className="w-6 h-6 rounded bg-[#1C1512] hover:bg-[#c68642]/20 border border-[#c68642]/10 hover:border-[#c68642]/30 text-zinc-400 hover:text-[#e0b034] flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer text-xs"
                >
                  +
                </button>

                <div id="mobile-option-1-temp-slider-container" className="h-[75px] relative flex items-center justify-center">
                  <input
                    id="mobile-option-1-temp-range"
                    type="range"
                    min={minTemp}
                    max={maxTemp}
                    step={1}
                    value={tempNum}
                    onChange={(e) => setWaterTemp(e.target.value)}
                    style={{ WebkitAppearance: "slider-vertical", width: "12px", height: "100%" }}
                    className="accent-[#e0b034] bg-zinc-950 rounded-lg cursor-pointer"
                  />
                </div>

                <button
                  id="btn-temp-decrement-mobile"
                  type="button"
                  onClick={handleTempDecrement}
                  className="w-6 h-6 rounded bg-[#1C1512] hover:bg-[#c68642]/20 border border-[#c68642]/10 hover:border-[#c68642]/30 text-zinc-400 hover:text-[#e0b034] flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer text-xs"
                >
                  -
                </button>

                <span id="mobile-option-1-dose-info" className="text-[8px] text-zinc-600 font-bold mt-1">Dose: {coffeeWeight}g</span>
              </div>
            )}

            <div 
              id="mobile-option-1-dial-container" 
              className="flex-1 flex flex-col items-center justify-center relative"
              style={{
                transform: isTimerRunning ? "scale(1.5)" : "scale(1)"
              }}
            >
              {/* Ripple Rings */}
              {isTimerRunning ? (
                <>
                  <div 
                    className="absolute w-[200px] h-[200px] rounded-full pointer-events-none dial-ripple-active-1 z-0" 
                    style={
                      isEspresso && alertStyle === "heartbeat" && seconds >= 22 && seconds < 25
                        ? {
                            animationDuration: "0.7s",
                            borderColor: "rgba(239, 68, 68, 0.75)",
                            boxShadow: "0 0 35px rgba(239, 68, 68, 0.4)",
                          }
                        : isEspresso && alertStyle === "collision" && seconds >= 15 && seconds < 25
                        ? {
                            borderColor: "rgba(255, 69, 0, 0.7)",
                            boxShadow: "0 0 35px rgba(255, 69, 0, 0.35)",
                          }
                        : undefined
                    }
                  />
                  <div 
                    className="absolute w-[200px] h-[200px] rounded-full pointer-events-none dial-ripple-active-2 z-0" 
                    style={
                      isEspresso && alertStyle === "heartbeat" && seconds >= 22 && seconds < 25
                        ? {
                            animationDuration: "0.7s",
                            animationDelay: "0.35s",
                            borderColor: "rgba(239, 68, 68, 0.55)",
                            boxShadow: "0 0 25px rgba(239, 68, 68, 0.25)",
                          }
                        : isEspresso && alertStyle === "collision" && seconds >= 15 && seconds < 25
                        ? {
                            borderColor: "rgba(255, 255, 255, 0.6)",
                            boxShadow: "0 0 25px rgba(255, 255, 255, 0.25)",
                          }
                        : undefined
                    }
                  />
                </>
              ) : (
                <div className="absolute w-[200px] h-[200px] rounded-full pointer-events-none dial-ripple-idle z-0" />
              )}

              <div 
                id="mobile-option-1-dial-circle" 
                onClick={handleDialClick}
                className={`w-[200px] h-[200px] rounded-full bg-[#130E0C] border-2 flex flex-col items-center justify-center relative z-10 transition-all duration-500 cursor-pointer active:scale-95 ${
                  isTimerRunning ? "dial-glow-active" : "dial-glow-idle"
                } ${isEspresso && alertStyle === "heartbeat" && seconds >= 22 && seconds < 25 ? "animate-vibrate" : ""}`}
              >
                {/* Glass reflections & Ring glow */}
                <div id="mobile-option-1-dial-glow" className="absolute inset-3.5 rounded-full bg-[#0A0706] border border-white/5 flex flex-col items-center justify-center z-10">
                  <Coffee className={`w-6 h-6 mb-1 transition-all ${isTimerRunning ? "text-[#e0b034] animate-bounce" : "text-[#c68642]/40"}`} />
                  <span 
                    id="mobile-option-1-dial-time" 
                    className="text-[25px] font-bold text-[#F5EFEB] font-mono tracking-tight tabular-nums inline-block"
                    style={{
                      transform: isEspresso && alertStyle === "drainage" && seconds >= 25 && seconds < 27 
                        ? "scale(1.25)" 
                        : "scale(1)",
                      transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                    }}
                  >
                    {formatTime(seconds)}
                  </span>
                  <span id="mobile-option-1-dial-weight" className="text-[11px] font-black text-[#e0b034] mt-0.5">
                    {displayWeight.toFixed(1)}g
                  </span>
                  <span 
                    id="mobile-option-1-dial-status" 
                    className={`text-[8px] font-black uppercase tracking-widest mt-1 ${
                      isTimerRunning ? "text-[#e0b034] animate-pulse" : "text-zinc-500"
                    }`}
                  >
                    {isTimerRunning ? (brewType === "espresso" ? "Extracting" : "Brewing") : isTimerPaused ? "Paused" : "Ready"}
                  </span>
                </div>

                {/* Gauge Ticking Marks on top (z-20) */}
                <svg id="mobile-option-1-dial-ticks" width="200" height="200" className="absolute top-0 left-0 z-20 pointer-events-none">
                  {renderDialTicks()}
                </svg>

                {/* Collision flash overlay */}
                {isEspresso && alertStyle === "collision" && seconds >= 25 && (
                  <div 
                    className="absolute inset-0 rounded-full bg-white pointer-events-none z-30"
                    style={{ opacity: Math.max(0, 1 - (seconds - 25) * 1.5), transition: "opacity 0.1s ease-out" }}
                  />
                )}
              </div>
            </div>

            {/* Right Vertical Sliders (Water Weight) */}
            {!isTimerRunning && (
              <div 
                id="mobile-option-1-right-slider-card" 
                className="flex flex-col items-center gap-2 w-[60px] bg-[#0E0A09] py-3 px-2 rounded-2xl border border-[#c68642]/10 shadow-inner select-none"
              >
                <span id="mobile-option-1-water-label" className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{brewType === "espresso" ? "Yield" : "Water"}</span>
                <span id="mobile-option-1-water-value" className="text-[13px] font-black text-[#e0b034] font-outfit">{targetWeight}g</span>
                
                <button
                  id="btn-weight-increment-mobile"
                  type="button"
                  onClick={handleWeightIncrement}
                  className="w-6 h-6 rounded bg-[#1C1512] hover:bg-[#c68642]/20 border border-[#c68642]/10 hover:border-[#c68642]/30 text-zinc-400 hover:text-[#e0b034] flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer text-xs"
                >
                  +
                </button>

                <div id="mobile-option-1-water-slider-container" className="h-[75px] relative flex items-center justify-center">
                  <input
                    id="mobile-option-1-water-range"
                    type="range"
                    min={minWeight}
                    max={maxWeight}
                    step={brewType === "espresso" ? 0.5 : 5}
                    value={targetWeight}
                    onChange={(e) => brewType === "espresso" ? setLiquidWeight(e.target.value) : setWaterWeight(e.target.value)}
                    style={{ WebkitAppearance: "slider-vertical", width: "12px", height: "100%" }}
                    className="accent-[#e0b034] bg-zinc-950 rounded-lg cursor-pointer"
                  />
                </div>

                <button
                  id="btn-weight-decrement-mobile"
                  type="button"
                  onClick={handleWeightDecrement}
                  className="w-6 h-6 rounded bg-[#1C1512] hover:bg-[#c68642]/20 border border-[#c68642]/10 hover:border-[#c68642]/30 text-zinc-400 hover:text-[#e0b034] flex items-center justify-center font-bold active:scale-90 transition-all cursor-pointer text-xs"
                >
                  -
                </button>

                <span id="mobile-option-1-grind-info" className="text-[8px] text-zinc-600 font-bold mt-1">Grind: {grindSize}</span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* LAYOUT 4: Concentric Interactive Arcs */}
      {layoutMode === "option_4" && (
        <div id="layout-mobile-option-4" className="w-full flex flex-col items-center">
          <div className="relative w-[280px] h-[280px] select-none my-2">
            
            {/* Concentric SVG Circle Tracks */}
            <svg
              ref={svgRef}
              width="280"
              height="280"
              className="absolute top-0 left-0"
              onTouchMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const dist = Math.sqrt(Math.pow(touchX - centerX, 2) + Math.pow(touchY - centerY, 2));
                
                if (dist > 105) {
                  handleSvgInteraction(e, "grind");
                } else if (dist > 80) {
                  handleSvgInteraction(e, "temp");
                } else {
                  handleSvgInteraction(e, "weight");
                }
              }}
              onMouseMove={(e) => {
                if (e.buttons !== 1) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const dist = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));
                
                if (dist > 105) {
                  handleSvgInteraction(e, "grind");
                } else if (dist > 80) {
                  handleSvgInteraction(e, "temp");
                } else {
                  handleSvgInteraction(e, "weight");
                }
              }}
            >
              <defs>
                <radialGradient id="espressoGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(198,134,66,0.15)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>
              </defs>

              <circle cx="140" cy="140" r="130" fill="url(#espressoGlow)" />

              {/* Outer Track (Grind size) */}
              <circle cx="140" cy="140" r="115" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" strokeDasharray="3,3" />
              <path
                d={getArcPath(115, grindNum, minGrind, maxGrind)}
                stroke="#c68642"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              {/* Gold Diamond Pointer handle for Grind */}
              <polygon
                points={`${grindKnob.x},${grindKnob.y - 5} ${grindKnob.x + 5},${grindKnob.y} ${grindKnob.x},${grindKnob.y + 5} ${grindKnob.x - 5},${grindKnob.y}`}
                fill="#e0b034"
                stroke="#F5EFEB"
                strokeWidth="1"
              />

              {/* Middle Track (Temp) */}
              <circle cx="140" cy="140" r="90" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" strokeDasharray="3,3" />
              <path
                d={getArcPath(90, tempNum, minTemp, maxTemp)}
                stroke="#e0b034"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              {/* Gold Diamond Pointer handle for Temp */}
              <polygon
                points={`${tempKnob.x},${tempKnob.y - 5} ${tempKnob.x + 5},${tempKnob.y} ${tempKnob.x},${tempKnob.y + 5} ${tempKnob.x - 5},${tempKnob.y}`}
                fill="#e0b034"
                stroke="#F5EFEB"
                strokeWidth="1"
              />

              {/* Inner Track (Weight) */}
              <circle cx="140" cy="140" r="65" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" strokeDasharray="3,3" />
              <path
                d={getArcPath(65, targetWeight, minWeight, maxWeight)}
                stroke="#F5EFEB"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              {/* Gold Diamond Pointer handle for Target Weight */}
              <polygon
                points={`${weightKnob.x},${weightKnob.y - 5} ${weightKnob.x + 5},${weightKnob.y} ${weightKnob.x},${weightKnob.y + 5} ${weightKnob.x - 5},${weightKnob.y}`}
                fill="#e0b034"
                stroke="#F5EFEB"
                strokeWidth="1"
              />
            </svg>

            {/* Text Overlay for Center Dial */}
            <div className="absolute top-[85px] left-[85px] w-[110px] h-[110px] rounded-full bg-[#0A0706] border border-white/5 shadow-2xl flex flex-col items-center justify-center text-center">
              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Time</span>
              <span className="text-[21px] font-bold text-[#F5EFEB] font-mono tracking-tight tabular-nums">{formatTime(seconds)}</span>
              <span className="text-[9px] font-black text-[#e0b034] mt-0.5">{displayWeight.toFixed(1)}g</span>
            </div>

          </div>

          {/* Quick concentric parameter list */}
          {!isTimerRunning && (
            <div className="w-full grid grid-cols-3 gap-2 mt-2 bg-[#0A0706]/40 p-3 rounded-2xl border border-white/5 text-center">
              <div className="flex flex-col">
                <span className="text-[8px] text-[#c68642] font-black uppercase tracking-wider">● Grind</span>
                <span className="text-xs font-bold text-[#F5EFEB]">{brewType === "espresso" ? `${grindSize}` : `${grindSize}格`}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-[#e0b034] font-black uppercase tracking-wider">● Temp</span>
                <span className="text-xs font-bold text-[#F5EFEB]">{waterTemp}°C</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] text-[#F5EFEB] font-black uppercase tracking-wider">● Target</span>
                <span className="text-xs font-bold text-[#F5EFEB]">{targetWeight}g</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons (Play, Reset, Save) */}
      {!isTimerRunning && (
        <div 
          id="mobile-special-controls-wrapper" 
          className="w-full flex justify-between items-center gap-4 mt-6"
        >
          {/* Reset button - only visible when paused */}
          {isTimerPaused && (
            <button
              id="btn-reset-mobile"
              onClick={handleReset}
              className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-[#130E0C] hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl border border-white/5 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer h-[44px] animate-fade-in"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 重設
            </button>
          )}

          {/* Main action button (Start, Stop, Resume) */}
          {brewType === "espresso" ? (
            isTimerIdle ? (
              <button
                id="btn-espresso-start-mobile"
                onClick={handleEspressoStart}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-[#c68642] hover:bg-[#b07536] text-[#F5EFEB] rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer h-[44px] shadow-lg shadow-[#c68642]/10"
              >
                <Play className="w-3.5 h-3.5 fill-[#F5EFEB]" /> 開始萃取
              </button>
            ) : isTimerRunning ? (
              <button
                id="btn-espresso-stop-mobile"
                onClick={handleEspressoStop}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl border border-red-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer h-[44px]"
              >
                <Pause className="w-3.5 h-3.5 fill-red-400" /> 停止
              </button>
            ) : (
              <button
                id="btn-espresso-resume-mobile"
                onClick={handleEspressoResume}
                className="flex-2 py-3 text-xs font-black uppercase tracking-wider bg-[#c68642] hover:bg-[#b07536] text-[#F5EFEB] rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer h-[44px] shadow-lg shadow-[#c68642]/10 animate-fade-in"
              >
                <Play className="w-3.5 h-3.5 fill-[#F5EFEB]" /> 繼續萃取
              </button>
            )
          ) : (
            isTimerIdle ? (
              <button
                id="btn-pourover-start-mobile"
                onClick={handleStartPausePourOver}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-[#c68642] hover:bg-[#b07536] text-[#F5EFEB] rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer h-[44px] shadow-lg shadow-[#c68642]/10"
              >
                <Play className="w-3.5 h-3.5 fill-[#F5EFEB]" /> 開始手沖
              </button>
            ) : isTimerRunning ? (
              <button
                id="btn-pourover-stop-mobile"
                onClick={handleStartPausePourOver}
                className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-red-950/40 hover:bg-red-900/40 text-red-400 rounded-xl border border-red-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer h-[44px]"
              >
                <Pause className="w-3.5 h-3.5 fill-red-400" /> 暫停手沖
              </button>
            ) : (
              <button
                id="btn-pourover-resume-mobile"
                onClick={handleStartPausePourOver}
                className="flex-2 py-3 text-xs font-black uppercase tracking-wider bg-[#c68642] hover:bg-[#b07536] text-[#F5EFEB] rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer h-[44px] shadow-lg shadow-[#c68642]/10 animate-fade-in"
              >
                <Play className="w-3.5 h-3.5 fill-[#F5EFEB]" /> 繼續手沖
              </button>
            )
          )}

          {/* Save button - only visible when paused */}
          {isTimerPaused && (
            <button
              id="btn-save-mobile"
              onClick={handleSaveBrew}
              disabled={isSaving}
              className="flex-1 py-3 text-xs font-black uppercase tracking-wider bg-[#130E0C] hover:bg-[#c68642]/10 text-[#e0b034] hover:text-[#f4eae0] rounded-xl border border-[#c68642]/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer h-[44px] animate-fade-in"
            >
              <Check className="w-3.5 h-3.5" /> 儲存
            </button>
          )}
        </div>
      )}
    </div>
  );
};
