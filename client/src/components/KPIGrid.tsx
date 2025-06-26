import React from 'react';
import { kpiCards, KPI } from './mockData';
import { Target, Truck, Leaf, TrendingUp } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Target,
  Truck,
  Leaf,
  TrendingUp,
};

const KPIGrid: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    {kpiCards.map((kpi, idx) => {
      const Icon = iconMap[kpi.icon] || Target;
      return (
        <div
          key={kpi.title}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 shadow-2xl flex flex-col items-center justify-center hover:scale-105 transition-transform duration-300 cursor-pointer"
        >
          <Icon className="w-8 h-8 mb-2 text-blue-300" />
          <div className="text-4xl font-bold text-white mb-1">{kpi.value}</div>
          <div className="text-lg text-purple-300 font-semibold mb-1">{kpi.title}</div>
          <div className="text-sm text-gray-400">{kpi.description}</div>
        </div>
      );
    })}
  </div>
);

export default KPIGrid; 