import React from "react";
import { Clock, Calendar, Activity, Database } from "lucide-react";

interface MobileBottomNavbarProps {
  mobileActiveTab: "timer" | "history" | "inventory" | "stats";
  setMobileActiveTab: (tab: "timer" | "history" | "inventory" | "stats") => void;
}

export const MobileBottomNavbar: React.FC<MobileBottomNavbarProps> = ({
  mobileActiveTab,
  setMobileActiveTab
}) => {
  const tabs = [
    { id: "timer" as const, label: "工作台", icon: Clock },
    { id: "inventory" as const, label: "熟成豆庫", icon: Database },
    { id: "stats" as const, label: "萃取曲線", icon: Activity },
    { id: "history" as const, label: "歷史日誌", icon: Calendar },
  ];

  const activeIndex = tabs.findIndex((t) => t.id === mobileActiveTab);

  return (
    <nav className="lg:hidden fixed bottom-6 left-4 right-4 max-w-md mx-auto bg-[#140e0b]/90 backdrop-blur-xl border border-[#c68642]/25 rounded-full z-40 flex items-center justify-between py-2 px-2 shadow-[0_10px_30px_rgba(0,0,0,0.8),_0_0_15px_rgba(198,134,66,0.15)] overflow-hidden">
      {/* Sliding Active Pill Background Indicator */}
      <div 
        className="absolute h-[80%] top-[10%] bg-[#c68642]/20 border border-[#c68642]/30 rounded-full transition-all duration-300 ease-out z-0"
        style={{
          width: "22%",
          left: `${activeIndex * 25 + 1.5}%`,
        }}
      />

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = mobileActiveTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`nav-btn-${tab.id}`}
            onClick={() => setMobileActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 z-10 transition-transform active:scale-95 duration-200 cursor-pointer"
          >
            <Icon 
              className={`w-5 h-5 transition-all duration-300 ${
                isActive ? "text-[#e0b034] scale-110 drop-shadow-[0_0_5px_rgba(224,176,52,0.5)]" : "text-zinc-500 hover:text-zinc-400"
              }`} 
            />
            <span 
              className={`text-[9px] font-black tracking-wider transition-all duration-300 ${
                isActive ? "text-[#f4eae0] opacity-100" : "text-zinc-500 opacity-80"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
