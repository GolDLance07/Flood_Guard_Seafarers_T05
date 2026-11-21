import React, { useState } from 'react';
import {
  FileText,
  Clock,
  MapPin,
  ExternalLink,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Shield,
  Search,
} from 'lucide-react';
import type { IncidentSubmissionResult, IncidentTrackingItem } from '../../types/citizen';
import { fetchIncidentStatus } from '../../services/api';

interface CitizenActivityTabProps {
  myReports: IncidentSubmissionResult[];
  onSelectTab: (tab: any) => void;
}

export const CitizenActivityTab: React.FC<CitizenActivityTabProps> = ({
  myReports,
  onSelectTab,
}) => {
  const [trackingInput, setTrackingInput] = useState('');
  const [queriedReport, setQueriedReport] = useState<IncidentTrackingItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    setCopiedId(trackingNumber);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSearchTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = trackingInput.trim().toUpperCase();
    if (!query) return;

    setLoading(true);
    setQueryError(null);
    setQueriedReport(null);

    try {
      const data = await fetchIncidentStatus(query);
      if (data && data.tracking_number) {
        setQueriedReport(data);
      } else {
        setQueryError(`No report found with tracking code "${query}". Please check the code and try again.`);
      }
    } catch (err: any) {
      setQueryError(err.message || 'Unable to retrieve report status. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED_UNVERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Submitted (Pending Verification)
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Under Officer Review
          </span>
        );
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified by Ground Team
          </span>
        );
      case 'ACTION_DISPATCHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Rescue Team Dispatched
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Privacy & Transparency Guarantee</p>
          <p className="mt-0.5">
            FloodGuard values citizen privacy. Your submitted reports are saved in your local browser storage.
            No persistent location tracking, advertising IDs, or background tracking cookies are maintained.
            Anyone with the tracking code can verify the official dispatch response status.
          </p>
        </div>
      </div>

      {/* Manual Tracking Lookup */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400" />
          Lookup Incident by Tracking Code
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Check verification progress and emergency service response status for any submitted report.
        </p>

        <form onSubmit={handleSearchTracking} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. FG-2026-A1B2C3D4"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !trackingInput.trim()}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Check Status'}
          </button>
        </form>

        {queryError && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {queryError}
          </div>
        )}

        {/* Queried Report Card */}
        {queriedReport && (
          <div className="mt-4 p-4 bg-slate-950/80 border border-cyan-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 block mb-0.5">TRACKING CODE</span>
                <span className="font-mono text-sm font-bold text-white">{queriedReport.tracking_number}</span>
              </div>
              {getStatusBadge(queriedReport.verification_status)}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">CATEGORY</span>
                <span className="font-semibold text-slate-200 capitalize">{queriedReport.category.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">SUBMITTED AT</span>
                <span className="text-slate-300">{new Date(queriedReport.submitted_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">VERIFICATION</span>
                <span className={`font-semibold ${queriedReport.is_verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {queriedReport.is_verified ? 'Official Ground Verified' : 'Pending Verification'}
                </span>
              </div>
            </div>

            {queriedReport.verification_notes && (
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300">
                <span className="font-semibold text-slate-400 block mb-0.5 text-[10px] uppercase tracking-wider">Official Response Note</span>
                {queriedReport.verification_notes}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Local Saved Reports List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            Your Local Incident Submissions ({myReports.length})
          </h3>
          <span className="text-xs text-slate-500">Stored on this device</span>
        </div>

        {myReports.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-300">No reports submitted from this browser yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              If you witness waterlogging, submerged roads, or marooned citizens, submit an alert to assist district response teams.
            </p>
            <button
              onClick={() => onSelectTab('report')}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-all"
            >
              Report Incident Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {myReports.map((report) => (
              <div
                key={report.tracking_number}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{report.tracking_number}</span>
                    <button
                      onClick={() => handleCopy(report.tracking_number)}
                      title="Copy Tracking Code"
                      className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                    >
                      {copiedId === report.tracking_number ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {getStatusBadge(report.verification_status)}
                </div>

                <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Submitted: {new Date(report.submitted_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Report ID: {report.incident_id.slice(0, 8)}...</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px] truncate max-w-md">{report.safety_disclaimer}</span>
                  <button
                    onClick={() => {
                      setTrackingInput(report.tracking_number);
                      fetchIncidentStatus(report.tracking_number).then((data) => {
                        if (data) setQueriedReport(data);
                      });
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 flex-shrink-0"
                  >
                    Refresh Status
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
