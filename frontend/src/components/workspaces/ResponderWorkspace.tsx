import React, { useState, useEffect } from 'react';
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
  AlertTriangle
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

export const ResponderWorkspace: React.FC = () => {
  const [teams, setTeams] = useState<ResponderTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [tasks, setTasks] = useState<ResponderTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<ResponderTask | null>(null);

  // Telemetry Location Sharing
  const [isSharingLocation, setIsSharingLocation] = useState<boolean>(true);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 9.498,
    longitude: 76.338
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
      setStatusMessage('Location telemetry beacon transmitted to Command Operations.');
    } catch (err: any) {
      setStatusMessage(`Location broadcast error: ${err.message}`);
    }
  };

  const activeTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070D18] text-slate-200 overflow-hidden select-none">
      {/* Top Console Bar */}
      <div className="p-4 bg-[#0A1220] border-b border-[#1E2D4A] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Responder Field Console</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-700/60 rounded">
                Telemetry Active
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Unit deployment status, tactical task queue, and live GPS beacon relay
            </p>
          </div>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-[#0D1626] border border-[#1E2D4A] px-3 py-1.5 rounded-xl">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Active Unit:</span>
            <select
              value={selectedTeamId}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id} className="bg-[#0D1626] text-white">
                  {team.name} ({team.team_type})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadTeamsAndTasks}
            className="p-2 bg-[#0D1626] hover:bg-[#16243A] text-slate-300 border border-[#1E2D4A] rounded-lg cursor-pointer transition-colors"
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="px-4 py-2 bg-emerald-950/60 border-b border-emerald-800/40 text-emerald-300 text-xs flex justify-between items-center">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Unit Dossier & Tactical Tasks Queue */}
        <div className="w-full md:w-1/2 lg:w-5/12 border-r border-[#1E2D4A] flex flex-col overflow-hidden bg-[#0A1220]/50">
          {/* Unit Info Card */}
          {activeTeam && (
            <div className="p-4 border-b border-[#1E2D4A] bg-[#0D1626]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-sm font-bold text-white">{activeTeam.name}</h2>
                  <span className="text-xs text-slate-400 font-mono">{activeTeam.jurisdiction_zone}</span>
                </div>
                <Badge variant={activeTeam.status === 'AVAILABLE' ? 'emerald' : 'cyan'}>
                  {activeTeam.status}
                </Badge>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {activeTeam.capabilities.map((cap, i) => (
                  <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-[#16243A] text-cyan-300 rounded border border-cyan-800/40">
                    {cap.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Task Queue Header */}
          <div className="px-4 py-2.5 bg-[#0D1626]/80 border-b border-[#1E2D4A] flex justify-between items-center text-xs font-bold text-slate-300">
            <span>Operational Task Assignments ({tasks.length})</span>
            <span className="text-[10px] text-slate-500 font-normal">Ranked by Priority</span>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
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
                        : 'bg-[#0D1626] border-[#1E2D4A] hover:bg-[#121E32] hover:border-slate-600'
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

        {/* Right: Task Execution Stepper & GPS Telemetry Control */}
        <div className="w-full md:w-1/2 lg:w-7/12 p-4 overflow-y-auto space-y-4 bg-[#070D18]">
          {selectedTask ? (
            <>
              {/* Task Header & Execution Controls */}
              <div className="p-4 bg-[#0D1626] border border-[#1E2D4A] rounded-2xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">{selectedTask.task_code}</span>
                  <Badge variant={selectedTask.priority === 'critical' ? 'rose' : 'amber'}>
                    {selectedTask.priority.toUpperCase()} PRIORITY
                  </Badge>
                </div>

                <h2 className="text-sm font-bold text-white">{selectedTask.title}</h2>
                {selectedTask.description && (
                  <p className="text-xs text-slate-300 mt-2 bg-[#0A1220] p-3 rounded-lg border border-[#1E2D4A]">
                    {selectedTask.description}
                  </p>
                )}

                {selectedTask.instructions && (
                  <div className="mt-3 text-xs bg-cyan-950/30 border border-cyan-800/40 p-2.5 rounded-lg text-cyan-200">
                    <span className="font-bold block text-[11px] text-cyan-400 mb-0.5">Command Instructions:</span>
                    {selectedTask.instructions}
                  </div>
                )}

                {/* Accept / Decline controls if PENDING */}
                {selectedTask.status === 'PENDING' && (
                  <div className="mt-4 pt-3 border-t border-[#1E2D4A] flex space-x-3">
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
                  <div className="mt-4 pt-3 border-t border-[#1E2D4A]">
                    <span className="text-xs font-bold text-white block mb-2">Tactical Mission Stepper:</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button
                        onClick={() => handleStatusUpdate(selectedTask.id, 'EN_ROUTE')}
                        disabled={selectedTask.status === 'EN_ROUTE'}
                        className={`py-2 px-2 text-[11px] font-bold rounded-lg border cursor-pointer ${
                          selectedTask.status === 'EN_ROUTE'
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-[#16243A] text-slate-300 hover:bg-[#1E2D4A] border-[#1E2D4A]'
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
                            : 'bg-[#16243A] text-slate-300 hover:bg-[#1E2D4A] border-[#1E2D4A]'
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
                            : 'bg-[#16243A] text-slate-300 hover:bg-[#1E2D4A] border-[#1E2D4A]'
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

              {/* Live Location Telemetry Beacon Card */}
              <div className="p-4 bg-[#0D1626] border border-[#1E2D4A] rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Unit Location Telemetry</h3>
                  </div>
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSharingLocation}
                      onChange={(e) => setIsSharingLocation(e.target.checked)}
                      className="rounded bg-[#16243A] border-[#1E2D4A] text-cyan-500 focus:ring-0"
                    />
                    <span>Opt-in Live Sharing</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-[#0A1220] p-3 rounded-xl border border-[#1E2D4A]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Current Latitude</span>
                    <input
                      type="number"
                      step="0.001"
                      value={currentCoords.latitude}
                      onChange={(e) => setCurrentCoords({ ...currentCoords, latitude: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#0D1626] border border-[#1E2D4A] rounded px-2 py-1 text-slate-200 font-mono text-xs mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Current Longitude</span>
                    <input
                      type="number"
                      step="0.001"
                      value={currentCoords.longitude}
                      onChange={(e) => setCurrentCoords({ ...currentCoords, longitude: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#0D1626] border border-[#1E2D4A] rounded px-2 py-1 text-slate-200 font-mono text-xs mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={handleBroadcastLocation}
                  className="w-full py-2 bg-[#16243A] hover:bg-[#1E2D4A] text-cyan-300 border border-cyan-800/60 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Telemetry Beacon</span>
                </button>
              </div>

              {/* Transit & Ground Warning Disclaimer */}
              <div className="p-3 bg-amber-950/20 border border-amber-600/30 rounded-xl text-[11px] text-amber-200/90 space-y-1">
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
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
              <Navigation className="w-8 h-8 text-slate-600 mb-2" />
              <span>Select an assigned mission task from the left queue to view details and execute orders.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
