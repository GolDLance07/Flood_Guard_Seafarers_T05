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
        affected_count: peopleCount ? parseInt(peopleCount, 10) : undefined,
        contact_phone: contactPhone.trim() || undefined,
        file: selectedFile || undefined
      };

      const result = await submitCitizenIncident(payload);
      setLastSubmission(result);
      onReportSubmitted(result);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report. Please retry or call emergency rescue 1077.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setLastSubmission(null);
    setStep(1);
    setTitle('');
    setDescription('');
    setAddress('');
    setPeopleCount('');
    setSelectedFile(null);
    setError(null);
  };

  if (lastSubmission) {
    return (
      <div className="max-w-2xl mx-auto p-6 my-8 bg-[#091522] border border-[#18A58B] rounded shadow-2xl space-y-5 text-center select-none font-sans">
        <div className="w-14 h-14 rounded-full bg-[#18A58B]/10 border-2 border-[#18A58B] text-[#18A58B] mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#18A58B] font-bold block">
            REPORT TRANSMITTED TO DISTRICT COMMAND
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#E8F0F7] mt-1">
            Emergency Incident Logged
          </h2>
          <p className="text-xs text-[#8DA3B8] mt-1.5">
            Your field observation has been dispatched to district disaster controllers and rescue teams.
          </p>
        </div>

        {/* Tracking ID Badge */}
        <div className="p-3.5 bg-[#07111F] border border-[#203A52] rounded max-w-sm mx-auto space-y-1">
          <span className="text-[10px] text-[#8DA3B8] font-mono uppercase">Official Tracking Number</span>
          <div className="text-xl font-bold font-mono text-[#16B8D4] tracking-wider">
            {lastSubmission.tracking_number}
          </div>
          <span className="text-[10px] text-[#8DA3B8]/70 font-mono block">Keep this code to track response status</span>
        </div>

        <div className="p-3 bg-[#F0A83B]/10 border border-[#F0A83B]/40 rounded text-xs text-[#F0A83B]">
          If flood waters are actively rising and you are in immediate life danger, call <strong>1077</strong> (Disaster Control) or <strong>112</strong> immediately.
        </div>

        <button
          onClick={handleReset}
          className="px-6 py-2 bg-[#10243A] hover:bg-[#142B42] text-[#16B8D4] border border-[#16B8D4] rounded text-xs font-bold font-mono transition cursor-pointer"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4 select-none font-sans">
      {/* Wizard Progress Stepper */}
      <div className="bg-[#091522] border border-[#203A52] rounded p-3 sm:p-3.5">
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <span className="text-[#16B8D4] font-bold">
            STEP {step} OF 4 &bull; {step === 1 ? 'Hazard Type' : step === 2 ? 'Severity & Description' : step === 3 ? 'Exact Location' : 'Evidence & Contact'}
          </span>
          <span className="text-[#8DA3B8] font-mono">{Math.round((step / 4) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-[#07111F] rounded-full h-1.5 border border-[#203A52]">
          <div
            className="bg-[#16B8D4] h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#E45555]/10 border border-[#E45555] rounded text-xs text-[#E45555] font-mono flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-[#E45555] font-bold ml-2">×</button>
        </div>
      )}

      {/* STEP 1: Hazard Category */}
      {step === 1 && (
        <div className="space-y-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#E8F0F7]">What is the nature of the emergency?</h2>
            <p className="text-xs text-[#8DA3B8] mt-0.5">Select the category that best describes the immediate hazard.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3.5 rounded border text-left transition cursor-pointer flex items-start space-x-3 ${
                    isSelected
                      ? 'bg-[#10243A] border-[#16B8D4] text-[#E8F0F7]'
                      : 'bg-[#091522] border-[#203A52] text-[#8DA3B8] hover:border-[#8DA3B8] hover:bg-[#10243A]/40'
                  }`}
                >
                  <div className={`p-2 rounded border flex-shrink-0 ${
                    isSelected ? 'bg-[#07111F] border-[#16B8D4] text-[#16B8D4]' : 'bg-[#07111F] border-[#203A52] text-[#8DA3B8]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#E8F0F7]">{cat.label}</div>
                    <p className="text-[11px] text-[#8DA3B8] mt-0.5 leading-relaxed">{cat.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2 bg-[#16B8D4] hover:bg-[#16B8D4]/90 text-[#07111F] rounded text-xs font-bold font-mono flex items-center space-x-1.5 transition cursor-pointer"
            >
              <span>Continue to Step 2</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Severity & Description */}
      {step === 2 && (
        <div className="bg-[#091522] border border-[#203A52] rounded p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#E8F0F7]">Estimated Severity &amp; Situation Details</h2>
            <p className="text-xs text-[#8DA3B8] mt-0.5">Indicate danger level and concise summary.</p>
          </div>

          {/* Severity Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-[#8DA3B8] uppercase">Emergency Severity Level *</label>
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
                  className={`p-2.5 rounded border text-center transition cursor-pointer ${
                    severity === sev.id
                      ? sev.id === 'critical'
                        ? 'bg-[#E45555]/15 border-[#E45555] text-[#E45555]'
                        : sev.id === 'high'
                        ? 'bg-[#F0A83B]/15 border-[#F0A83B] text-[#F0A83B]'
                        : 'bg-[#16B8D4]/15 border-[#16B8D4] text-[#16B8D4]'
                      : 'bg-[#07111F] border-[#203A52] text-[#8DA3B8] hover:border-[#8DA3B8]'
                  }`}
                >
                  <div className="text-xs font-bold font-mono uppercase">{sev.label}</div>
                  <div className="text-[10px] text-[#8DA3B8] mt-0.5">{sev.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Incident Title */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-[#8DA3B8] uppercase">Brief Incident Title *</label>
            <input
              type="text"
              placeholder="e.g. 4-foot water inside residential block, road cut off"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#07111F] border border-[#203A52] rounded px-3.5 py-2 text-xs text-[#E8F0F7] placeholder-[#8DA3B8]/60 focus:outline-none focus:border-[#16B8D4]"
            />
          </div>

          {/* Detailed Observations */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-[#8DA3B8] uppercase">Detailed Observations (Optional)</label>
            <textarea
              rows={3}
              placeholder="Describe current water trend (rising/falling), elderly/infants needing evacuation, or specific landmarks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#07111F] border border-[#203A52] rounded px-3.5 py-2 text-xs text-[#E8F0F7] placeholder-[#8DA3B8]/60 focus:outline-none focus:border-[#16B8D4]"
            />
          </div>

          {/* Affected People Count */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-[#8DA3B8] uppercase">Number of People Trapped / Affected</label>
            <input
              type="number"
              placeholder="e.g. 5"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              className="w-full sm:w-44 bg-[#07111F] border border-[#203A52] rounded px-3.5 py-2 text-xs text-[#E8F0F7] placeholder-[#8DA3B8]/60 focus:outline-none focus:border-[#16B8D4]"
            />
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-3.5 py-1.5 rounded border border-[#203A52] text-xs text-[#8DA3B8] hover:text-[#E8F0F7] flex items-center space-x-1.5 cursor-pointer"
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
              className="px-5 py-2 bg-[#16B8D4] hover:bg-[#16B8D4]/90 text-[#07111F] rounded text-xs font-bold font-mono flex items-center space-x-1.5 transition cursor-pointer"
            >
              <span>Continue to Location</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Exact Location */}
      {step === 3 && (
        <div className="bg-[#091522] border border-[#203A52] rounded p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#E8F0F7]">Pinpoint Hazard Location</h2>
            <p className="text-xs text-[#8DA3B8] mt-0.5">Use GPS or provide nearest landmark address.</p>
          </div>

          {/* GPS Auto Button */}
          <div className="p-3.5 bg-[#07111F] border border-[#203A52] rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-[#E8F0F7] flex items-center space-x-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#16B8D4]" />
                <span>Automatic Device Geolocation</span>
              </span>
              <p className="text-[11px] text-[#8DA3B8] mt-0.5">
                Acquire high-precision satellite coordinates from your phone or browser.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="px-3.5 py-1.5 bg-[#10243A] hover:bg-[#142B42] text-[#16B8D4] border border-[#16B8D4] rounded text-xs font-mono font-bold flex items-center space-x-1.5 transition cursor-pointer flex-shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{locating ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#8DA3B8] uppercase">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full bg-[#07111F] border border-[#203A52] rounded px-3 py-1.5 text-xs font-mono text-[#E8F0F7] focus:outline-none focus:border-[#16B8D4]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#8DA3B8] uppercase">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full bg-[#07111F] border border-[#203A52] rounded px-3 py-1.5 text-xs font-mono text-[#E8F0F7] focus:outline-none focus:border-[#16B8D4]"
              />
            </div>
          </div>

          {/* Landmark / Street Address */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-[#8DA3B8] uppercase">Landmark or Street Address</label>
            <input
              type="text"
              placeholder="e.g. Near Convent Square Bridge, Kalarcode, Alappuzha"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#07111F] border border-[#203A52] rounded px-3.5 py-2 text-xs text-[#E8F0F7] placeholder-[#8DA3B8]/60 focus:outline-none focus:border-[#16B8D4]"
            />
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-3.5 py-1.5 rounded border border-[#203A52] text-xs text-[#8DA3B8] hover:text-[#E8F0F7] flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2 bg-[#16B8D4] hover:bg-[#16B8D4]/90 text-[#07111F] rounded text-xs font-bold font-mono flex items-center space-x-1.5 transition cursor-pointer"
            >
              <span>Continue to Evidence</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Evidence & Contact */}
      {step === 4 && (
        <div className="bg-[#091522] border border-[#203A52] rounded p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#E8F0F7]">Photo Evidence &amp; Responder Callback</h2>
            <p className="text-xs text-[#8DA3B8] mt-0.5">Attach photo verification and emergency contact number.</p>
          </div>

          {/* File Upload Box */}
          <div className="p-4 bg-[#07111F] border-2 border-dashed border-[#203A52] hover:border-[#16B8D4] rounded text-center space-y-1.5">
            <UploadCloud className="w-7 h-7 text-[#16B8D4] mx-auto" />
            <div className="text-xs font-bold text-[#E8F0F7]">Upload On-Ground Photographic Evidence</div>
            <p className="text-[10px] text-[#8DA3B8]">JPEG, PNG, WEBP up to 10MB (helps responders calibrate boat vs truck)</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="citizen-photo-upload"
            />
            <label
              htmlFor="citizen-photo-upload"
              className="inline-block mt-1 px-3.5 py-1.5 bg-[#10243A] hover:bg-[#142B42] text-[#16B8D4] rounded text-xs font-mono font-semibold cursor-pointer border border-[#203A52]"
            >
              {selectedFile ? selectedFile.name : 'Select File from Device'}
            </label>
            {fileError && <div className="text-xs text-[#E45555] font-mono mt-1">{fileError}</div>}
          </div>

          {/* Contact Phone */}
          <div className="space-y-1">
            <label className="text-xs font-mono text-[#8DA3B8] uppercase">Contact Phone Number (For Rescue Dispatchers)</label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-[#8DA3B8] absolute left-3 top-2.5" />
              <input
                type="tel"
                placeholder="e.g. +91 98470 12345"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full bg-[#07111F] border border-[#203A52] rounded pl-9 pr-3.5 py-2 text-xs text-[#E8F0F7] placeholder-[#8DA3B8]/60 focus:outline-none focus:border-[#16B8D4]"
              />
            </div>
          </div>

          {/* Review Summary */}
          <div className="p-3 bg-[#07111F] border border-[#203A52] rounded text-xs font-mono space-y-1 text-[#8DA3B8]">
            <div className="text-[10px] text-[#16B8D4] uppercase font-bold">REPORT SUMMARY</div>
            <div>Category: <span className="text-[#E8F0F7] font-bold">{category}</span> &bull; Severity: <span className="text-[#F0A83B] uppercase font-bold">{severity}</span></div>
            <div>Title: <span className="text-[#E8F0F7]">{title}</span></div>
            <div>Location: <span className="text-[#16B8D4]">{latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E</span></div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(3)}
              className="px-3.5 py-1.5 rounded border border-[#203A52] text-xs text-[#8DA3B8] hover:text-[#E8F0F7] flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-[#E45555] hover:bg-[#E45555]/90 text-white rounded text-xs font-bold font-mono flex items-center space-x-1.5 transition cursor-pointer"
            >
              {submitting ? (
                <span>Transmitting Incident...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
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
