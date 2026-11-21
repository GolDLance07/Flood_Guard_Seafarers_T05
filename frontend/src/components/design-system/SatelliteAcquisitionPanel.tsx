import React, { useState } from 'react';
import { Satellite, Play, CheckCircle } from 'lucide-react';
import { triggerSatelliteJob } from '../../services/api';

interface SatelliteAcquisitionPanelProps {
  regionId?: string;
  onJobTriggered?: () => void;
  className?: string;
}

export const SatelliteAcquisitionPanel: React.FC<SatelliteAcquisitionPanelProps> = ({
  regionId = 'kerala-alappuzha',
  onJobTriggered,
  className = ''
}) => {
  const [sceneId, setSceneId] = useState('S1A_IW_GRDH_1SDV_20261122T000000_000000_0000');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleTrigger = async () => {
    setSubmitting(true);
    setStatusMessage(null);
    try {
      await triggerSatelliteJob(sceneId, regionId);
      setStatusMessage('Copernicus Sentinel-1 pipeline task queued.');
      if (onJobTriggered) onJobTriggered();
    } catch (e: any) {
      setStatusMessage(`Submission error: ${e.message || 'Check cluster'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`bg-[#091522] border border-[#203A52] rounded p-3 select-none text-xs font-mono space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-[#203A52] pb-2">
        <div className="flex items-center space-x-2">
          <Satellite className="w-4 h-4 text-[#16B8D4]" />
          <span className="font-bold text-[#E8F0F7] uppercase tracking-wider text-[11px]">
            Sentinel-1 SAR Acquisition Profile
          </span>
        </div>
        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded border border-[#18A58B]/40 bg-[#18A58B]/10 text-[#18A58B]">
          COPERNICUS OPERATIONAL
        </span>
      </div>

      {/* Sensor Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="p-2 bg-[#07111F] border border-[#203A52] rounded space-y-0.5">
          <span className="text-[#8DA3B8] block uppercase">Platform / Instrument</span>
          <span className="text-[#E8F0F7] font-bold">Sentinel-1A • C-SAR</span>
        </div>
        <div className="p-2 bg-[#07111F] border border-[#203A52] rounded space-y-0.5">
          <span className="text-[#8DA3B8] block uppercase">Orbit Direction</span>
          <span className="text-[#E8F0F7] font-bold">ASCENDING • Rel. Orbit 56</span>
        </div>
        <div className="p-2 bg-[#07111F] border border-[#203A52] rounded space-y-0.5">
          <span className="text-[#8DA3B8] block uppercase">Polarisation Mode</span>
          <span className="text-[#16B8D4] font-bold">VV + VH Dual-Pol (IW GRD)</span>
        </div>
        <div className="p-2 bg-[#07111F] border border-[#203A52] rounded space-y-0.5">
          <span className="text-[#8DA3B8] block uppercase">Calibration & Threshold</span>
          <span className="text-[#18A58B] font-bold">Gamma-0 Radiometric (-16.5 dB)</span>
        </div>
      </div>

      {/* Analysis & Permanent Water Baseline Note */}
      <div className="p-2 bg-[#10243A] border border-[#203A52] rounded text-[10px] space-y-1">
        <div className="flex items-center justify-between text-[#8DA3B8]">
          <span>Permanent Water Mask:</span>
          <span className="text-[#E8F0F7]">29 perennial bodies subtracted</span>
        </div>
        <div className="flex items-center justify-between text-[#8DA3B8]">
          <span>Resolution & Cell Size:</span>
          <span className="text-[#E8F0F7]">10.0m ground resolution</span>
        </div>
        <div className="flex items-center justify-between text-[#8DA3B8]">
          <span>Processing Pipeline:</span>
          <span className="text-[#18A58B] flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Ready for Inundation Analysis</span>
          </span>
        </div>
      </div>

      {/* Granule Trigger Form */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[10px] text-[#8DA3B8] block uppercase">Granule Scene ID</label>
        <div className="flex space-x-1.5">
          <input
            type="text"
            value={sceneId}
            onChange={(e) => setSceneId(e.target.value)}
            className="flex-1 bg-[#07111F] border border-[#203A52] rounded px-2.5 py-1 text-[10px] text-[#E8F0F7] focus:border-[#16B8D4] focus:outline-none"
          />
          <button
            onClick={handleTrigger}
            disabled={submitting}
            className="px-2.5 py-1 bg-[#10243A] hover:bg-[#142B42] border border-[#203A52] hover:border-[#16B8D4] text-[#16B8D4] font-bold rounded flex items-center space-x-1 text-[10px] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3 h-3" />
            <span>{submitting ? 'Queuing...' : 'Submit'}</span>
          </button>
        </div>
        {statusMessage && (
          <div className="text-[10px] text-[#16B8D4] pt-0.5">{statusMessage}</div>
        )}
      </div>
    </div>
  );
};
