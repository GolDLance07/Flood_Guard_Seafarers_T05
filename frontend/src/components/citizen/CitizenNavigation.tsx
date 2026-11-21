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
    <div className="bg-[#07111F] border-b border-[#203A52] px-3 sm:px-6 py-1.5 select-none font-sans">
      <div className="max-w-4xl mx-auto flex items-center justify-between sm:justify-center sm:space-x-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4]'
                  : 'text-[#8DA3B8] hover:text-[#E8F0F7] hover:bg-[#091522] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#16B8D4]' : 'text-[#8DA3B8]'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                  tab.id === 'report'
                    ? 'bg-[#E45555]/10 text-[#E45555] border border-[#E45555]/40'
                    : 'bg-[#10243A] text-[#16B8D4] border border-[#203A52]'
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
