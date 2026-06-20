import React from "react";
import {
  Calendar,
  Coffee,
  Star,
  Scale,
  Thermometer,
  Clock,
  MessageSquare,
  Trash2
} from "lucide-react";
import { BrewRecord } from "../types/coffee";

interface BrewHistoryProps {
  history: BrewRecord[];
  brewType: "pour_over" | "espresso";
  onDeleteBrew: (id: string) => void;
}

export const BrewHistory: React.FC<BrewHistoryProps> = ({
  history,
  brewType,
  onDeleteBrew
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex-1 flex flex-col min-h-[300px]">
      <h2 className="text-sm font-bold text-[#e0b034] mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4" /> 歷史 {brewType === "espresso" ? "義式" : "手沖"} 紀錄日誌 ({history.length} 筆)
      </h2>

      <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-3">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs py-10">
            <Coffee className="w-8 h-8 mb-2 opacity-30" />
            <p>尚無歷史日誌紀錄</p>
          </div>
        ) : (
          history.map((record) => (
            <div
              key={record.id}
              className="bg-[#140e0b] border border-[#c68642]/10 rounded-xl p-4 hover:border-[#c68642]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-[#f4eae0] truncate max-w-[180px]">
                    {record.bean_name}
                  </span>
                  
                  <div className="flex">
                    {Array.from({ length: record.rating || 0 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-[#e0b034] fill-[#e0b034]" />
                    ))}
                  </div>

                  {record.grind_size && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#4b3621]/30 border border-[#c68642]/20 text-[#c68642] font-semibold">
                      研磨: {record.grind_size}
                    </span>
                  )}

                  {record.brew_type === "espresso" && record.pressure && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#e0b034]/20 border border-[#e0b034]/20 text-[#e0b034] font-semibold">
                      壓力: {record.pressure}bar
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" /> 
                    {record.brew_type === "espresso" ? (
                      <>{record.coffee_weight || "--"}g 粉 ➔ {record.liquid_weight || "--"}g 液</>
                    ) : (
                      <>{record.coffee_weight || "--"}g / {record.water_weight || "--"}g</>
                    )}
                  </span>
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5" /> {record.water_temp || "--"}°C
                  </span>
                  
                  {record.brew_type === "espresso" ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 
                      {record.brew_time ? `${record.brew_time}s` : "--"} 
                      {record.preinfusion_time !== null && ` (預浸 ${record.preinfusion_time}s)`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {record.brew_time ? formatTime(record.brew_time) : "--:--"}
                    </span>
                  )}
                  
                  <span className="text-zinc-600 font-mono">
                    {new Date(record.created_at).toLocaleDateString("zh-TW", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>

                {record.notes && (
                  <div className="text-xs text-zinc-400 bg-[#0f0b09] rounded-lg p-2 border border-[#c68642]/5 flex items-start gap-1.5 mt-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[#c68642] mt-0.5 shrink-0" />
                    <span className="italic">{record.notes}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onDeleteBrew(record.id)}
                className="p-2 self-end sm:self-center text-zinc-700 hover:text-[#ff8080] hover:bg-[#ff8080]/5 rounded-lg transition-all cursor-pointer"
                title="刪除此紀錄"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
