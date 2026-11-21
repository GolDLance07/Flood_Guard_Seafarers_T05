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
    { id: 'overview', label: 'Safety Overview', icon: ShieldCheck },
    { id: 'map', label: 'Risk Map', icon: Map },
    { id: 'shelters', label: 'Safe Shelters', icon: Home },
    { id: 'report', label: 'Report Emergency', icon: AlertTriangle, badge: 'Submit' },
    { id: 'activity', label: 'My Activity', icon: Clock, badge: reportCount > 0 ? `${reportCount}` : undefined },
  ];

  return (
    <div className="bg-[#070D18] border-b border-[#1E2D4A] px-4 sm:px-6 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between sm:justify-center sm:space-x-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#16243A]/60 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                  tab.id === 'report'
                    ? 'bg-amber-950 text-amber-300 border border-amber-700/60'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
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
