import React from 'react';
import type { ResponderTeam, ResponderTask } from '../../types/api';
import { Users, Send } from 'lucide-react';

interface ResponderStatusPanelProps {
  teams: ResponderTeam[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  tasks?: ResponderTask[];
  onBroadcastLocation?: () => void;
  lastBeaconTime?: string;
  isGpsFresh?: boolean;
  className?: string;
}

export const ResponderStatusPanel: React.FC<ResponderStatusPanelProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  onBroadcastLocation,
  lastBeaconTime = 'Just now',
  isGpsFresh = true,
  className = ''
}) => {

  return (
    <div className={`flex flex-col h-full bg-[#091522] border-r border-[#203A52] text-xs font-sans select-none ${className}`}>
      {/* Header */}
      <div className="p-3 bg-[#07111F] border-b border-[#203A52] space-y-1">
        <div className="flex items-center justify-between font-mono">
          <span className="font-bold text-[#E8F0F7] uppercase tracking-wider text-xs flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-[#18A58B]" />
            <span>Field Team Roster ({teams.length})</span>
          </span>
          <span className={`text-[9px] px-1.5 py-0.2 rounded border uppercase font-mono font-bold ${
            isGpsFresh ? 'text-[#18A58B] border-[#18A58B]/40 bg-[#18A58B]/10' : 'text-[#F0A83B] border-[#F0A83B]/40 bg-[#F0A83B]/10'
          }`}>
            {isGpsFresh ? 'GPS LIVE (<5m)' : 'GPS STALE (>15m)'}
          </span>
        </div>
        <div className="text-[10px] font-mono text-[#8DA3B8]">
          Last Telemetry Beacon: {lastBeaconTime}
        </div>
      </div>

      {/* Team Selection List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#203A52]">
        {teams.map((team) => {
          const isSelected = team.id === selectedTeamId;
          const statusColor =
            team.status === 'AVAILABLE' ? 'text-[#18A58B] bg-[#18A58B]/10 border-[#18A58B]/40' :
            team.status === 'ENGAGED' ? 'text-[#F0A83B] bg-[#F0A83B]/10 border-[#F0A83B]/40' :
            'text-[#8DA3B8] bg-[#07111F] border-[#203A52]';

          return (
            <div
              key={team.id}
              onClick={() => onSelectTeam(team.id)}
              className={`p-3 cursor-pointer transition-colors font-mono space-y-1.5 ${
                isSelected
                  ? 'bg-[#10243A] border-l-2 border-l-[#18A58B]'
                  : 'bg-[#091522] hover:bg-[#10243A]/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#E8F0F7] text-xs font-sans">{team.name}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border uppercase font-bold ${statusColor}`}>
                  {team.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#8DA3B8]">
                <span>Type: {team.team_type}</span>
                <span>Cap: {team.member_count || 6} Pax</span>
              </div>

              {team.capabilities && team.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {team.capabilities.map((cap, idx) => (
                    <span key={idx} className="text-[9px] px-1 py-0.2 bg-[#07111F] border border-[#203A52] text-[#8DA3B8] rounded">
                      {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Telemetry Broadcast Button */}
      {onBroadcastLocation && (
        <div className="p-3 bg-[#07111F] border-t border-[#203A52]">
          <button
            onClick={onBroadcastLocation}
            className="w-full py-1.5 bg-[#10243A] hover:bg-[#142B42] border border-[#18A58B] text-[#18A58B] font-mono font-bold text-xs rounded flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit Beacon Location</span>
          </button>
        </div>
      )}
    </div>
  );
};
