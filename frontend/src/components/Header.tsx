import React from 'react';
import { ShieldAlert, Radio, RefreshCw, LayoutDashboard, Activity, Navigation as NavigationIcon, FileCheck2, MapPin, Eye } from 'lucide-react';
import type { OverviewResponse } from '../types/api';
import { Badge } from './common/Badge';

export type WorkspaceTab = 'overview' | 'historical' | 'live' | 'rescue' | 'evidence';

interface HeaderProps {
  overview: OverviewResponse | null;
  loading: boolean;
  activeWorkspace: WorkspaceTab;
  onSelectWorkspace: (tab: WorkspaceTab) => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  overview,
  loading,
  activeWorkspace,
  onSelectWorkspace,
  onRefresh,
}) => {
  const workspaces: { id: WorkspaceTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard },
    { id: 'historical', label: 'Historical Analysis', icon: Activity },
    { id: 'live', label: 'Live Monitoring', icon: Radio, badge: 'Live' },
    { id: 'rescue', label: 'Rescue Intelligence', icon: NavigationIcon },
    { id: 'evidence', label: 'Data & Evidence', icon: FileCheck2 },
  ];

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#070D18]/95 backdrop-blur-md border-b border-[#1E2D4A] flex items-center justify-between z-30 select-none">
      {/* Brand & Context */}
      <div className="flex items-center space-x-3 sm:space-x-5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 shadow-sm shadow-cyan-950/40">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                Flood<span className="text-cyan-400">Guard</span>
              </span>
              <Badge variant="cyan" size="sm">
                Hybrid Platform
              </Badge>
            </div>
            <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-slate-400">
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>{overview?.aoi.name || 'Alappuzha & Kuttanad, Kerala'}</span>
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-[#1E2D4A] hidden lg:block" />

        {/* Workspace Navigation Tabs (5 Tabs including Live Monitoring) */}
        <nav className="flex items-center bg-[#0D1626] border border-[#1E2D4A] p-1 rounded-xl space-x-1 overflow-x-auto">
          {workspaces.map((ws) => {
            const Icon = ws.icon;
            const isActive = activeWorkspace === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#16243A]/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'} ${ws.id === 'live' ? 'animate-pulse text-emerald-400' : ''}`} />
                <span className="hidden sm:inline">{ws.label}</span>
                {ws.badge && (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                    {ws.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mode Status & Refresh Action */}
      <div className="flex items-center space-x-3">
        {/* Active Mode Status Indicator */}
        <div className="hidden xl:flex items-center space-x-2 px-3 py-1 bg-[#0D1626] border border-[#1E2D4A] rounded-lg">
          {activeWorkspace === 'live' ? (
            <>
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-300">
                Mode: <span className="font-semibold text-emerald-400">Live Environmental Telemetry</span>
              </span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs text-slate-300">
                Mode: <span className="font-semibold text-cyan-300">Historical SAR (Aug 2018)</span>
              </span>
            </>
          )}
        </div>

        {/* Refresh Action */}
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Reload geospatial and environmental metrics"
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0D1626] hover:bg-[#16243A] text-slate-300 hover:text-white border border-[#1E2D4A] rounded-lg text-xs font-medium transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
};
