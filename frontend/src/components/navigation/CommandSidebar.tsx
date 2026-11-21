import React from 'react';
import {
  LayoutDashboard,
  Radio,
  AlertTriangle,
  Users,
  Compass,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';

export type CommandWorkspaceId = 'overview' | 'intelligence' | 'operations' | 'teams' | 'resources';

interface CommandSidebarProps {
  activeWorkspace: CommandWorkspaceId;
  onSelectWorkspace: (workspace: CommandWorkspaceId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSystemDiagnostics?: () => void;
}

export const CommandSidebar: React.FC<CommandSidebarProps> = ({
  activeWorkspace,
  onSelectWorkspace,
  collapsed,
  onToggleCollapse,
  onOpenSystemDiagnostics,
}) => {
  const workspaces: {
    id: CommandWorkspaceId;
    label: string;
    sublabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Situation Room',
      sublabel: 'Geospatial Briefing',
      icon: LayoutDashboard,
    },
    {
      id: 'intelligence',
      label: 'Satellite Studio',
      sublabel: 'SAR Radar & Risk',
      icon: Radio,
      badge: 'LIVE',
    },
    {
      id: 'operations',
      label: 'Incident Command',
      sublabel: 'Triage & Dispatch',
      icon: AlertTriangle,
    },
    {
      id: 'teams',
      label: 'Live Response',
      sublabel: 'Field Units & Beacon',
      icon: Users,
    },
    {
      id: 'resources',
      label: 'Relief & Routing',
      sublabel: 'Shelters & Logistics',
      icon: Compass,
    },
  ];

  return (
    <aside
      className={`h-full bg-[#060D17] border-r border-[#142B42] flex flex-col justify-between transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Primary Workspaces Navigation */}
      <div className="p-2 space-y-1">
        <div className={`px-2 py-1.5 text-[9px] font-mono uppercase text-slate-500 font-bold tracking-wider ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? 'OPS' : 'OPERATIONAL WORKSPACES'}
        </div>

        {workspaces.map((ws) => {
          const Icon = ws.icon;
          const isActive = activeWorkspace === ws.id;

          return (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              title={collapsed ? `${ws.label}: ${ws.sublabel}` : undefined}
              className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/40 shadow-cyan-glow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0D1D2D] border border-transparent'
              }`}
            >
              <div className="flex-shrink-0">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  } ${ws.badge === 'LIVE' ? 'text-emerald-400' : ''}`}
                />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{ws.label}</span>
                    {ws.badge && (
                      <span className="text-[8px] uppercase font-mono px-1 py-0.2 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-700/60 animate-pulse">
                        {ws.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 truncate block font-mono">
                    {ws.sublabel}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Area: Technical Diagnostics & Sidebar Collapse */}
      <div className="p-2 border-t border-[#142B42] space-y-1">
        {onOpenSystemDiagnostics && (
          <button
            onClick={onOpenSystemDiagnostics}
            title={collapsed ? 'Data & System Diagnostics' : undefined}
            className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-left text-slate-400 hover:text-slate-200 hover:bg-[#0D1D2D] transition-colors cursor-pointer border border-transparent"
          >
            <div className="flex-shrink-0">
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold block truncate">Provenance & Data</span>
                <span className="text-[9px] text-slate-500 block truncate font-mono">System Integrity</span>
              </div>
            )}
          </button>
        )}

        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-2 text-slate-500 hover:text-slate-300 hover:bg-[#0D1D2D] rounded-xl transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
