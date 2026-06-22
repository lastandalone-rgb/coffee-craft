import React from "react";
import { Coffee, Activity } from "lucide-react";
import { StatsResponse, ChartDataPoint } from "../types/coffee";

interface TelemetryPoint {
  time: number;
  yield: number;
  flow: number;
  pressure?: number;
}

interface BrewChartProps {
  // Stats Mode
  stats?: StatsResponse;
  activeTab?: "daily" | "weekly" | "monthly";
  setActiveTab?: (tab: "daily" | "weekly" | "monthly") => void;

  // Real-time Extraction Curve Mode
  telemetry?: TelemetryPoint[];
  maxDuration?: number; // Target time limit, default 40s
  targetYield?: number;  // Target yield, e.g. 36g
  targetPressure?: number; // Target pressure, e.g. 9bar
}

export const BrewChart: React.FC<BrewChartProps> = ({
  stats,
  activeTab = "daily",
  setActiveTab,
  telemetry,
  maxDuration = 40,
  targetYield = 40,
  targetPressure = 12
}) => {
  // === RENDER MODE 1: TELEMETRY CURVES ===
  if (telemetry) {
    if (telemetry.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-zinc-500 bg-[#130E0C]/40 rounded-xl border border-zinc-800/40">
          <Activity className="w-10 h-10 mb-2 animate-pulse text-zinc-600" />
          <p className="text-xs">等待開始萃取以繪製即時數據曲線...</p>
        </div>
      );
    }

    const width = 600;
    const height = 280;
    const paddingLeft = 45;
    const paddingRight = 45;
    const paddingTop = 25;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Define X & Y scales
    const maxTime = Math.max(maxDuration, ...telemetry.map(t => t.time));
    const maxYieldVal = Math.max(targetYield, ...telemetry.map(t => t.yield), 1);
    const maxFlowVal = Math.max(5.0, ...telemetry.map(t => t.flow)); // Flow usually capped around 5 g/s for graphing
    const maxLeftY = Math.max(maxYieldVal, maxFlowVal * 10); // scale flow by 10 to fit on left Y axis (0-5g/s mapped to 0-50g)

    const getX = (t: number) => paddingLeft + (t / maxTime) * chartWidth;
    const getLeftY = (val: number) => height - paddingBottom - (val / maxLeftY) * chartHeight;
    const getRightY = (p: number) => height - paddingBottom - (p / targetPressure) * chartHeight;

    // Map points
    const yieldPoints = telemetry.map(pt => ({ x: getX(pt.time), y: getLeftY(pt.yield) }));
    const flowPoints = telemetry.map(pt => ({ x: getX(pt.time), y: getLeftY(pt.flow * 10) }));
    const pressurePoints = telemetry.map(pt => ({
      x: getX(pt.time),
      y: getRightY(pt.pressure !== undefined ? pt.pressure : 0)
    }));

    // Area path for Yield
    const yieldAreaPath = yieldPoints.length > 0
      ? `M ${yieldPoints[0].x} ${height - paddingBottom} ` +
        yieldPoints.map(p => `L ${p.x} ${p.y}`).join(" ") +
        ` L ${yieldPoints[yieldPoints.length - 1].x} ${height - paddingBottom} Z`
      : "";

    // Line paths
    const makeLinePath = (pts: { x: number; y: number }[]) =>
      pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <div className="w-full">
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] overflow-visible">
            <defs>
              <linearGradient id="yieldAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f4eae0" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#f4eae0" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Axis Titles */}
            <text x={paddingLeft} y={paddingTop - 12} fill="#8a8075" fontSize="10" fontWeight="600" textAnchor="start">
              Yield
            </text>
            <text x={width - paddingRight} y={paddingTop - 12} fill="#e0b034" fontSize="10" fontWeight="600" textAnchor="end">
              Pressure
            </text>
            <text x={width / 2} y={height - 8} fill="#8a8075" fontSize="10" fontWeight="600" textAnchor="middle">
              Time
            </text>

            {/* Grid lines (X/Y axes) */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = paddingTop + ratio * chartHeight;
              const leftVal = ((1 - ratio) * maxLeftY).toFixed(0);
              const rightVal = ((1 - ratio) * targetPressure).toFixed(0);
              return (
                <g key={idx} className="opacity-40">
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="#2e2118"
                    strokeWidth="1"
                  />
                  {/* Left Labels (Yield / Flow) */}
                  <text x={paddingLeft - 8} y={y + 4} fill="#8a8075" fontSize="9" textAnchor="end">
                    {idx === 0 ? `${leftVal} g` : leftVal}
                  </text>
                  {/* Right Labels (Pressure bar) */}
                  <text x={width - paddingRight + 8} y={y + 4} fill="#e0b034" fontSize="9" textAnchor="start">
                    {idx === 0 ? `${rightVal} bar` : rightVal}
                  </text>
                </g>
              );
            })}

            {/* Time labels (X Axis ticks) */}
            {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((ratio, idx) => {
              const t = ratio * maxTime;
              const x = paddingLeft + ratio * chartWidth;
              // Format labels like 'Ss', '10s' etc matching the design
              let label = `${t.toFixed(0)}s`;
              if (t === 0) label = "0";
              else if (t > 0 && t < 3) label = "Ss";
              return (
                <text key={idx} x={x} y={height - paddingBottom + 16} fill="#8a8075" fontSize="9" textAnchor="middle" className="opacity-50 font-mono">
                  {label}
                </text>
              );
            })}

            {/* Yield Area Path */}
            {yieldAreaPath && <path d={yieldAreaPath} fill="url(#yieldAreaGrad)" />}

            {/* Yield Line (Cream) */}
            {yieldPoints.length > 0 && (
              <path d={makeLinePath(yieldPoints)} fill="none" stroke="#f4eae0" strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Flow Line (Teal) */}
            {flowPoints.length > 0 && (
              <path d={makeLinePath(flowPoints)} fill="none" stroke="#48D1CC" strokeWidth="2" strokeLinecap="round" />
            )}

            {/* Pressure Line (Gold) */}
            {pressurePoints.length > 0 && (
              <path d={makeLinePath(pressurePoints)} fill="none" stroke="#e0b034" strokeWidth="2" strokeLinecap="round" />
            )}

            {/* Point highlights */}
            {yieldPoints.length > 0 && (
              <circle cx={yieldPoints[yieldPoints.length - 1].x} cy={yieldPoints[yieldPoints.length - 1].y} r="4" fill="#f4eae0" />
            )}
            {flowPoints.length > 0 && (
              <circle cx={flowPoints[flowPoints.length - 1].x} cy={flowPoints[flowPoints.length - 1].y} r="4" fill="#48D1CC" />
            )}
            {pressurePoints.length > 0 && (
              <circle cx={pressurePoints[pressurePoints.length - 1].x} cy={pressurePoints[pressurePoints.length - 1].y} r="4" fill="#e0b034" />
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-[11px] font-semibold">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#f4eae0] block"></span>
            <span className="text-[#f4eae0]">出液重 (g)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#48D1CC] block"></span>
            <span className="text-[#48D1CC]">流速 (g/s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-[#e0b034] block"></span>
            <span className="text-[#e0b034]">壓力 (bar)</span>
          </div>
        </div>
      </div>
    );
  }

  // === RENDER MODE 2: HISTORICAL STATS ===
  if (!stats) return null;
  const chartData = stats[activeTab] || [];

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
        <Coffee className="w-12 h-12 mb-2 animate-pulse text-[#4b3621]" />
        <p>尚無該類期的統計數據，請先進行幾次沖煮吧！</p>
      </div>
    );
  }

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);
  const maxCoffee = Math.max(...chartData.map((d) => d.total_coffee), 1);

  const width = 600;
  const height = 240;
  const padding = 40;

  const pointsCount = chartData.map((d, index) => {
    const x = padding + (index / Math.max(1, chartData.length - 1)) * (width - padding * 2);
    const y = height - padding - (d.count / maxCount) * (height - padding * 2);
    return { x, y, ...d };
  });

  const pointsCoffee = chartData.map((d, index) => {
    const x = padding + (index / Math.max(1, chartData.length - 1)) * (width - padding * 2);
    const y = height - padding - (d.total_coffee / maxCoffee) * (height - padding * 2);
    return { x, y, ...d };
  });

  const getLabel = (d: ChartDataPoint) => {
    if (activeTab === "daily") return d.date_label?.substring(5) || "";
    if (activeTab === "weekly") return d.week_label?.substring(2) || "";
    return d.month_label || "";
  };

  return (
    <div id="brew-chart-container" className="w-full">
      {setActiveTab && (
        <div id="brew-chart-tabs" className="flex gap-2 mb-4 bg-[#140e0b]/60 p-1 rounded-xl border border-zinc-800/80 self-start w-fit">
          {(["daily", "weekly", "monthly"] as const).map((tab) => (
            <button
              key={tab}
              id={`btn-chart-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-[#c68642] text-[#f4eae0]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab === "daily" ? "日報表" : tab === "weekly" ? "週報表" : "月報表"}
            </button>
          ))}
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[500px] overflow-visible">
          <defs>
            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c68642" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#c68642" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding + ratio * (height - padding * 2);
            return (
              <g key={idx}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="#1a120e"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
              </g>
            );
          })}

          {/* Area fill for Coffee weight */}
          <path
            d={`M ${pointsCoffee[0]?.x} ${height - padding} ` +
              pointsCoffee.map((p) => `L ${p.x} ${p.y}`).join(" ") +
              ` L ${pointsCoffee[pointsCoffee.length - 1]?.x} ${height - padding} Z`}
            fill="url(#blueGrad)"
          />

          {/* Brew Count Line */}
          <path
            d={pointsCount.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
            fill="none"
            stroke="#e0b034"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Coffee Weight Line */}
          <path
            d={pointsCoffee.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
            fill="none"
            stroke="#c68642"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2,2"
          />

          {/* Grid Labels and Points */}
          {pointsCount.map((p, idx) => (
            <g key={idx} className="group">
              <circle cx={p.x} cy={p.y} r="5" fill="#e0b034" className="cursor-pointer hover:r-7 transition-all" />
              <circle cx={p.x} cy={pointsCoffee[idx].y} r="4" fill="#c68642" />
              
              <title>{`沖煮: ${p.count}次\n豆重: ${p.total_coffee}g`}</title>

              {/* X Axis labels */}
              <text
                x={p.x}
                y={height - 12}
                fill="#8a8075"
                fontSize="11"
                textAnchor="middle"
              >
                {getLabel(p)}
              </text>
            </g>
          ))}
        </svg>
        <div className="flex justify-center gap-6 mt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#e0b034] rounded-full"></span>
            <span className="text-zinc-400">沖煮次數</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 border border-dashed border-[#c68642] rounded-full"></span>
            <span className="text-zinc-400">咖啡豆用量 (g)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
