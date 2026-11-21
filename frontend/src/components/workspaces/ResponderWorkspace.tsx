import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  Radio,
  RefreshCw,
  Users,
  Send,
  CheckCircle2
} from 'lucide-react';
import type { ResponderTeam, ResponderTask } from '../../types/api';
import {
  fetchResponderTeams,
  fetchResponderTasks,
  respondToTask,
  updateTaskLifecycle,
  sendResponderLocation
} from '../../services/api';
import { Badge } from '../common/Badge';

const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

export const ResponderWorkspace: React.FC = () => {
  const [teams, setTeams] = useState<ResponderTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [tasks, setTasks] = useState<ResponderTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<ResponderTask | null>(null);

  // Telemetry Location Sharing
  const isSharingLocation = true;
  const [isGpsFresh, setIsGpsFresh] = useState<boolean>(true);
  const [lastBeaconTime, setLastBeaconTime] = useState<string>('Just now');
  const currentCoords = {
    latitude: 9.498,
    longitude: 76.338
  };
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // MapLibre references
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const loadTeamsAndTasks = async () => {
    setLoading(true);
    try {
      const teamList = await fetchResponderTeams();
      setTeams(teamList);

      const activeTeamId = selectedTeamId || (teamList.length > 0 ? teamList[0].id : '');
      if (activeTeamId) {
        setSelectedTeamId(activeTeamId);
        const taskList = await fetchResponderTasks(activeTeamId);
        setTasks(taskList);
        if (taskList.length > 0 && !selectedTask) {
          setSelectedTask(taskList[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load responder operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamsAndTasks();
  }, [selectedTeamId]);

  // Tactical Map Initialization
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLE,
      center: [currentCoords.longitude, currentCoords.latitude],
      zoom: 12.5,
      maxZoom: 16
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update map markers when coordinates or tasks change
  useEffect(() => {
    if (!mapInstance.current) return;

    const map = mapInstance.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Marker 1: Team live location (cyan dot with pulsing ring)
    const teamEl = document.createElement('div');
    teamEl.className = 'w-6 h-6 rounded-full bg-cyan-400 border-2 border-white shadow-cyan-glow flex items-center justify-center animate-pulse';
    teamEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#060D17]"></span>';

    const teamMarker = new maplibregl.Marker({ element: teamEl })
      .setLngLat([currentCoords.longitude, currentCoords.latitude])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setHTML(`
        <div class="font-sans text-xs">
          <div class="font-bold text-white">${teams.find(t => t.id === selectedTeamId)?.name || 'Field Unit'}</div>
          <div class="text-[10px] text-cyan-400 font-mono">LIVE GPS BEACON &bull; &lt;2m Accuracy</div>
        </div>
      `))
      .addTo(map);
    markersRef.current.push(teamMarker);

    // Marker 2: Target incident location (red pin)
    if (selectedTask?.target_location) {
      const targetEl = document.createElement('div');
      targetEl.className = 'w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow-danger-glow flex items-center justify-center text-[10px] text-white font-bold animate-bounce';
      targetEl.innerText = '!';

      const targetMarker = new maplibregl.Marker({ element: targetEl })
        .setLngLat([selectedTask.target_location.longitude, selectedTask.target_location.latitude])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText(`Target: ${selectedTask.title}`))
        .addTo(map);
      markersRef.current.push(targetMarker);

      // Fit bounds to include both points
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([currentCoords.longitude, currentCoords.latitude]);
      bounds.extend([selectedTask.target_location.longitude, selectedTask.target_location.latitude]);
      map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 600 });
    } else {
      map.flyTo({ center: [currentCoords.longitude, currentCoords.latitude], zoom: 12.5, duration: 600 });
    }
  }, [currentCoords, selectedTask, selectedTeamId, teams]);

  const handleSelectTeam = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setLoading(true);
    try {
      const taskList = await fetchResponderTasks(teamId);
      setTasks(taskList);
      setSelectedTask(taskList.length > 0 ? taskList[0] : null);
    } catch (err) {
      console.error('Failed to switch team tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskDecision = async (taskId: string, decision: 'ACCEPTED' | 'DECLINED') => {
    try {
      await respondToTask(taskId, {
        team_id: selectedTeamId,
        decision
      });
      setStatusMessage(`Task ${decision.toLowerCase()} successfully.`);
      const taskList = await fetchResponderTasks(selectedTeamId);
      setTasks(taskList);
      setSelectedTask(taskList.find((t) => t.id === taskId) || null);
    } catch (err: any) {
      setStatusMessage(`Error responding to task: ${err.message}`);
    }
  };

  const handleStatusUpdate = async (taskId: string, nextStatus: 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await updateTaskLifecycle(taskId, {
        team_id: selectedTeamId,
        status: nextStatus,
        notes: `Unit marked status as ${nextStatus}`
      });
      setStatusMessage(`Status transitioned to ${nextStatus.replace('_', ' ')}.`);
      const taskList = await fetchResponderTasks(selectedTeamId);
      setTasks(taskList);
      setSelectedTask(taskList.find((t) => t.id === taskId) || null);
    } catch (err: any) {
      setStatusMessage(`Error updating status: ${err.message}`);
    }
  };

  const handleBroadcastLocation = async () => {
    if (!selectedTeamId) return;
    try {
      await sendResponderLocation({
        team_id: selectedTeamId,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        heading: 180.0,
        speed_kmh: 18.5,
        is_sharing_active: isSharingLocation
      });
      setIsGpsFresh(true);
      setLastBeaconTime(new Date().toLocaleTimeString());
      setStatusMessage('Location telemetry beacon transmitted to Command Operations.');
    } catch (err: any) {
      setStatusMessage(`Location broadcast error: ${err.message}`);
    }
  };

  const activeTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#060D17] text-slate-200 overflow-hidden select-none font-sans relative">
      {/* 1. Top Mission Control Header */}
      <div className="p-3 bg-[#091522] border-b border-[#142B42] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
              <span>RESPONDER FIELD MISSION CONTROL</span>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.2 rounded border ${
                isGpsFresh
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700/60'
                  : 'bg-amber-950 text-amber-400 border-amber-700/60'
              }`}>
                TELEMETRY ACTIVE
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Unit deployment status, tactical navigation vectors, and GPS beacon relay
            </p>
          </div>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-[#060D17] border border-[#142B42] px-3 py-1.5 rounded-xl">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Callsign:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id} className="bg-[#060D17] text-white">
                  {team.name} ({team.team_type})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadTeamsAndTasks}
            className="p-1.5 bg-[#060D17] hover:bg-[#10243A] text-slate-300 border border-[#142B42] rounded-lg cursor-pointer"
            title="Refresh Teams"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="px-4 py-1.5 bg-cyan-950/80 border-b border-cyan-700/60 text-cyan-300 text-xs flex justify-between items-center font-mono">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-cyan-400 font-bold ml-2">×</button>
        </div>
      )}

      {/* 2. Asymmetric Split Layout: Tactical Map (Left 60%) + Mission Terminal (Right 40%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT / CENTER: Tactical Field Map Engine (60% width) */}
        <div className="flex-1 h-[55%] lg:h-full relative overflow-hidden border-r border-[#142B42]">
          <div ref={mapContainer} className="w-full h-full" />

          {/* Floating Top-Left Status HUD */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none max-w-sm">
            <div className="pointer-events-auto panel-glass-deep p-3 rounded-2xl border border-[#142B42] shadow-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-[#142B42] pb-1.5">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                  UNIT BEACON STATUS
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-semibold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>TRANSMITTING</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Coordinates</span>
                  <span className="text-white font-semibold">
                    {currentCoords.latitude.toFixed(4)}°N, {currentCoords.longitude.toFixed(4)}°E
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">Accuracy</span>
                  <span className="text-cyan-300 font-semibold">&plusmn; 1.8 meters</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Team Roster & Mission Dossier (40% width) */}
        <div className="w-full lg:w-[460px] h-[45%] lg:h-full bg-[#091522] flex flex-col overflow-hidden">
          {/* Active Unit Profile Bar */}
          {activeTeam && (
            <div className="p-4 bg-[#0D1D2D] border-b border-[#142B42] space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-wider block">
                    TACTICAL FIELD UNIT
                  </span>
                  <h3 className="text-sm font-bold text-white">{activeTeam.name}</h3>
                </div>
                <Badge variant={activeTeam.status === 'AVAILABLE' ? 'emerald' : 'slate'} size="sm">
                  {activeTeam.status}
                </Badge>
              </div>

              {/* Capabilities & Comms */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(activeTeam.capabilities || ['Water Rescue', 'First Aid', 'Satellite Comm']).map((cap, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#060D17] text-slate-300 border border-[#142B42]"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              {/* Beacon Pulse Action */}
              <div className="pt-2 flex items-center justify-between border-t border-[#142B42] text-xs font-mono">
                <span className="text-slate-400 text-[10px]">Last Sync: {lastBeaconTime}</span>
                <button
                  onClick={handleBroadcastLocation}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-bold font-mono shadow-cyan-glow cursor-pointer transition flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Transmit GPS Beacon</span>
                </button>
              </div>
            </div>
          )}

          {/* Assigned Missions Queue */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1">
              <span>ASSIGNED MISSIONS ({tasks.length})</span>
              <span>PRIORITY RANKED</span>
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-2 bg-[#060D17] rounded-2xl border border-[#142B42]">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p>No active missions assigned to this unit.</p>
                <p className="text-[10px] text-slate-600">Standby for Command Center dispatch orders.</p>
              </div>
            ) : (
              tasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-[#10243A] border-cyan-500/70 shadow-cyan-glow'
                        : 'bg-[#060D17] border-[#142B42] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{task.title}</span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                          task.priority === 'critical' || task.priority === 'high'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 font-sans line-clamp-2">
                      {task.description || 'Emergency evacuation and survivor transport orders.'}
                    </p>

                    {/* Operational Lifecycle Stepper */}
                    <div className="pt-2 border-t border-[#142B42] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-cyan-400 font-bold uppercase">{task.status}</span>
                      <div className="flex items-center space-x-1.5">
                        {task.status === 'PENDING' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTaskDecision(task.id, 'ACCEPTED'); }}
                            className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold cursor-pointer"
                          >
                            Accept
                          </button>
                        )}
                        {task.status === 'ACCEPTED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(task.id, 'EN_ROUTE'); }}
                            className="px-2 py-0.5 rounded bg-cyan-600 text-white font-bold cursor-pointer"
                          >
                            En Route
                          </button>
                        )}
                        {task.status === 'EN_ROUTE' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(task.id, 'ARRIVED'); }}
                            className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold cursor-pointer"
                          >
                            On Scene
                          </button>
                        )}
                        {task.status === 'ARRIVED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(task.id, 'COMPLETED'); }}
                            className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
