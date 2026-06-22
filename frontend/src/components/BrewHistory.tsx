import React, { useState } from "react";
import {
  Calendar,
  Coffee,
  Star,
  Scale,
  Thermometer,
  Clock,
  MessageSquare,
  Trash2,
  Edit3,
  Check,
  X
} from "lucide-react";
import { BrewRecord } from "../types/coffee";

interface UpdateParams {
  grind_size?: string;
  water_temp?: string;
  coffee_weight?: string;
  water_weight?: string;
  brew_time?: string;
  liquid_weight?: string;
  preinfusion_time?: string;
  pressure?: string;
}

interface BrewHistoryProps {
  history: BrewRecord[];
  brewType: "pour_over" | "espresso";
  onDeleteBrew: (id: string) => void;
  onUpdateBrew: (id: string, notes: string, rating: number, params: UpdateParams) => void;
}

export const BrewHistory: React.FC<BrewHistoryProps> = ({
  history,
  brewType,
  onDeleteBrew,
  onUpdateBrew
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Local edit states
  const [editNotes, setEditNotes] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [editGrind, setEditGrind] = useState("");
  const [editWaterTemp, setEditWaterTemp] = useState("");
  const [editCoffeeWeight, setEditCoffeeWeight] = useState("");
  const [editWaterWeight, setEditWaterWeight] = useState("");
  const [editLiquidWeight, setEditLiquidWeight] = useState("");
  const [editBrewTime, setEditBrewTime] = useState("");
  const [editPreinfusionTime, setEditPreinfusionTime] = useState("");
  const [editPressure, setEditPressure] = useState("");

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startEditing = (record: BrewRecord) => {
    setEditingId(record.id);
    setEditNotes(record.notes || "");
    setEditRating(record.rating || 5);
    setEditGrind(record.grind_size || "");
    setEditWaterTemp(record.water_temp?.toString() || "");
    setEditCoffeeWeight(record.coffee_weight?.toString() || "");
    setEditWaterWeight(record.water_weight?.toString() || "");
    setEditLiquidWeight(record.liquid_weight?.toString() || "");
    setEditBrewTime(record.brew_time?.toString() || "");
    setEditPreinfusionTime(record.preinfusion_time?.toString() || "");
    setEditPressure(record.pressure?.toString() || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    onUpdateBrew(id, editNotes, editRating, {
      grind_size: editGrind,
      water_temp: editWaterTemp,
      coffee_weight: editCoffeeWeight,
      water_weight: editWaterWeight,
      brew_time: editBrewTime,
      liquid_weight: editLiquidWeight,
      preinfusion_time: editPreinfusionTime,
      pressure: editPressure
    });
    setEditingId(null);
  };

  return (
    <div id="brew-history-panel" className="glass-panel rounded-2xl p-6 flex-1 flex flex-col min-h-[300px]">
      <h2 id="brew-history-title" className="text-sm font-bold text-[#e0b034] mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4" /> 歷史 {brewType === "espresso" ? "義式" : "手沖"} 紀錄日誌 ({history.length} 筆)
      </h2>

      <div id="brew-history-list" className="flex-1 overflow-y-auto lg:max-h-[500px] pr-1 space-y-3 pb-16">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs py-10">
            <Coffee className="w-8 h-8 mb-2 opacity-30" />
            <p>尚無歷史日誌紀錄</p>
          </div>
        ) : (
          history.map((record) => {
            const isEditing = editingId === record.id;
            return (
              <div
                key={record.id}
                className={`border rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isEditing 
                    ? "bg-[#1C1512]/60 border-[#e0b034]/50 shadow-[0_0_15px_rgba(224,176,52,0.1)]" 
                    : "bg-[#140e0b] border-[#c68642]/10 hover:border-[#c68642]/30"
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  
                  {/* Row 1: Bean Name, Rating, Grind size, Pressure */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#f4eae0] truncate max-w-[180px]">
                      {record.bean_name}
                    </span>
                    
                    {!isEditing ? (
                      <div className="flex">
                        {Array.from({ length: record.rating || 0 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 text-[#e0b034] fill-[#e0b034]" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-1 items-center bg-[#0A0706] px-2 py-1 rounded-lg border border-white/5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            id={`btn-edit-rating-${star}-${record.id}`}
                            type="button"
                            onClick={() => setEditRating(star)}
                            className="hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                star <= editRating
                                  ? "text-[#e0b034] fill-[#e0b034]"
                                  : "text-zinc-700"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Grind Size */}
                    {!isEditing ? (
                      record.grind_size && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#4b3621]/30 border border-[#c68642]/20 text-[#c68642] font-semibold">
                          研磨: {record.grind_size}
                        </span>
                      )
                    ) : (
                      <div className="flex items-center gap-1 bg-[#0A0706] border border-white/5 rounded px-2 py-0.5 text-[10px]">
                        <span className="text-zinc-500 font-bold">研磨:</span>
                        <input
                          id={`edit-grind-size-${record.id}`}
                          type="text"
                          value={editGrind}
                          onChange={(e) => setEditGrind(e.target.value)}
                          className="w-16 bg-transparent text-[#c68642] font-bold focus:outline-none text-[10px]"
                        />
                      </div>
                    )}

                    {/* Pressure (Espresso only) */}
                    {record.brew_type === "espresso" && (
                      !isEditing ? (
                        record.pressure && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#e0b034]/20 border border-[#e0b034]/20 text-[#e0b034] font-semibold">
                            壓力: {record.pressure}bar
                          </span>
                        )
                      ) : (
                        <div className="flex items-center gap-1 bg-[#0A0706] border border-white/5 rounded px-2 py-0.5 text-[10px]">
                          <span className="text-zinc-500 font-bold">壓力:</span>
                          <input
                            id={`edit-pressure-${record.id}`}
                            type="number"
                            step="0.1"
                            value={editPressure}
                            onChange={(e) => setEditPressure(e.target.value)}
                            className="w-10 bg-transparent text-[#e0b034] font-bold focus:outline-none text-[10px]"
                          />
                          <span className="text-zinc-500">bar</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Row 2: Weights, Temp, Timer / Seconds */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    
                    {/* Weights */}
                    <span className="flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" /> 
                      {!isEditing ? (
                        record.brew_type === "espresso" ? (
                          <>{record.coffee_weight || "--"}g 粉 ➔ {record.liquid_weight || "--"}g 液</>
                        ) : (
                          <>{record.coffee_weight || "--"}g / {record.water_weight || "--"}g</>
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-[11px]">
                          <input
                            id={`edit-coffee-weight-${record.id}`}
                            type="number"
                            step="0.1"
                            value={editCoffeeWeight}
                            onChange={(e) => setEditCoffeeWeight(e.target.value)}
                            className="w-10 bg-[#0A0706] border border-white/5 rounded text-center text-[#f4eae0] focus:outline-none py-0.5"
                          />
                          <span className="text-zinc-500">g粉</span>
                          {record.brew_type === "espresso" ? (
                            <>
                              <span className="text-zinc-600">➔</span>
                              <input
                                id={`edit-liquid-weight-${record.id}`}
                                type="number"
                                step="0.1"
                                value={editLiquidWeight}
                                onChange={(e) => setEditLiquidWeight(e.target.value)}
                                className="w-10 bg-[#0A0706] border border-white/5 rounded text-center text-[#f4eae0] focus:outline-none py-0.5"
                              />
                              <span className="text-zinc-500">g液</span>
                            </>
                          ) : (
                            <>
                              <span className="text-zinc-600">/</span>
                              <input
                                id={`edit-water-weight-${record.id}`}
                                type="number"
                                value={editWaterWeight}
                                onChange={(e) => setEditWaterWeight(e.target.value)}
                                className="w-12 bg-[#0A0706] border border-white/5 rounded text-center text-[#f4eae0] focus:outline-none py-0.5"
                              />
                              <span className="text-zinc-500">g水</span>
                            </>
                          )}
                        </div>
                      )}
                    </span>

                    {/* Temperature */}
                    <span className="flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5" /> 
                      {!isEditing ? (
                        <>{record.water_temp || "--"}°C</>
                      ) : (
                        <div className="flex items-center gap-0.5 text-[11px]">
                          <input
                            id={`edit-water-temp-${record.id}`}
                            type="number"
                            value={editWaterTemp}
                            onChange={(e) => setEditWaterTemp(e.target.value)}
                            className="w-10 bg-[#0A0706] border border-white/5 rounded text-center text-[#f4eae0] focus:outline-none py-0.5"
                          />
                          <span className="text-zinc-500">°C</span>
                        </div>
                      )}
                    </span>
                    
                    {/* Timer / Brew Time */}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 
                      {!isEditing ? (
                        record.brew_type === "espresso" ? (
                          <>{record.brew_time ? `${record.brew_time}s` : "--"} {record.preinfusion_time !== null && ` (預浸 ${record.preinfusion_time}s)`}</>
                        ) : (
                          <>{record.brew_time ? formatTime(record.brew_time) : "--:--"}</>
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-[11px]">
                          <input
                            id={`edit-brew-time-${record.id}`}
                            type="number"
                            value={editBrewTime}
                            onChange={(e) => setEditBrewTime(e.target.value)}
                            className="w-12 bg-[#0A0706] border border-white/5 rounded text-center text-[#f4eae0] focus:outline-none py-0.5"
                          />
                          <span className="text-zinc-500">秒</span>
                          {record.brew_type === "espresso" && (
                            <>
                              <span className="text-zinc-500 ml-1">預浸:</span>
                              <input
                                id={`edit-preinfusion-time-${record.id}`}
                                type="number"
                                value={editPreinfusionTime}
                                onChange={(e) => setEditPreinfusionTime(e.target.value)}
                                className="w-10 bg-[#0A0706] border border-white/5 rounded text-center text-[#f4eae0] focus:outline-none py-0.5"
                              />
                              <span className="text-zinc-500">秒</span>
                            </>
                          )}
                        </div>
                      )}
                    </span>
                    
                    {/* Timestamp */}
                    <span className="text-zinc-600 font-mono">
                      {new Date(record.created_at).toLocaleDateString("zh-TW", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  {/* Notes / Thoughts */}
                  {!isEditing ? (
                    record.notes && (
                      <div className="text-xs text-zinc-400 bg-[#0f0b09] rounded-lg p-2 border border-[#c68642]/5 flex items-start gap-1.5 mt-2">
                        <MessageSquare className="w-3.5 h-3.5 text-[#c68642] mt-0.5 shrink-0" />
                        <span className="italic">{record.notes}</span>
                      </div>
                    )
                  ) : (
                    <div className="mt-2.5">
                      <textarea
                        id={`edit-notes-${record.id}`}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="在此撰寫您的風味筆記、心得或調整計畫..."
                        rows={2}
                        className="w-full bg-[#0A0706] border border-[#c68642]/30 rounded-xl px-3 py-2 text-xs text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] resize-none font-medium placeholder-zinc-600"
                      />
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex sm:flex-col items-center justify-end gap-1.5 self-end sm:self-center">
                  {!isEditing ? (
                    <>
                      <button
                        id={`btn-edit-log-${record.id}`}
                        onClick={() => startEditing(record)}
                        className="p-2 text-zinc-600 hover:text-[#e0b034] hover:bg-[#e0b034]/5 rounded-lg transition-all cursor-pointer"
                        title="編輯此紀錄參數"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-delete-log-${record.id}`}
                        onClick={() => onDeleteBrew(record.id)}
                        className="p-2 text-zinc-700 hover:text-[#ff8080] hover:bg-[#ff8080]/5 rounded-lg transition-all cursor-pointer"
                        title="刪除此紀錄"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex sm:flex-col gap-1.5">
                      <button
                        id={`btn-save-log-edit-${record.id}`}
                        onClick={() => saveEdit(record.id)}
                        className="p-2 text-emerald-500 hover:bg-emerald-500/5 rounded-lg transition-all cursor-pointer border border-emerald-500/20"
                        title="儲存編輯"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        id={`btn-cancel-log-edit-${record.id}`}
                        onClick={cancelEditing}
                        className="p-2 text-zinc-500 hover:bg-zinc-500/5 rounded-lg transition-all cursor-pointer border border-white/5"
                        title="取消"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
