import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  MapPin,
  RefreshCw,
  Activity,
  User,
  AlertTriangle,
  Clock,
  Satellite
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
    <header className="h-13 px-3 sm:px-5 bg-[#060D17]/95 backdrop-blur-xl border-b border-[#142B42] flex items-center justify-between z-30 select-none font-sans relative">
      {/* Brand & Terminal Metadata */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Terminal Logo Anchor */}
        <div className="flex items-center space-x-2.5">
          <div className="relative p-1.5 bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/40 rounded-lg text-cyan-400 shadow-cyan-glow flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white font-mono leading-none">
                Flood<span className="text-cyan-400">Guard</span>
              </span>
              <span className="hidden sm:inline text-[9px] uppercase font-mono tracking-widest text-cyan-300 px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-700/50 rounded">
                OPS TERMINAL
              </span>
            </div>
            <div className="text-[9px] text-slate-500 font-mono hidden md:block leading-none mt-0.5">
              AUTONOMOUS SATELLITE & DISASTER INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-[#142B42] hidden md:block" />

        {/* Tactical Coordinates & Region Anchor */}
        <div className="hidden lg:flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-slate-300 px-2 py-1 rounded bg-[#091522] border border-[#142B42]">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white">{currentRegionName}</span>
            <span className="text-[10px] text-cyan-400/80 pl-1 font-mono">9.498°N 76.338°E</span>
          </div>

          <div className="hidden xl:flex items-center space-x-1.5 text-[10px] text-slate-400 px-2 py-1 rounded bg-[#091522] border border-[#142B42]">
            <Satellite className="w-3.5 h-3.5 text-teal-400" />
            <span>SENTINEL-1A • ORBIT 56</span>
          </div>
        </div>
      </div>

      {/* Center Live Clock & Operational Status */}
      <div className="hidden 2xl:flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#091522] border border-[#142B42] text-[10px] font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">SYSTEM:</span>
          <span className="text-emerald-400 font-bold">{operationalStatus}</span>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-slate-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime}</span>
        </div>
      </div>

      {/* Right Actions & Mode Switcher */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Active Emergency Alert Pill */}
        {activeAlertCount > 0 && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs font-mono font-bold animate-pulse shadow-danger-glow">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{activeAlertCount} CRITICAL ALERT{activeAlertCount === 1 ? '' : 'S'}</span>
          </div>
        )}

        {/* Dual-Experience Toggle Pill */}
        <div className="flex items-center bg-[#091522] border border-[#142B42] p-1 rounded-xl text-xs">
          <button
            onClick={() => onSwitchMode('citizen')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              appMode === 'citizen'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-teal-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Public Citizen
          </button>
          <button
            onClick={() => onSwitchMode('command')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              appMode === 'command'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Command Center
          </button>
        </div>

        {/* Telemetry Trigger */}
        {onOpenSystemDiagnostics && (
          <button
            onClick={onOpenSystemDiagnostics}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#091522] hover:bg-[#10243A] text-slate-300 border border-[#142B42] rounded-lg text-xs font-mono transition-colors cursor-pointer"
            title="System Diagnostics & Provenance"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telemetry</span>
          </button>
        )}

        {/* Data Ingest Sync Button */}
        <button
          onClick={onRefresh}
          className="p-2 bg-[#091522] hover:bg-[#10243A] text-slate-300 border border-[#142B42] rounded-lg transition-colors cursor-pointer"
          title="Force Ingest Telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        {/* User Identity / Role Pill */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-[#091522] hover:bg-[#10243A] border border-[#142B42] rounded-xl text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
        >
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-mono text-xs">
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
