import React, { useState } from 'react';
import {
  ShieldAlert,
  ChevronDown,
  Navigation,
  User,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import type { MonitoringRegion } from '../../types/api';

interface CitizenHeaderProps {
  currentRegion: {
    id: string;
    name: string;
    state: string;
  };
  regionsList: MonitoringRegion[];
  onSelectRegion: (regionId: string) => void;
  onSwitchToCommand: () => void;
}

const PRESET_REGIONS = [
  { id: 'kerala-alappuzha', label: 'Alappuzha, Kerala', icon: '🌴' },
  { id: 'assam-guwahati', label: 'Guwahati, Assam', icon: '🏔️' },
  { id: 'bihar-patna', label: 'Patna, Bihar', icon: '🏛️' },
  { id: 'gujarat-ahmedabad', label: 'Ahmedabad, Gujarat', icon: '🏭' },
  { id: 'odisha-cuttack', label: 'Cuttack, Odisha', icon: '🌊' },
  { id: 'maharashtra-mumbai', label: 'Mumbai, Maharashtra', icon: '🏙️' }
];

export const CitizenHeader: React.FC<CitizenHeaderProps> = ({
  currentRegion,
  regionsList: _regionsList,
  onSelectRegion,
  onSwitchToCommand
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);

  return (
    <header className="bg-[#07111F] border-b border-[#203A52] sticky top-0 z-40 select-none font-sans">
      {/* Top Emergency Advisory Bar */}
      <div className="bg-[#F0A83B]/10 border-b border-[#F0A83B]/30 px-4 py-1 text-[11px] text-[#F0A83B] flex items-center justify-between">
        <div className="flex items-center space-x-1.5 truncate">
          <AlertTriangle className="w-3.5 h-3.5 text-[#F0A83B] flex-shrink-0" />
          <span className="truncate">
            Official instructions from District Administration and NDMA take precedence. Call <strong>1077</strong> for emergency rescue.
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[10px] text-[#F0A83B] font-bold px-1.5 py-0.2 rounded bg-[#07111F] border border-[#F0A83B]/40">
          PUBLIC SAFETY PORTAL
        </span>
      </div>

      <div className="h-12 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand & Citizen Mode Identity */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1 bg-[#10243A] border border-[#203A52] rounded text-[#16B8D4]">
              <ShieldAlert className="w-4 h-4 text-[#16B8D4]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#E8F0F7] font-mono leading-none">
                  Flood<span className="text-[#16B8D4]">Guard</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#10243A] border border-[#203A52] text-[#18A58B] font-mono">
                  PUBLIC SAFETY
                </span>
              </div>
              <span className="text-[10px] text-[#8DA3B8] hidden sm:inline leading-none mt-0.5 block">
                Real-Time Flood Warnings &amp; Verified Shelter Directory
              </span>
            </div>
          </div>
        </div>

        {/* Region Selector & Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Geographical Basin Selector */}
          <div className="relative">
            <button
              onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#10243A] border border-[#203A52] hover:border-[#16B8D4] rounded text-xs text-[#E8F0F7] transition cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-[#16B8D4] flex-shrink-0" />
              <span className="font-semibold max-w-[120px] sm:max-w-[180px] truncate">
                {currentRegion.name}
              </span>
              <ChevronDown className="w-3 h-3 text-[#8DA3B8]" />
            </button>

            {isRegionDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-[#091522] border border-[#203A52] rounded shadow-2xl p-2 z-50 font-mono text-xs space-y-2">
                <div className="text-[9px] text-[#8DA3B8] uppercase font-bold px-1">
                  Monitoring Region
                </div>
                <div className="space-y-1">
                  {PRESET_REGIONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onSelectRegion(r.id);
                        setIsRegionDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center space-x-2 transition cursor-pointer ${
                        currentRegion.id === r.id
                          ? 'bg-[#10243A] text-[#16B8D4] font-bold border border-[#203A52]'
                          : 'text-[#8DA3B8] hover:text-[#E8F0F7] hover:bg-[#10243A]'
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Sign In */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1 bg-[#091522] hover:bg-[#10243A] border border-[#203A52] rounded text-xs text-[#8DA3B8] hover:text-[#E8F0F7] cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[#16B8D4]" />
            <span className="hidden sm:inline font-mono">
              {isAuthenticated ? user?.email?.split('@')[0] : 'Sign In'}
            </span>
          </button>

          {/* Command Center Mode Switch */}
          <button
            onClick={onSwitchToCommand}
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#10243A] hover:bg-[#142B42] text-[#16B8D4] border border-[#16B8D4] rounded text-xs font-mono font-bold cursor-pointer"
          >
            <span>Command Portal</span>
          </button>
        </div>
      </div>

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
    </header>
  );
};
