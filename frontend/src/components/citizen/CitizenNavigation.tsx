import React from 'react';
import {
  ShieldCheck,
  Map,
  Home,
  AlertTriangle,
  Clock
} from 'lucide-react';
import type { CitizenTab } from '../../types/citizen';

interface CitizenNavigationProps {
  activeTab: CitizenTab;
  onSelectTab: (tab: CitizenTab) => void;
  reportCount?: number;
}

export const CitizenNavigation: React.FC<CitizenNavigationProps> = ({
  activeTab,
  onSelectTab,
  reportCount = 0
}) => {
  const tabs: { id: CitizenTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'overview', label: 'Home', icon: ShieldCheck },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'shelters', label: 'Shelters', icon: Home },
    { id: 'report', label: 'Report', icon: AlertTriangle, badge: 'SOS' },
    { id: 'activity', label: 'My Activity', icon: Clock, badge: reportCount > 0 ? `${reportCount}` : undefined },
  ];

  return (
    <div className="bg-[#07111F] border-b border-[#1E3550] px-3 sm:px-6 py-2 select-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between sm:justify-center sm:space-x-3 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                  tab.id === 'report'
                    ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
