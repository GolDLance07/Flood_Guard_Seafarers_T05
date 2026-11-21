import React from 'react';
import type { IncidentSummary } from '../../types/api';
import {
  ShieldCheck,
  XCircle,
  Copy,
  Navigation,
  AlertTriangle
} from 'lucide-react';
import { OperationalTimeline, type TimelineEvent } from './OperationalTimeline';

interface IncidentInspectorProps {
  incident: IncidentSummary | null;
  onVerify: (id: string, notes: string) => void;
  onReject: (id: string, reason: string) => void;
  onDuplicate: (id: string, parentId: string) => void;
  onTransitionStatus: (id: string, status: any) => void;
  onRunDispatchAdvisor?: () => void;
  actionLoading?: boolean;
  className?: string;
}

export const IncidentInspector: React.FC<IncidentInspectorProps> = ({
  incident,
  onVerify,
  onReject,
  onDuplicate,
  onTransitionStatus,
  onRunDispatchAdvisor,
  actionLoading = false,
  className = ''
}) => {
  if (!incident) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 bg-[#091522] border-l border-[#203A52] text-[#8DA3B8] font-mono text-xs ${className}`}>
        <AlertTriangle className="w-8 h-8 text-[#8DA3B8]/40 mb-2" />
        <span>Select an incident from the tactical queue to inspect dossier.</span>
      </div>
    );
  }

  const sampleEvents: TimelineEvent[] = [
    {
      id: 'evt-1',
      title: 'Report Submitted',
      timestamp: incident.submitted_at || new Date().toISOString(),
      actor: 'Reporting Citizen (citizen)',
      notes: `Report submitted with category '${incident.category}' and initial severity '${incident.severity}'.`,
      status: incident.status
    }
  ];

  return (
    <div className={`flex flex-col h-full bg-[#091522] border-l border-[#203A52] text-xs font-sans overflow-y-auto ${className}`}>
      {/* Header */}
      <div className="p-3.5 border-b border-[#203A52] bg-[#07111F] space-y-1">
        <div className="flex items-center justify-between font-mono">
          <span className="text-[10px] text-[#16B8D4] uppercase tracking-wider font-bold">
            INCIDENT DOSSIER • {incident.id}
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded border uppercase font-bold text-[#F0A83B] border-[#F0A83B]/40 bg-[#F0A83B]/10">
            {incident.status.replace(/_/g, ' ')}
          </span>
        </div>
        <h2 className="text-sm font-bold text-[#E8F0F7]">
          {incident.category.replace(/_/g, ' ')}
        </h2>
        <div className="text-[10px] font-mono text-[#8DA3B8] flex items-center space-x-2">
          <span>{incident.latitude.toFixed(4)}°N, {incident.longitude.toFixed(4)}°E</span>
          <span>•</span>
          <span>Headcount: {incident.affected_people_count || 1} Persons</span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-3.5 space-y-4 flex-1">
        {/* Description & Narrative */}
        <div className="p-2.5 bg-[#07111F] border border-[#203A52] rounded space-y-1">
          <span className="text-[9px] font-mono text-[#8DA3B8] uppercase block">Citizen Field Narrative</span>
          <p className="text-xs text-[#E8F0F7] leading-relaxed">
            {(incident as any).description || incident.title || 'No description provided by citizen.'}
          </p>
        </div>

        {/* Operational Actions */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-[#8DA3B8] uppercase block font-bold">
            Ground Truth Verification
          </span>
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
            <button
              onClick={() => onVerify(incident.id, 'Ground truth confirmed by operator')}
              disabled={actionLoading}
              className="py-1.5 px-2 bg-[#10243A] hover:bg-[#142B42] border border-[#18A58B] text-[#18A58B] font-bold rounded flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Confirm</span>
            </button>
            <button
              onClick={() => onDuplicate(incident.id, 'PARENT-REF')}
              disabled={actionLoading}
              className="py-1.5 px-2 bg-[#10243A] hover:bg-[#142B42] border border-[#F0A83B] text-[#F0A83B] font-bold rounded flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={() => onReject(incident.id, 'Report refuted by local verification')}
              disabled={actionLoading}
              className="py-1.5 px-2 bg-[#10243A] hover:bg-[#142B42] border border-[#E45555] text-[#E45555] font-bold rounded flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </div>
        </div>

        {/* State Machine Transition */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-[#8DA3B8] uppercase block font-bold">
            Lifecycle Status Update
          </span>
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
            <button
              onClick={() => onTransitionStatus(incident.id, 'IN_REVIEW')}
              disabled={actionLoading}
              className="py-1 px-1.5 bg-[#07111F] hover:bg-[#10243A] border border-[#203A52] text-[#E8F0F7] rounded cursor-pointer"
            >
              Under Review
            </button>
            <button
              onClick={() => onTransitionStatus(incident.id, 'VERIFIED')}
              disabled={actionLoading}
              className="py-1 px-1.5 bg-[#07111F] hover:bg-[#10243A] border border-[#203A52] text-[#18A58B] rounded cursor-pointer"
            >
              Mark Verified
            </button>
            <button
              onClick={() => onTransitionStatus(incident.id, 'RESOLVED')}
              disabled={actionLoading}
              className="py-1 px-1.5 bg-[#07111F] hover:bg-[#10243A] border border-[#203A52] text-[#8DA3B8] rounded cursor-pointer"
            >
              Mark Resolved
            </button>
          </div>
        </div>

        {/* Dispatch Advisor */}
        {onRunDispatchAdvisor && (
          <div className="p-3 bg-[#10243A] border border-[#203A52] rounded space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="text-[10px] text-[#16B8D4] uppercase font-bold flex items-center space-x-1">
                <Navigation className="w-3 h-3 text-[#16B8D4]" />
                <span>Dispatch Routing Advisor</span>
              </span>
              <span className="text-[9px] text-[#8DA3B8]">OSM DRY-ROAD</span>
            </div>
            <p className="text-[11px] text-[#8DA3B8] leading-tight">
              Evaluate nearest available responder units using dry-road network routing excluding flooded segments.
            </p>
            <button
              onClick={onRunDispatchAdvisor}
              className="w-full py-1.5 bg-[#142B42] hover:bg-[#203A52] border border-[#16B8D4] text-[#16B8D4] font-mono font-bold text-xs rounded transition-colors cursor-pointer"
            >
              Compute Dispatch Vectors
            </button>
          </div>
        )}

        {/* Operational Timeline */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-mono text-[#8DA3B8] uppercase block font-bold">
            Operational Audit Trail
          </span>
          <OperationalTimeline events={sampleEvents} />
        </div>
      </div>
    </div>
  );
};
