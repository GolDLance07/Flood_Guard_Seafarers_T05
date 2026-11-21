import React from 'react';
import { Database, ShieldCheck, AlertCircle, Info, Calendar } from 'lucide-react';

export type ProvenanceKind = 'OBSERVED' | 'OFFICIAL_WARNING' | 'MODELLED' | 'HISTORICAL_REFERENCE' | 'CITIZEN_REPORT';

interface DataProvenanceCardProps {
  title: string;
  sourceAgency: string;
  sensorOrFeed?: string;
  collectedAt?: string;
  lastUpdatedAt?: string;
  kind: ProvenanceKind;
  isGroundVerified?: boolean;
  uncertaintyOrLimitations?: string;
  className?: string;
}

export const DataProvenanceCard: React.FC<DataProvenanceCardProps> = ({
  title,
  sourceAgency,
  sensorOrFeed,
  collectedAt,
  lastUpdatedAt,
  kind,
  isGroundVerified,
  uncertaintyOrLimitations,
  className = '',
}) => {
  const kindBadge: Record<ProvenanceKind, { label: string; style: string }> = {
    OBSERVED: {
      label: 'INSTRUMENT OBSERVED',
      style: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
    },
    OFFICIAL_WARNING: {
      label: 'OFFICIAL ADVISORY',
      style: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
    },
    MODELLED: {
      label: 'NUMERICAL ESTIMATE',
      style: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
    },
    HISTORICAL_REFERENCE: {
      label: 'HISTORICAL BENCHMARK',
      style: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
    },
    CITIZEN_REPORT: {
      label: 'CITIZEN SUBMISSION',
      style: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
    },
  };

  const badge = kindBadge[kind] || kindBadge.OBSERVED;

  return (
    <div className={`p-3 bg-[#0A1828] border border-[#203A52] rounded-xl text-xs space-y-2 select-none font-sans ${className}`}>
      {/* Title & Category Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-white tracking-tight flex items-center space-x-1.5">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>{title}</span>
        </span>
        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider border ${badge.style}`}>
          {badge.label}
        </span>
      </div>

      {/* Provenance Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
        <div>
          <span className="text-[9px] text-slate-500 block uppercase">Source Agency</span>
          <span className="text-white font-semibold">{sourceAgency}</span>
        </div>
        {sensorOrFeed && (
          <div>
            <span className="text-[9px] text-slate-500 block uppercase">Instrument / Feed</span>
            <span className="text-cyan-300 truncate block">{sensorOrFeed}</span>
          </div>
        )}
        {collectedAt && (
          <div>
            <span className="text-[9px] text-slate-500 block uppercase">Collected At</span>
            <span className="text-slate-300 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{collectedAt.slice(0, 16).replace('T', ' ')}</span>
            </span>
          </div>
        )}
        {lastUpdatedAt && (
          <div>
            <span className="text-[9px] text-slate-500 block uppercase">Last Ingested</span>
            <span className="text-emerald-400 font-semibold">{lastUpdatedAt}</span>
          </div>
        )}
      </div>

      {/* Ground Verification Status */}
      <div className="pt-2 border-t border-[#203A52]/70 flex items-center justify-between text-[10px] font-mono">
        <span className="flex items-center space-x-1">
          {isGroundVerified ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-teal-300 font-bold">Ground-Level Verification Confirmed</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300">Unverified Field Intelligence • Requires Confirmation</span>
            </>
          )}
        </span>
      </div>

      {/* Methodological Caveats / Uncertainty */}
      {uncertaintyOrLimitations && (
        <div className="p-2 rounded bg-[#07111F] border border-[#203A52] text-[10px] text-slate-400 leading-relaxed flex items-start space-x-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <span>{uncertaintyOrLimitations}</span>
        </div>
      )}
    </div>
  );
};
