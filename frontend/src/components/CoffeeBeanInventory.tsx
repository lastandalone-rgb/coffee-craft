import React, { useState } from "react";
import { Plus, Database, Edit3, Check, X, Calendar, User, Compass, Tag, Scale } from "lucide-react";
import { CoffeeBean } from "../types/coffee";

interface CoffeeBeanInventoryProps {
  activeBeans: CoffeeBean[];
  setIsAddBeanModalOpen: (open: boolean) => void;
  onUpdateBean: (id: string, updates: {
    name: string;
    roaster: string;
    roast_date: string;
    roast_level: "light" | "medium" | "dark";
    origin: string;
    process: string;
    current_weight: string;
  }) => void;
}

export const CoffeeBeanInventory: React.FC<CoffeeBeanInventoryProps> = ({
  activeBeans,
  setIsAddBeanModalOpen,
  onUpdateBean
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Local editing states
  const [editName, setEditName] = useState("");
  const [editRoaster, setEditRoaster] = useState("");
  const [editRoastDate, setEditRoastDate] = useState("");
  const [editRoastLevel, setEditRoastLevel] = useState<"light" | "medium" | "dark">("medium");
  const [editOrigin, setEditOrigin] = useState("");
  const [editProcess, setEditProcess] = useState("");
  const [editCurrentWeight, setEditCurrentWeight] = useState("");

  const startEditing = (bean: CoffeeBean) => {
    setEditingId(bean.id);
    setEditName(bean.name);
    setEditRoaster(bean.roaster || "");
    setEditRoastDate(bean.roast_date ? bean.roast_date.split("T")[0] : "");
    setEditRoastLevel(bean.roast_level || "medium");
    setEditOrigin(bean.origin || "");
    setEditProcess(bean.process || "");
    setEditCurrentWeight(bean.current_weight?.toString() || "0");
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    onUpdateBean(id, {
      name: editName,
      roaster: editRoaster,
      roast_date: editRoastDate,
      roast_level: editRoastLevel,
      origin: editOrigin,
      process: editProcess,
      current_weight: editCurrentWeight
    });
    setEditingId(null);
  };

  return (
    <div id="coffee-bean-inventory-panel" className="glass-panel rounded-2xl p-6 flex-1 flex flex-col">
      <h2 id="coffee-bean-inventory-title" className="text-sm font-bold text-[#e0b034] mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Database className="w-4 h-4" /> 咖啡豆庫存與熟成監測
        </span>
        <button
          id="btn-register-bean-header"
          type="button"
          onClick={() => setIsAddBeanModalOpen(true)}
          className="text-xs text-[#c68642] hover:text-[#e0b034] font-bold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> 登記新豆
        </button>
      </h2>

      <div id="coffee-bean-list" className="flex-1 space-y-3 overflow-y-auto lg:max-h-[500px] pr-1 pb-16">
        {activeBeans.length === 0 ? (
          <div className="text-center py-8 text-xs text-zinc-600">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-30 animate-pulse" />
            目前無在庫咖啡豆，請先登記。
          </div>
        ) : (
          activeBeans.map((bean) => {
            const isEditing = editingId === bean.id;
            return (
              <div
                key={bean.id}
                className={`border rounded-xl p-3 flex flex-col gap-3 transition-all ${
                  isEditing 
                    ? "bg-[#1C1512]/60 border-[#e0b034]/50 shadow-[0_0_15px_rgba(224,176,52,0.1)]" 
                    : "bg-[#140e0b]/60 border-[#c68642]/10 hover:border-[#c68642]/30"
                }`}
              >
                {!isEditing ? (
                  // Display Mode
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-bold text-[#f4eae0] truncate">{bean.name}</span>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-semibold flex-wrap">
                        <span>{bean.roaster || "未知烘焙商"}</span>
                        <span>•</span>
                        <span>烘焙後 {bean.days_since_roast} 天</span>
                        {bean.origin && (
                          <>
                            <span>•</span>
                            <span>{bean.origin}</span>
                          </>
                        )}
                        {bean.process && (
                          <>
                            <span>•</span>
                            <span>{bean.process}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-black text-[#e0b034] font-mono">{bean.current_weight ?? 0}g</span>
                        {bean.peak_status && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider ${
                            bean.peak_status === "最佳風味期" ? "bg-emerald-950/80 text-emerald-400" :
                            bean.peak_status === "排氣醒豆中" ? "bg-amber-950/80 text-amber-400" :
                            "bg-zinc-900 text-zinc-400"
                          }`}>
                            {bean.peak_status}
                          </span>
                        )}
                      </div>

                      <button
                        id={`btn-edit-bean-${bean.id}`}
                        onClick={() => startEditing(bean)}
                        className="p-1.5 text-zinc-600 hover:text-[#e0b034] hover:bg-[#e0b034]/5 rounded-lg transition-all cursor-pointer"
                        title="編輯此咖啡豆庫存"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <div className="flex flex-col gap-3">
                    {/* Name input */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">名稱 / Name</span>
                      <input
                        id={`edit-bean-name-${bean.id}`}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="咖啡豆名稱"
                        className="w-full bg-[#0A0706] border border-[#c68642]/30 rounded-lg px-2.5 py-1.5 text-xs text-[#F5EFEB] focus:outline-none focus:border-[#e0b034]"
                      />
                    </div>

                    {/* Row grid: Roaster, Weight, Date */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5"><User className="w-2.5 h-2.5" /> 烘焙商</span>
                        <input
                          id={`edit-bean-roaster-${bean.id}`}
                          type="text"
                          value={editRoaster}
                          onChange={(e) => setEditRoaster(e.target.value)}
                          placeholder="e.g. Simple Kaffa"
                          className="w-full bg-[#0A0706] border border-[#c68642]/30 rounded-lg px-2 py-1 text-xs text-[#F5EFEB] focus:outline-none focus:border-[#e0b034]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5"><Scale className="w-2.5 h-2.5" /> 餘量</span>
                        <div className="flex items-center bg-[#0A0706] border border-[#c68642]/30 rounded-lg px-2 text-xs">
                          <input
                            id={`edit-bean-weight-${bean.id}`}
                            type="number"
                            value={editCurrentWeight}
                            onChange={(e) => setEditCurrentWeight(e.target.value)}
                            className="w-full bg-transparent border-none text-[#e0b034] font-bold focus:outline-none py-1"
                          />
                          <span className="text-zinc-500 font-bold ml-1 text-[10px]">g</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" /> 烘焙日期</span>
                        <input
                          id={`edit-bean-roast-date-${bean.id}`}
                          type="date"
                          value={editRoastDate}
                          onChange={(e) => setEditRoastDate(e.target.value)}
                          className="w-full bg-[#0A0706] border border-[#c68642]/30 rounded-lg px-2 py-1 text-xs text-[#F5EFEB] focus:outline-none focus:border-[#e0b034]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" /> 焙度</span>
                        <select
                          id={`edit-bean-roast-level-${bean.id}`}
                          value={editRoastLevel}
                          onChange={(e) => setEditRoastLevel(e.target.value as "light" | "medium" | "dark")}
                          className="w-full bg-[#0A0706] border border-[#c68642]/30 rounded-lg px-2 py-1 text-xs text-[#F5EFEB] focus:outline-none focus:border-[#e0b034]"
                        >
                          <option value="light">淺焙 / Light</option>
                          <option value="medium">中焙 / Medium</option>
                          <option value="dark">深焙 / Dark</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5"><Compass className="w-2.5 h-2.5" /> 產區/莊園</span>
                        <input
                          id={`edit-bean-origin-${bean.id}`}
                          type="text"
                          value={editOrigin}
                          onChange={(e) => setEditOrigin(e.target.value)}
                          placeholder="e.g. 耶加雪菲"
                          className="w-full bg-[#0A0706] border border-[#c68642]/30 rounded-lg px-2 py-1 text-xs text-[#F5EFEB] focus:outline-none focus:border-[#e0b034]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" /> 處理法</span>
                        <input
                          id={`edit-bean-process-${bean.id}`}
                          type="text"
                          value={editProcess}
                          onChange={(e) => setEditProcess(e.target.value)}
                          placeholder="e.g. 日曬"
                          className="w-full bg-[#0A0706] border border-[#c68642]/30 rounded-lg px-2 py-1 text-xs text-[#F5EFEB] focus:outline-none focus:border-[#e0b034]"
                        />
                      </div>
                    </div>

                    {/* Edit Buttons */}
                    <div className="flex gap-2 justify-end mt-1">
                      <button
                        id={`btn-cancel-bean-edit-${bean.id}`}
                        onClick={cancelEditing}
                        className="px-2.5 py-1 border border-white/5 text-[10px] text-zinc-400 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-zinc-800/10"
                      >
                        <X className="w-3.5 h-3.5" /> 取消
                      </button>
                      <button
                        id={`btn-save-bean-edit-${bean.id}`}
                        onClick={() => saveEdit(bean.id)}
                        className="px-2.5 py-1 border border-emerald-500/20 text-[10px] text-emerald-400 bg-emerald-950/10 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-emerald-950/20"
                      >
                        <Check className="w-3.5 h-3.5" /> 儲存
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
