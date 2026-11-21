import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Layers,
  Search,
  Filter,
  Navigation,
  RefreshCw,
  Copy,
  Users,
  Compass
} from 'lucide-react';
import type { IncidentSummary, IncidentDetail, IncidentCluster, DispatchRecommendation } from '../../types/api';
import {
  fetchCommandIncidents,
  fetchIncidentClusters,
  fetchIncidentDetail,
  updateIncidentStatus,
  verifyIncident,
  assignIncidentTeam,
  fetchDispatchRecommendations
} from '../../services/api';
import { Badge } from '../common/Badge';

export const IncidentWorkspace: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [clusters, setClusters] = useState<IncidentCluster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [incidentDetail, setIncidentDetail] = useState<IncidentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'queue' | 'clusters'>('queue');

  // Dispatch Recommendation Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState<boolean>(false);
  const [dispatchRecommendations, setDispatchRecommendations] = useState<DispatchRecommendation[]>([]);
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);

  // Action status notes
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const [incData, clusterData] = await Promise.all([
        fetchCommandIncidents(params),
        fetchIncidentClusters()
      ]);
      setIncidents(incData);
      setClusters(clusterData.clusters || []);
    } catch (err) {
      console.error('Failed to load command incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, severityFilter]);

  const handleSelectIncident = async (id: string) => {
    setSelectedIncidentId(id);
    setDetailLoading(true);
    try {
      const detail = await fetchIncidentDetail(id);
      setIncidentDetail(detail);
    } catch (err) {
      console.error('Failed to fetch incident details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!selectedIncidentId) return;
    try {
      await updateIncidentStatus(selectedIncidentId, {
        new_status: newStatus,
        reason: `Command Center duty officer transitioned status to ${newStatus}`,
        public_note: `Emergency status updated to ${newStatus.replace('_', ' ')}.`
      });
      setActionNotice(`Status transitioned to ${newStatus}`);
      await handleSelectIncident(selectedIncidentId);
      await loadIncidents();
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    }
  };

  const handleVerify = async (decision: 'confirmed' | 'rejected' | 'duplicate') => {
    if (!selectedIncidentId) return;
    try {
      await verifyIncident(selectedIncidentId, {
        decision,
        confidence_score: 0.95,
        verification_notes: 'Ground validation verified by emergency operations center',
        public_note: decision === 'confirmed' ? 'Hazard verified by district emergency command.' : undefined
      });
      setActionNotice(`Verification decision '${decision}' recorded.`);
      await handleSelectIncident(selectedIncidentId);
      await loadIncidents();
    } catch (err: any) {
      setActionNotice(`Verification failed: ${err.message}`);
    }
  };

  const handleOpenDispatch = async () => {
    if (!selectedIncidentId) return;
    setDispatchModalOpen(true);
    setDispatchLoading(true);
    try {
      const recs = await fetchDispatchRecommendations(selectedIncidentId, 4);
      setDispatchRecommendations(recs.top_recommendations || []);
    } catch (err) {
      console.error('Dispatch recommendations error:', err);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleAssignTeam = async (teamId: string) => {
    if (!selectedIncidentId) return;
    try {
      await assignIncidentTeam(selectedIncidentId, {
        team_id: teamId,
        priority: incidentDetail?.severity || 'high',
        assignment_notes: 'Dispatched from Command Center Advisor'
      });
      setDispatchModalOpen(false);
      setActionNotice(`Responder team dispatched successfully.`);
      await handleSelectIncident(selectedIncidentId);
      await loadIncidents();
    } catch (err: any) {
      setActionNotice(`Dispatch error: ${err.message}`);
    }
  };

  const severityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case 'critical':
        return <Badge variant="rose">CRITICAL</Badge>;
      case 'high':
        return <Badge variant="amber">HIGH</Badge>;
      case 'medium':
        return <Badge variant="cyan">MEDIUM</Badge>;
      default:
        return <Badge variant="slate">LOW</Badge>;
    }
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case 'SUBMITTED_UNVERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-600/40">UNVERIFIED</span>;
      case 'IN_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-600/40">IN REVIEW</span>;
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-600/40">VERIFIED</span>;
      case 'ACTION_DISPATCHED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/60 text-purple-300 border border-purple-600/40">DISPATCHED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/60 text-blue-300 border border-blue-600/40">IN PROGRESS</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-600">RESOLVED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-600/40">REJECTED</span>;
      case 'DUPLICATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-400 border border-slate-700">DUPLICATE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-slate-300">{st}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070D18] text-slate-200 overflow-hidden select-none">
      {/* Header Bar */}
      <div className="p-4 bg-[#0A1220] border-b border-[#1E2D4A] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Incident Triage & Command Queue</span>
              <span className="text-xs px-2 py-0.5 bg-[#16243A] text-cyan-400 rounded-full font-mono border border-cyan-800/40">
                {incidents.length} active
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Multi-source disaster verification, hotspot clustering, and resource dispatching
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex bg-[#0D1626] p-1 rounded-lg border border-[#1E2D4A]">
            <button
              onClick={() => setViewMode('queue')}
              className={`px-3 py-1 text-xs font-semibold rounded ${viewMode === 'queue' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'}`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('clusters')}
              className={`px-3 py-1 text-xs font-semibold rounded flex items-center space-x-1 ${viewMode === 'clusters' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'}`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Hotspot Clusters ({clusters.length})</span>
            </button>
          </div>

          <button
            onClick={loadIncidents}
            className="p-2 bg-[#0D1626] hover:bg-[#16243A] text-slate-300 border border-[#1E2D4A] rounded-lg cursor-pointer transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="px-4 py-2 bg-cyan-950/60 border-b border-cyan-800/40 text-cyan-300 text-xs flex justify-between items-center">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-cyan-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Main Split Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Filter & Incident List / Cluster View */}
        <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col border-r border-[#1E2D4A] overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3 bg-[#0A1220]/80 border-b border-[#1E2D4A] flex flex-wrap gap-2 items-center text-xs">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadIncidents()}
                placeholder="Search tracking #, location, title..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#0D1626] border border-[#1E2D4A] rounded text-slate-200 text-xs focus:outline-none focus:border-cyan-500/60"
              />
            </div>

            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#0D1626] border border-[#1E2D4A] rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED_UNVERIFIED">Unverified Only</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="ACTION_DISPATCHED">Dispatched</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#0D1626] border border-[#1E2D4A] rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* List or Clusters */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {viewMode === 'clusters' ? (
              // Clusters View
              clusters.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No high-density spatial incident clusters detected in this area.
                </div>
              ) : (
                clusters.map((cluster) => (
                  <div
                    key={cluster.cluster_id}
                    className="p-3 bg-[#0D1626] border border-[#1E2D4A] hover:border-cyan-500/40 rounded-xl transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs">{cluster.primary_area || cluster.cluster_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            cluster.cluster_risk_level === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-700/60' :
                            cluster.cluster_risk_level === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-700/60' :
                            'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                          }`}>
                            {cluster.cluster_risk_level} HOTSPOT
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-3">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3 text-cyan-400" />
                            <span>{cluster.report_count} clustered citizen reports</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Compass className="w-3 h-3 text-amber-400" />
                            <span>{cluster.centroid_latitude.toFixed(4)}, {cluster.centroid_longitude.toFixed(4)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#1E2D4A]/60 flex flex-wrap gap-1.5 text-[10px]">
                      {cluster.categories.map((cat, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-[#16243A] text-slate-300 rounded font-mono">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )
            ) : (
              // Incident Queue View
              incidents.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No incident reports matching active filter criteria.
                </div>
              ) : (
                incidents.map((inc) => {
                  const isSelected = inc.id === selectedIncidentId;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => handleSelectIncident(inc.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                          : 'bg-[#0D1626] border-[#1E2D4A] hover:bg-[#121E32] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[11px] font-bold text-cyan-400">{inc.tracking_number}</span>
                            {severityBadge(inc.severity)}
                            {statusBadge(inc.status)}
                          </div>
                          <h3 className="font-bold text-white text-xs mt-1 leading-snug">{inc.title}</h3>
                          {inc.address && (
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{inc.address}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#1E2D4A]/60 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-mono capitalize">{inc.category.replace('_', ' ')}</span>
                        <span>{new Date(inc.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Right Column: Detailed Incident Inspection & Operational Actions */}
        <div className="hidden md:flex md:w-1/2 lg:w-5/12 flex-col bg-[#0A1220] overflow-y-auto p-4">
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
              Loading incident dossier...
            </div>
          ) : incidentDetail ? (
            <div className="space-y-4">
              {/* Header Details */}
              <div className="p-4 bg-[#0D1626] border border-[#1E2D4A] rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">{incidentDetail.tracking_number}</span>
                  <div className="flex items-center space-x-2">
                    {severityBadge(incidentDetail.severity)}
                    {statusBadge(incidentDetail.status)}
                  </div>
                </div>
                <h2 className="text-sm font-bold text-white">{incidentDetail.title}</h2>
                {incidentDetail.description && (
                  <p className="text-xs text-slate-300 mt-2 bg-[#070D18] p-2.5 rounded border border-[#1E2D4A]">
                    {incidentDetail.description}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Location</span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {incidentDetail.latitude.toFixed(4)}, {incidentDetail.longitude.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Affected Count</span>
                    <span className="text-slate-200 font-bold">{incidentDetail.affected_people_count || 0} persons</span>
                  </div>
                </div>
              </div>

              {/* Duplicate Detection Card */}
              {incidentDetail.suggested_duplicates && incidentDetail.suggested_duplicates.length > 0 && (
                <div className="p-3 bg-amber-950/20 border border-amber-600/30 rounded-xl">
                  <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold mb-2">
                    <Copy className="w-4 h-4" />
                    <span>Nearby Duplicate Detected ({incidentDetail.suggested_duplicates.length})</span>
                  </div>
                  {incidentDetail.suggested_duplicates.map((dup) => (
                    <div key={dup.incident_id} className="text-[11px] text-slate-300 bg-[#0D1626] p-2 rounded mb-1.5 flex justify-between items-center">
                      <div>
                        <span className="font-mono text-cyan-400 font-bold">{dup.tracking_number}</span>
                        <span className="ml-2 text-slate-400">{(dup.distance_meters / 1000).toFixed(1)} km away</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold">{Math.round(dup.confidence_score * 100)}% match</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Authority Actions & Verification Controls */}
              <div className="p-4 bg-[#0D1626] border border-[#1E2D4A] rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Authority Action Controls</span>
                </h3>

                {/* Ground Verification */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5">Official Ground Verification:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleVerify('confirmed')}
                      className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => handleVerify('duplicate')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={() => handleVerify('rejected')}
                      className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>

                {/* Dispatch Advisor Trigger */}
                <div className="pt-2 border-t border-[#1E2D4A]">
                  <button
                    onClick={handleOpenDispatch}
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-cyan-950/40 cursor-pointer"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Launch Resource Dispatch Advisor</span>
                  </button>
                </div>

                {/* State Machine Step transitions */}
                <div className="pt-2 border-t border-[#1E2D4A]">
                  <span className="text-[11px] text-slate-400 block mb-1.5">Manual Lifecycle Transitions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {incidentDetail.status === 'SUBMITTED_UNVERIFIED' && (
                      <button
                        onClick={() => handleStatusTransition('IN_REVIEW')}
                        className="px-2 py-1 bg-[#16243A] hover:bg-[#1E2D4A] text-cyan-300 rounded text-[11px] border border-cyan-700/40"
                      >
                        Begin Review
                      </button>
                    )}
                    {['VERIFIED', 'ACTION_DISPATCHED'].includes(incidentDetail.status) && (
                      <button
                        onClick={() => handleStatusTransition('IN_PROGRESS')}
                        className="px-2 py-1 bg-blue-950 hover:bg-blue-900 text-blue-300 rounded text-[11px] border border-blue-600/40"
                      >
                        Set In Progress
                      </button>
                    )}
                    {['IN_PROGRESS', 'ACTION_DISPATCHED'].includes(incidentDetail.status) && (
                      <button
                        onClick={() => handleStatusTransition('RESOLVED')}
                        className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded text-[11px] border border-emerald-600/40"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Timeline */}
              {incidentDetail.timeline && incidentDetail.timeline.length > 0 && (
                <div className="p-3 bg-[#0D1626] border border-[#1E2D4A] rounded-xl">
                  <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Log & Timeline</span>
                  </h4>
                  <div className="space-y-2 text-[11px]">
                    {incidentDetail.timeline.map((evt) => (
                      <div key={evt.id} className="border-l-2 border-cyan-500/60 pl-2 py-0.5">
                        <div className="text-slate-300 font-semibold">{evt.message}</div>
                        <div className="text-[10px] text-slate-500">
                          {evt.author_name} ({evt.author_role}) • {new Date(evt.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Compass className="w-8 h-8 text-slate-600 mb-2" />
              <span>Select an incident from the queue to view full dossier and dispatch responders</span>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Advisor Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0A1220] border border-[#1E2D4A] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1E2D4A] flex justify-between items-center bg-[#0D1626]">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <span>Intelligent Resource Dispatch Advisor</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Scored based on equipment capabilities, proximity, and unit availability
                </p>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {dispatchLoading ? (
                <div className="text-center py-8 text-slate-400 text-xs flex justify-center items-center">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2 text-cyan-400" />
                  Analyzing unit capabilities & staging proximity...
                </div>
              ) : dispatchRecommendations.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No eligible responder units found for this jurisdiction.
                </div>
              ) : (
                dispatchRecommendations.map((rec) => (
                  <div
                    key={rec.team_id}
                    className="p-3 bg-[#0D1626] border border-[#1E2D4A] hover:border-cyan-500/50 rounded-xl transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs">{rec.team_name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                            {rec.team_type}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {rec.rationale}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-cyan-400 font-mono">{rec.score}</span>
                        <span className="text-[10px] text-slate-500 block">/100 match</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#1E2D4A]/60 flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                        <span>{rec.distance_km} km away</span>
                        <span>ETA ~{rec.estimated_eta_minutes} min</span>
                      </div>
                      <button
                        onClick={() => handleAssignTeam(rec.team_id)}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold cursor-pointer transition-colors shadow-sm"
                      >
                        Dispatch Unit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
