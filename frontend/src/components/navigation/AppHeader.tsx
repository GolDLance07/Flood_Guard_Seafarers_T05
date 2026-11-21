import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  MapPin,
  RefreshCw,
  Activity,
  User,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';

interface AppHeaderProps {
  appMode: 'citizen' | 'command';
  onSwitchMode: (mode: 'citizen' | 'command') => void;
  currentRegionName?: string;
  loading: boolean;
  onRefresh: () => void;
  onOpenSystemDiagnostics?: () => void;
  activeAlertCount?: number;
  operationalStatus?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  appMode,
  onSwitchMode,
  currentRegionName = 'Alappuzha, Kerala',
  loading,
  onRefresh,
  onOpenSystemDiagnostics,
  activeAlertCount = 0,
  operationalStatus = 'ACTIVE MONITORING',
}) => {
  const { user, role, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().slice(11, 19) + ' UTC • ' +
        now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const roleVariant: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' =
    role === 'administrator' ? 'rose' :
    role === 'district_authority' ? 'amber' :
    role === 'field_team' ? 'emerald' :
    role === 'citizen' ? 'cyan' : 'slate';

  return (
    <header className="h-12 px-4 bg-[#07111F]/95 backdrop-blur-md border-b border-[#203A52] flex items-center justify-between z-30 select-none font-sans">
      {/* Brand & Context */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm tracking-tight text-white font-mono">
              Flood<span className="text-cyan-400">Guard</span>
            </span>
            <span className="hidden sm:inline text-[9px] uppercase font-mono tracking-widest text-cyan-400/90 px-1.5 py-0.2 bg-cyan-950/60 border border-cyan-800/40 rounded">
              GEOSPATIAL INTEL
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-[#203A52] hidden md:block" />

        {/* Region Location Tag */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-300 font-mono">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-white">{currentRegionName}</span>
        </div>

        {/* Operational Status Pill */}
        <div className="hidden xl:flex items-center space-x-1 px-2 py-0.5 rounded bg-[#10243A] border border-[#203A52] text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 uppercase">STATUS:</span>
          <span className="text-emerald-400 font-bold">{operationalStatus}</span>
        </div>
      </div>

      {/* Center Live Clock */}
      <div className="hidden 2xl:flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
        <Clock className="w-3 h-3 text-cyan-400" />
        <span>{currentTime}</span>
      </div>

      {/* Center / Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Active Alert Pill if any */}
        {activeAlertCount > 0 && (
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-600/70 text-rose-300 text-[10px] font-mono font-bold animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>{activeAlertCount} ALERT{activeAlertCount === 1 ? '' : 'S'}</span>
          </div>
        )}

        {/* Mode Switcher Pill */}
        <div className="flex items-center bg-[#091522] border border-[#203A52] p-0.5 rounded-lg text-xs">
          <button
            onClick={() => onSwitchMode('citizen')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              appMode === 'citizen'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Public Citizen
          </button>
          <button
            onClick={() => onSwitchMode('command')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              appMode === 'command'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Command Center
          </button>
        </div>

        {/* Secondary: System Diagnostics Trigger */}
        {onOpenSystemDiagnostics && (
          <button
            onClick={onOpenSystemDiagnostics}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-[#10243A] hover:bg-[#142B42] text-slate-300 border border-[#203A52] rounded-lg text-[11px] font-mono transition-colors cursor-pointer"
            title="System Diagnostics & Provenance"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telemetry</span>
          </button>
        )}

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          className="p-1.5 bg-[#10243A] hover:bg-[#142B42] text-slate-300 border border-[#203A52] rounded-lg transition-colors cursor-pointer"
          title="Refresh Data Feeds"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        {/* User Identity / Role Pill */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#10243A] hover:bg-[#142B42] border border-[#203A52] rounded-lg text-xs font-semibold text-slate-300 cursor-pointer transition-colors"
        >
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-mono text-[11px]">
            {isAuthenticated ? user?.email?.split('@')[0] : 'Sign In'}
          </span>
          <Badge variant={roleVariant} size="sm">
            {role.replace('_', ' ')}
          </Badge>
        </button>
      </div>

      {isAuthModalOpen && <AuthModal onClose={() => setIsAuthModalOpen(false)} />}
    </header>
  );
};
