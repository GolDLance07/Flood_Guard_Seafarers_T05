import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  Navigation,
  CheckCircle2,
  Radio,
  MapPin,
  RefreshCw,
  AlertOctagon,
  Users,
  Compass,
  Send,
  AlertTriangle,
  Clock
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
  const [isSharingLocation, setIsSharingLocation] = useState<boolean>(true);
  const [lastBeaconTime, setLastBeaconTime] = useState<string>('Just now');
  const [isGpsFresh, setIsGpsFresh] = useState<boolean>(true);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 9.498,
    longitude: 76.338
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // MapLibre references for tactical field map
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

  // Tactical map initialization & marker updates
  useEffect(() => {
    if (!mapContainer.current) return;

    if (!mapInstance.current) {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: BASEMAP_STYLE,
        center: [currentCoords.longitude, currentCoords.latitude],
        zoom: 12.5,
        maxZoom: 16
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      mapInstance.current = map;
    }

    const map = mapInstance.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Marker 1: Team live location (cyan dot with pulsing ring)
    const teamEl = document.createElement('div');
    teamEl.className = 'w-5 h-5 rounded-full bg-cyan-400 border-2 border-white shadow-lg flex items-center justify-center animate-pulse';
    const teamMarker = new maplibregl.Marker({ element: teamEl })
      .setLngLat([currentCoords.longitude, currentCoords.latitude])
      .setPopup(new maplibregl.Popup({ offset: 12 }).setText('Unit Current Beacon'))
      .addTo(map);
    markersRef.current.push(teamMarker);

    // Marker 2: Target incident location (red pin)
    if (selectedTask?.target_location) {
      const targetEl = document.createElement('div');
      targetEl.className = 'w-5 h-5 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-white font-bold';
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
      map.fitBounds(bounds, { padding: 45, maxZoom: 14, duration: 600 });
    } else {
      map.flyTo({ center: [currentCoords.longitude, currentCoords.latitude], zoom: 12.5, duration: 600 });
    }
  }, [currentCoords, selectedTask]);

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
    <div className="flex-1 flex flex-col h-full bg-[#07111F] text-slate-200 overflow-hidden select-none font-sans">
      {/* Top Console Bar */}
      <div className="p-3.5 bg-[#091522] border-b border-[#203A52] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center space-x-2 font-mono">
              <span>RESPONDER FIELD CONSOLE</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-700/60 rounded">
                Telemetry Active
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Unit deployment status, tactical task queue, and live GPS beacon relay
            </p>
          </div>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-[#10243A] border border-[#203A52] px-3 py-1.5 rounded-xl">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Active Unit:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id} className="bg-[#10243A] text-white">
                  {team.name} ({team.team_type})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadTeamsAndTasks}
            className="p-2 bg-[#10243A] hover:bg-[#142B42] text-slate-300 border border-[#203A52] rounded-xl cursor-pointer transition-colors"
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="px-4 py-2 bg-emerald-950/60 border-b border-emerald-800/40 text-emerald-300 text-xs flex justify-between items-center font-mono">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Unit Dossier & Tactical Tasks Queue */}
        <div className="w-full md:w-5/12 lg:w-4/12 border-r border-[#203A52] flex flex-col overflow-hidden bg-[#091522]/60">
          {/* Unit Info Card */}
          {activeTeam && (
            <div className="p-3.5 border-b border-[#203A52] bg-[#10243A]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-xs font-bold text-white font-mono">{activeTeam.name}</h2>
                  <span className="text-[11px] text-slate-400 font-mono">{activeTeam.jurisdiction_zone}</span>
                </div>
                <Badge variant={activeTeam.status === 'AVAILABLE' ? 'emerald' : 'cyan'}>
                  {activeTeam.status}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {activeTeam.capabilities.map((cap, i) => (
                  <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 bg-[#07111F] text-cyan-300 rounded border border-[#203A52]">
                    {cap.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Task Queue Header */}
          <div className="px-3.5 py-2 bg-[#10243A]/80 border-b border-[#203A52] flex justify-between items-center text-xs font-bold text-slate-300 font-mono">
            <span>OPERATIONAL TASKS ({tasks.length})</span>
            <span className="text-[10px] text-slate-500 font-normal">Ranked by Priority</span>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                No active tasks dispatched to this unit. Standby for operational orders.
              </div>
            ) : (
              tasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                        : 'bg-[#10243A] border-[#203A52] hover:bg-[#142B42] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-[11px] font-bold text-cyan-400">{task.task_code}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        task.status === 'COMPLETED' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-950 text-blue-300 border border-blue-600' :
                        task.status === 'EN_ROUTE' ? 'bg-purple-950 text-purple-300 border border-purple-600' :
                        'bg-amber-950 text-amber-300 border border-amber-600'
                      }`}>
                        {task.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-xs leading-snug">{task.title}</h3>
                    {task.target_location?.address && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        <span className="line-clamp-1">{task.target_location.address}</span>
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Task Execution Stepper & GPS Telemetry Control & Tactical Map */}
        <div className="w-full md:w-7/12 lg:w-8/12 p-4 overflow-y-auto space-y-4 bg-[#07111F]">
          {selectedTask ? (
            <>
              {/* Task Header & Execution Controls */}
              <div className="p-4 bg-[#10243A] border border-[#203A52] rounded-2xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">{selectedTask.task_code}</span>
                  <Badge variant={selectedTask.priority === 'critical' ? 'rose' : 'amber'}>
                    {selectedTask.priority.toUpperCase()} PRIORITY
                  </Badge>
                </div>

                <h2 className="text-sm font-bold text-white">{selectedTask.title}</h2>
                {selectedTask.description && (
                  <p className="text-xs text-slate-300 mt-2 bg-[#091522] p-3 rounded-lg border border-[#203A52]">
                    {selectedTask.description}
                  </p>
                )}

                {selectedTask.instructions && (
                  <div className="mt-3 text-xs bg-cyan-950/30 border border-cyan-800/40 p-2.5 rounded-lg text-cyan-200">
                    <span className="font-bold block text-[11px] text-cyan-400 mb-0.5 font-mono">Command Instructions:</span>
                    {selectedTask.instructions}
                  </div>
                )}

                {/* Accept / Decline controls if PENDING */}
                {selectedTask.status === 'PENDING' && (
                  <div className="mt-4 pt-3 border-t border-[#203A52] flex space-x-3">
                    <button
                      onClick={() => handleTaskDecision(selectedTask.id, 'ACCEPTED')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Assignment</span>
                    </button>
                    <button
                      onClick={() => handleTaskDecision(selectedTask.id, 'DECLINED')}
                      className="flex-1 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <AlertOctagon className="w-4 h-4" />
                      <span>Decline Task</span>
                    </button>
                  </div>
                )}

                {/* Progress Lifecycle Stepper if Accepted */}
                {['ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(selectedTask.status) && (
                  <div className="mt-4 pt-3 border-t border-[#203A52]">
                    <span className="text-xs font-bold text-white block mb-2 font-mono uppercase tracking-wider">
                      Tactical Mission Stepper:
                    </span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono">
                      <button
                        onClick={() => handleStatusUpdate(selectedTask.id, 'EN_ROUTE')}
                        disabled={selectedTask.status === 'EN_ROUTE'}
                        className={`py-2 px-2 text-[11px] font-bold rounded-lg border cursor-pointer ${
                          selectedTask.status === 'EN_ROUTE'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-[#091522] text-slate-300 hover:bg-[#142B42] border-[#203A52]'
                        }`}
                      >
                        En Route
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedTask.id, 'ARRIVED')}
                        disabled={selectedTask.status === 'ARRIVED'}
                        className={`py-2 px-2 text-[11px] font-bold rounded-lg border cursor-pointer ${
                          selectedTask.status === 'ARRIVED'
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-[#091522] text-slate-300 hover:bg-[#142B42] border-[#203A52]'
                        }`}
                      >
                        Arrived On Scene
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedTask.id, 'IN_PROGRESS')}
                        disabled={selectedTask.status === 'IN_PROGRESS'}
                        className={`py-2 px-2 text-[11px] font-bold rounded-lg border cursor-pointer ${
                          selectedTask.status === 'IN_PROGRESS'
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-[#091522] text-slate-300 hover:bg-[#142B42] border-[#203A52]'
                        }`}
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedTask.id, 'COMPLETED')}
                        className="py-2 px-2 text-[11px] font-bold rounded-lg border bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer shadow-sm"
                      >
                        Complete Task
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tactical Mission Map Container */}
              <div className="p-4 bg-[#10243A] border border-[#203A52] rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <span>Tactical Geolocation Context</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Unit: {currentCoords.latitude.toFixed(3)}, {currentCoords.longitude.toFixed(3)}
                  </span>
                </div>
                <div className="w-full h-48 rounded-xl overflow-hidden border border-[#203A52] relative">
                  <div ref={mapContainer} className="w-full h-full" />
                </div>
              </div>

              {/* Live Location Telemetry Beacon Card */}
              <div className="p-4 bg-[#10243A] border border-[#203A52] rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Unit GPS Telemetry Beacon
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Stale vs Live GPS Distinction */}
                    {isGpsFresh ? (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE GPS BEACON</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>STALE GPS (&gt;15m)</span>
                      </span>
                    )}
                    <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSharingLocation}
                        onChange={(e) => {
                          setIsSharingLocation(e.target.checked);
                          if (!e.target.checked) setIsGpsFresh(false);
                        }}
                        className="rounded bg-[#091522] border-[#203A52] text-cyan-500 focus:ring-0"
                      />
                      <span>Opt-in Sharing</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#091522] p-3 rounded-xl border border-[#203A52]">
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono">Current Latitude</span>
                    <input
                      type="number"
                      step="0.001"
                      value={currentCoords.latitude}
                      onChange={(e) => setCurrentCoords({ ...currentCoords, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#10243A] border border-[#203A52] rounded px-2 py-1 text-slate-200 font-mono text-xs mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] font-mono">Current Longitude</span>
                    <input
                      type="number"
                      step="0.001"
                      value={currentCoords.longitude}
                      onChange={(e) => setCurrentCoords({ ...currentCoords, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#10243A] border border-[#203A52] rounded px-2 py-1 text-slate-200 font-mono text-xs mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={handleBroadcastLocation}
                  className="w-full py-2 bg-[#142B42] hover:bg-[#1B3A5A] text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Telemetry Beacon (Updated: {lastBeaconTime})</span>
                </button>
              </div>

              {/* Transit & Ground Warning Disclaimer */}
              <div className="p-3 bg-amber-950/20 border border-amber-600/30 rounded-xl text-[11px] text-amber-200/90 space-y-1 font-mono">
                <div className="flex items-center space-x-1.5 font-bold text-amber-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Tactical Navigation Advisory</span>
                </div>
                <p>
                  Candidate routes and staging points require continuous on-scene reconnaissance. Mapped radar water levels
                  can underestimate water depth in drainage culverts and submerged roadways. Do not cross rushing water.
                </p>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
              <Navigation className="w-8 h-8 text-slate-600 mb-2" />
              <span>Select an assigned mission task from the left queue to view details and execute orders.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
