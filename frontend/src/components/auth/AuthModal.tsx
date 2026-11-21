import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Mail, LogOut, CheckCircle, AlertTriangle, X, Lock } from 'lucide-react';
import { Badge } from '../common/Badge';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, role, isAuthenticated, signInWithOtp, signInWithPassword, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<'citizen' | 'responder'>('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleCitizenOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await signInWithOtp(email.trim());
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Magic sign-in link dispatched to your email address.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to dispatch magic link.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResponderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await signInWithPassword(email.trim(), password);
      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Authenticated successfully.' });
        setTimeout(() => onClose(), 600);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Authentication failed.' });
    } finally {
      setLoading(false);
    }
  };

  const roleBadgeVariant: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' =
    role === 'administrator' ? 'rose' :
    role === 'district_authority' ? 'amber' :
    role === 'field_team' ? 'emerald' :
    role === 'citizen' ? 'cyan' : 'slate';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0D1626] border border-[#1E2D4A] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D4A] bg-[#070D18]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {isAuthenticated ? 'Authenticated Identity' : 'FloodGuard Identity Portal'}
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Supabase Auth & RBAC
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1E2D4A] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isAuthenticated ? (
            /* Logged-In User Profile Card */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#070D18] border border-[#1E2D4A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Current Role</span>
                  <Badge variant={roleBadgeVariant} size="sm">
                    {role.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#16243A]">
                  <span className="text-xs text-slate-400">Email</span>
                  <span className="text-xs font-mono text-slate-200">{user?.email || 'N/A'}</span>
                </div>
                {profile?.full_name && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#16243A]">
                    <span className="text-xs text-slate-400">Name</span>
                    <span className="text-xs text-slate-200 font-medium">{profile.full_name}</span>
                  </div>
                )}
                {profile?.district && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#16243A]">
                    <span className="text-xs text-slate-400">District</span>
                    <span className="text-xs text-slate-200">{profile.district}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-[#16243A]">
                  <span className="text-xs text-slate-400">User UUID</span>
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">{user?.id}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed bg-[#16243A]/40 p-3 rounded-lg border border-[#1E2D4A]">
                Role verification is evaluated against authoritative database records and enforced via PostgreSQL Row Level Security (RLS).
              </div>

              <button
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Secure Sign Out</span>
              </button>
            </div>
          ) : (
            /* Login Tabs: Citizen (OTP) or Responder (Password) */
            <div className="space-y-4">
              <div className="grid grid-cols-2 p-1 bg-[#070D18] border border-[#1E2D4A] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => { setActiveTab('citizen'); setMessage(null); }}
                  className={`py-1.5 rounded-lg font-medium transition ${
                    activeTab === 'citizen'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Citizen Portal (OTP)
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('responder'); setMessage(null); }}
                  className={`py-1.5 rounded-lg font-medium transition ${
                    activeTab === 'responder'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Responder / Command
                </button>
              </div>

              {message && (
                <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                  message.type === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-700/60 text-rose-300'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {activeTab === 'citizen' ? (
                <form onSubmit={handleCitizenOtp} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="citizen@kerala.gov.in"
                        required
                        className="w-full bg-[#070D18] border border-[#1E2D4A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Citizens authenticate passwordlessly via secure Supabase OTP magic link.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-lg shadow-cyan-950/50"
                  >
                    {loading ? 'Sending link...' : 'Send Magic Sign-In Link'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResponderLogin} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                      Responder Official Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="official@ndma.gov.in"
                        required
                        className="w-full bg-[#070D18] border border-[#1E2D4A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full bg-[#070D18] border border-[#1E2D4A] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-lg shadow-emerald-950/50"
                  >
                    {loading ? 'Authenticating...' : 'Sign In as Responder'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
