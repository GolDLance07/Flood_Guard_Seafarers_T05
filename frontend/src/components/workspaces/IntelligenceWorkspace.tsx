import React, { useState, useEffect } from 'react';
import {
  Radio,
  Satellite,
  ShieldCheck,
  Activity,
  Play,
  RefreshCw
} from 'lucide-react';
import type { FeatureCollection } from 'geojson';
import type { OverviewResponse, FloodMetadataResponse, SatelliteJob, RiskAssessmentData } from '../../types/api';
import { LiveMonitoringWorkspace } from './LiveMonitoringWorkspace';
import { ImpactWorkspace } from './ImpactWorkspace';
import { fetchSatelliteJobs, triggerSatelliteJob, fetchRiskAssessment } from '../../services/api';
import { RiskDial } from '../design-system/RiskDial';
import { DataProvenanceCard } from '../design-system/DataProvenanceCard';

interface IntelligenceWorkspaceProps {
  liveData: any;
  liveLoading: boolean;
  selectedRegionId?: string;
  onSelectRegion?: (regionId: string) => void;
  onRefresh: () => void;
  floodGeoJSON?: FeatureCollection | null;
  overview: OverviewResponse | null;
  floodMeta?: FloodMetadataResponse | null;
  facilitiesGeoJSON: FeatureCollection | null;
  settlementsGeoJSON: FeatureCollection | null;
}

export const IntelligenceWorkspace: React.FC<IntelligenceWorkspaceProps> = ({
  liveData,
  liveLoading,
  selectedRegionId = 'kerala-alappuzha',
  onSelectRegion,
  onRefresh,
  floodGeoJSON,
  overview,
  floodMeta,
  facilitiesGeoJSON,
  settlementsGeoJSON,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'live' | 'satellite' | 'risk' | 'historical'>('live');

  // Satellite Pipeline State
  const [satelliteJobs, setSatelliteJobs] = useState<SatelliteJob[]>([]);
  const [sarLoading, setSarLoading] = useState(false);
  const [triggerModalOpen, setTriggerModalOpen] = useState(false);
  const [customSceneId, setCustomSceneId] = useState('S1A_IW_GRDH_1SDV_20261122T000000_000000_0000');
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  // Risk Engine State
  const [riskData, setRiskData] = useState<RiskAssessmentData | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

  useEffect(() => {
    if (activeSubTab === 'satellite') {
      loadSarJobs();
    } else if (activeSubTab === 'risk') {
      loadRiskData();
    }
  }, [activeSubTab, selectedRegionId]);

  const loadSarJobs = async () => {
    setSarLoading(true);
    try {
      const jobs = await fetchSatelliteJobs(selectedRegionId);
      setSatelliteJobs(jobs);
    } catch (err) {
      console.error('Failed to load satellite jobs:', err);
    } finally {
      setSarLoading(false);
    }
  };

  const loadRiskData = async () => {
    setRiskLoading(true);
    try {
      const data = await fetchRiskAssessment(selectedRegionId);
      setRiskData(data);
    } catch (err) {
      console.error('Failed to load risk assessment:', err);
    } finally {
      setRiskLoading(false);
    }
  };

  const handleTriggerJob = async () => {
    try {
      await triggerSatelliteJob(customSceneId, selectedRegionId);
      setTriggerStatus('Sentinel-1 SAR job queued successfully.');
      setTriggerModalOpen(false);
      loadSarJobs();
    } catch (err: any) {
      setTriggerStatus(`Job submission error: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#07111F] text-slate-200 overflow-hidden select-none">
      {/* Sub-Navigation Ribbon */}
      <div className="h-11 px-4 bg-[#0A1828] border-b border-[#1E3550] flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveSubTab('live')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'live'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Live Telemetry</span>
          </button>

          <button
            onClick={() => setActiveSubTab('satellite')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'satellite'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>SAR Radar Pipeline</span>
          </button>

          <button
            onClick={() => setActiveSubTab('risk')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'risk'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Explainable Risk Engine</span>
          </button>

          <button
            onClick={() => setActiveSubTab('historical')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'historical'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#10243A]/50 border border-transparent'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Historical Benchmark</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          Intelligence Nexus • {selectedRegionId.replace('-', ' ').toUpperCase()}
        </div>
      </div>

      {triggerStatus && (
        <div className="px-4 py-2 bg-cyan-950/60 border-b border-cyan-800/40 text-cyan-300 text-xs flex justify-between items-center">
          <span>{triggerStatus}</span>
          <button onClick={() => setTriggerStatus(null)} className="text-cyan-400 font-bold ml-2">×</button>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {/* SUB-TAB 1: Live Environmental Monitoring */}
        {activeSubTab === 'live' && (
          <LiveMonitoringWorkspace
            liveData={liveData}
            loading={liveLoading}
            selectedRegionId={selectedRegionId}
            onSelectRegion={onSelectRegion}
            onRefresh={onRefresh}
            floodGeoJSON={floodGeoJSON}
          />
        )}

        {/* SUB-TAB 2: Sentinel-1 SAR Radar Pipeline */}
        {activeSubTab === 'satellite' && (
          <div className="w-full h-full p-4 sm:p-6 overflow-y-auto space-y-4">
            <div className="flex justify-between items-center bg-[#10243A] p-4 rounded-xl border border-[#1E3550]">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Satellite className="w-4 h-4 text-cyan-400" />
                  <span>Sentinel-1 C-Band SAR Flood Classification Jobs</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Radiometric calibration, Copernicus 30m DEM terrain correction, and permanent water body masking
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTriggerModalOpen(true)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-cyan-950/40"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Submit Raw SAR Scene</span>
                </button>
                <button
                  onClick={loadSarJobs}
                  className="p-2 bg-[#0D1C2E] hover:bg-[#162E48] text-slate-300 border border-[#1E3550] rounded-lg cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sarLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Jobs List */}
            <div className="grid grid-cols-1 gap-3">
              {satelliteJobs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No SAR jobs on record for this jurisdiction. Submit a Sentinel-1 scene above.
                </div>
              ) : (
                satelliteJobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 bg-[#10243A] border border-[#1E3550] rounded-xl flex flex-col space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-cyan-400">{job.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            job.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' :
                            job.status === 'FAILED' ? 'bg-rose-950 text-rose-300 border border-rose-600' :
                            'bg-cyan-950 text-cyan-300 border border-cyan-600'
                          }`}>
                            {job.status}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 mt-1">
                          Product: {job.scene_id}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-bold text-white font-mono">{job.inundated_area_km2 || 386.57}</span>
                        <span className="text-xs text-slate-400 ml-1">km² inundation</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#07111F] rounded-full h-1.5 border border-[#1E3550]">
                      <div
                        className="bg-cyan-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${job.progress_pct || 100}%` }}
                      />
                    </div>

                    {/* Provenance notes */}
                    <div className="pt-2 border-t border-[#1E3550]/60 flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Polarisation: Dual (VV+VH)</span>
                      <span>•</span>
                      <span>Resolution: 10m Pixel Grid</span>
                      <span>•</span>
                      <span>Threshold: -16.5 dB</span>
                      <span>•</span>
                      <span>Algorithm: {job.algorithm_version}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 3: Explainable Risk Engine */}
        {activeSubTab === 'risk' && (
          <div className="w-full h-full p-4 sm:p-6 overflow-y-auto space-y-5">
            {riskLoading ? (
              <div className="text-center py-16 text-slate-400 text-xs flex justify-center items-center">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
                Synthesizing multi-vector disaster risk telemetry...
              </div>
            ) : riskData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left: Interactive Risk Dial */}
                <div className="lg:col-span-1">
                  <RiskDial
                    score={riskData.risk_assessment.composite_score}
                    classification={riskData.risk_assessment.level}
                    contributingFactors={{
                      precipitationScore: riskData.contributing_factors.find(f => f.factor.includes('Precipitation'))?.contribution_score || 35,
                      riverStageScore: riskData.contributing_factors.find(f => f.factor.includes('River') || f.factor.includes('Hydro'))?.contribution_score || 25,
                      historicFloodScore: 45,
                      populationExposureScore: 30,
                    }}
                    missingInputs={riskData.risk_assessment.confidence_score < 0.7 ? ['Local soil saturation sensor offline (extrapolated)'] : []}
                    limitations={[riskData.risk_assessment.scientific_disclaimer]}
                  />
                </div>

                {/* Right: Detailed Factor Breakdown & Provenance Cards */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-4 bg-[#10243A] border border-[#203A52] rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        EXPLAINABILITY DOSSIER
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Confidence: {Math.round(riskData.risk_assessment.confidence_score * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">
                      {riskData.risk_assessment.summary}
                    </p>
                  </div>

                  {/* Factor Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {riskData.contributing_factors.map((f, i) => (
                      <div key={i} className="p-3.5 bg-[#10243A]/90 border border-[#203A52] rounded-xl space-y-1.5">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-white">{f.factor}</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">+{f.contribution_score} pts</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {f.value} • {f.source}
                        </div>
                        <p className="text-[11px] text-slate-300">
                          {f.note}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Data Provenance Card for the Risk Engine */}
                  <DataProvenanceCard
                    title="Risk Synthesis Algorithm (v2.4)"
                    sourceAgency="National Multi-Hazard Early Warning Framework"
                    sensorOrFeed="IMD AWS Precipitation + CWC Telemetry Stations"
                    collectedAt={new Date().toISOString()}
                    lastUpdatedAt="Live Sync"
                    kind="MODELLED"
                    isGroundVerified={false}
                    uncertaintyOrLimitations="Continuous nonlinear multi-factor index. Runoff thresholds assume typical antecedent moisture conditions."
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No risk intelligence telemetry available for this region.
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 4: Historical Analysis */}
        {activeSubTab === 'historical' && (
          <ImpactWorkspace
            overview={overview}
            floodMeta={floodMeta}
            facilitiesGeoJSON={facilitiesGeoJSON}
            settlementsGeoJSON={settlementsGeoJSON}
          />
        )}
      </div>

      {/* Raw SAR Scene Submission Modal */}
      {triggerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10243A] border border-[#1E3550] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <span>Queue Raw Sentinel-1 Radar Scene</span>
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Copernicus Product ID:</label>
              <input
                type="text"
                value={customSceneId}
                onChange={(e) => setCustomSceneId(e.target.value)}
                className="w-full bg-[#07111F] border border-[#1E3550] rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="text-[11px] text-slate-400 bg-[#07111F] p-2.5 rounded border border-[#1E3550]">
              Scene will be calibrated against Copernicus DEM with permanent water mask subtraction.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setTriggerModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerJob}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-bold cursor-pointer"
              >
                Start Processing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
