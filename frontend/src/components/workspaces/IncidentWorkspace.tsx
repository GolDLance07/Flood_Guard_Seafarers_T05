import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Layers,
  Search,
  Navigation,
  RefreshCw,
  Copy,
  Compass,
  MapPin
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
import { IncidentPriorityBadge } from '../design-system/IncidentPriorityBadge';
import { OperationalTimeline, type TimelineEvent } from '../design-system/OperationalTimeline';

const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

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

  // MapLibre references
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

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

      // If no incident selected and incidents exist, auto-select first item
      if (!selectedIncidentId && incData.length > 0) {
        handleSelectIncident(incData[0].id);
      }
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

      // Pan map to incident coordinates
      if (mapInstance.current && detail.latitude && detail.longitude) {
        mapInstance.current.flyTo({
          center: [detail.longitude, detail.latitude],
          zoom: 13.5,
          speed: 1.2,
          essential: true
        });
      }
    } catch (err) {
      console.error('Failed to fetch incident details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Tactical Map Initialization
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLE,
      center: [76.338, 9.498],
      zoom: 11.5,
      maxZoom: 16
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update map markers when incidents change
  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    incidents.forEach((inc) => {
      if (!inc.latitude || !inc.longitude) return;

      const isSelected = inc.id === selectedIncidentId;
      const isCritical = inc.severity === 'critical';
      const isVerified = inc.status === 'VERIFIED' || inc.status === 'ACTION_DISPATCHED' || inc.status === 'IN_PROGRESS';

      const el = document.createElement('div');
      el.className = 'cursor-pointer transition-transform duration-200';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          ${isSelected ? '<span class="absolute -inset-2 rounded-full bg-cyan-400/40 animate-ping"></span>' : ''}
          <div class="w-6 h-6 rounded-full border-2 ${
            isSelected
              ? 'bg-cyan-400 border-white shadow-cyan-glow scale-125'
              : isCritical
              ? 'bg-rose-500 border-white shadow-danger-glow'
              : isVerified
              ? 'bg-emerald-500 border-white shadow-teal-glow'
              : 'bg-amber-500 border-white shadow-amber-glow'
          } flex items-center justify-center text-[10px] font-bold text-white">
            !
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        handleSelectIncident(inc.id);
      });

      const popup = new maplibregl.Popup({ offset: 15 }).setHTML(`
        <div class="font-sans text-xs">
          <div class="font-bold text-white">${inc.title}</div>
          <div class="text-[10px] text-cyan-400 font-mono">${inc.tracking_number}</div>
          <div class="text-[10px] text-slate-400 mt-1 uppercase font-mono">${inc.category} &bull; ${inc.status}</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([inc.longitude, inc.latitude])
        .setPopup(popup)
        .addTo(mapInstance.current!);

      markersRef.current.push(marker);
    });
  }, [incidents, selectedIncidentId]);

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

  const mappedTimeline: TimelineEvent[] = (incidentDetail?.timeline || []).map((e) => ({
    id: e.id,
    timestamp: e.created_at,
    title: e.update_type.replace(/_/g, ' '),
    actor: `${e.author_name} (${e.author_role})`,
    notes: e.message,
    status: e.update_type,
  }));

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060D17] text-slate-200 overflow-hidden select-none font-sans relative">
      {/* 1. Header Toolbar */}
      <div className="p-3 bg-[#091522] border-b border-[#142B42] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
              <span>INCIDENT TRIAGE &amp; OPERATIONS COMMAND</span>
              <span className="text-[10px] px-2 py-0.2 bg-[#10243A] text-cyan-400 rounded-full font-mono border border-cyan-800/40">
                {incidents.length} active
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Multi-source disaster verification, geospatial hotspot clustering, and unit dispatch
            </p>
          </div>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex bg-[#060D17] p-0.5 rounded-lg border border-[#142B42]">
            <button
              onClick={() => setViewMode('queue')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                viewMode === 'queue' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
              }`}
            >
              Triage Queue
            </button>
            <button
              onClick={() => setViewMode('clusters')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded flex items-center space-x-1 cursor-pointer ${
                viewMode === 'clusters' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Clusters ({clusters.length})</span>
            </button>
          </div>

          <button
            onClick={loadIncidents}
            className="p-1.5 bg-[#060D17] hover:bg-[#10243A] text-slate-300 border border-[#142B42] rounded-lg cursor-pointer"
            title="Refresh Incidents"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="px-4 py-1.5 bg-cyan-950/80 border-b border-cyan-700/60 text-cyan-300 text-xs flex justify-between items-center font-mono">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-cyan-400 font-bold ml-2">×</button>
        </div>
      )}

      {/* 2. Asymmetric Split Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT / CENTER: Triage Queue & Map Composite (60% width) */}
        <div className="flex-1 flex flex-col h-[50%] lg:h-full border-r border-[#142B42] overflow-hidden">
          {/* Tactical Incident Map Viewport */}
          <div className="h-64 sm:h-72 w-full relative border-b border-[#142B42] flex-shrink-0">
            <div ref={mapContainer} className="w-full h-full" />
            <div className="absolute top-2.5 left-2.5 panel-glass px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-400 border border-[#142B42] flex items-center space-x-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>TACTICAL INCIDENT BEACONS ({incidents.length})</span>
            </div>
          </div>

          {/* Incident Queue Table & Filter HUD */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#07111F]">
            {/* Filter Controls Bar */}
            <div className="p-2.5 bg-[#091522] border-b border-[#142B42] flex flex-wrap items-center gap-2 text-xs font-mono">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search tracking #, location, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadIncidents()}
                  className="w-full bg-[#060D17] border border-[#142B42] rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#060D17] border border-[#142B42] rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED_UNVERIFIED">Unverified</option>
                <option value="IN_REVIEW">Under Review</option>
                <option value="VERIFIED">Verified</option>
                <option value="ACTION_DISPATCHED">Dispatched</option>
                <option value="RESOLVED">Resolved</option>
              </select>

              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#060D17] border border-[#142B42] rounded-lg px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Scrollable Queue List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {incidents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  No incidents matching operational filters.
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
                          ? 'bg-[#10243A] border-cyan-500/70 shadow-cyan-glow'
                          : 'bg-[#091522] border-[#142B42] hover:border-slate-600 hover:bg-[#0D1D2D]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-cyan-300">
                            {inc.tracking_number}
                          </span>
                          <IncidentPriorityBadge status={inc.status} size="sm" />
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                              inc.severity === 'critical'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : inc.severity === 'high'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {inc.submitted_at ? inc.submitted_at.slice(11, 16) : 'Now'}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white truncate">{inc.title}</div>
                      <div className="text-[11px] text-slate-400 truncate flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span>{inc.address || 'Kuttanad Lowlands, Alappuzha'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Selected Incident Focal Dossier (40% width) */}
        <div className="w-full lg:w-[480px] h-[50%] lg:h-full bg-[#091522] flex flex-col overflow-hidden">
          {detailLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-cyan-400 space-y-2">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Retrieving Tactical Incident Dossier...</span>
            </div>
          ) : incidentDetail ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Dossier Header */}
              <div className="p-4 bg-[#0D1D2D] border border-[#142B42] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-cyan-400 font-mono uppercase tracking-wider block">
                      INCIDENT DOSSIER
                    </span>
                    <h2 className="text-sm font-bold text-white">{incidentDetail.title}</h2>
                  </div>
                  <IncidentPriorityBadge status={incidentDetail.status} size="md" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-[#142B42]">
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Tracking ID</span>
                    <span className="text-white font-bold">{incidentDetail.tracking_number}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Category</span>
                    <span className="text-amber-400 font-semibold uppercase">{incidentDetail.category}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Coordinates</span>
                    <span className="text-cyan-300">
                      {incidentDetail.latitude.toFixed(4)}°N, {incidentDetail.longitude.toFixed(4)}°E
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase">Affected Count</span>
                    <span className="text-rose-400 font-bold">{incidentDetail.affected_people_count || 1} Persons</span>
                  </div>
                </div>

                {incidentDetail.description && (
                  <p className="text-xs text-slate-300 bg-[#060D17] p-2.5 rounded-xl border border-[#142B42] leading-relaxed">
                    {incidentDetail.description}
                  </p>
                )}
              </div>

              {/* Lifecycle State Transitions */}
              <div className="p-3 bg-[#0D1D2D] border border-[#142B42] rounded-xl space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  LIFECYCLE TRANSITION
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  <button
                    onClick={() => handleStatusTransition('IN_REVIEW')}
                    className="p-1.5 bg-[#060D17] hover:bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded-lg text-center cursor-pointer"
                  >
                    Under Review
                  </button>
                  <button
                    onClick={() => handleStatusTransition('VERIFIED')}
                    className="p-1.5 bg-[#060D17] hover:bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 rounded-lg text-center cursor-pointer"
                  >
                    Mark Verified
                  </button>
                  <button
                    onClick={() => handleStatusTransition('RESOLVED')}
                    className="p-1.5 bg-[#060D17] hover:bg-blue-950/60 text-blue-300 border border-blue-800/60 rounded-lg text-center cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>

              {/* Ground Truth Verification Actions */}
              <div className="p-3 bg-[#0D1D2D] border border-[#142B42] rounded-xl space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  GROUND TRUTH VERIFICATION
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <button
                    onClick={() => handleVerify('confirmed')}
                    className="p-2 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl flex items-center justify-center space-x-1 cursor-pointer font-bold shadow-teal-glow"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>
                  <button
                    onClick={() => handleVerify('duplicate')}
                    className="p-2 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl flex items-center justify-center space-x-1 cursor-pointer font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={() => handleVerify('rejected')}
                    className="p-2 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl flex items-center justify-center space-x-1 cursor-pointer font-bold"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* AI Multi-Factor Dispatch Advisor Trigger */}
              <div className="p-4 bg-gradient-to-br from-cyan-950/40 to-[#0D1D2D] border border-cyan-500/40 rounded-2xl space-y-3 shadow-cyan-glow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Navigation className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white font-mono">DISPATCH ADVISOR</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    NETWORK ROUTING
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans">
                  Calculate nearest available field response units based on terrain access, boat equipment, and dry-road navigation corridors.
                </p>
                <button
                  onClick={handleOpenDispatch}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono shadow-cyan-glow cursor-pointer transition flex items-center justify-center space-x-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Launch Dispatch Advisor</span>
                </button>
              </div>

              {/* Operational Audit Timeline */}
              <div className="p-3 bg-[#0D1D2D] border border-[#142B42] rounded-xl space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  OPERATIONAL AUDIT TRAIL
                </span>
                <OperationalTimeline events={mappedTimeline} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono text-xs space-y-2">
              <Compass className="w-6 h-6 text-slate-600 animate-pulse" />
              <span>Select an incident from the tactical map or triage queue to inspect dossier.</span>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Recommendation Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="panel-glass-deep p-6 rounded-2xl border border-cyan-500/40 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-[#142B42] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 font-mono">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span>Recommended Dispatch Units</span>
              </h3>
              <button onClick={() => setDispatchModalOpen(false)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>

            {dispatchLoading ? (
              <div className="py-8 text-center text-xs font-mono text-cyan-400">
                Calculating dry-route transit times...
              </div>
            ) : dispatchRecommendations.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-mono">
                No active units available in immediate quadrant.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {dispatchRecommendations.map((rec) => (
                  <div
                    key={rec.team_id}
                    className="p-3 bg-[#060D17] border border-[#142B42] rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{rec.team_name}</div>
                      <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                        ETA: ~{rec.estimated_eta_minutes} mins &bull; Suitability: {(rec.score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignTeam(rec.team_id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono cursor-pointer shadow-teal-glow"
                    >
                      Dispatch
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
