import React, { useState } from 'react';
import {
  AlertTriangle,
  MapPin,
  Navigation,
  CheckCircle2,
  Users,
  Waves,
  Building2,
  HeartPulse,
  Home,
  Info
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { submitCitizenIncident } from '../../services/api';
import type { IncidentCategory, IncidentSeverity, IncidentSubmissionResult } from '../../types/citizen';

interface CitizenReportTabProps {
  currentRegion: {
    id: string;
    name: string;
    center?: [number, number];
  };
  onReportSubmitted: (result: IncidentSubmissionResult) => void;
}

const CATEGORIES: { id: IncidentCategory; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { id: 'waterlogging', label: 'Severe Waterlogging', icon: Waves, description: 'Standing water on roads or residential blocks' },
  { id: 'flooded_road', label: 'Submerged Road / Bridge', icon: AlertTriangle, description: 'Roadway impassable for light or heavy vehicles' },
  { id: 'stranded_citizens', label: 'Stranded People', icon: Users, description: 'Families trapped on upper floors or isolated terrain' },
  { id: 'infrastructure_damage', label: 'Infrastructure Failure', icon: Building2, description: 'Embankment breach, fallen power lines, collapsed culverts' },
  { id: 'medical_emergency', label: 'Medical Emergency', icon: HeartPulse, description: 'Patients requiring immediate dialysis, insulin, or medical transport' },
  { id: 'shelter_need', label: 'Shelter / Food Need', icon: Home, description: 'Displaced community in need of emergency camp provisions' },
  { id: 'other', label: 'Other Hazard', icon: Info, description: 'Other flood-related safety hazards' },
];

export const CitizenReportTab: React.FC<CitizenReportTabProps> = ({
  currentRegion,
  onReportSubmitted
}) => {
  const [category, setCategory] = useState<IncidentCategory>('waterlogging');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number>(currentRegion.center ? currentRegion.center[1] : 9.4950);
  const [longitude, setLongitude] = useState<number>(currentRegion.center ? currentRegion.center[0] : 76.3350);
  const [address, setAddress] = useState('');
  const [peopleCount, setPeopleCount] = useState<string>('');
  const [contactPhone, setContactPhone] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<IncidentSubmissionResult | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        setError(`Location access denied or unavailable: ${err.message}`);
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('File size exceeds the 10MB limit.');
      setSelectedFile(null);
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setFileError('Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a brief title describing the incident.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        category,
        severity,
        title: title.trim(),
        description: description.trim() || undefined,
        latitude,
        longitude,
        address: address.trim() || undefined,
        affected_people_count: peopleCount ? parseInt(peopleCount, 10) : undefined,
        contact_phone: contactPhone.trim() || undefined,
        region_slug: currentRegion.id
      };

      const result = await submitCitizenIncident(payload);
      setLastSubmission(result);
      onReportSubmitted(result);

      // Save to localStorage history
      try {
        const existing = JSON.parse(localStorage.getItem('floodguard_my_reports') || '[]');
        existing.unshift(result);
        localStorage.setItem('floodguard_my_reports', JSON.stringify(existing.slice(0, 50)));
      } catch {}

      // Reset form
      setTitle('');
      setDescription('');
      setPeopleCount('');
      setSelectedFile(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit incident report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header & Truth Notice */}
      <div className="pb-4 border-b border-[#1E2D4A] space-y-2">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Report Emergency Observation
          </h1>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/60 text-amber-300">
            Crowd Telemetry
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Transmit on-ground flood observations to official disaster response teams and district emergency controllers.
        </p>

        {/* Mandatory Safety Notice */}
        <div className="p-3 bg-amber-950/30 border border-amber-700/40 rounded-xl text-xs text-amber-200/90 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Critical Advisory:</strong> If you are in immediate life-threatening danger, do NOT wait for online verification.
            Call District Disaster Control directly at <strong>1077</strong> or National Emergency Response at <strong>112</strong>.
          </div>
        </div>
      </div>

      {/* Submission Success Banner */}
      {lastSubmission && (
        <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-2xl p-5 shadow-2xl space-y-3 animate-in fade-in">
          <div className="flex items-center space-x-2.5 text-emerald-300 font-bold text-sm sm:text-base">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <span>Incident Transmitted Successfully</span>
          </div>

          <div className="bg-[#070D18] p-3.5 rounded-xl border border-emerald-900/60 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tracking Code:</span>
              <span className="font-mono font-bold text-emerald-300 text-sm tracking-wider">
                {lastSubmission.tracking_number}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current Status:</span>
              <Badge variant="amber" size="sm">
                SUBMITTED (UNVERIFIED)
              </Badge>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-[#1E2D4A]">
              {lastSubmission.safety_disclaimer}
            </p>
          </div>

          <button
            onClick={() => setLastSubmission(null)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
          >
            Submit Another Report &rarr;
          </button>
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-700/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Incident Category Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            1. What is the nature of the emergency? *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-md shadow-emerald-950/40'
                      : 'bg-[#0D1626] border-[#1E2D4A] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Estimated Severity */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            2. Estimated Severity *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['low', 'medium', 'high', 'critical'] as IncidentSeverity[]).map((sev) => {
              const isSelected = severity === sev;
              const colors = {
                low: 'bg-emerald-950/60 border-emerald-500 text-emerald-300',
                medium: 'bg-cyan-950/60 border-cyan-500 text-cyan-300',
                high: 'bg-amber-950/60 border-amber-500 text-amber-300',
                critical: 'bg-rose-950/60 border-rose-500 text-rose-300',
              }[sev];

              return (
                <button
                  type="button"
                  key={sev}
                  onClick={() => setSeverity(sev)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition border text-center cursor-pointer ${
                    isSelected ? colors : 'bg-[#0D1626] border-[#1E2D4A] text-slate-400 hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Location Capture */}
        <div className="space-y-2 bg-[#0D1626] p-4 rounded-2xl border border-[#1E2D4A]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Incident Location *</span>
            </label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <Navigation className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Locating...' : 'Use My GPS'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-[10px] text-slate-400">Latitude</span>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                required
                className="w-full bg-[#070D18] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Longitude</span>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                required
                className="w-full bg-[#070D18] border border-[#1E2D4A] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <span className="text-[10px] text-slate-400">Landmark or Street Address</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Near Convent Square Bridge, Kalarcode"
              className="w-full bg-[#070D18] border border-[#1E2D4A] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none mt-0.5"
            />
          </div>
        </div>

        {/* 4. Description & Details */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
              Brief Incident Summary *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 2-foot standing water cutting off residential lane"
              required
              className="w-full bg-[#0D1626] border border-[#1E2D4A] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
              Detailed Observation Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Note current water trend (rising/falling), elderly or children stranded, passable vehicles..."
              className="w-full bg-[#0D1626] border border-[#1E2D4A] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                Estimated People Affected
              </label>
              <input
                type="number"
                min="0"
                value={peopleCount}
                onChange={(e) => setPeopleCount(e.target.value)}
                placeholder="e.g. 15"
                className="w-full bg-[#0D1626] border border-[#1E2D4A] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                Callback Phone (Optional)
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. 98470XXXXX"
                className="w-full bg-[#0D1626] border border-[#1E2D4A] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 5. Optional Photograph Attachment */}
        <div className="bg-[#0D1626] p-4 rounded-2xl border border-[#1E2D4A] space-y-2">
          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
            Optional Ground Photo (Max 10MB)
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            onChange={handleFileChange}
            className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-emerald-500/40 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-300 hover:file:bg-emerald-500/20 cursor-pointer"
          />
          {fileError && (
            <span className="text-[10px] text-rose-400 block">{fileError}</span>
          )}
          {selectedFile && !fileError && (
            <span className="text-[10px] text-emerald-400 block font-mono">
              Ready to attach: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
          )}
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-xl shadow-emerald-950/60 cursor-pointer"
        >
          {submitting ? 'Transmitting Incident Report...' : 'Transmit Emergency Report to Responders'}
        </button>
      </form>
    </div>
  );
};
