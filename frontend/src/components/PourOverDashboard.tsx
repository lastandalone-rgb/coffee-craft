import React from "react";
import { RotateCcw, Check, Bluetooth } from "lucide-react";

interface PourOverStage {
  name: string;
  duration: number;
  color: string;
}

interface PourOverDashboardProps {
  isTimerActive: boolean;
  seconds: number;
  stageTimeLeft: number;
  currentStageIndex: number;
  POUR_OVER_STAGES: PourOverStage[];
  handleStartPausePourOver: () => void;
  handleReset: () => void;
  handleSaveBrew: () => void;
  isSaving: boolean;
  connectedScaleName: string | null;
  scaleWeight: number;
  isScaleConnecting: boolean;
  handleConnectScale: (simulated: boolean) => void;
  handleDisconnectScale: () => void;
  formatTime: (totalSeconds: number) => string;
}

export const PourOverDashboard: React.FC<PourOverDashboardProps> = ({
  isTimerActive,
  seconds,
  stageTimeLeft,
  currentStageIndex,
  POUR_OVER_STAGES,
  handleStartPausePourOver,
  handleReset,
  handleSaveBrew,
  isSaving,
  connectedScaleName,
  scaleWeight,
  isScaleConnecting,
  handleConnectScale,
  handleDisconnectScale,
  formatTime
}) => {
  return (
    <div id="pourover-dashboard-panel" className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col items-center text-center relative overflow-hidden z-10 w-full border border-white/5">
      {/* Background elegant gradient elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-gradient-to-bl from-[#c68642]/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

      {/* Bluetooth Scale Connection Widget */}
      <div id="pourover-scale-bar" className="w-full flex items-center justify-between p-3.5 mb-5 rounded-2xl bg-[#0A0706]/90 border border-[#c68642]/10 z-10 shadow-inner">
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
                id="btn-connect-scale-bt-pourover"
                type="button"
                onClick={() => handleConnectScale(false)}
                disabled={isScaleConnecting}
                className="text-[10px] font-black uppercase tracking-wider text-[#e0b034] hover:text-[#f4eae0] bg-[#c68642]/10 hover:bg-[#c68642]/20 px-3 py-1.5 rounded-lg border border-[#c68642]/20 transition-all cursor-pointer"
              >
                {isScaleConnecting ? "Connecting..." : "Connect BT"}
              </button>
              <button
                id="btn-connect-scale-simulate-pourover"
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
              id="btn-disconnect-scale-pourover"
              type="button"
              onClick={handleDisconnectScale}
              className="text-[10px] font-black uppercase tracking-wider text-[#ff8080] hover:text-[#ffb3b3] bg-[#ff8080]/10 hover:bg-[#ff8080]/20 px-3 py-1.5 rounded-lg border border-[#ff8080]/20 transition-all cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="text-[#e0b034] text-xs font-black uppercase tracking-widest mb-4 relative z-10">
        {POUR_OVER_STAGES[currentStageIndex]?.name || "POUR OVER ACTIVE"}
      </div>

      {/* Radial Progress Timer */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-6 z-10">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="82"
            stroke="#1C1512"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="96"
            cy="96"
            r="82"
            stroke={isTimerActive ? "#e0b034" : "#c68642"}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 82}
            strokeDashoffset={
              POUR_OVER_STAGES[currentStageIndex]
                ? 2 * Math.PI * 82 * (1 - stageTimeLeft / POUR_OVER_STAGES[currentStageIndex].duration)
                : 0
            }
            strokeLinecap="round"
            className="transition-all duration-1000 drop-shadow-[0_0_6px_rgba(224,176,52,0.3)]"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-black font-mono tracking-tighter text-[#F5EFEB]">
            {formatTime(seconds)}
          </span>
          <span className="text-[11px] text-[#c68642] font-black uppercase tracking-wider mt-1">
            {stageTimeLeft}s Left
          </span>
        </div>
      </div>

      {/* Stage Previews */}
      <div className="w-full flex gap-2 mb-6 text-[10px] overflow-x-auto z-10 pb-1">
        {POUR_OVER_STAGES.map((stage, idx) => (
          <div
            key={idx}
            className={`flex-1 min-w-[75px] py-2.5 px-2 rounded-xl border transition-all duration-300 ${
              idx === currentStageIndex
                ? "border-[#e0b034] bg-[#e0b034]/5 text-[#e0b034] font-black scale-[1.03] shadow-md shadow-[#e0b034]/5"
                : "border-white/5 text-zinc-500 bg-[#0A0706]/40"
            }`}
          >
            <div className="truncate uppercase tracking-wider font-bold">{stage.name.split(" ")[0]}</div>
            <div className="text-[9px] mt-0.5 font-mono font-bold opacity-75">{stage.duration}s</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div id="pourover-controls-wrapper" className="flex flex-col gap-3 w-full relative z-20">
        <div className="flex gap-3 w-full">
          <button
            id="btn-pourover-toggle-desktop"
            type="button"
            onClick={handleStartPausePourOver}
            className={`flex-grow-[2] py-4 px-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] ${
              isTimerActive
                ? "bg-[#ff8080]/10 border border-[#ff8080]/20 hover:border-[#ff8080]/40 text-[#ff8080]"
                : "bg-[#e0b034] text-[#0A0706] hover:bg-[#c68642] shadow-lg shadow-[#e0b034]/15 hover:shadow-[#c68642]/20"
            }`}
          >
            {isTimerActive ? "Pause" : seconds > 0 ? "Resume" : "Start Brew"}
          </button>

          <button
            id="btn-pourover-reset-desktop"
            type="button"
            onClick={handleReset}
            disabled={seconds === 0}
            className="p-4 rounded-2xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-pourover-save-desktop"
            type="button"
            onClick={handleSaveBrew}
            disabled={seconds === 0 || isSaving}
            className="py-4 px-5 rounded-2xl bg-[#c68642] text-[#F5EFEB] hover:bg-[#b07536] disabled:opacity-30 disabled:pointer-events-none font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#c68642]/10"
          >
            <Check className="w-4 h-4" /> {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};
