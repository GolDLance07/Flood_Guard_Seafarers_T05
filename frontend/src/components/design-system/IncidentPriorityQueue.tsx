import React from 'react';
import type { IncidentSummary } from '../../types/api';
import { Search, AlertTriangle } from 'lucide-react';

interface IncidentPriorityQueueProps {
  incidents: IncidentSummary[];
  selectedIncidentId?: string | null;
  onSelectIncident: (incident: IncidentSummary) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  severityFilter: string;
  onSeverityFilterChange: (sev: string) => void;
  className?: string;
}

export const IncidentPriorityQueue: React.FC<IncidentPriorityQueueProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  severityFilter,
  onSeverityFilterChange,
  className = ''
}) => {
  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      !searchQuery ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ((inc as any).description && (inc as any).description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      inc.status.toUpperCase() === statusFilter.toUpperCase();

    const matchesSeverity =
      severityFilter === 'ALL' ||
      inc.severity.toUpperCase() === severityFilter.toUpperCase();

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className={`flex flex-col h-full bg-[#091522] border-r border-[#203A52] text-xs font-sans ${className}`}>
      {/* Header & Counters */}
      <div className="p-3 border-b border-[#203A52] bg-[#07111F] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-[#E8F0F7] uppercase tracking-wider flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F0A83B]" />
            <span>Tactical Incident Queue</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10243A] text-[#16B8D4] border border-[#203A52]">
            {filteredIncidents.length} Records
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3 h-3 text-[#8DA3B8] absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tracking ID, category..."
            className="w-full bg-[#10243A] border border-[#203A52] rounded pl-7 pr-2.5 py-1 text-xs text-[#E8F0F7] placeholder-[#8DA3B8]/60 focus:border-[#16B8D4] focus:outline-none font-mono"
          />
        </div>

        {/* Filter Selectors */}
        <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-[#10243A] border border-[#203A52] rounded px-2 py-1 text-[#8DA3B8] focus:outline-none focus:border-[#16B8D4]"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED_UNVERIFIED">Unverified</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="VERIFIED">Verified</option>
            <option value="ACTION_DISPATCHED">Dispatched</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => onSeverityFilterChange(e.target.value)}
            className="bg-[#10243A] border border-[#203A52] rounded px-2 py-1 text-[#8DA3B8] focus:outline-none focus:border-[#16B8D4]"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#203A52]">
        {filteredIncidents.length === 0 ? (
          <div className="p-6 text-center text-[#8DA3B8] font-mono text-xs">
            No incident reports matching filter criteria.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncidentId === inc.id;
            const sevColor =
              inc.severity.toUpperCase() === 'CRITICAL' ? 'text-[#E45555] bg-[#E45555]/10 border-[#E45555]/30' :
              inc.severity.toUpperCase() === 'HIGH' ? 'text-[#F0A83B] bg-[#F0A83B]/10 border-[#F0A83B]/30' :
              'text-[#16B8D4] bg-[#16B8D4]/10 border-[#16B8D4]/30';

            const statusColor =
              inc.status.toUpperCase() === 'VERIFIED' ? 'text-[#18A58B]' :
              inc.status.toUpperCase() === 'SUBMITTED_UNVERIFIED' ? 'text-[#F0A83B]' :
              'text-[#8DA3B8]';

            const formattedTime = inc.submitted_at
              ? new Date(inc.submitted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : 'Recent';

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3 cursor-pointer transition-colors font-mono space-y-1.5 ${
                  isSelected
                    ? 'bg-[#10243A] border-l-2 border-l-[#16B8D4]'
                    : 'bg-[#091522] hover:bg-[#10243A]/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#E8F0F7]">{inc.id}</span>
                  <span className={`px-1.5 py-0.2 rounded border uppercase font-semibold ${sevColor}`}>
                    {inc.severity}
                  </span>
                </div>

                <div className="text-xs font-semibold text-[#E8F0F7] font-sans truncate">
                  {inc.category.replace(/_/g, ' ')}
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#8DA3B8]">
                  <span className={`font-medium ${statusColor}`}>
                    ● {inc.status.replace(/_/g, ' ')}
                  </span>
                  <span>{formattedTime}</span>
                </div>

                <div className="text-[9px] text-[#8DA3B8]/70">
                  {inc.latitude.toFixed(4)}°N, {inc.longitude.toFixed(4)}°E
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
