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
      className={`h-full bg-[#07111F] border-r border-[#203A52] flex flex-col justify-between transition-all duration-200 select-none z-20 ${
        collapsed ? 'w-12' : 'w-52'
      }`}
    >
      {/* Primary Workspaces Navigation */}
      <div className="p-2 space-y-1">
        <div className={`px-2 py-1 text-[9px] font-mono uppercase text-[#8DA3B8] font-bold tracking-wider ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? 'OPS' : 'WORKSPACES'}
        </div>

        {workspaces.map((ws) => {
          const Icon = ws.icon;
          const isActive = activeWorkspace === ws.id;

          return (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              title={collapsed ? `${ws.label}: ${ws.sublabel}` : undefined}
              className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded text-left transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4]'
                  : 'text-[#8DA3B8] hover:text-[#E8F0F7] hover:bg-[#091522] border border-transparent'
              }`}
            >
              <div className="flex-shrink-0">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#16B8D4]' : 'text-[#8DA3B8]'
                  } ${ws.badge === 'LIVE' ? 'text-[#18A58B]' : ''}`}
                />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{ws.label}</span>
                    {ws.badge && (
                      <span className="text-[8px] uppercase font-mono px-1 py-0.2 rounded font-bold bg-[#18A58B]/10 text-[#18A58B] border border-[#18A58B]/40">
                        {ws.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-[#8DA3B8] truncate block font-mono">
                    {ws.sublabel}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Area: Technical Diagnostics & Sidebar Collapse */}
      <div className="p-2 border-t border-[#203A52] space-y-1">
        {onOpenSystemDiagnostics && (
          <button
            onClick={onOpenSystemDiagnostics}
            title={collapsed ? 'Data & System Diagnostics' : undefined}
            className="w-full flex items-center space-x-2.5 px-2 py-1.5 rounded text-left text-[#8DA3B8] hover:text-[#E8F0F7] hover:bg-[#091522] transition-colors cursor-pointer border border-transparent"
          >
            <div className="flex-shrink-0">
              <Database className="w-3.5 h-3.5 text-[#8DA3B8]" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold block truncate">Provenance & Data</span>
                <span className="text-[9px] text-[#8DA3B8]/70 block truncate font-mono">System Integrity</span>
              </div>
            )}
          </button>
        )}

        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center py-1.5 text-[#8DA3B8] hover:text-[#E8F0F7] hover:bg-[#091522] rounded transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
