'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useUser, useClerk, UserButton } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { ShieldAlert, Navigation, Search, MapPin, CheckCircle2, Clock, AlertTriangle, Package, Activity, BellRing, UserCircle, Users, MessageSquare, Send, Sparkles, X, LogOut, Camera } from 'lucide-react';
import { toast } from 'react-toastify';
import ThemeToggle from '../../components/ThemeToggle';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center text-black dark:text-white transition-colors duration-300">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3 transition-colors duration-300"></div>
        Loading Dashboard...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const searchParams = useSearchParams();
  const initialView = (searchParams.get('view') as 'missions' | 'report' | 'donate') || 'missions';
  
  const [role, setRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'missions' | 'report' | 'donate'>(initialView);

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        checkUserRole();
      }
      setLoading(false);
    }
  }, [isLoaded, user]);

  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'missions' || v === 'report' || v === 'donate') {
      setView(v);
    }
  }, [searchParams]);

  const checkUserRole = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
        
      if (profile?.role) {
        setRole(profile.role);
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (!isLoaded || loading) return (
    <div className="min-h-[60vh] flex items-center justify-center text-black dark:text-white transition-colors duration-300">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3 transition-colors duration-300"></div>
      Loading secure session...
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto transition-colors duration-300">
      <header className="mb-8 flex justify-between items-end transition-colors duration-300">
        <div className="flex justify-between items-center w-full transition-colors duration-300">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2 transition-colors duration-300">Welcome, {user?.firstName || 'Back'}</h1>
            <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">SahaySathi Unified Response Center</p>
          </div>
          <div className="flex items-center gap-4 transition-colors duration-300">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-surface rounded-lg border border-slate-200 dark:border-slate-700 transition-colors duration-300">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse transition-colors duration-300"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300 font-medium transition-colors duration-300">System Online</span>
            </div>
            <ThemeToggle />
            <div className="flex items-center gap-2 transition-colors duration-300">
              <img src={user?.imageUrl} alt="Profile" className="w-8 h-8 rounded-full border border-slate-700 transition-colors duration-300" />
              <button 
                onClick={async () => { await signOut(); window.location.href = "/"; }} 
                className="flex items-center gap-2 text-xs font-semibold text-black dark:text-white bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 px-3 py-2 rounded-lg transition-all transition-colors duration-300"
              >
                <LogOut className="w-3 h-3 transition-colors duration-300" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <OfflineBanner />
      {role === 'ngo' ? <NgoDashboard /> : <UnifiedUserDashboard user={user} view={view} setView={setView} />}
    </div>
  );
}

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-6 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-3 text-amber-400 transition-colors duration-300">
        <AlertTriangle className="w-5 h-5 transition-colors duration-300" />
        <span className="text-sm font-bold uppercase tracking-widest transition-colors duration-300">Offline Mode Active</span>
      </div>
      <p className="text-amber-400/60 text-[10px] font-medium uppercase tracking-widest transition-colors duration-300">Requests will be synced when you're back online</p>
    </div>
  );
}

// -------------------------------------------------------------
// VICTIM DASHBOARD (SOS REPORTING)
// -------------------------------------------------------------
function VictimDashboard({ user }: { user: any }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Medical');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  
  // New manual inputs
  const [manualResources, setManualResources] = useState<string[]>([]);
  const [otherResource, setOtherResource] = useState('');
  const [estimatedPeople, setEstimatedPeople] = useState<number>(1);
  const [requiredVolunteers, setRequiredVolunteers] = useState<number>(4);

  const resourceOptions = ['Food', 'Water', 'First Aid', 'Medical Help', 'Rescue Team', 'Shelter'];

  const toggleResource = (res: string) => {
    setManualResources(prev => prev.includes(res) ? prev.filter(r => r !== res) : [...prev, res]);
  };

  useEffect(() => {
    if (user) fetchMyRequests();
    const channel = supabase
      .channel('my-request-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        fetchMyRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchMyRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('requests')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'solved')
      .order('created_at', { ascending: false });
    
    if (data) setActiveRequests(data);
  };
  
  useEffect(() => {
    const handleOnline = () => {
      processOfflineQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const processOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('sos_queue') || '[]');
    if (queue.length === 0) return;

    toast.info(`Syncing ${queue.length} offline requests...`);
    const remaining = [];

    for (const req of queue) {
      try {
        let finalReq = { ...req };
        
        // AI Fallback execution on reconnect
        if (req.description && !req.is_verified && !req.is_fake) {
          try {
            const aiRes = await fetch('/api/ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description: req.description, image_url: req.image_url || null })
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              finalReq = { 
                ...finalReq, 
                priority: aiData.priority || finalReq.priority,
                summary: aiData.summary || finalReq.summary,
                is_verified: aiData.is_verified,
                is_fake: aiData.is_fake,
                confidence: aiData.confidence
              };
            }
          } catch (e) {
            console.error('AI Sync failed for offline request');
          }
        }

        const response = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalReq)
        });
        if (!response.ok) remaining.push(req);
      } catch (err) {
        remaining.push(req);
      }
    }

    localStorage.setItem('sos_queue', JSON.stringify(remaining));
    if (remaining.length === 0) {
      toast.success('All offline requests synced!');
      fetchMyRequests();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be under 2MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSOS = async (isInstant: boolean = true) => {
    if (isRequesting) return;
    setIsRequesting(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsRequesting(false);
      return;
    }

    const sosCategory = isInstant ? 'Rescue' : category;
    const sosDescription = isInstant ? 'Emergency SOS triggered' : (description || 'Emergency Request');
    
    const finalResources = [...manualResources];
    if (otherResource.trim()) finalResources.push(otherResource.trim());

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast.error('Invalid GPS coordinates detected.');
        setIsRequesting(false);
        return;
      }
      
      const requestData: any = {
        category: sosCategory,
        description: sosDescription,
        latitude: lat,
        longitude: lng,
        user_id: user?.id,
        priority: isInstant ? 'Critical' : 'High',
        summary: isInstant ? 'Instant SOS triggered' : sosDescription.substring(0, 50),
        image_url: null,
        created_at: new Date().toISOString(),
        required_resources: finalResources,
        estimated_people: estimatedPeople,
        required_volunteers: requiredVolunteers
      };

      if (!navigator.onLine) {
        const queue = JSON.parse(localStorage.getItem('sos_queue') || '[]');
        // We cannot upload image to Supabase while offline, so we proceed without it
        queue.push({ ...requestData, id: `offline-${Date.now()}` });
        localStorage.setItem('sos_queue', JSON.stringify(queue));
        toast.warning('⚠️ Saved offline — will sync later');
        setDescription('');
        setImage(null);
        setImagePreview(null);
        setManualResources([]);
        setOtherResource('');
        setEstimatedPeople(1);
        setRequiredVolunteers(4);
        setIsRequesting(false);
        return;
      }

      let imageUrl = null;
      if (image && !isInstant) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('incident-images')
          .upload(`incidents/${fileName}`, image);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('incident-images')
            .getPublicUrl(`incidents/${fileName}`);
          imageUrl = publicUrl;
        }
      }
      
      requestData.image_url = imageUrl;

      try {
        let finalData = { ...requestData };
        if (!isInstant && description) {
          try {
            const aiResponse = await fetch('/api/ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ description: sosDescription, image_url: imageUrl })
            });
            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              finalData = {
                ...requestData, // Keeps user inputs
                rescue_requirements: aiData.requirements,
                priority: aiData.priority || 'High',
                summary: aiData.summary || 'Emergency reported',
                risk_level: aiData.risk_level || 'Low',
                required_skills: aiData.required_skills || [],
                is_verified: aiData.is_verified || false,
                is_fake: aiData.is_fake || false,
                confidence: aiData.confidence || 0.5
              };
            }
          } catch (aiErr) {
            console.error('AI Triage failed, falling back to manual values', aiErr);
          }
        }

        const { data, error: dbError } = await supabase
          .from('requests')
          .insert([finalData])
          .select();
        
        if (!dbError) {
          toast.success(`SOS Sent! Priority: ${finalData.priority}`);
          setDescription('');
          setImage(null);
          setImagePreview(null);
          setManualResources([]);
          setOtherResource('');
          setEstimatedPeople(1);
          setRequiredVolunteers(4);
          if (typeof fetchMyRequests === 'function') fetchMyRequests();
        } else {
          console.error('Direct Insert Error:', dbError);
          toast.error(`Database Error: ${dbError.message}`);
        }
      } catch (error: any) {
        toast.error(`Network Error: ${error.message || 'Failed to send SOS'}`);
      } finally {
        setIsRequesting(false);
      }
    }, (error) => {
      let msg = 'Could not get your location.';
      if (error.code === 1) msg = 'Location access denied. Please enable GPS.';
      toast.error(msg);
      setIsRequesting(false);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors duration-300">
      <div className="bg-red-950/30 border border-red-500/20 p-6 rounded-3xl backdrop-blur-md transition-colors duration-300">
        <div className="flex items-center gap-4 mb-6 transition-colors duration-300">
          <div className="p-3 bg-red-600 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-colors duration-300">
            <ShieldAlert className="w-8 h-8 text-black dark:text-white animate-pulse transition-colors duration-300" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter transition-colors duration-300">Emergency Mode</h2>
            <p className="text-red-400/80 text-sm font-medium transition-colors duration-300">Your location is being shared with nearby responders.</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-8 relative overflow-hidden rounded-2xl bg-white dark:bg-[#0D1117]/50 border border-white/5 transition-colors duration-300">
          <button 
            onClick={() => handleSOS(true)}
            disabled={isRequesting}
            className="relative group w-40 h-40 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-black dark:text-white font-black text-4xl shadow-[0_0_50px_rgba(220,38,38,0.6)] hover:shadow-[0_0_80px_rgba(220,38,38,0.8)] transition-all transform active:scale-95 disabled:opacity-50 transition-colors duration-300"
          >
            <div className="absolute inset-0 rounded-full border-4 border-red-400 opacity-0 group-hover:animate-ping transition-colors duration-300"></div>
            {isRequesting ? '...' : 'SOS'}
          </button>
          <p className="mt-6 text-gray-600 dark:text-gray-300 text-sm font-bold uppercase tracking-widest transition-colors duration-300">Tap for instant help</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 transition-colors duration-300">
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white dark:bg-[#0D1117]/40 transition-colors duration-300">
          <h3 className="text-lg font-bold text-black dark:text-white mb-6 flex items-center gap-2 transition-colors duration-300">
            <Activity className="text-red-500 transition-colors duration-300" /> Dispatch Details
          </h3>
          <div className="space-y-4 transition-colors duration-300">
            <div className="space-y-1 transition-colors duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">Incident Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-100 dark:bg-slate-800/80 border border-slate-700 text-black dark:text-white rounded-2xl px-4 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none transition-colors duration-300"
              >
                <option>Medical</option>
                <option>Rescue</option>
                <option>Food / Water</option>
                <option>Shelter</option>
              </select>
            </div>
            <div className="space-y-1 transition-colors duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">Photo Evidence</label>
              <label className="flex items-center justify-center w-full h-[60px] bg-gray-100 dark:bg-slate-800/80 border border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-700/50 transition-all overflow-hidden transition-colors duration-300">
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover transition-colors duration-300" />
                ) : (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 transition-colors duration-300">
                    <Camera className="w-5 h-5 transition-colors duration-300" />
                    <span className="text-xs font-bold uppercase tracking-widest transition-colors duration-300">Upload Image</span>
                  </div>
                )}
                <input type="file" className="hidden transition-colors duration-300" accept="image/jpeg, image/png" onChange={handleImageChange} />
              </label>
            </div>
            <div className="space-y-1 transition-colors duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">Situation Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's happening..."
                className="w-full bg-gray-100 dark:bg-slate-800/80 border border-slate-700 text-black dark:text-white rounded-2xl px-4 py-4 h-32 focus:ring-2 focus:ring-red-500 outline-none resize-none transition-all transition-colors duration-300"
              ></textarea>
            </div>

            {/* MANUAL RESOURCES SECTION */}
            <div className="space-y-2 pt-2 border-t border-white/5 transition-colors duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">Required Resources</label>
              <div className="flex flex-wrap gap-2 transition-colors duration-300">
                {resourceOptions.map(res => (
                  <button
                    key={res}
                    onClick={() => toggleResource(res)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      manualResources.includes(res) 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
                        : 'bg-gray-100 dark:bg-slate-800 border-slate-700 text-gray-600 dark:text-gray-300 hover:text-black dark:text-white'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={otherResource}
                onChange={(e) => setOtherResource(e.target.value)}
                placeholder="Other resources (e.g. Blankets, Medicine)"
                className="w-full bg-gray-100 dark:bg-slate-800/80 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-2 mt-2 focus:ring-1 focus:ring-emerald-500 outline-none text-xs transition-colors duration-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 transition-colors duration-300">
              <div className="space-y-1 transition-colors duration-300">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">People Affected</label>
                <input
                  type="number"
                  min="1"
                  value={estimatedPeople}
                  onChange={(e) => setEstimatedPeople(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-100 dark:bg-slate-800/80 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors duration-300"
                />
              </div>
              <div className="space-y-1 transition-colors duration-300">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">Volunteers Needed</label>
                <input
                  type="number"
                  min="1"
                  value={requiredVolunteers}
                  onChange={(e) => setRequiredVolunteers(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-100 dark:bg-slate-800/80 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors duration-300"
                />
              </div>
            </div>

            <button onClick={() => handleSOS(false)} disabled={isRequesting} className="w-full bg-slate-100 hover:bg-white text-slate-900 font-black py-4 rounded-2xl transition-all shadow-xl active:scale-[0.98] mt-4 transition-colors duration-300">
              SEND EMERGENCY ALERT
            </button>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white dark:bg-[#0D1117]/40 transition-colors duration-300">
          <h3 className="text-lg font-bold text-black dark:text-white mb-6 flex items-center gap-2 transition-colors duration-300">
            <Clock className="text-red-500 transition-colors duration-300" /> My Incident Log
          </h3>
          <div className="space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar pr-2 transition-colors duration-300">
            {activeRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 transition-colors duration-300">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-20 transition-colors duration-300" />
                <p className="text-sm font-medium transition-colors duration-300">No active reports</p>
              </div>
            ) : (
              activeRequests.map((req) => (
                <div key={req.id} className="p-5 bg-gray-100 dark:bg-slate-800/40 rounded-2xl border border-white/5 transition-all hover:bg-gray-100 dark:bg-slate-800/60 group transition-colors duration-300">
                  <div className="flex justify-between items-start mb-3 transition-colors duration-300">
                    <div className="flex gap-2 transition-colors duration-300">
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        req.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {req.status === 'accepted' ? 'Rescue In-Progress' : 'Broadcasting SOS'}
                      </span>
                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        req.is_fake ? 'bg-red-500/20 text-red-500' : (req.is_verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-500')
                      }`}>
                        {req.is_fake ? 'Fake' : (req.is_verified ? 'Verified' : 'Unverified')}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono transition-colors duration-300">{new Date(req.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <h4 className="text-black dark:text-white font-bold text-lg mb-1 transition-colors duration-300">{req.category}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed transition-colors duration-300">{req.description}</p>
                  {req.image_url && (
                    <div className="mt-3 transition-colors duration-300">
                      <img src={req.image_url} alt="Incident" className="w-full h-32 object-cover rounded-xl transition-colors duration-300" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// UNIFIED USER DASHBOARD (RESCUE MODE)
// -------------------------------------------------------------
function UnifiedUserDashboard({ user, view, setView }: { user: any, view: 'missions' | 'report' | 'donate', setView: (v: 'missions' | 'report' | 'donate') => void }) {
  const [missions, setMissions] = useState<any[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [activeMission, setActiveMission] = useState<any>(null);

  const updateResource = async (id: string, item: string) => {
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fulfill_resource', id, item, user_id: user?.id, user_name: user?.firstName || 'Volunteer' })
      });
      if (res.ok) {
        toast.success(`You are bringing: ${item}`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to assign resource');
      }
    } catch(err) {
      toast.error('Network error');
    }
  };

  useEffect(() => {
    fetchNearbyRequests();
    const channel = supabase
      .channel('volunteer-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        fetchNearbyRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchNearbyRequests = async () => {
    setLoadingMissions(true);
    const { data } = await supabase
      .from('requests')
      .select('*')
      .neq('status', 'solved')
      .order('created_at', { ascending: false });
    
    if (data) setMissions(data);
    setLoadingMissions(false);
  };

  const updateStatus = async (id: string, newStatus: string, action?: string) => {
    if (!user) {
      toast.error('Authentication error: User not found. Please refresh.');
      return;
    }
    try {
      if (action) {
        if (action === 'volunteer') {
          const { error } = await supabase.rpc('increment_volunteer', { row_id: id });
          if (error) {
            // Fallback if RPC fails
            const { data: current } = await supabase.from('requests').select('volunteer_count').eq('id', id).single();
            await supabase.from('requests').update({ volunteer_count: (current?.volunteer_count || 0) + 1 }).eq('id', id);
          }
          toast.success('Mission Joined!');
        } else if (action === 'complete') {
          await supabase.from('requests').update({ status: 'completed' }).eq('id', id);
          toast.success('Incident marked as Solved');
        }
        fetchNearbyRequests();
        return;
      }

      const { error } = await supabase
        .from('requests')
        .update({ 
          status: newStatus,
          volunteer_id: newStatus === 'accepted' ? user.id : null
        })
        .eq('id', id);

      if (error) throw error;
      toast.success(newStatus === 'solved' ? 'Incident marked as Solved' : 'Mission Accepted! Deploying...');
      fetchNearbyRequests();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex justify-center mb-8 transition-colors duration-300">
        <div className="bg-gray-100 dark:bg-slate-800/80 p-1.5 rounded-3xl flex gap-2 border border-white/5 backdrop-blur-xl transition-colors duration-300">
          <button 
            onClick={() => setView('missions')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${view === 'missions' ? 'bg-emerald-500 text-black dark:text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:text-white'}`}
          >
            Rescue Missions
          </button>
          <button 
            onClick={() => setView('report')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${view === 'report' ? 'bg-red-600 text-black dark:text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:text-white'}`}
          >
            Report SOS
          </button>
          <button 
            onClick={() => setView('donate')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${view === 'donate' ? 'bg-blue-600 text-black dark:text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:text-white'}`}
          >
            Donate Resources
          </button>
        </div>
      </div>

      {view === 'report' ? (
        <VictimDashboard user={user} />
      ) : view === 'donate' ? (
        <DonorDashboard user={user} />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors duration-300">
          {activeMission && (
            <MissionChat mission={activeMission} user={user} onClose={() => setActiveMission(null)} />
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 transition-colors duration-300">
            {[
              { label: 'Rank Points', val: '450', icon: Activity, color: 'text-emerald-400' },
              { label: 'Lives Saved', val: '12', icon: CheckCircle2, color: 'text-blue-400' },
              { label: 'Open Alerts', val: missions.length.toString(), icon: AlertTriangle, color: 'text-yellow-400' },
              { label: 'Vitals', val: 'Active', icon: BellRing, color: 'text-emerald-400' },
            ].map((s,i) => (
              <div key={i} className="glass-panel p-5 rounded-3xl flex flex-col items-center justify-center text-center border border-white/5 bg-white dark:bg-[#0D1117]/40 transition-colors duration-300">
                <s.icon className={`w-5 h-5 mb-3 ${s.color}`} />
                <div className="text-2xl font-black text-black dark:text-white tracking-tighter transition-colors duration-300">{s.val}</div>
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest transition-colors duration-300">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-white dark:bg-[#0D1117]/40 transition-colors duration-300">
            <div className="flex justify-between items-center mb-8 transition-colors duration-300">
              <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tighter flex items-center gap-3 transition-colors duration-300">
                <div className="w-2 h-6 bg-emerald-500 rounded-full transition-colors duration-300"></div>
                Active Rescue Missions
              </h3>
              <Link href="/map" className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all transition-colors duration-300">
                <MapPin className="w-3 h-3 transition-colors duration-300" /> View Realtime Map
              </Link>
            </div>

            {loadingMissions ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 transition-colors duration-300">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4 transition-colors duration-300"></div>
                <p className="text-xs font-bold uppercase tracking-widest transition-colors duration-300">Scanning disaster zones...</p>
              </div>
            ) : missions.length === 0 ? (
              <div className="text-slate-500 text-center py-20 font-bold uppercase tracking-widest border-2 border-dashed border-white/5 rounded-3xl transition-colors duration-300">
                All zones cleared. Standby.
              </div>
            ) : (
              <div className="grid gap-6 transition-colors duration-300">
                {missions.map((mission) => (
                  <div key={mission.id} className={`p-6 bg-gray-100 dark:bg-slate-800/40 border ${mission.is_fake ? 'border-red-500/50' : 'border-white/5'} rounded-[1.5rem] flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all hover:border-emerald-500/30 group relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-1 h-full ${mission.is_fake ? 'bg-red-500 opacity-50' : 'bg-emerald-500 opacity-20'}`}></div>
                    
                    {/* Thumbnail Image */}
                    {mission.image_url && (
                      <div className="w-full lg:w-32 h-32 shrink-0 transition-colors duration-300">
                        <img src={mission.image_url} alt="Incident" className="w-full h-full object-cover rounded-xl transition-colors duration-300" />
                      </div>
                    )}

                    <div className="flex-1 transition-colors duration-300">
                      <div className="flex flex-wrap items-center gap-3 mb-3 transition-colors duration-300">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                          mission.status === 'completed' || mission.status === 'solved' ? 'bg-emerald-500 text-black dark:text-white' : 
                          mission.status === 'in_progress' ? 'bg-blue-500 text-black dark:text-white' :
                          mission.status === 'assigned' ? 'bg-purple-500 text-black dark:text-white' :
                          'bg-yellow-600 text-black dark:text-white'
                        }`}>
                          {mission.status === 'completed' || mission.status === 'solved' ? 'Finished' : (mission.priority || 'High Priority')}
                        </span>
                        
                        {/* AI VALIDATION BADGES */}
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 ${
                          mission.is_fake ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 
                          mission.is_verified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 
                          'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'
                        }`}>
                          {mission.is_fake ? (
                            <><X className="w-3 h-3 transition-colors duration-300" /> Suspected Fake</>
                          ) : mission.is_verified ? (
                            <><CheckCircle2 className="w-3 h-3 transition-colors duration-300" /> AI Verified</>
                          ) : (
                            <><AlertTriangle className="w-3 h-3 transition-colors duration-300" /> Unverified</>
                          )}
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 transition-colors duration-300">
                          <Clock className="w-3 h-3 transition-colors duration-300"/> {new Date(mission.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1 ml-2 transition-colors duration-300">
                          <Users className="w-3 h-3 transition-colors duration-300" /> {mission.volunteer_count || 0} / {mission.required_volunteers || 10} Responders
                        </span>
                        {/* RISK LEVEL BADGE */}
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                          mission.risk_level === 'High' ? 'bg-red-500/20 text-red-500' : 
                          mission.risk_level === 'Medium' ? 'bg-orange-500/20 text-orange-500' : 
                          'bg-emerald-500/20 text-emerald-500'
                        }`}>
                          {mission.risk_level || 'Low'} Risk
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-black dark:text-white leading-none mb-2 transition-colors duration-300">{mission.summary || mission.category}</h4>
                      {mission.is_fake && (
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1 transition-colors duration-300">
                          <AlertTriangle className="w-3 h-3 transition-colors duration-300" /> Warning: This request may be false
                        </p>
                      )}
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2 max-w-2xl leading-relaxed transition-colors duration-300">{mission.description}</p>
                      
                      {/* SKILLS REQUIRED */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 mt-4 transition-colors duration-300">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest w-full mb-1 flex items-center gap-1 transition-colors duration-300">
                          <Activity className="w-3 h-3 transition-colors duration-300" /> Required Skills
                        </span>
                        {Array.isArray(mission.required_skills) ? mission.required_skills.map((skill: string, idx: number) => (
                          <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg text-[9px] font-bold transition-colors duration-300">
                            {skill}
                          </span>
                        )) : (mission.rescue_requirements || 'General Rescue').split(',').map((item: string, idx: number) => (
                          <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg text-[9px] font-bold transition-colors duration-300">
                            {item.trim()}
                          </span>
                        ))}
                      </div>

                      {/* RESOURCES NEEDED */}
                      {mission.required_resources && (
                        <div className="flex flex-col gap-2 mt-3 w-full max-w-sm transition-colors duration-300">
                          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest w-full mb-1 transition-colors duration-300">Resources Needed</span>
                          <div className="grid gap-2 transition-colors duration-300">
                            {Array.isArray(mission.required_resources) && mission.required_resources.map((item: string, idx: number) => {
                              const fulfilledBy = (mission.fulfilled_resources || []).find((r: any) => r.item === item);
                              const isFulfilled = !!fulfilledBy;
                              
                              return (
                                <div key={idx} className={`flex items-center justify-between p-2 rounded-xl border ${isFulfilled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                                  <span className="text-[10px] font-bold uppercase transition-colors duration-300">{item}</span>
                                  {isFulfilled ? (
                                    <span className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors duration-300" title={`Brought by ${fulfilledBy.user_name}`}>
                                      <CheckCircle2 className="w-3 h-3 transition-colors duration-300"/> {fulfilledBy.user_name}
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={() => updateResource(mission.id, item)}
                                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-black dark:text-white text-[8px] font-black uppercase rounded shadow-lg active:scale-95 transition-all transition-colors duration-300"
                                    >
                                      I'll Bring This
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <MissionProgress status={mission.status} />
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[160px] transition-colors duration-300">
                      {mission.status === 'completed' ? (
                        <div className="w-full py-4 bg-emerald-500/10 text-emerald-400 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 transition-colors duration-300">
                          Mission Accomplished
                        </div>
                      ) : (
                        <>
                          {mission.volunteer_count < (mission.required_volunteers || 10) ? (
                            <button 
                              onClick={() => updateStatus(mission.id, 'accepted', 'volunteer')}
                              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-black dark:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98] transition-colors duration-300"
                            >
                              Join Mission
                            </button>
                          ) : (
                            <div className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-slate-500 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border border-white/5 transition-colors duration-300">
                              Team full — choose another mission
                            </div>
                          )}
                          <button 
                            onClick={() => setActiveMission(mission)}
                            className="w-full py-3 bg-gray-100 dark:bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 transition-colors duration-300"
                          >
                            <MessageSquare className="w-3 h-3 transition-colors duration-300" /> Situation Room
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MISSION CHAT & AI SITUATION ANALYST
// -------------------------------------------------------------
function MissionChat({ mission, user, onClose }: { mission: any, user: any, onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiSummary, setAiSummary] = useState('Analysing live intel...');
  const [loadingAi, setLoadingAi] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chatTab, setChatTab] = useState<'chat'|'resources'>('chat');
  const [nearbyDonations, setNearbyDonations] = useState<any[]>([]);
  const [assignedDonations, setAssignedDonations] = useState<any[]>([]);

  useEffect(() => {
    fetchMessages();
    fetchDonations();
    const channel = supabase
      .channel(`mission-chat-${mission.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${mission.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        fetchDonations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mission.id]);

  const fetchDonations = async () => {
    // Assigned to this mission
    const { data: assigned } = await supabase.from('donations').select('*').eq('assigned_request_id', mission.id);
    if (assigned) setAssignedDonations(assigned);

    // Available nearby
    const { data: available } = await supabase.from('donations').select('*').eq('status', 'available');
    if (available) setNearbyDonations(available);
  };

  const assignDonation = async (donId: string) => {
    const { error } = await supabase.from('donations').update({
      status: 'assigned',
      assigned_request_id: mission.id
    }).eq('id', donId);
    
    if (error) toast.error('Failed to assign resource');
    else {
      toast.success('Resource assigned to mission!');
      fetchDonations();
    }
  };


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && messages.length % 5 === 0) {
      generateAiBriefing();
    }
  }, [messages.length]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('request_id', mission.id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('[Chat] Fetch Error:', error.message);
      toast.error('Could not load chat messages');
    }
    if (data) setMessages(data);
  };

  const generateAiBriefing = async () => {
    if (messages.length < 2) return;
    setLoadingAi(true);
    try {
      const chatContent = messages.slice(-10).map(m => `${m.user_name}: ${m.message}`).join('\n');
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: `ACT AS TACTICAL COORDINATOR. ANALYZE THIS RESCUE CHAT AND PROVIDE A 2-SENTENCE LIVE BRIEFING FOR NEW ARRIVALS. FOCUS ON PROGRESS AND REMAINING DANGER.
          CHAT HISTORY:
          ${chatContent}` 
        })
      });
      const data = await response.json();
      setAiSummary(data.summary || 'Scene coordination in progress.');
    } catch (error) {
      console.error('[Chat] AI Error:', error);
    } finally {
      setLoadingAi(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data, error } = await supabase.from('messages').insert({
      request_id: mission.id,
      user_id: user.id,
      user_name: user.firstName || user.username || 'Responder',
      message: newMessage
    }).select();

    if (error) {
      console.error('[Chat] Send Error:', error.message);
      toast.error('Failed to send message: ' + error.message);
    } else {
      setNewMessage('');
      if (data && data.length > 0) {
        setMessages(prev => {
          // Prevent duplicates if realtime also caught it
          if (prev.find(m => m.id === data[0].id)) return prev;
          return [...prev, data[0]];
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white dark:bg-[#0D1117]/80 backdrop-blur-sm animate-in fade-in duration-300 transition-colors duration-300">
      <div className="w-full max-w-2xl h-[80vh] bg-white dark:bg-[#0D1117] border border-white/10 rounded-[2rem] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-colors duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gray-100 dark:bg-slate-800/50 transition-colors duration-300">
          <div className="flex items-center gap-3 transition-colors duration-300">
            <div className="p-2 bg-emerald-500 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-colors duration-300">
              <MessageSquare className="w-5 h-5 text-black dark:text-white transition-colors duration-300" />
            </div>
            <div>
              <h3 className="text-black dark:text-white font-black uppercase tracking-tighter transition-colors duration-300">Mission Situation Room</h3>
              <p className="text-[10px] text-gray-600 dark:text-gray-300 font-bold uppercase tracking-widest transition-colors duration-300">{mission.category} | Zone ID: {mission.id.slice(0,8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 transition-colors duration-300">
            <div className="bg-white dark:bg-[#0D1117] rounded-lg p-1 border border-white/5 flex mr-2 transition-colors duration-300">
              <button 
                onClick={() => setChatTab('chat')} 
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${chatTab === 'chat' ? 'bg-emerald-600 text-black dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:text-white'}`}
              >
                Comms
              </button>
              <button 
                onClick={() => setChatTab('resources')} 
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${chatTab === 'resources' ? 'bg-blue-600 text-black dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-black dark:text-white'}`}
              >
                <Package className="w-3 h-3 transition-colors duration-300" /> Resources
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-600 dark:text-gray-300 transition-all transition-colors duration-300">
              <X className="w-6 h-6 transition-colors duration-300" />
            </button>
          </div>
        </div>

        {chatTab === 'chat' ? (
          <>
            {/* AI TACTICAL BRIEFING */}
            <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/10 flex gap-4 items-start transition-colors duration-300">
              <div className="p-2 bg-emerald-500/20 rounded-lg transition-colors duration-300">
                <Sparkles className={`w-4 h-4 text-emerald-400 ${loadingAi ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1 transition-colors duration-300">AI Tactical Briefing (Live)</span>
                <p className="text-xs text-emerald-100/80 italic transition-colors duration-300">"{aiSummary}"</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar transition-colors duration-300">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-20 transition-colors duration-300">
                  <MessageSquare className="w-12 h-12 mb-2 text-black dark:text-white transition-colors duration-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-black dark:text-white transition-colors duration-300">No comms yet. Start briefing.</p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.user_id === user.id ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-1 transition-colors duration-300">{m.user_name}</span>
                    <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${
                      m.user_id === user.id ? 'bg-emerald-600 text-black dark:text-white rounded-tr-none' : 'bg-gray-100 dark:bg-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-gray-100 dark:bg-slate-800/30 border-t border-white/5 flex gap-2 transition-colors duration-300">
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type status update..."
                className="flex-1 bg-white dark:bg-[#0D1117] border border-white/5 rounded-xl px-4 py-3 text-sm text-black dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all transition-colors duration-300"
              />
              <button type="submit" className="p-3 bg-emerald-600 hover:bg-emerald-500 text-black dark:text-white rounded-xl transition-all shadow-lg active:scale-95 transition-colors duration-300">
                <Send className="w-5 h-5 transition-colors duration-300" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6 transition-colors duration-300">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-gray-100 dark:bg-slate-800/40 transition-colors duration-300">
              <h4 className="text-black dark:text-white font-bold mb-4 uppercase tracking-widest text-sm text-emerald-400 transition-colors duration-300">Resources Assigned to Mission</h4>
              {assignedDonations.length > 0 ? (
                <div className="grid gap-3 transition-colors duration-300">
                  {assignedDonations.map(don => (
                    <div key={don.id} className="flex items-center justify-between bg-white dark:bg-[#0D1117]/50 p-3 rounded-xl border border-emerald-500/20 transition-colors duration-300">
                      <div>
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase transition-colors duration-300">{don.type}</span>
                        <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 transition-colors duration-300">{don.description} (Qty: {don.quantity})</p>
                      </div>
                      <CheckCircle2 className="text-emerald-500 w-5 h-5 transition-colors duration-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs font-bold uppercase transition-colors duration-300">No resources assigned yet.</p>
              )}
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-gray-100 dark:bg-slate-800/40 transition-colors duration-300">
              <h4 className="text-black dark:text-white font-bold mb-4 uppercase tracking-widest text-sm text-blue-400 transition-colors duration-300">Available Nearby Resources</h4>
              {nearbyDonations.length > 0 ? (
                <div className="grid gap-3 transition-colors duration-300">
                  {nearbyDonations.map(don => (
                    <div key={don.id} className="flex items-center justify-between bg-white dark:bg-[#0D1117]/50 p-3 rounded-xl border border-blue-500/20 transition-colors duration-300">
                      <div>
                        <span className="text-[10px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase transition-colors duration-300">{don.type}</span>
                        <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 transition-colors duration-300">{don.description} (Qty: {don.quantity})</p>
                      </div>
                      <button 
                        onClick={() => assignDonation(don.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-black dark:text-white text-[10px] font-black uppercase rounded-lg transition-all transition-colors duration-300"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs font-bold uppercase transition-colors duration-300">No available resources found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// NGO DASHBOARD
// -------------------------------------------------------------
function NgoDashboard() {
  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 transition-colors duration-300">
        {[
          { label: 'Total Requests', val: '1,240', icon: Activity, color: 'text-blue-400' },
          { label: 'Pending', val: '342', icon: Clock, color: 'text-yellow-400' },
          { label: 'Volunteers', val: '89', icon: Users, color: 'text-emerald-400' },
          { label: 'Critical', val: '15', icon: AlertTriangle, color: 'text-red-400' },
        ].map((s,i) => (
          <div key={i} className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center transition-colors duration-300">
            <s.icon className={`w-6 h-6 mb-2 ${s.color}`} />
            <div className="text-2xl font-bold text-black dark:text-white transition-colors duration-300">{s.val}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider transition-colors duration-300">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6 transition-colors duration-300">
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl transition-colors duration-300">
          <h3 className="text-xl font-bold text-black dark:text-white mb-6 transition-colors duration-300">Recent Coordination Tasks</h3>
          <div className="overflow-x-auto transition-colors duration-300">
            <table className="w-full text-left text-sm transition-colors duration-300">
              <thead className="bg-gray-100 dark:bg-slate-800/50 text-gray-600 dark:text-gray-300 transition-colors duration-300">
                <tr>
                  <th className="p-3 rounded-tl-lg rounded-bl-lg transition-colors duration-300">Category</th>
                  <th className="p-3 transition-colors duration-300">Location</th>
                  <th className="p-3 transition-colors duration-300">Status</th>
                  <th className="p-3 rounded-tr-lg rounded-br-lg transition-colors duration-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 transition-colors duration-300">
                {[1,2,3,4].map((i) => (
                  <tr key={i} className="text-black dark:text-white transition-colors duration-300">
                    <td className="p-3 transition-colors duration-300">Medical Supplies</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300 transition-colors duration-300">Sector {i}</td>
                    <td className="p-3 transition-colors duration-300"><span className="text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs transition-colors duration-300">Pending Setup</span></td>
                    <td className="p-3 transition-colors duration-300"><button className="text-blue-400 hover:text-blue-300 transition-colors duration-300">Assign Team</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl flex flex-col transition-colors duration-300">
          <h3 className="text-xl font-bold text-black dark:text-white mb-4 flex items-center gap-2 transition-colors duration-300">
            <ShieldAlert className="text-red-400 transition-colors duration-300"/> AI Fraud Check
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 transition-colors duration-300">Our AI systems have flagged potential duplicate or non-urgent requests in the last hour.</p>
          
          <div className="space-y-3 flex-1 transition-colors duration-300">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors duration-300">
              <div className="text-black dark:text-white font-medium text-sm transition-colors duration-300">Possible Duplicate</div>
              <div className="text-gray-600 dark:text-gray-300 text-xs mt-1 transition-colors duration-300">2 requests from same IP for Rescue within 5 mins.</div>
            </div>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg transition-colors duration-300">
              <div className="text-black dark:text-white font-medium text-sm transition-colors duration-300">Low Priority Flagged</div>
              <div className="text-gray-600 dark:text-gray-300 text-xs mt-1 transition-colors duration-300">"Need extra blankets" marked as Critical. Reclassified to Medium.</div>
            </div>
          </div>
          
          <button className="w-full mt-4 bg-gray-100 dark:bg-slate-800 hover:bg-slate-700 text-black dark:text-white py-2 rounded-lg text-sm transition-colors">View All Logs</button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MISSION STATUS COMPONENT
// -------------------------------------------------------------
function MissionProgress({ status }: { status: string }) {
  const steps = [
    { id: 'waiting', label: 'Waiting' },
    { id: 'assigned', label: 'Assigned' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' }
  ];
  
  let normalizedStatus = status || 'waiting';
  if (normalizedStatus === 'active') normalizedStatus = 'waiting';
  if (normalizedStatus === 'solved') normalizedStatus = 'completed';

  const idx = steps.findIndex(s => s.id === normalizedStatus);
  const currentIndex = idx >= 0 ? idx : 0;
  
  return (
    <div className="flex items-center gap-1 mt-6 mb-2 w-full max-w-lg transition-colors duration-300">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <div className={`text-[9px] font-black uppercase px-2 py-1.5 rounded-md flex-1 text-center transition-all ${
            i <= currentIndex ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-gray-100 dark:bg-slate-800 text-slate-500 border border-slate-700 opacity-50'
          }`}>
            {step.label}
          </div>
          {i < steps.length - 1 && <div className={`h-[2px] w-2 sm:w-4 rounded-full ${i < currentIndex ? 'bg-emerald-500/50' : 'bg-slate-700'}`}></div>}
        </React.Fragment>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// DONOR DASHBOARD
// -------------------------------------------------------------
function DonorDashboard({ user }: { user: any }) {
  const [type, setType] = useState('food');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [myDonations, setMyDonations] = useState<any[]>([]);
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMyDonations();
    fetchNearbyRequests();

    const channel = supabase
      .channel('donor-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => {
        fetchMyDonations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
        fetchNearbyRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMyDonations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('donations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyDonations(data);
  };

  const fetchNearbyRequests = async () => {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .neq('status', 'solved')
      .order('created_at', { ascending: false });
    if (data) setNearbyRequests(data);
  };

  const handleDonate = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation required to donate resources.');
      return;
    }
    setIsSubmitting(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { data, error } = await supabase.from('donations').insert([{
        user_id: user.id,
        type,
        quantity,
        description,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        status: 'available'
      }]);

      if (error) {
        console.error("Donation Insert Error:", error);
        toast.error('Failed to post donation: ' + error.message);
      } else {
        toast.success('Donation offered successfully! Volunteers will contact you.');
        setDescription('');
        setQuantity(1);
        fetchMyDonations();
      }
      setIsSubmitting(false);
    }, () => {
      toast.error('Could not get location.');
      setIsSubmitting(false);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors duration-300">
      <div className="grid md:grid-cols-2 gap-6 transition-colors duration-300">
        {/* DONATION FORM */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white dark:bg-[#0D1117]/40 transition-colors duration-300">
          <h3 className="text-lg font-bold text-black dark:text-white mb-6 flex items-center gap-2 transition-colors duration-300">
            <Package className="text-blue-500 transition-colors duration-300" /> Offer Resources
          </h3>
          <div className="space-y-4 transition-colors duration-300">
            <div className="space-y-1 transition-colors duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">Resource Type</label>
              <select 
                value={type} onChange={(e) => setType(e.target.value)}
                className="w-full bg-gray-100 dark:bg-slate-800/80 border border-slate-700 text-black dark:text-white rounded-2xl px-4 py-3 outline-none transition-colors duration-300"
              >
                <option value="food">Food & Water</option>
                <option value="blood">Blood</option>
                <option value="medical">Medical</option>
                <option value="supplies">General Supplies</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4 transition-colors duration-300">
              <div className="space-y-1 transition-colors duration-300">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">Quantity</label>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full bg-gray-100 dark:bg-slate-800/80 border border-slate-700 text-black dark:text-white rounded-2xl px-4 py-3 outline-none transition-colors duration-300" />
              </div>
            </div>
            <div className="space-y-1 transition-colors duration-300">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 transition-colors duration-300">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 50 packets of biscuits, 20L water" className="w-full bg-gray-100 dark:bg-slate-800/80 border border-slate-700 text-black dark:text-white rounded-2xl px-4 py-3 h-24 outline-none resize-none transition-colors duration-300"></textarea>
            </div>
            <button onClick={handleDonate} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-black dark:text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-[0.98] transition-colors duration-300">
              {isSubmitting ? 'Posting...' : 'DONATE RESOURCES'}
            </button>
          </div>
        </div>

        {/* MY DONATIONS */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white dark:bg-[#0D1117]/40 transition-colors duration-300">
          <h3 className="text-lg font-bold text-black dark:text-white mb-6 flex items-center gap-2 transition-colors duration-300">
            <CheckCircle2 className="text-blue-500 transition-colors duration-300" /> My Donations
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 transition-colors duration-300">
            {myDonations.length === 0 ? (
              <p className="text-slate-500 text-center py-10 font-bold text-sm transition-colors duration-300">No donations yet. Be the first to help!</p>
            ) : (
              myDonations.map(don => (
                <div key={don.id} className="p-4 bg-gray-100 dark:bg-slate-800/40 rounded-2xl border border-white/5 transition-colors duration-300">
                  <div className="flex justify-between items-center mb-2 transition-colors duration-300">
                    <span className="text-xs font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-1 rounded transition-colors duration-300">{don.type}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${don.status === 'assigned' ? 'bg-orange-500/20 text-orange-400' : don.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-green-500/20 text-green-400'}`}>
                      {don.status}
                    </span>
                  </div>
                  <p className="text-black dark:text-white text-sm font-medium transition-colors duration-300">{don.description}</p>
                  <p className="text-slate-500 text-xs mt-1 transition-colors duration-300">Qty: {don.quantity}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* REQUESTS NEEDING HELP (SMART MATCH) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white dark:bg-[#0D1117]/40 mt-8 transition-colors duration-300">
        <h3 className="text-lg font-bold text-black dark:text-white mb-6 flex items-center gap-2 transition-colors duration-300">
          <Sparkles className="text-yellow-500 transition-colors duration-300" /> Requests Needing Your Resources
        </h3>
        <div className="grid md:grid-cols-3 gap-4 transition-colors duration-300">
          {nearbyRequests.slice(0, 6).map(req => (
            <div key={req.id} className="p-5 bg-gray-100 dark:bg-slate-800/40 rounded-2xl border border-white/5 relative overflow-hidden group transition-colors duration-300">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 opacity-20 transition-colors duration-300"></div>
              <div className="flex justify-between mb-2 transition-colors duration-300">
                <span className="text-xs font-bold text-black dark:text-white transition-colors duration-300">{req.category}</span>
                <span className="text-[10px] text-red-400 font-bold uppercase transition-colors duration-300">{req.priority}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-xs line-clamp-2 mb-3 transition-colors duration-300">{req.summary || req.description}</p>
              
              {/* SMART MATCH AI RESOURCES */}
              {req.required_resources && req.required_resources.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 transition-colors duration-300">
                  <span className="w-full text-[9px] font-black text-yellow-500 uppercase tracking-widest transition-colors duration-300">Needs:</span>
                  {req.required_resources.slice(0,3).map((r: string, idx: number) => (
                    <span key={idx} className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[9px] font-bold transition-colors duration-300">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
