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
  Info,
  ArrowRight,
  ArrowLeft,
  Phone,
  Check,
  UploadCloud
} from 'lucide-react';
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
  { id: 'waterlogging', label: 'Severe Waterlogging', icon: Waves, description: 'Standing water entering homes or residential lanes' },
  { id: 'flooded_road', label: 'Submerged Road / Bridge', icon: AlertTriangle, description: 'Roadway impassable for vehicles or pedestrians' },
  { id: 'stranded_citizens', label: 'Stranded People', icon: Users, description: 'Families trapped on upper floors or isolated terrain' },
  { id: 'infrastructure_damage', label: 'Infrastructure Breach', icon: Building2, description: 'Embankment breach, fallen power lines, collapsed culvert' },
  { id: 'medical_emergency', label: 'Medical Emergency', icon: HeartPulse, description: 'Patients requiring urgent dialysis, oxygen, or hospital transfer' },
  { id: 'shelter_need', label: 'Shelter / Food Need', icon: Home, description: 'Displaced families requiring emergency camp provisions' },
  { id: 'other', label: 'Other Hazard', icon: Info, description: 'Other flood-related safety hazard' },
];

export const CitizenReportTab: React.FC<CitizenReportTabProps> = ({
  currentRegion,
  onReportSubmitted
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

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

  const handleSubmit = async () => {
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

      try {
        const existing = JSON.parse(localStorage.getItem('floodguard_my_reports') || '[]');
        existing.unshift(result);
        localStorage.setItem('floodguard_my_reports', JSON.stringify(existing.slice(0, 50)));
      } catch {}
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setLastSubmission(null);
    setStep(1);
    setTitle('');
    setDescription('');
    setPeopleCount('');
    setSelectedFile(null);
    setError(null);
  };

  if (lastSubmission) {
    return (
      <div className="max-w-2xl mx-auto p-6 my-8 bg-[#091522] border border-emerald-500/50 rounded-3xl shadow-2xl space-y-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
            REPORT TRANSMITTED TO DISTRICT COMMAND
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            Emergency Incident Logged
          </h2>
          <p className="text-xs text-slate-300 mt-2">
            Your field observation has been dispatched to district disaster controllers and rescue teams.
          </p>
        </div>

        {/* Tracking ID Badge */}
        <div className="p-4 bg-[#060D17] border border-[#142B42] rounded-2xl max-w-sm mx-auto space-y-1">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Official Tracking Number</span>
          <div className="text-xl font-black font-mono text-cyan-300 tracking-wider">
            {lastSubmission.tracking_number}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">Keep this code to track response status</span>
        </div>

        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200">
          If flood waters are actively rising and you are in immediate life danger, call <strong>1077</strong> (Disaster Control) or <strong>112</strong> immediately.
        </div>

        <button
          onClick={handleReset}
          className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono shadow-cyan-glow transition cursor-pointer"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 select-none font-sans">
      {/* Wizard Progress Stepper */}
      <div className="bg-[#091522] border border-[#142B42] rounded-2xl p-3.5 sm:p-4">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-cyan-400 font-bold">
            STEP {step} OF 4 &bull; {step === 1 ? 'Hazard Type' : step === 2 ? 'Severity & Description' : step === 3 ? 'Exact Location' : 'Evidence & Contact'}
          </span>
          <span className="text-slate-500 font-mono">{Math.round((step / 4) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-[#060D17] rounded-full h-1.5 border border-[#142B42]">
          <div
            className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-600/70 rounded-xl text-xs text-rose-200 font-mono flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 font-bold ml-2">×</button>
        </div>
      )}

      {/* STEP 1: Hazard Category */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-white">What is the nature of the emergency?</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select the category that best describes the immediate hazard.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-4 rounded-2xl border text-left transition cursor-pointer flex items-start space-x-3.5 ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-950/60 to-[#0D1D2D] border-cyan-400 text-white shadow-cyan-glow'
                      : 'bg-[#091522] border-[#142B42] text-slate-300 hover:border-slate-500 hover:bg-[#0D1D2D]'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                    isSelected ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-[#060D17] border-[#142B42] text-slate-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{cat.label}</div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{cat.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono shadow-cyan-glow flex items-center space-x-2 transition cursor-pointer"
            >
              <span>Continue to Step 2</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Severity & Description */}
      {step === 2 && (
        <div className="bg-[#091522] border border-[#142B42] rounded-3xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-white">Estimated Severity &amp; Situation Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">Indicate danger level and concise summary.</p>
          </div>

          {/* Severity Selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase">Emergency Severity Level *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'low', label: 'Low', sub: 'Monitoring' },
                { id: 'medium', label: 'Medium', sub: 'Action needed' },
                { id: 'high', label: 'High', sub: 'Urgent rescue' },
                { id: 'critical', label: 'Critical', sub: 'Life-threatening' },
              ].map((sev) => (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id as IncidentSeverity)}
                  className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                    severity === sev.id
                      ? sev.id === 'critical'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-danger-glow'
                        : sev.id === 'high'
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-amber-glow'
                        : 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-cyan-glow'
                      : 'bg-[#060D17] border-[#142B42] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold font-mono uppercase">{sev.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{sev.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Incident Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Brief Incident Title *</label>
            <input
              type="text"
              placeholder="e.g. 4-foot water inside residential block, road cut off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#060D17] border border-[#142B42] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Detailed Observations */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Detailed Observations (Optional)</label>
            <textarea
              rows={3}
              placeholder="Describe current water trend (rising/falling), elderly/infants needing evacuation, or specific landmarks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#060D17] border border-[#142B42] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Affected People Count */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Number of People Trapped / Affected</label>
            <input
              type="number"
              placeholder="e.g. 5"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              className="w-full sm:w-48 bg-[#060D17] border border-[#142B42] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-[#142B42] text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => {
                if (!title.trim()) {
                  setError('Please provide a brief title describing the incident.');
                  return;
                }
                setError(null);
                setStep(3);
              }}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono shadow-cyan-glow flex items-center space-x-2 transition cursor-pointer"
            >
              <span>Continue to Location</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Exact Location */}
      {step === 3 && (
        <div className="bg-[#091522] border border-[#142B42] rounded-3xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-white">Pinpoint Hazard Location</h2>
            <p className="text-xs text-slate-400 mt-0.5">Use GPS or provide nearest landmark address.</p>
          </div>

          {/* GPS Auto Button */}
          <div className="p-4 bg-[#060D17] border border-[#142B42] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Automatic Device Geolocation</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Acquire high-precision satellite coordinates from your phone or browser.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-mono font-bold flex items-center space-x-2 transition cursor-pointer flex-shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{locating ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full bg-[#060D17] border border-[#142B42] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full bg-[#060D17] border border-[#142B42] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Landmark / Street Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Landmark or Street Address</label>
            <input
              type="text"
              placeholder="e.g. Near Convent Square Bridge, Kalarcode, Alappuzha"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#060D17] border border-[#142B42] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border border-[#142B42] text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono shadow-cyan-glow flex items-center space-x-2 transition cursor-pointer"
            >
              <span>Continue to Evidence</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Evidence & Contact */}
      {step === 4 && (
        <div className="bg-[#091522] border border-[#142B42] rounded-3xl p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-white">Photo Evidence &amp; Responder Callback</h2>
            <p className="text-xs text-slate-400 mt-0.5">Attach photo verification and emergency contact number.</p>
          </div>

          {/* File Upload Box */}
          <div className="p-5 bg-[#060D17] border-2 border-dashed border-[#142B42] hover:border-cyan-500/50 rounded-2xl text-center space-y-2">
            <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto" />
            <div className="text-xs font-bold text-white">Upload On-Ground Photographic Evidence</div>
            <p className="text-[11px] text-slate-400">JPEG, PNG, WEBP up to 10MB (helps responders calibrate boat vs truck)</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="citizen-photo-upload"
            />
            <label
              htmlFor="citizen-photo-upload"
              className="inline-block mt-2 px-4 py-2 bg-[#142B42] hover:bg-[#1A344B] text-cyan-300 rounded-xl text-xs font-mono font-semibold cursor-pointer border border-[#203A52]"
            >
              {selectedFile ? selectedFile.name : 'Select File from Device'}
            </label>
            {fileError && <div className="text-xs text-rose-400 font-mono mt-1">{fileError}</div>}
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Contact Phone Number (For Rescue Dispatchers)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                placeholder="e.g. +91 98470 12345"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-[#060D17] border border-[#142B42] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Review Summary */}
          <div className="p-3.5 bg-[#060D17] border border-[#142B42] rounded-2xl text-xs font-mono space-y-1 text-slate-300">
            <div className="text-[10px] text-cyan-400 uppercase font-bold">REPORT SUMMARY</div>
            <div>Category: <span className="text-white font-bold">{category}</span> &bull; Severity: <span className="text-amber-400 uppercase font-bold">{severity}</span></div>
            <div>Title: <span className="text-white">{title}</span></div>
            <div>Location: <span className="text-cyan-300">{latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E</span></div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded-xl border border-[#142B42] text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold font-mono shadow-danger-glow flex items-center space-x-2 transition cursor-pointer"
            >
              {submitting ? (
                <span>Transmitting Incident...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Transmit Emergency Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
