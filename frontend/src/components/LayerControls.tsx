import React from 'react';
import { Layers, Eye, EyeOff, Maximize2, RotateCcw } from 'lucide-react';

export interface LayerVisibility {
  floodExtent: boolean;
  affectedRoads: boolean;
  normalRoads?: boolean;
  facilities: boolean;
  settlements: boolean;
  candidateRoute?: boolean;
}

interface LayerControlsProps {
  layers: LayerVisibility;
  onToggle: (layer: keyof LayerVisibility) => void;
  onFitAOI: () => void;
  onResetView: () => void;
  className?: string;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  layers,
  onToggle,
  onFitAOI,
  onResetView,
  className = '',
}) => {
  return (
    <div className={`flex flex-col space-y-2 pointer-events-auto select-none ${className}`}>
      <div className="bg-[#070D18]/90 backdrop-blur-md border border-[#1E2D4A] rounded-xl p-3 shadow-2xl min-w-[210px]">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 pb-1.5 border-b border-[#1E2D4A]">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Map Layers</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">SAR / GIS</span>
        </div>

        <div className="space-y-1.5 text-xs">
          {/* Flood Extent */}
          <button
            onClick={() => onToggle('floodExtent')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              layers.floodExtent
                ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-200'
                : 'bg-[#0D1626]/80 border-[#1E2D4A] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              <span className="font-medium">SAR Flood Extent</span>
            </div>
            {layers.floodExtent ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Affected Roads */}
          <button
            onClick={() => onToggle('affectedRoads')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              layers.affectedRoads
                ? 'bg-orange-950/70 border-orange-500/50 text-orange-200'
                : 'bg-[#0D1626]/80 border-[#1E2D4A] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-1 rounded bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
              <span className="font-medium">Affected Roads</span>
            </div>
            {layers.affectedRoads ? <Eye className="w-3.5 h-3.5 text-orange-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Normal Road Network */}
          <button
            onClick={() => onToggle('normalRoads')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              layers.normalRoads
                ? 'bg-slate-900/90 border-slate-600/60 text-slate-200'
                : 'bg-[#0D1626]/80 border-[#1E2D4A] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-1 rounded bg-slate-400 shadow-[0_0_6px_rgba(148,163,184,0.6)]" />
              <span className="font-medium">OSM Road Network</span>
            </div>
            {layers.normalRoads ? <Eye className="w-3.5 h-3.5 text-slate-300" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Critical Facilities */}
          <button
            onClick={() => onToggle('facilities')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              layers.facilities
                ? 'bg-rose-950/70 border-rose-500/50 text-rose-200'
                : 'bg-[#0D1626]/80 border-[#1E2D4A] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
              <span className="font-medium">Critical Facilities</span>
            </div>
            {layers.facilities ? <Eye className="w-3.5 h-3.5 text-rose-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Settlements */}
          <button
            onClick={() => onToggle('settlements')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition ${
              layers.settlements
                ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
                : 'bg-[#0D1626]/80 border-[#1E2D4A] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              <span className="font-medium">Settlements</span>
            </div>
            {layers.settlements ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Viewport Control Buttons */}
        <div className="grid grid-cols-2 gap-1.5 mt-3 pt-2 border-t border-[#1E2D4A]">
          <button
            onClick={onFitAOI}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-[#0D1626] hover:bg-[#16243A] text-slate-300 hover:text-white border border-[#1E2D4A] rounded-lg text-xs font-medium transition cursor-pointer"
            title="Fit Area of Interest"
          >
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            <span>Fit AOI</span>
          </button>
          <button
            onClick={onResetView}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 bg-[#0D1626] hover:bg-[#16243A] text-slate-300 hover:text-white border border-[#1E2D4A] rounded-lg text-xs font-medium transition cursor-pointer"
            title="Reset to default Alappuzha Center"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
