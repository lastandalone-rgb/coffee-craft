export interface BrewRecord {
  id: string;
  bean_name: string;
  grind_size: string | null;
  water_temp: number | null;
  coffee_weight: number | null;
  water_weight: number | null;
  brew_time: number | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
  brew_type: string;
  liquid_weight: number | null;
  preinfusion_time: number | null;
  pressure: number | null;
}

export interface StatsSummary {
  total_brews: number;
  avg_rating: number;
  avg_coffee_weight: number;
  avg_water_weight: number;
  avg_liquid_weight: number;
  avg_brew_time: number;
  avg_preinfusion_time: number;
  avg_water_temp: number;
  avg_pressure: number;
  favorite_bean: string;
}

export interface ChartDataPoint {
  date_label?: string;
  week_label?: string;
  month_label?: string;
  count: number;
  total_coffee: number;
  total_water: number;
}

export interface StatsResponse {
  summary: StatsSummary;
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
}
