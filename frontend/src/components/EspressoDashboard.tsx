import React from "react";
import { Bluetooth } from "lucide-react";
import { TelemetryPoint } from "../types/coffee";
import { BrewChart } from "./BrewChart";

interface EspressoDashboardProps {
  connectedScaleName: string | null;
  scaleWeight: number;
  isScaleConnecting: boolean;
  handleConnectScale: (simulated: boolean) => void;
  handleDisconnectScale: () => void;
  espressoLayout: "standard" | "chart_first" | "radial_gauge" | "split_screen";
  setEspressoLayout: (layout: "standard" | "chart_first" | "radial_gauge" | "split_screen") => void;
  espressoSubStage: "idle" | "timing" | "done";
  seconds: number;
  pressure: string;
  liquidWeight: string;
  preinfusionTime: string;
  telemetry: TelemetryPoint[];
  historyLength: number;
  beanName: string;
  handleEspressoStart: () => void;
  handleEspressoStop: () => void;
  handleEspressoMarkPreinfusionEnd: () => void;
  handleReset: () => void;
  handleSaveBrew: () => void;
  isSaving: boolean;
  espressoPreinfusionSec: number | null;
}

export const EspressoDashboard: React.FC<EspressoDashboardProps> = ({
  connectedScaleName,
  scaleWeight,
  isScaleConnecting,
  handleConnectScale,
  handleDisconnectScale,
  espressoLayout,
  setEspressoLayout,
  espressoSubStage,
  seconds,
  pressure,
  liquidWeight,
  preinfusionTime,
  telemetry,
  historyLength,
  beanName,
  handleEspressoStart,
  handleEspressoStop,
  handleEspressoMarkPreinfusionEnd,
  handleReset,
  handleSaveBrew,
  isSaving,
  espressoPreinfusionSec
}) => {
  return (
    <div id="espresso-dashboard-panel" className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col items-center relative overflow-hidden z-10 w-full border border-white/5">
      {/* Background elegant gradient elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gradient-to-br from-[#c68642]/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

      {/* Bluetooth Scale Connection Widget */}
      <div id="espresso-scale-bar" className="w-full flex items-center justify-between p-3.5 mb-5 rounded-2xl bg-[#0A0706]/90 border border-[#c68642]/10 z-10 shadow-inner">
        <div className="flex items-center gap-2.5">
          <Bluetooth className={`w-4 h-4 transition-colors duration-300 ${connectedScaleName ? "text-[#e0b034] drop-shadow-[0_0_4px_rgba(224,176,52,0.6)]" : "text-zinc-600"}`} />
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            {connectedScaleName ? `${connectedScaleName}` : "Scale Disconnected"}
          </span>
          {connectedScaleName && (
            <span className="text-[10px] bg-[#e0b034]/10 border border-[#e0b034]/20 text-[#e0b034] px-2 py-0.5 rounded-md font-mono font-bold tracking-tight">
              {scaleWeight.toFixed(1)}g
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!connectedScaleName ? (
            <>
              <button
                id="btn-connect-scale-bt"
                type="button"
                onClick={() => handleConnectScale(false)}
                disabled={isScaleConnecting}
                className="text-[10px] font-black uppercase tracking-wider text-[#e0b034] hover:text-[#f4eae0] bg-[#c68642]/10 hover:bg-[#c68642]/20 px-3 py-1.5 rounded-lg border border-[#c68642]/20 transition-all cursor-pointer"
              >
                {isScaleConnecting ? "Connecting..." : "Connect BT"}
              </button>
              <button
                id="btn-connect-scale-simulate"
                type="button"
                onClick={() => handleConnectScale(true)}
                disabled={isScaleConnecting}
                className="text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-200 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 transition-all cursor-pointer"
              >
                Simulate
              </button>
            </>
          ) : (
            <button
              id="btn-disconnect-scale-desktop"
              type="button"
              onClick={handleDisconnectScale}
              className="text-[10px] font-black uppercase tracking-wider text-[#ff8080] hover:text-[#ffb3b3] bg-[#ff8080]/10 hover:bg-[#ff8080]/20 px-3 py-1.5 rounded-lg border border-[#ff8080]/20 transition-all cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Layout Switcher Tabs */}
      <div id="espresso-layout-switcher" className="w-full flex bg-[#0A0706]/90 p-1.5 mb-6 rounded-2xl border border-[#c68642]/10 z-10">
        {(["standard", "chart_first", "radial_gauge", "split_screen"] as const).map((layout) => (
          <button
            key={layout}
            id={`btn-espresso-layout-${layout}`}
            type="button"
            onClick={() => setEspressoLayout(layout)}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer ${
              espressoLayout === layout
                ? "bg-[#c68642] text-[#F5EFEB] shadow-lg shadow-[#c68642]/10"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {layout === "standard" && "Standard"}
            {layout === "chart_first" && "Chart Mode"}
            {layout === "radial_gauge" && "Gauge"}
            {layout === "split_screen" && "Split"}
          </button>
        ))}
      </div>

      {/* Title & Status */}
      <div className="flex flex-col items-center mb-6 z-10">
        <div className="text-xl font-black tracking-widest text-[#e0b034] uppercase font-outfit">
          Espresso Extraction
        </div>
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
          {espressoSubStage === "idle" && "Ready to Extract"}
          {espressoSubStage === "timing" && "Extraction in Progress"}
          {espressoSubStage === "done" && "Extraction Completed"}
        </div>
      </div>

      {/* Layout 5: Standard Grid layout */}
      {espressoLayout === "standard" && (
        <div id="layout-espresso-standard" className="w-full">
          {/* 3 Metric Cards Grid */}
          <div className="grid grid-cols-12 gap-4 w-full mb-6 z-10">
            {/* Left Stack (6 Cols) */}
            <div className="col-span-6 flex flex-col gap-4">
              {/* Yield Card */}
              <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-2xl p-5 flex flex-col items-center justify-center shadow-inner">
                <div className="text-3xl font-black font-mono text-[#F5EFEB] tracking-tight">
                  {scaleWeight.toFixed(1)}<span className="text-xs font-bold text-zinc-500 ml-1">g</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider mt-1.5">Yield Weight</div>
              </div>

              {/* Pressure Card */}
              <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-2xl p-5 flex flex-col items-center justify-center shadow-inner">
                <div className="text-3xl font-black font-mono text-[#F5EFEB] tracking-tight">
                  {(telemetry[telemetry.length - 1]?.pressure ?? parseFloat(pressure) ?? 9.0).toFixed(1)}<span className="text-xs font-bold text-zinc-500 ml-1">bar</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider mt-1.5">Pressure</div>
              </div>
            </div>

            {/* Right Tall Active Card (6 Cols) */}
            <div className="col-span-6 bg-[#0A0706]/85 border border-[#c68642]/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#e0b034]/10 border-b border-l border-[#e0b034]/20 text-[9px] text-[#e0b034] font-black uppercase tracking-widest rounded-bl-lg">Active</div>
              <div className="text-5xl font-black font-mono text-[#F5EFEB] tracking-tighter">{seconds}s</div>
              <div className="text-[9px] text-zinc-500 font-bold mt-4 uppercase tracking-wider font-mono">
                TRG: {liquidWeight}g | {preinfusionTime ? `${preinfusionTime}s` : "30s"}
              </div>
            </div>
          </div>

          {/* Extraction Curve Chart Panel */}
          <div className="w-full mb-6 z-10 p-3 bg-[#0A0706]/40 rounded-2xl border border-white/5">
            <BrewChart telemetry={telemetry} targetYield={parseFloat(liquidWeight) || 36} targetPressure={parseFloat(pressure) || 12} />
          </div>
        </div>
      )}

      {/* Layout 1: Chart-First */}
      {espressoLayout === "chart_first" && (
        <div id="layout-espresso-chart-first" className="w-full flex flex-col gap-4 z-10 mb-6">
          {/* Curve Graph on top */}
          <div className="w-full p-3 bg-[#0A0706]/40 rounded-2xl border border-white/5">
            <BrewChart telemetry={telemetry} targetYield={parseFloat(liquidWeight) || 36} targetPressure={parseFloat(pressure) || 12} />
          </div>
          {/* Metrics Below */}
          <div className="grid grid-cols-3 gap-3 w-full">
            <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Yield</span>
              <div className="text-xl font-black font-mono text-[#F5EFEB]">{scaleWeight.toFixed(1)}g</div>
            </div>
            <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Pressure</span>
              <div className="text-xl font-black font-mono text-[#F5EFEB]">
                {(telemetry[telemetry.length - 1]?.pressure ?? parseFloat(pressure) ?? 9.0).toFixed(1)}bar
              </div>
            </div>
            <div className="bg-[#0A0706]/85 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="text-[10px] text-[#e0b034] font-bold uppercase tracking-wider mb-1">Timer</span>
              <div className="text-xl font-black font-mono text-[#e0b034]">{seconds}s</div>
            </div>
          </div>
        </div>
      )}

      {/* Layout 3: Radial Gauge */}
      {espressoLayout === "radial_gauge" && (
        <div id="layout-espresso-radial-gauge" className="w-full flex flex-col items-center gap-5 z-10 mb-6">
          <div className="relative w-48 h-48 flex items-center justify-center bg-[#0A0706]/80 border border-[#c68642]/10 rounded-full p-4 shadow-2xl">
            {/* Pressure Radial Dial using SVG */}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="78"
                stroke="#1C1512"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 78 * 0.75}
                strokeDashoffset={0}
                className="transform rotate-45 origin-center"
              />
              <circle
                cx="96"
                cy="96"
                r="78"
                stroke="#e0b034"
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 78 * 0.75}
                strokeDashoffset={
                  2 * Math.PI * 78 * 0.75 * (1 - (telemetry[telemetry.length - 1]?.pressure ?? parseFloat(pressure) ?? 9.0) / 12)
                }
                strokeLinecap="round"
                className="transform rotate-45 origin-center transition-all duration-300 drop-shadow-[0_0_6px_rgba(224,176,52,0.4)]"
              />
            </svg>
            {/* Digital Timer inside dial */}
            <div className="flex flex-col items-center z-10">
              <span className="text-4xl font-black font-mono text-[#F5EFEB] tracking-tighter">{seconds}s</span>
              <span className="text-[9px] text-[#e0b034] font-black tracking-widest mt-1">ACTIVE</span>
              <span className="text-[10px] text-zinc-400 font-bold mt-2 font-mono">
                {(telemetry[telemetry.length - 1]?.pressure ?? parseFloat(pressure) ?? 9.0).toFixed(1)} bar
              </span>
            </div>
          </div>

          {/* Yield Display bottom panel */}
          <div className="w-full grid grid-cols-2 gap-4">
            <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-2xl p-4 text-center shadow-inner">
              <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider block">Yield Weight</span>
              <span className="text-xl font-black font-mono text-[#F5EFEB] mt-1.5 block">{scaleWeight.toFixed(1)} g</span>
            </div>
            <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-2xl p-4 text-center shadow-inner">
              <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider block">Flow Speed</span>
              <span className="text-xl font-black font-mono text-[#c68642] mt-1.5 block">
                {(telemetry[telemetry.length - 1]?.flow ?? 0).toFixed(1)} g/s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Layout 4: Split-Screen Timer */}
      {espressoLayout === "split_screen" && (
        <div id="layout-espresso-split-screen" className="w-full flex flex-col gap-4 z-10 mb-6">
          <div className="grid grid-cols-12 gap-4 w-full">
            {/* Giant Clock display */}
            <div className="col-span-5 bg-[#0A0706]/85 border border-[#c68642]/10 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-inner">
              <div className="text-6xl font-black font-mono text-[#e0b034] tracking-tighter leading-none drop-shadow-[0_0_10px_rgba(224,176,52,0.2)]">
                {seconds}
              </div>
              <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-3">Seconds</div>
              <div className="text-[9px] text-[#c68642] font-black mt-2 font-mono">
                TRG: {liquidWeight}g
              </div>
            </div>
            {/* Metrics on the Right */}
            <div className="col-span-7 flex flex-col gap-3">
              <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-xl px-4 py-2.5 flex justify-between items-center shadow-inner">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Weight</span>
                <span className="text-lg font-black font-mono text-[#F5EFEB]">{scaleWeight.toFixed(1)}g</span>
              </div>
              <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-xl px-4 py-2.5 flex justify-between items-center shadow-inner">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Pressure</span>
                <span className="text-lg font-black font-mono text-[#e0b034]">
                  {(telemetry[telemetry.length - 1]?.pressure ?? parseFloat(pressure) ?? 9.0).toFixed(1)}bar
                </span>
              </div>
              <div className="bg-[#0A0706]/85 border border-[#c68642]/10 rounded-xl px-4 py-2.5 flex justify-between items-center shadow-inner">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Flow Rate</span>
                <span className="text-lg font-black font-mono text-zinc-300">
                  {(telemetry[telemetry.length - 1]?.flow ?? 0).toFixed(1)}g/s
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pill Button Controls */}
      <div className="flex flex-col gap-3 w-full relative z-20 mb-5">
        <div className="flex gap-4 w-full">
          {espressoSubStage === "timing" ? (
            <button
              id="btn-espresso-stop-desktop"
              type="button"
              onClick={handleEspressoStop}
              className="flex-grow-[2] py-4 px-6 rounded-2xl font-black bg-[#e0b034] text-[#0A0706] hover:bg-[#c68642] flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] text-xs uppercase tracking-widest shadow-lg shadow-[#e0b034]/10 hover:shadow-[#c68642]/20 font-outfit"
            >
              Stop Extraction
            </button>
          ) : (
            <button
              id="btn-espresso-start-desktop"
              type="button"
              onClick={handleEspressoStart}
              className="flex-grow-[2] py-4 px-6 rounded-2xl font-black bg-[#e0b034] text-[#0A0706] hover:bg-[#c68642] flex items-center justify-center transition-all cursor-pointer active:scale-[0.98] text-xs uppercase tracking-widest shadow-lg shadow-[#e0b034]/15 hover:shadow-[#c68642]/20 font-outfit"
            >
              Start Extraction
            </button>
          )}

          <button
            id="btn-espresso-preinfusion-end-desktop"
            type="button"
            onClick={handleEspressoMarkPreinfusionEnd}
            disabled={espressoSubStage !== "timing" || espressoPreinfusionSec !== null}
            className="py-4 px-6 rounded-2xl font-bold bg-[#1C1512] hover:bg-[#281e1a] text-zinc-300 border border-white/5 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center transition-all cursor-pointer text-xs uppercase tracking-wide"
          >
            Pre-infusion End
          </button>
        </div>

        {/* Reset & Save for Espresso Done / Idle state */}
        {espressoSubStage === "done" && (
          <div id="espresso-done-controls" className="flex gap-3 w-full mt-1.5 animate-fadeIn">
            <button
              id="btn-espresso-reset-desktop"
              type="button"
              onClick={handleReset}
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Reset Timer
            </button>
            <button
              id="btn-espresso-save-desktop"
              type="button"
              onClick={handleSaveBrew}
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-xl bg-[#c68642] text-[#F5EFEB] hover:bg-[#b07536] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#c68642]/10"
            >
              {isSaving ? "Saving..." : "Save Brew Log"}
            </button>
          </div>
        )}
      </div>

      {/* Footer info line */}
      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest border-t border-white/5 pt-4 w-full text-center">
        Stage: {espressoSubStage === "idle" ? "Ready" : espressoSubStage === "timing" ? "Extraction" : "Completed"} | Shot #{historyLength + 1} | {beanName || "Single Origin"}
      </div>
    </div>
  );
};
