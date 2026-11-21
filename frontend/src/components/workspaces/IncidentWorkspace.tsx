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
      console.error('Failed to load incident detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Map Initialization
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLE,
      center: [76.335, 9.495],
      zoom: 11,
      maxZoom: 16
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update Map Markers on incident change
  useEffect(() => {
    if (!mapInstance.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    incidents.forEach((inc) => {
      if (!inc.latitude || !inc.longitude) return;

      const isSelected = inc.id === selectedIncidentId;
      const el = document.createElement('div');
      el.className = 'cursor-pointer select-none';

      const color =
        inc.severity === 'critical' ? '#E45555' :
        inc.severity === 'high' ? '#F0A83B' : '#16B8D4';

      el.innerHTML = `
        <div style="
          width: ${isSelected ? '22px' : '16px'};
          height: ${isSelected ? '22px' : '16px'};
          border-radius: 50%;
          background: ${color};
          border: 2px solid #E8F0F7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 9px;
          color: #07111F;
        ">
          !
        </div>
      `;

      el.addEventListener('click', () => handleSelectIncident(inc.id));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([inc.longitude, inc.latitude])
        .addTo(mapInstance.current!);

      markersRef.current.push(marker);
    });
  }, [incidents, selectedIncidentId]);

  // Operational Verification Actions
  const handleVerify = async (status: 'confirmed' | 'rejected' | 'duplicate') => {
    if (!selectedIncidentId) return;
    try {
      await verifyIncident(selectedIncidentId, { decision: status, verification_notes: 'Verified by Command Coordinator' });
      setActionNotice(`Incident status updated to: ${status.toUpperCase()}`);
      loadIncidents();
      handleSelectIncident(selectedIncidentId);
    } catch (err: any) {
      setActionNotice(`Verification failed: ${err.message}`);
    }
  };

  const handleStatusTransition = async (newStatus: string) => {
    if (!selectedIncidentId) return;
    try {
      await updateIncidentStatus(selectedIncidentId, { new_status: newStatus, internal_note: 'Status modified via Command operations console' });
      setActionNotice(`Lifecycle state transitioned to: ${newStatus}`);
      loadIncidents();
      handleSelectIncident(selectedIncidentId);
    } catch (err: any) {
      setActionNotice(`Status update failed: ${err.message}`);
    }
  };

  const handleOpenDispatch = async () => {
    if (!selectedIncidentId) return;
    setDispatchModalOpen(true);
    setDispatchLoading(true);
    try {
      const recs = await fetchDispatchRecommendations(selectedIncidentId);
      setDispatchRecommendations(recs.top_recommendations || []);
    } catch (err) {
      console.error('Failed to load dispatch recommendations:', err);
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleAssignTeam = async (teamId: string) => {
    if (!selectedIncidentId) return;
    try {
      await assignIncidentTeam(selectedIncidentId, { team_id: teamId, assignment_notes: 'Dispatch order issued via incident triage' });
      setDispatchModalOpen(false);
      setActionNotice(`Unit dispatched successfully.`);
      loadIncidents();
      handleSelectIncident(selectedIncidentId);
    } catch (err: any) {
      setActionNotice(`Dispatch assignment failed: ${err.message}`);
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
    <div className="flex-1 flex flex-col h-full bg-[#07111F] text-[#E8F0F7] overflow-hidden select-none font-sans relative">
      {/* 1. Header Toolbar */}
      <div className="p-2.5 bg-[#091522] border-b border-[#203A52] flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-[#10243A] border border-[#203A52] rounded text-[#F0A83B]">
            <AlertTriangle className="w-4 h-4 text-[#F0A83B]" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-[#E8F0F7] tracking-tight flex items-center space-x-2 font-mono">
              <span>INCIDENT TRIAGE &amp; OPERATIONS COMMAND</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#10243A] text-[#16B8D4] rounded font-mono border border-[#203A52]">
                {incidents.length} active
              </span>
            </h1>
            <p className="text-[10px] text-[#8DA3B8] font-mono">
              Multi-source disaster verification, geospatial hotspot clustering, and unit dispatch
            </p>
          </div>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex bg-[#07111F] p-0.5 rounded border border-[#203A52]">
            <button
              onClick={() => setViewMode('queue')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                viewMode === 'queue' ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4]' : 'text-[#8DA3B8]'
              }`}
            >
              Triage Queue
            </button>
            <button
              onClick={() => setViewMode('clusters')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded flex items-center space-x-1 transition-colors cursor-pointer ${
                viewMode === 'clusters' ? 'bg-[#10243A] text-[#16B8D4] border border-[#16B8D4]' : 'text-[#8DA3B8]'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Clusters ({clusters.length})</span>
            </button>
          </div>

          <button
            onClick={loadIncidents}
            className="p-1.5 bg-[#07111F] hover:bg-[#10243A] text-[#8DA3B8] hover:text-[#E8F0F7] border border-[#203A52] rounded cursor-pointer"
            title="Refresh Incidents"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#16B8D4]' : ''}`} />
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="px-3 py-1 bg-[#10243A] border-b border-[#203A52] text-[#16B8D4] text-xs flex justify-between items-center font-mono">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-[#8DA3B8] hover:text-[#E8F0F7] font-bold ml-2">×</button>
        </div>
      )}

      {/* 2. Asymmetric Split Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT / CENTER: Triage Queue & Map Composite (60% width) */}
        <div className="flex-1 flex flex-col h-[50%] lg:h-full border-r border-[#203A52] overflow-hidden">
          {/* Tactical Incident Map Viewport */}
          <div className="h-60 sm:h-64 w-full relative border-b border-[#203A52] flex-shrink-0">
            <div ref={mapContainer} className="w-full h-full" />
            <div className="absolute top-2.5 left-2.5 bg-[#091522] px-2 py-0.5 rounded text-[10px] font-mono text-[#16B8D4] border border-[#203A52] flex items-center space-x-1.5 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16B8D4]" />
              <span>TACTICAL INCIDENT BEACONS ({incidents.length})</span>
            </div>
          </div>

          {/* Incident Queue Table & Filter HUD */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#07111F]">
            {/* Filter Controls Bar */}
            <div className="p-2 bg-[#091522] border-b border-[#203A52] flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="w-3 h-3 text-[#8DA3B8] absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Search tracking #, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadIncidents()}
                  className="w-full bg-[#07111F] border border-[#203A52] rounded pl-7 pr-2.5 py-1 text-xs text-[#E8F0F7] placeholder-[#8DA3B8]/60 focus:outline-none focus:border-[#16B8D4]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#07111F] border border-[#203A52] rounded px-2 py-1 text-[10px] text-[#8DA3B8] focus:outline-none focus:border-[#16B8D4]"
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
                className="bg-[#07111F] border border-[#203A52] rounded px-2 py-1 text-[10px] text-[#8DA3B8] focus:outline-none focus:border-[#16B8D4]"
              >
                <option value="ALL">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Scrollable Queue List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {incidents.length === 0 ? (
                <div className="p-6 text-center text-[#8DA3B8] font-mono text-xs">
                  No incidents matching operational filters.
                </div>
              ) : (
                incidents.map((inc) => {
                  const isSelected = inc.id === selectedIncidentId;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => handleSelectIncident(inc.id)}
                      className={`p-2.5 rounded border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#10243A] border-[#16B8D4]'
                          : 'bg-[#091522] border-[#203A52] hover:border-[#8DA3B8]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-bold text-[#16B8D4]">
                            {inc.tracking_number}
                          </span>
                          <IncidentPriorityBadge status={inc.status} size="sm" />
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                              inc.severity === 'critical'
                                ? 'bg-[#E45555]/10 text-[#E45555] border border-[#E45555]/40'
                                : inc.severity === 'high'
                                ? 'bg-[#F0A83B]/10 text-[#F0A83B] border border-[#F0A83B]/40'
                                : 'bg-[#16B8D4]/10 text-[#16B8D4] border border-[#16B8D4]/40'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#8DA3B8] font-mono">
                          {inc.submitted_at ? inc.submitted_at.slice(11, 16) : 'Now'}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-[#E8F0F7] truncate">{inc.title}</div>
                      <div className="text-[10px] text-[#8DA3B8] truncate flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#16B8D4] flex-shrink-0" />
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
        <div className="w-full lg:w-[460px] h-[50%] lg:h-full bg-[#091522] flex flex-col overflow-hidden">
          {detailLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-[#16B8D4] space-y-2">
              <div className="w-5 h-5 border-2 border-[#16B8D4] border-t-transparent rounded-full animate-spin" />
              <span>Retrieving Incident Dossier...</span>
            </div>
          ) : incidentDetail ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Dossier Header */}
              <div className="p-3 bg-[#10243A] border border-[#203A52] rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#16B8D4] font-mono uppercase tracking-wider block font-bold">
                      INCIDENT DOSSIER
                    </span>
                    <h2 className="text-sm font-bold text-[#E8F0F7]">{incidentDetail.title}</h2>
                  </div>
                  <IncidentPriorityBadge status={incidentDetail.status} size="md" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-[#203A52]">
                  <div>
                    <span className="text-[9px] text-[#8DA3B8] block uppercase">Tracking ID</span>
                    <span className="text-[#E8F0F7] font-bold">{incidentDetail.tracking_number}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8DA3B8] block uppercase">Category</span>
                    <span className="text-[#F0A83B] font-semibold uppercase">{incidentDetail.category}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8DA3B8] block uppercase">Coordinates</span>
                    <span className="text-[#16B8D4]">
                      {incidentDetail.latitude.toFixed(4)}°N, {incidentDetail.longitude.toFixed(4)}°E
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8DA3B8] block uppercase">Affected Count</span>
                    <span className="text-[#E45555] font-bold">{incidentDetail.affected_people_count || 1} Persons</span>
                  </div>
                </div>

                {incidentDetail.description && (
                  <p className="text-xs text-[#E8F0F7] bg-[#07111F] p-2 rounded border border-[#203A52] leading-relaxed">
                    {incidentDetail.description}
                  </p>
                )}
              </div>

              {/* Lifecycle State Transitions */}
              <div className="p-2.5 bg-[#10243A] border border-[#203A52] rounded space-y-1.5">
                <span className="text-[10px] font-mono text-[#8DA3B8] uppercase tracking-wider block font-bold">
                  LIFECYCLE TRANSITION
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  <button
                    onClick={() => handleStatusTransition('IN_REVIEW')}
                    className="p-1 bg-[#07111F] hover:bg-[#142B42] text-[#F0A83B] border border-[#203A52] rounded text-center cursor-pointer"
                  >
                    Under Review
                  </button>
                  <button
                    onClick={() => handleStatusTransition('VERIFIED')}
                    className="p-1 bg-[#07111F] hover:bg-[#142B42] text-[#18A58B] border border-[#203A52] rounded text-center cursor-pointer"
                  >
                    Mark Verified
                  </button>
                  <button
                    onClick={() => handleStatusTransition('RESOLVED')}
                    className="p-1 bg-[#07111F] hover:bg-[#142B42] text-[#8DA3B8] border border-[#203A52] rounded text-center cursor-pointer"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>

              {/* Ground Truth Verification Actions */}
              <div className="p-2.5 bg-[#10243A] border border-[#203A52] rounded space-y-1.5">
                <span className="text-[10px] font-mono text-[#8DA3B8] uppercase tracking-wider block font-bold">
                  GROUND TRUTH VERIFICATION
                </span>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  <button
                    onClick={() => handleVerify('confirmed')}
                    className="p-1.5 bg-[#07111F] hover:bg-[#142B42] text-[#18A58B] border border-[#18A58B] rounded flex items-center justify-center space-x-1 cursor-pointer font-bold"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm</span>
                  </button>
                  <button
                    onClick={() => handleVerify('duplicate')}
                    className="p-1.5 bg-[#07111F] hover:bg-[#142B42] text-[#F0A83B] border border-[#F0A83B] rounded flex items-center justify-center space-x-1 cursor-pointer font-bold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={() => handleVerify('rejected')}
                    className="p-1.5 bg-[#07111F] hover:bg-[#142B42] text-[#E45555] border border-[#E45555] rounded flex items-center justify-center space-x-1 cursor-pointer font-bold"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              {/* Multi-Factor Dispatch Advisor Trigger */}
              <div className="p-3 bg-[#10243A] border border-[#203A52] rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Navigation className="w-3.5 h-3.5 text-[#16B8D4]" />
                    <span className="text-xs font-bold text-[#E8F0F7] font-mono">DISPATCH ADVISOR</span>
                  </div>
                  <span className="text-[9px] font-mono text-[#16B8D4] bg-[#07111F] px-1.5 py-0.2 rounded border border-[#203A52]">
                    NETWORK ROUTING
                  </span>
                </div>
                <p className="text-xs text-[#8DA3B8] font-sans">
                  Calculate nearest available field response units based on terrain access, boat equipment, and dry-road navigation corridors.
                </p>
                <button
                  onClick={handleOpenDispatch}
                  className="w-full py-1.5 bg-[#142B42] hover:bg-[#203A52] border border-[#16B8D4] text-[#16B8D4] rounded text-xs font-bold font-mono cursor-pointer transition flex items-center justify-center space-x-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Launch Dispatch Advisor</span>
                </button>
              </div>

              {/* Operational Audit Timeline */}
              <div className="p-2.5 bg-[#10243A] border border-[#203A52] rounded space-y-1.5">
                <span className="text-[10px] font-mono text-[#8DA3B8] uppercase tracking-wider block font-bold">
                  OPERATIONAL AUDIT TRAIL
                </span>
                <OperationalTimeline events={mappedTimeline} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8DA3B8] font-mono text-xs space-y-2">
              <Compass className="w-6 h-6 text-[#8DA3B8]/40" />
              <span>Select an incident from the tactical map or triage queue to inspect dossier.</span>
            </div>
          )}
        </div>
      </div>

      {/* Dispatch Recommendation Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#091522] p-5 rounded border border-[#203A52] shadow-2xl max-w-lg w-full space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#203A52] pb-2">
              <h3 className="text-xs font-bold text-[#E8F0F7] flex items-center space-x-2">
                <Compass className="w-4 h-4 text-[#16B8D4]" />
                <span>Recommended Dispatch Units</span>
              </h3>
              <button onClick={() => setDispatchModalOpen(false)} className="text-[#8DA3B8] hover:text-[#E8F0F7] text-base">×</button>
            </div>

            {dispatchLoading ? (
              <div className="py-6 text-center text-xs text-[#16B8D4]">
                Calculating dry-route transit times...
              </div>
            ) : dispatchRecommendations.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8DA3B8]">
                No active units available in immediate quadrant.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {dispatchRecommendations.map((rec) => (
                  <div
                    key={rec.team_id}
                    className="p-2.5 bg-[#07111F] border border-[#203A52] rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#E8F0F7]">{rec.team_name}</div>
                      <div className="text-[10px] text-[#16B8D4] mt-0.5">
                        ETA: ~{rec.estimated_eta_minutes} mins &bull; Suitability: {(rec.score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignTeam(rec.team_id)}
                      className="px-2.5 py-1 bg-[#10243A] hover:bg-[#142B42] text-[#18A58B] border border-[#18A58B] rounded text-xs font-bold cursor-pointer"
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
