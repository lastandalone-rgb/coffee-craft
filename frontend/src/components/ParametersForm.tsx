import React, { useState } from "react";
import { Compass, Plus, Star } from "lucide-react";
import { CoffeeBean } from "../types/coffee";

interface ParametersFormProps {
  brewType: "pour_over" | "espresso";
  selectedBeanId: string;
  beanName: string;
  activeBeans: CoffeeBean[];
  uniqueBeans: string[];
  grindSize: string;
  waterTemp: string;
  coffeeWeight: string;
  waterWeight: string;
  liquidWeight: string;
  preinfusionTime: string;
  pressure: string;
  rating: number;
  notes: string;
  setIsAddBeanModalOpen: (open: boolean) => void;
  handleBeanChange: (beanId: string) => void;
  setBeanName: (name: string) => void;
  setSelectedBeanId: (id: string) => void;
  setGrindSize: (val: string) => void;
  setWaterTemp: (val: string) => void;
  setCoffeeWeight: (val: string) => void;
  setWaterWeight: (val: string) => void;
  setLiquidWeight: (val: string) => void;
  setPreinfusionTime: (val: string) => void;
  setPressure: (val: string) => void;
  setRating: (val: number) => void;
  setNotes: (val: string) => void;
  calcRatio: () => string;
}

interface SliderInputProps {
  label: string;
  value: string;
  unit?: string;
  placeholder?: string;
  min: number;
  max: number;
  step: number;
  active: boolean;
  onToggle: () => void;
  onChange: (val: string) => void;
  displayValueMapper?: (val: string) => string;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  unit = "",
  placeholder = "",
  min,
  max,
  step,
  active,
  onToggle,
  onChange,
  displayValueMapper
}) => {
  // Parse numeric representation of value
  const numericValue = parseFloat(value) || min;

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = Math.max(min, numericValue - step);
    onChange(newVal.toFixed(step % 1 === 0 ? 0 : 1));
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = Math.min(max, numericValue + step);
    onChange(newVal.toFixed(step % 1 === 0 ? 0 : 1));
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const displayVal = value ? (displayValueMapper ? displayValueMapper(value) : value) : "";

  return (
    <div className="relative flex flex-col gap-1.5 w-full select-none">
      <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{label}</label>
      <div
        onClick={onToggle}
        className={`w-full bg-[#0A0706] border ${
          active ? "border-[#e0b034] ring-1 ring-[#e0b034]/20 shadow-[0_0_10px_rgba(224,176,52,0.1)]" : "border-[#c68642]/20 hover:border-[#c68642]/40"
        } rounded-xl px-3 py-2.5 text-sm text-[#F5EFEB] flex justify-between items-center transition-all cursor-pointer font-medium h-[44px]`}
      >
        <span className={value ? "text-[#F5EFEB]" : "text-zinc-500 font-normal"}>
          {displayVal || placeholder}
        </span>
        {unit && <span className="text-xs text-zinc-500 font-bold">{unit}</span>}
      </div>

      {active && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] p-4 bg-[#130E0C]/98 backdrop-blur-xl border border-[#c68642]/30 rounded-xl flex items-center justify-between shadow-[0_15px_35px_rgba(0,0,0,0.9),_0_0_15px_rgba(198,134,66,0.1)] z-30 transition-all duration-300 min-h-[170px]">
          {/* Left side: massive value display */}
          <div className="flex flex-col justify-center flex-1">
            <span className="text-[9px] text-zinc-500 font-black tracking-wider uppercase mb-1">設定數值 / Value</span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-3xl font-black text-[#e0b034] font-outfit tracking-tight">
                {displayVal}
              </span>
              {unit && <span className="text-sm font-bold text-zinc-400">{unit}</span>}
            </div>
            <div className="mt-3 flex gap-4 text-[9px] text-zinc-500 font-black tracking-wider uppercase">
              <span>MIN: {min}{unit}</span>
              <span>MAX: {max}{unit}</span>
            </div>
          </div>
          
          {/* Right side: vertical slider and adjustment buttons */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleIncrement}
              className="w-8 h-8 rounded-lg bg-[#1C1512] hover:bg-[#c68642]/20 border border-[#c68642]/10 hover:border-[#c68642]/30 text-zinc-400 hover:text-[#e0b034] flex items-center justify-center font-black active:scale-90 transition-all cursor-pointer text-base select-none"
            >
              +
            </button>
            <div className="h-[75px] flex items-center justify-center py-1">
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={numericValue}
                onChange={handleSliderChange}
                style={{
                  WebkitAppearance: "slider-vertical",
                  width: "12px",
                  height: "100%",
                }}
                className="accent-[#e0b034] bg-zinc-950 rounded-lg cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={handleDecrement}
              className="w-8 h-8 rounded-lg bg-[#1C1512] hover:bg-[#c68642]/20 border border-[#c68642]/10 hover:border-[#c68642]/30 text-zinc-400 hover:text-[#e0b034] flex items-center justify-center font-black active:scale-90 transition-all cursor-pointer text-base select-none"
            >
              -
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ParametersForm: React.FC<ParametersFormProps> = ({
  brewType,
  selectedBeanId,
  beanName,
  activeBeans,
  uniqueBeans,
  grindSize,
  waterTemp,
  coffeeWeight,
  waterWeight,
  liquidWeight,
  preinfusionTime,
  pressure,
  rating,
  notes,
  setIsAddBeanModalOpen,
  handleBeanChange,
  setBeanName,
  setSelectedBeanId,
  setGrindSize,
  setWaterTemp,
  setCoffeeWeight,
  setWaterWeight,
  setLiquidWeight,
  setPreinfusionTime,
  setPressure,
  setRating,
  setNotes,
  calcRatio
}) => {
  // Local state to track which parameter slider is active
  const [activePicker, setActivePicker] = useState<string | null>(null);

  const togglePicker = (picker: string) => {
    setActivePicker(activePicker === picker ? null : picker);
  };

  return (
    <div id="parameters-form-panel" className="glass-panel rounded-3xl p-6 md:p-8 border border-white/5 shadow-2xl relative flex-1 flex flex-col">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#c68642]/5 to-transparent rounded-full blur-xl pointer-events-none"></div>
      
      <h2 id="parameters-form-title" className="text-xs font-black text-[#e0b034] mb-6 flex items-center gap-2 uppercase tracking-widest font-outfit">
        <Compass className="w-4 h-4 text-[#c68642]" /> 沖煮參數配置 / Brew Configuration
      </h2>
      
      <div className="grid grid-cols-2 gap-5">
        
        {/* Bean name - spans full width */}
        <div className="col-span-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">咖啡豆種類 / Beans</label>
            <button
              id="btn-register-bean-form"
              type="button"
              onClick={() => setIsAddBeanModalOpen(true)}
              className="text-[11px] text-[#e0b034] hover:text-[#f4eae0] flex items-center gap-1 font-extrabold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> 登記新豆 / Register Bean
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <select
              id="param-bean-select"
              value={selectedBeanId}
              onChange={(e) => handleBeanChange(e.target.value)}
              className="w-full bg-[#0A0706] border border-[#c68642]/20 hover:border-[#c68642]/40 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] focus:ring-1 focus:ring-[#e0b034]/20 transition-all cursor-pointer font-medium"
            >
              <option value="">-- 選擇已登記咖啡豆 (或在下方手動輸入) --</option>
              {activeBeans.map((bean) => (
                <option key={bean.id} value={bean.id} className="bg-[#130E0C]">
                  {bean.name} ({bean.roaster || "無烘焙商"}) - 剩 {bean.current_weight ?? 0}g
                </option>
              ))}
            </select>
            
            <input
              id="param-bean-name-input"
              type="text"
              placeholder="或手動輸入咖啡豆名稱..."
              value={beanName}
              onChange={(e) => {
                setBeanName(e.target.value);
                if (selectedBeanId) setSelectedBeanId("");
              }}
              className="w-full bg-[#0A0706] border border-[#c68642]/20 hover:border-[#c68642]/40 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] focus:ring-1 focus:ring-[#e0b034]/20 transition-all font-medium"
            />
          </div>
          
          {/* Active Bean status badge if selected */}
          {selectedBeanId && (() => {
            const activeBean = activeBeans.find(b => b.id === selectedBeanId);
            if (!activeBean) return null;
            return (
              <div className="mt-3 p-3 bg-[#1C1512]/50 border border-[#c68642]/10 rounded-xl text-xs flex justify-between items-center">
                <div>
                  <span className="text-[#e0b034] font-bold">{activeBean.name}</span>
                  {activeBean.roast_date && (
                    <span className="text-zinc-400 ml-2">烘焙後 {activeBean.days_since_roast} 天</span>
                  )}
                </div>
                {activeBean.peak_status && (
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    activeBean.peak_status === "最佳風味期" ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/20" :
                    activeBean.peak_status === "排氣醒豆中" ? "bg-amber-950/80 text-amber-400 border border-amber-500/20" :
                    "bg-zinc-900 text-zinc-400"
                  }`}>
                    {activeBean.peak_status}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Quick Bean selection from history */}
          {uniqueBeans.length > 0 && !selectedBeanId && (
            <div className="flex flex-wrap gap-1.5 mt-3 items-center">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1">常用豆:</span>
              {uniqueBeans.map((bean) => (
                <button
                  key={bean}
                  type="button"
                  onClick={() => {
                    setBeanName(bean);
                    setSelectedBeanId("");
                  }}
                  className="text-[10px] bg-[#1C1512] hover:bg-[#c68642]/10 border border-[#c68642]/10 hover:border-[#c68642]/30 text-zinc-400 hover:text-[#e0b034] rounded-lg px-2.5 py-1 transition-all cursor-pointer font-medium"
                >
                  {bean}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grind size */}
        <SliderInput
          label="研磨刻度 / Grind"
          value={grindSize}
          placeholder={brewType === "espresso" ? "選擇刻度" : "選擇格數"}
          min={brewType === "espresso" ? 1.0 : 10}
          max={brewType === "espresso" ? 10.0 : 40}
          step={brewType === "espresso" ? 0.1 : 1}
          active={activePicker === "grind"}
          onToggle={() => togglePicker("grind")}
          onChange={setGrindSize}
          displayValueMapper={(val) => brewType === "espresso" ? `刻度 ${val}` : `${val} 格`}
        />

        {/* Water Temperature */}
        <SliderInput
          label="水溫 / Temp"
          value={waterTemp}
          placeholder="選擇水溫"
          min={80}
          max={100}
          step={1}
          unit="°C"
          active={activePicker === "temp"}
          onToggle={() => togglePicker("temp")}
          onChange={setWaterTemp}
        />

        {/* Coffee beans weight / Dose */}
        <SliderInput
          label="咖啡粉量 / Dose"
          value={coffeeWeight}
          placeholder="選擇粉量"
          min={10.0}
          max={25.0}
          step={0.1}
          unit="g"
          active={activePicker === "dose"}
          onToggle={() => togglePicker("dose")}
          onChange={setCoffeeWeight}
        />

        {/* Mode Specific: Liquid yield (Espresso) OR Water weight (Pour Over) */}
        {brewType === "espresso" ? (
          <>
            <SliderInput
              label="出液量 / Yield"
              value={liquidWeight}
              placeholder="選擇液重"
              min={15.0}
              max={80.0}
              step={0.5}
              unit="g"
              active={activePicker === "yield"}
              onToggle={() => togglePicker("yield")}
              onChange={setLiquidWeight}
            />

            <SliderInput
              label="預浸時間 / Pre-infusion"
              value={preinfusionTime}
              placeholder="選擇時間"
              min={0}
              max={30}
              step={1}
              unit="s"
              active={activePicker === "preinfusion"}
              onToggle={() => togglePicker("preinfusion")}
              onChange={setPreinfusionTime}
            />

            <SliderInput
              label="萃取壓力 / Pressure"
              value={pressure}
              placeholder="選擇壓力"
              min={1.0}
              max={12.0}
              step={0.1}
              unit="bar"
              active={activePicker === "pressure"}
              onToggle={() => togglePicker("pressure")}
              onChange={setPressure}
              displayValueMapper={(val) => `${val} bar`}
            />
          </>
        ) : (
          <SliderInput
            label="總注水量 / Water"
            value={waterWeight}
            placeholder="選擇水重"
            min={100}
            max={500}
            step={5}
            unit="g"
            active={activePicker === "water"}
            onToggle={() => togglePicker("water")}
            onChange={setWaterWeight}
          />
        )}

        {/* Brew Ratio - Readonly indicator */}
        <div id="param-brew-ratio-display" className="col-span-2 bg-[#0A0706] rounded-xl px-4 py-3.5 border border-[#c68642]/10 flex justify-between items-center mt-1">
          <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            {brewType === "espresso" ? "粉液比例 (Ratio)" : "粉水比率 (Ratio)"}
          </span>
          <span className="text-base font-extrabold text-[#e0b034] font-outfit">{calcRatio()}</span>
        </div>

        {/* Rating */}
        <div className="col-span-2 mt-1">
          <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">風味評分 / Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                id={`btn-param-rating-${star}`}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-125 hover:rotate-12 transition-all cursor-pointer"
              >
                <Star
                  className={`w-6 h-6 transition-all ${
                    star <= rating
                      ? "text-[#e0b034] fill-[#e0b034] drop-shadow-[0_0_5px_rgba(224,176,52,0.4)]"
                      : "text-zinc-800"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Flavor notes */}
        <div className="col-span-2">
          <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-2">風味與心得筆記 / Notes</label>
          <textarea
            id="param-flavor-notes-input"
            placeholder={
              brewType === "espresso"
                ? "可填寫：油脂(Crema)厚度、酸甜比、通道效應、流速調整..."
                : "可填寫：甜感高、酸味明亮、中段柑橘風味..."
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full bg-[#0A0706] border border-[#c68642]/20 hover:border-[#c68642]/40 rounded-xl px-4 py-3 text-sm text-[#F5EFEB] focus:outline-none focus:border-[#e0b034] focus:ring-1 focus:ring-[#e0b034]/20 transition-all resize-none font-medium"
          />
        </div>

        {/* Dynamic spacer to prevent absolute floating pickers from getting cut off at the bottom */}
        {activePicker && (
          <div id="param-active-picker-spacer" className="col-span-2 h-[150px] pointer-events-none transition-all duration-300" />
        )}

      </div>
    </div>
  );
};
