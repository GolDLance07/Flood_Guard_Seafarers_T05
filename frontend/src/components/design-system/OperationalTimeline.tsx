import React from 'react';
import { Clock, CheckCircle2, Navigation, ShieldCheck } from 'lucide-react';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  actor?: string;
  notes?: string;
  status?: string;
}

interface OperationalTimelineProps {
  events: TimelineEvent[];
  emptyMessage?: string;
}

export const OperationalTimeline: React.FC<OperationalTimelineProps> = ({
  events,
  emptyMessage = 'No operational actions recorded yet.',
}) => {
  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-500 font-mono">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#203A52] select-none font-sans text-xs">
      {events.map((evt) => {
        const icon = evt.status === 'VERIFIED' ? (
          <ShieldCheck className="w-3 h-3 text-teal-400" />
        ) : evt.status === 'DISPATCHED' ? (
          <Navigation className="w-3 h-3 text-cyan-400" />
        ) : evt.status === 'RESOLVED' ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        ) : (
          <Clock className="w-3 h-3 text-amber-400" />
        );

        return (
          <div key={evt.id} className="relative group">
            {/* Dot Beacon */}
            <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full bg-[#0A1828] border border-cyan-400 flex items-center justify-center">
              {icon}
            </div>

            {/* Event Container */}
            <div className="p-2.5 rounded-xl bg-[#0A1828] border border-[#203A52] hover:border-cyan-500/50 transition-colors space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-white tracking-tight">{evt.title}</span>
                <span className="text-[10px] text-slate-400">{evt.timestamp}</span>
              </div>

              {evt.actor && (
                <div className="text-[10px] text-cyan-400 font-mono">
                  Authority: {evt.actor}
                </div>
              )}

              {evt.notes && (
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {evt.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
