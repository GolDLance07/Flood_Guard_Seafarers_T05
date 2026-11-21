import React, { useState } from 'react';
import {
  ShieldAlert,
  ChevronDown,
  Navigation,
  Search,
  Lock,
  User,
  Shield,
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
  regionsList,
  onSelectRegion,
  onSwitchToCommand
}) => {
  const { user, role, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRegions = regionsList.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="bg-[#07111F]/95 backdrop-blur-md border-b border-[#1E3550] sticky top-0 z-40 select-none">
      {/* Top Emergency Advisory Bar */}
      <div className="bg-amber-950/40 border-b border-amber-900/40 px-4 py-1 text-[11px] text-amber-200/90 flex items-center justify-between">
        <div className="flex items-center space-x-1.5 truncate">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="truncate">
            Official instructions from District Administration and NDMA take precedence. Call <strong>1077</strong> for emergency rescue.
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[10px] text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-900/40 border border-amber-700/50">
          PUBLIC SAFETY PORTAL
        </span>
      </div>

      <div className="h-14 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand & Citizen Mode Identity */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-sm shadow-cyan-950/40">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-white font-mono">
                  Flood<span className="text-cyan-400">Guard</span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-mono">
                  Public Safety
                </span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Real-Time Flood Warnings & Verified Shelter Directory
              </span>
            </div>
          </div>
        </div>

        {/* Region Selector & Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Geographical Basin Selector */}
          <div className="relative">
            <button
              onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#10243A] border border-[#1E3550] hover:border-cyan-500/50 rounded-xl text-xs text-white transition shadow-sm cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="font-semibold max-w-[120px] sm:max-w-[180px] truncate">
                {currentRegion.name}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isRegionDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-[#10243A] border border-[#1E3550] rounded-xl shadow-2xl overflow-hidden p-2.5 w-72 sm:w-80 space-y-2 backdrop-blur-xl">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search city, district, state..."
                    className="w-full bg-[#07111F] border border-[#1E3550] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    autoFocus
                  />
                </div>

                <div className="text-[10px] uppercase font-bold text-slate-400 px-1 pt-1 border-t border-[#1E3550]">
                  Preset Flood Monitoring Basins
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {PRESET_REGIONS.map(pr => (
                    <button
                      key={pr.id}
                      onClick={() => {
                        onSelectRegion(pr.id);
                        setIsRegionDropdownOpen(false);
                      }}
                      className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition cursor-pointer ${
                        currentRegion.id === pr.id
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                          : 'text-slate-300 hover:bg-[#16243A]'
                      }`}
                    >
                      <span>{pr.icon}</span>
                      <span className="truncate">{pr.label}</span>
                    </button>
                  ))}
                </div>

                {filteredRegions.length > 0 && searchQuery && (
                  <div className="max-h-40 overflow-y-auto space-y-1 pt-1 border-t border-[#1E2D4A]">
                    {filteredRegions.map(r => (
                      <div
                        key={r.id}
                        onClick={() => {
                          onSelectRegion(r.id);
                          setIsRegionDropdownOpen(false);
                        }}
                        className="px-2 py-1.5 rounded-lg cursor-pointer text-xs text-slate-200 hover:bg-[#16243A] flex justify-between items-center"
                      >
                        <span className="font-medium truncate">{r.name}</span>
                        <span className="text-[10px] text-slate-400 ml-1">{r.state}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Identity & Role Trigger */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-xl text-xs font-medium transition cursor-pointer ${
              isAuthenticated
                ? 'bg-[#0D1626] border-[#1E2D4A] text-slate-200'
                : 'bg-[#0D1626] border-[#1E2D4A] text-slate-300 hover:text-white'
            }`}
          >
            {isAuthenticated ? (
              <>
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline text-xs font-mono">
                  {user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  {role.replace('_', ' ')}
                </span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Sign In</span>
              </>
            )}
          </button>

          {/* Switch to Command Center */}
          <button
            onClick={onSwitchToCommand}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0D1626] hover:bg-cyan-950/40 border border-cyan-800/60 hover:border-cyan-500/70 text-cyan-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
            title="Switch to FloodGuard Command Tactical Workspace"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Command Portal</span>
          </button>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </header>
  );
};
