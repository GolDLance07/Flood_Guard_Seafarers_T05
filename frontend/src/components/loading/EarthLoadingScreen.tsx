import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface EarthLoadingScreenProps {
  currentStage?: string;
  progressPct?: number;
  onFinished?: () => void;
}

const DEFAULT_STAGES = [
  'Establishing secure connection',
  'Initialising geospatial services',
  'Connecting to monitoring feeds',
  'Loading regional intelligence',
  'Preparing operational workspace'
];

// Simplified continent vector polygons [lon, lat] for high-performance Canvas rendering
const CONTINENTS: [number, number][][] = [
  // India & South Asia
  [[68, 24], [72, 21], [73, 15], [76, 9], [80, 10], [80, 13], [85, 19], [88, 22], [92, 21], [90, 26], [78, 31], [73, 30], [68, 24]],
  // Eurasia
  [[-9, 36], [0, 43], [5, 50], [10, 55], [30, 60], [60, 65], [100, 70], [140, 68], [170, 65], [160, 50], [130, 45], [120, 30], [105, 20], [80, 25], [50, 25], [35, 32], [25, 36], [10, 36], [-5, 36], [-9, 36]],
  // Africa
  [[-17, 15], [-5, 5], [10, 5], [40, 10], [50, 12], [40, -10], [35, -25], [20, -35], [18, -34], [12, -15], [0, 5], [-15, 12], [-17, 15]],
  // North America
  [[-165, 65], [-140, 60], [-125, 50], [-120, 35], [-105, 25], [-95, 20], [-80, 25], [-75, 35], [-65, 45], [-60, 55], [-90, 60], [-130, 65], [-165, 65]],
  // South America
  [[-80, 8], [-60, 10], [-35, -5], [-40, -20], [-55, -35], [-70, -55], [-75, -45], [-70, -20], [-80, 0], [-80, 8]],
  // Australia
  [[115, -22], [125, -15], [140, -15], [150, -24], [150, -37], [135, -35], [115, -35], [115, -22]]
];

export const EarthLoadingScreen: React.FC<EarthLoadingScreenProps> = ({
  currentStage,
  progressPct,
  onFinished,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const stageInterval = setInterval(() => {
      setStageIndex((prev) => {
        if (prev < DEFAULT_STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 900);
    return () => clearInterval(stageInterval);
  }, []);

  useEffect(() => {
    if (progressPct !== undefined && progressPct >= 100 && onFinished) {
      const timeout = setTimeout(() => {
        onFinished();
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [progressPct, onFinished]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let rotation = 75; // Initial longitudinal rotation targeting India longitude ~76E
    let radarAngle = 0;
    let satelliteAngle1 = 0;
    let satelliteAngle2 = Math.PI;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;
      const R = width * 0.36; // Globe radius

      ctx.clearRect(0, 0, width, height);

      // 1. Atmosphere Radial Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.35);
      glowGrad.addColorStop(0, 'rgba(22, 184, 212, 0.25)');
      glowGrad.addColorStop(0.5, 'rgba(22, 184, 212, 0.08)');
      glowGrad.addColorStop(1, 'rgba(7, 17, 31, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // 2. Globe Sphere Deep Background
      const sphereGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      sphereGrad.addColorStop(0, '#0D2744');
      sphereGrad.addColorStop(0.7, '#071628');
      sphereGrad.addColorStop(1, '#040B15');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Clip subsequent drawings to globe disk
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      const tilt = 0.22; // Axial tilt in radians (~13 deg)

      // Project spherical coords [lon, lat] (deg) to 2D screen [x, y, z]
      const project = (lonDeg: number, latDeg: number): [number, number, number] => {
        const phi = (latDeg * Math.PI) / 180;
        const lam = ((lonDeg + rotation) * Math.PI) / 180;
        const x3 = Math.cos(phi) * Math.sin(lam);
        const y3 = Math.sin(phi) * Math.cos(tilt) - Math.cos(phi) * Math.cos(lam) * Math.sin(tilt);
        const z3 = Math.sin(phi) * Math.sin(tilt) + Math.cos(phi) * Math.cos(lam) * Math.cos(tilt);
        return [cx + x3 * R, cy - y3 * R, z3];
      };

      // 3. Draw Graticules (Latitude & Longitude gridlines)
      ctx.strokeStyle = 'rgba(22, 184, 212, 0.16)';
      ctx.lineWidth = 1;

      // Latitude Parallels
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 5) {
          const [px, py, z] = project(lon, lat);
          if (z >= -0.05) {
            if (!started) {
              ctx.moveTo(px, py);
              started = true;
            } else {
              ctx.lineTo(px, py);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Longitude Meridians
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -80; lat <= 80; lat += 5) {
          const [px, py, z] = project(lon, lat);
          if (z >= -0.05) {
            if (!started) {
              ctx.moveTo(px, py);
              started = true;
            } else {
              ctx.lineTo(px, py);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // 4. Draw Continents with Cyan Shading
      CONTINENTS.forEach((poly, polyIdx) => {
        ctx.beginPath();
        let visibleCount = 0;
        poly.forEach((pt, idx) => {
          const [px, py, z] = project(pt[0], pt[1]);
          if (z >= 0) visibleCount++;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();

        if (visibleCount > 0) {
          ctx.fillStyle = polyIdx === 0 ? 'rgba(22, 184, 212, 0.35)' : 'rgba(24, 165, 139, 0.22)';
          ctx.fill();
          ctx.strokeStyle = polyIdx === 0 ? 'rgba(22, 184, 212, 0.8)' : 'rgba(24, 165, 139, 0.45)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // 5. Radar Sweep Line & Pulse
      const sweepX = cx + Math.cos(radarAngle) * R;
      const sweepY = cy + Math.sin(radarAngle) * R;
      const sweepGrad = ctx.createLinearGradient(cx, cy, sweepX, sweepY);
      sweepGrad.addColorStop(0, 'rgba(22, 184, 212, 0)');
      sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.35)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, radarAngle - 0.35, radarAngle);
      ctx.closePath();
      ctx.fill();

      // Atmospheric Rim Highlight
      const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R);
      rimGrad.addColorStop(0, 'rgba(7, 17, 31, 0)');
      rimGrad.addColorStop(0.85, 'rgba(22, 184, 212, 0.15)');
      rimGrad.addColorStop(1, 'rgba(56, 189, 248, 0.55)');
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore(); // Exit sphere clipping

      // 6. Draw Satellite Orbital Ellipses (Outside Sphere)
      ctx.save();
      ctx.strokeStyle = 'rgba(22, 184, 212, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Orbit 1: Polar inclined
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.25, R * 0.55, -Math.PI / 6, 0, Math.PI * 2);
      ctx.stroke();

      // Orbit 2: Equatorial inclined
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.35, R * 0.65, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 7. Draw Satellite Beacon 1 (Sentinel-1 SAR)
      const sat1X = cx + Math.cos(satelliteAngle1) * R * 1.25 * Math.cos(-Math.PI / 6) - Math.sin(satelliteAngle1) * R * 0.55 * Math.sin(-Math.PI / 6);
      const sat1Y = cy + Math.cos(satelliteAngle1) * R * 1.25 * Math.sin(-Math.PI / 6) + Math.sin(satelliteAngle1) * R * 0.55 * Math.cos(-Math.PI / 6);
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(sat1X, sat1Y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.font = '8px monospace';
      ctx.fillText('SENTINEL-1A', sat1X + 6, sat1Y - 3);

      // 8. Draw Satellite Beacon 2 (Met-Sensor)
      const sat2X = cx + Math.cos(satelliteAngle2) * R * 1.35 * Math.cos(Math.PI / 4) - Math.sin(satelliteAngle2) * R * 0.65 * Math.sin(Math.PI / 4);
      const sat2Y = cy + Math.cos(satelliteAngle2) * R * 1.35 * Math.sin(Math.PI / 4) + Math.sin(satelliteAngle2) * R * 0.65 * Math.cos(Math.PI / 4);
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(sat2X, sat2Y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.font = '8px monospace';
      ctx.fillText('CWC-HYDRO', sat2X + 6, sat2Y - 3);

      // Increment rotation and angles
      if (!prefersReducedMotion) {
        rotation += 0.35;
        radarAngle += 0.035;
        satelliteAngle1 += 0.015;
        satelliteAngle2 += 0.012;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const activeStageText = currentStage || DEFAULT_STAGES[stageIndex];

  return (
    <div className="fixed inset-0 z-50 bg-[#07111F] bg-geo-grid flex flex-col items-center justify-center p-6 select-none font-sans overflow-hidden">
      {/* 3D Rotating Earth Canvas */}
      <div className="relative flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={420}
          height={420}
          className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px]"
        />

        {/* Center Target Indicator Grid */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-56 h-56 rounded-full border border-cyan-500/10" />
          <div className="absolute w-72 h-72 rounded-full border border-cyan-500/5 border-dashed" />
        </div>
      </div>

      {/* Brand Header */}
      <div className="mt-4 flex flex-col items-center text-center space-y-1.5 max-w-md">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white font-mono">
            Flood<span className="text-cyan-400">Guard</span>
          </span>
          <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            GEOSPATIAL AI
          </span>
        </div>

        <h2 className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase mt-2">
          CONNECTING TO EARTH INTELLIGENCE
        </h2>
        <p className="text-xs text-slate-400 font-mono tracking-tight">
          Establishing multi-sensor geospatial telemetry
        </p>

        {/* Progress Bar & Status Text */}
        <div className="w-64 mt-4 space-y-2">
          <div className="h-1 w-full bg-[#10243A] rounded-full overflow-hidden border border-[#1E3550]">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300"
              style={{ width: `${progressPct !== undefined ? progressPct : ((stageIndex + 1) / DEFAULT_STAGES.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{activeStageText}</span>
            </span>
            <span className="text-cyan-300 font-bold">
              {progressPct !== undefined ? `${progressPct}%` : `${Math.round(((stageIndex + 1) / DEFAULT_STAGES.length) * 100)}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
