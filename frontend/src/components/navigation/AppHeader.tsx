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
    <header className="h-12 px-3 sm:px-4 bg-[#07111F] border-b border-[#203A52] flex items-center justify-between z-30 select-none font-sans relative">
      {/* Brand & Terminal Metadata */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Terminal Logo Anchor */}
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-[#10243A] border border-[#203A52] rounded text-[#16B8D4] flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-[#16B8D4]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#E8F0F7] font-mono leading-none">
                Flood<span className="text-[#16B8D4]">Guard</span>
              </span>
              <span className="hidden sm:inline text-[9px] uppercase font-mono tracking-widest text-[#16B8D4] px-1.5 py-0.2 bg-[#10243A] border border-[#203A52] rounded">
                MISSION CONTROL
              </span>
            </div>
            <div className="text-[9px] text-[#8DA3B8] font-mono hidden md:block leading-none mt-0.5">
              AUTONOMOUS SATELLITE & DISASTER INTELLIGENCE
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-[#203A52] hidden md:block" />

        {/* Tactical Coordinates & Region Anchor */}
        <div className="hidden lg:flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center space-x-1.5 text-[#8DA3B8] px-2 py-1 rounded bg-[#091522] border border-[#203A52]">
            <MapPin className="w-3.5 h-3.5 text-[#16B8D4]" />
            <span className="font-semibold text-[#E8F0F7]">{currentRegionName}</span>
            <span className="text-[10px] text-[#16B8D4] pl-1 font-mono">9.498°N 76.338°E</span>
          </div>

          <div className="hidden xl:flex items-center space-x-1.5 text-[10px] text-[#8DA3B8] px-2 py-1 rounded bg-[#091522] border border-[#203A52]">
            <Satellite className="w-3.5 h-3.5 text-[#18A58B]" />
            <span>SENTINEL-1A • ORBIT 56</span>
          </div>
        </div>
      </div>

      {/* Center Live Clock & Operational Status */}
      <div className="hidden 2xl:flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-[#091522] border border-[#203A52] text-[10px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#18A58B]" />
          <span className="text-[#8DA3B8]">SYSTEM:</span>
          <span className="text-[#18A58B] font-bold">{operationalStatus}</span>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-[#8DA3B8] font-mono">
          <Clock className="w-3.5 h-3.5 text-[#16B8D4]" />
          <span>{currentTime}</span>
        </div>
      </div>

      {/* Right Actions & Mode Switcher */}
      <div className="flex items-center space-x-2 sm:space-x-2.5">
        {/* Active Emergency Alert Pill */}
        {activeAlertCount > 0 && (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#E45555]/10 border border-[#E45555] text-[#E45555] text-xs font-mono font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-[#E45555]" />
            <span>{activeAlertCount} CRITICAL ALERT{activeAlertCount === 1 ? '' : 'S'}</span>
          </div>
        )}

        {/* Dual-Experience Toggle Pill */}
        <div className="flex items-center bg-[#091522] border border-[#203A52] p-0.5 rounded text-xs font-mono">
          <button
            onClick={() => onSwitchMode('citizen')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              appMode === 'citizen'
                ? 'bg-[#10243A] text-[#18A58B] border border-[#18A58B]'
                : 'text-[#8DA3B8] hover:text-[#E8F0F7]'
            }`}
          >
            Public Citizen
          </button>
          <button
            onClick={() => onSwitchMode('command')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              appMode === 'command'
                ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4]'
                : 'text-[#8DA3B8] hover:text-[#E8F0F7]'
            }`}
          >
            Command Center
          </button>
        </div>

        {/* Telemetry Trigger */}
        {onOpenSystemDiagnostics && (
          <button
            onClick={onOpenSystemDiagnostics}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#091522] hover:bg-[#10243A] text-[#8DA3B8] hover:text-[#E8F0F7] border border-[#203A52] rounded text-xs font-mono transition-colors cursor-pointer"
            title="System Diagnostics & Provenance"
          >
            <Activity className="w-3.5 h-3.5 text-[#18A58B]" />
            <span>Telemetry</span>
          </button>
        )}

        {/* Data Ingest Sync Button */}
        <button
          onClick={onRefresh}
          className="p-1.5 bg-[#091522] hover:bg-[#10243A] text-[#8DA3B8] hover:text-[#E8F0F7] border border-[#203A52] rounded transition-colors cursor-pointer"
          title="Force Ingest Telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#16B8D4]' : ''}`} />
        </button>

        {/* User Identity / Role Pill */}
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-[#091522] hover:bg-[#10243A] border border-[#203A52] rounded text-xs font-medium text-[#E8F0F7] cursor-pointer transition-colors"
        >
          <User className="w-3.5 h-3.5 text-[#16B8D4]" />
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
