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
      <div className="min-h-[60vh] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
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
    <div className="min-h-[60vh] flex items-center justify-center text-white">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
      Loading secure session...
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Welcome, {user?.firstName || 'Back'}</h1>
            <p className="text-slate-400">SahaySathi Unified Response Center</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-surface rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-slate-300 font-medium">System Online</span>
            </div>
            <ThemeToggle />
            <UserButton />
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
    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3 text-amber-400">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-bold uppercase tracking-widest">Offline Mode Active</span>
      </div>
      <p className="text-amber-400/60 text-[10px] font-medium uppercase tracking-widest">Requests will be synced when you're back online</p>
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
              finalReq = { ...finalReq, ...aiData };
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
        created_at: new Date().toISOString()
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
                ...requestData,
                rescue_requirements: aiData.requirements,
                priority: aiData.priority || 'High',
                summary: aiData.summary || 'Emergency reported',
                risk_level: aiData.risk_level || 'Low',
                required_volunteers: aiData.required_volunteers || 4,
                required_skills: aiData.required_skills || [],
                required_resources: aiData.required_resources || [],
                estimated_people: aiData.estimated_people || 1,
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-red-950/30 border border-red-500/20 p-6 rounded-3xl backdrop-blur-md">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-600 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.4)]">
            <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Emergency Mode</h2>
            <p className="text-red-400/80 text-sm font-medium">Your location is being shared with nearby responders.</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-8 relative overflow-hidden rounded-2xl bg-slate-900/50 border border-white/5">
          <button 
            onClick={() => handleSOS(true)}
            disabled={isRequesting}
            className="relative group w-40 h-40 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white font-black text-4xl shadow-[0_0_50px_rgba(220,38,38,0.6)] hover:shadow-[0_0_80px_rgba(220,38,38,0.8)] transition-all transform active:scale-95 disabled:opacity-50"
          >
            <div className="absolute inset-0 rounded-full border-4 border-red-400 opacity-0 group-hover:animate-ping"></div>
            {isRequesting ? '...' : 'SOS'}
          </button>
          <p className="mt-6 text-slate-400 text-sm font-bold uppercase tracking-widest">Tap for instant help</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/40">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-red-500" /> Dispatch Details
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Incident Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-2xl px-4 py-4 focus:ring-2 focus:ring-red-500 outline-none transition-all appearance-none"
              >
                <option>Medical</option>
                <option>Rescue</option>
                <option>Food / Water</option>
                <option>Shelter</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Photo Evidence</label>
              <label className="flex items-center justify-center w-full h-[60px] bg-slate-800/80 border border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-700/50 transition-all overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Camera className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Upload Image</span>
                  </div>
                )}
                <input type="file" className="hidden" accept="image/jpeg, image/png" onChange={handleImageChange} />
              </label>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Situation Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's happening..."
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-2xl px-4 py-4 h-32 focus:ring-2 focus:ring-red-500 outline-none resize-none transition-all"
              ></textarea>
            </div>
            <button onClick={() => handleSOS(false)} disabled={isRequesting} className="w-full bg-slate-100 hover:bg-white text-slate-900 font-black py-4 rounded-2xl transition-all shadow-xl active:scale-[0.98]">
              SEND EMERGENCY ALERT
            </button>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/40">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="text-red-500" /> My Incident Log
          </h3>
          <div className="space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar pr-2">
            {activeRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">No active reports</p>
              </div>
            ) : (
              activeRequests.map((req) => (
                <div key={req.id} className="p-5 bg-slate-800/40 rounded-2xl border border-white/5 transition-all hover:bg-slate-800/60 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
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
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(req.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <h4 className="text-white font-bold text-lg mb-1">{req.category}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{req.description}</p>
                  {req.image_url && (
                    <div className="mt-3">
                      <img src={req.image_url} alt="Incident" className="w-full h-32 object-cover rounded-xl" />
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
    <div className="space-y-6">
      <div className="flex justify-center mb-8">
        <div className="bg-slate-800/80 p-1.5 rounded-3xl flex gap-2 border border-white/5 backdrop-blur-xl">
          <button 
            onClick={() => setView('missions')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${view === 'missions' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-slate-400 hover:text-white'}`}
          >
            Rescue Missions
          </button>
          <button 
            onClick={() => setView('report')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${view === 'report' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'text-slate-400 hover:text-white'}`}
          >
            Report SOS
          </button>
          <button 
            onClick={() => setView('donate')}
            className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${view === 'donate' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'text-slate-400 hover:text-white'}`}
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeMission && (
            <MissionChat mission={activeMission} user={user} onClose={() => setActiveMission(null)} />
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Rank Points', val: '450', icon: Activity, color: 'text-emerald-400' },
              { label: 'Lives Saved', val: '12', icon: CheckCircle2, color: 'text-blue-400' },
              { label: 'Open Alerts', val: missions.length.toString(), icon: AlertTriangle, color: 'text-yellow-400' },
              { label: 'Vitals', val: 'Active', icon: BellRing, color: 'text-emerald-400' },
            ].map((s,i) => (
              <div key={i} className="glass-panel p-5 rounded-3xl flex flex-col items-center justify-center text-center border border-white/5 bg-slate-900/40">
                <s.icon className={`w-5 h-5 mb-3 ${s.color}`} />
                <div className="text-2xl font-black text-white tracking-tighter">{s.val}</div>
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-slate-900/40">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                Active Rescue Missions
              </h3>
              <Link href="/map" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                <MapPin className="w-3 h-3" /> View Realtime Map
              </Link>
            </div>

            {loadingMissions ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-bold uppercase tracking-widest">Scanning disaster zones...</p>
              </div>
            ) : missions.length === 0 ? (
              <div className="text-slate-500 text-center py-20 font-bold uppercase tracking-widest border-2 border-dashed border-white/5 rounded-3xl">
                All zones cleared. Standby.
              </div>
            ) : (
              <div className="grid gap-6">
                {missions.map((mission) => (
                  <div key={mission.id} className={`p-6 bg-slate-800/40 border ${mission.is_fake ? 'border-red-500/50' : 'border-white/5'} rounded-[1.5rem] flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all hover:border-emerald-500/30 group relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-1 h-full ${mission.is_fake ? 'bg-red-500 opacity-50' : 'bg-emerald-500 opacity-20'}`}></div>
                    
                    {/* Thumbnail Image */}
                    {mission.image_url && (
                      <div className="w-full lg:w-32 h-32 shrink-0">
                        <img src={mission.image_url} alt="Incident" className="w-full h-full object-cover rounded-xl" />
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                          mission.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {mission.status === 'completed' ? 'Rescue Finished' : (mission.priority || 'High Priority')}
                        </span>
                        
                        {/* AI VALIDATION BADGES */}
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 ${
                          mission.is_fake ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 
                          mission.is_verified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 
                          'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20'
                        }`}>
                          {mission.is_fake ? (
                            <><X className="w-3 h-3" /> Suspected Fake</>
                          ) : mission.is_verified ? (
                            <><CheckCircle2 className="w-3 h-3" /> AI Verified</>
                          ) : (
                            <><AlertTriangle className="w-3 h-3" /> Unverified</>
                          )}
                        </span>

                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3"/> {new Date(mission.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-1 ml-2">
                          <Users className="w-3 h-3" /> {mission.volunteer_count || 0} / {mission.required_volunteers || 10} Responders
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
                      <h4 className="text-xl font-black text-white leading-none mb-2">{mission.summary || mission.category}</h4>
                      {mission.is_fake && (
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Warning: This request may be false
                        </p>
                      )}
                      <p className="text-slate-400 text-sm mb-4 line-clamp-2 max-w-2xl leading-relaxed">{mission.description}</p>
                      
                      {/* SKILLS REQUIRED */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 mt-4">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest w-full mb-1 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Required Skills
                        </span>
                        {Array.isArray(mission.required_skills) ? mission.required_skills.map((skill: string, idx: number) => (
                          <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg text-[9px] font-bold">
                            {skill}
                          </span>
                        )) : (mission.rescue_requirements || 'General Rescue').split(',').map((item: string, idx: number) => (
                          <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg text-[9px] font-bold">
                            {item.trim()}
                          </span>
                        ))}
                      </div>

                      {/* RESOURCES NEEDED */}
                      {mission.required_resources && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest w-full mb-1">Resources Needed</span>
                          {Array.isArray(mission.required_resources) && mission.required_resources.map((item: string, idx: number) => (
                            <span key={idx} className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-lg text-[9px] font-bold">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[160px]">
                      {mission.status === 'completed' ? (
                        <div className="w-full py-4 bg-emerald-500/10 text-emerald-400 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                          Mission Accomplished
                        </div>
                      ) : (
                        <>
                          {mission.volunteer_count < (mission.required_volunteers || 10) ? (
                            <button 
                              onClick={() => updateStatus(mission.id, 'accepted', 'volunteer')}
                              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-[0.98]"
                            >
                              Join Mission
                            </button>
                          ) : (
                            <div className="w-full py-4 bg-slate-800 text-slate-500 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border border-white/5">
                              Team full — choose another mission
                            </div>
                          )}
                          <button 
                            onClick={() => setActiveMission(mission)}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                          >
                            <MessageSquare className="w-3 h-3" /> Situation Room
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
    fetchMessages();
    const channel = supabase
      .channel(`mission-chat-${mission.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `request_id=eq.${mission.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mission.id]);

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

    const { error } = await supabase.from('messages').insert({
      request_id: mission.id,
      user_id: user.id,
      user_name: user.firstName || user.username || 'Responder',
      message: newMessage
    });

    if (error) {
      console.error('[Chat] Send Error:', error.message);
      toast.error('Failed to send message: ' + error.message);
    } else {
      setNewMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-2xl h-[80vh] bg-slate-900 border border-white/10 rounded-[2rem] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-black uppercase tracking-tighter">Mission Situation Room</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{mission.category} | Zone ID: {mission.id.slice(0,8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 rounded-lg p-1 border border-white/5 flex mr-2">
              <button 
                onClick={() => setChatTab('chat')} 
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${chatTab === 'chat' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Comms
              </button>
              <button 
                onClick={() => setChatTab('resources')} 
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${chatTab === 'resources' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Package className="w-3 h-3" /> Resources
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {chatTab === 'chat' ? (
          <>
            {/* AI TACTICAL BRIEFING */}
            <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/10 flex gap-4 items-start">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Sparkles className={`w-4 h-4 text-emerald-400 ${loadingAi ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">AI Tactical Briefing (Live)</span>
                <p className="text-xs text-emerald-100/80 italic">"{aiSummary}"</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-20">
                  <MessageSquare className="w-12 h-12 mb-2 text-white" />
                  <p className="text-xs font-bold uppercase tracking-widest text-white">No comms yet. Start briefing.</p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.user_id === user.id ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">{m.user_name}</span>
                    <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] ${
                      m.user_id === user.id ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-slate-800/30 border-t border-white/5 flex gap-2">
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type status update..."
                className="flex-1 bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
              <button type="submit" className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-lg active:scale-95">
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex flex-col gap-6">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-slate-800/40">
              <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-sm text-emerald-400">Resources Assigned to Mission</h4>
              {assignedDonations.length > 0 ? (
                <div className="grid gap-3">
                  {assignedDonations.map(don => (
                    <div key={don.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-emerald-500/20">
                      <div>
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded uppercase">{don.type}</span>
                        <p className="text-slate-300 text-xs mt-1">{don.description} (Qty: {don.quantity})</p>
                      </div>
                      <CheckCircle2 className="text-emerald-500 w-5 h-5" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs font-bold uppercase">No resources assigned yet.</p>
              )}
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-slate-800/40">
              <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-sm text-blue-400">Available Nearby Resources</h4>
              {nearbyDonations.length > 0 ? (
                <div className="grid gap-3">
                  {nearbyDonations.map(don => (
                    <div key={don.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-blue-500/20">
                      <div>
                        <span className="text-[10px] font-black bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase">{don.type}</span>
                        <p className="text-slate-300 text-xs mt-1">{don.description} (Qty: {don.quantity})</p>
                      </div>
                      <button 
                        onClick={() => assignDonation(don.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg transition-all"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-xs font-bold uppercase">No available resources found.</p>
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Requests', val: '1,240', icon: Activity, color: 'text-blue-400' },
          { label: 'Pending', val: '342', icon: Clock, color: 'text-yellow-400' },
          { label: 'Volunteers', val: '89', icon: Users, color: 'text-emerald-400' },
          { label: 'Critical', val: '15', icon: AlertTriangle, color: 'text-red-400' },
        ].map((s,i) => (
          <div key={i} className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <s.icon className={`w-6 h-6 mb-2 ${s.color}`} />
            <div className="text-2xl font-bold text-white">{s.val}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-panel p-6 rounded-2xl">
          <h3 className="text-xl font-bold text-white mb-6">Recent Coordination Tasks</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400">
                <tr>
                  <th className="p-3 rounded-tl-lg rounded-bl-lg">Category</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 rounded-tr-lg rounded-br-lg">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {[1,2,3,4].map((i) => (
                  <tr key={i} className="text-white">
                    <td className="p-3">Medical Supplies</td>
                    <td className="p-3 text-slate-400">Sector {i}</td>
                    <td className="p-3"><span className="text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded text-xs">Pending Setup</span></td>
                    <td className="p-3"><button className="text-blue-400 hover:text-blue-300">Assign Team</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl flex flex-col">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="text-red-400"/> AI Fraud Check
          </h3>
          <p className="text-slate-400 text-sm mb-4">Our AI systems have flagged potential duplicate or non-urgent requests in the last hour.</p>
          
          <div className="space-y-3 flex-1">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-white font-medium text-sm">Possible Duplicate</div>
              <div className="text-slate-400 text-xs mt-1">2 requests from same IP for Rescue within 5 mins.</div>
            </div>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="text-white font-medium text-sm">Low Priority Flagged</div>
              <div className="text-slate-400 text-xs mt-1">"Need extra blankets" marked as Critical. Reclassified to Medium.</div>
            </div>
          </div>
          
          <button className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors">View All Logs</button>
        </div>
      </div>
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid md:grid-cols-2 gap-6">
        {/* DONATION FORM */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/40">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Package className="text-blue-500" /> Offer Resources
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Resource Type</label>
              <select 
                value={type} onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-2xl px-4 py-3 outline-none"
              >
                <option value="food">Food & Water</option>
                <option value="blood">Blood</option>
                <option value="medical">Medical</option>
                <option value="supplies">General Supplies</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-2xl px-4 py-3 outline-none" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 50 packets of biscuits, 20L water" className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-2xl px-4 py-3 h-24 outline-none resize-none"></textarea>
            </div>
            <button onClick={handleDonate} disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-[0.98]">
              {isSubmitting ? 'Posting...' : 'DONATE RESOURCES'}
            </button>
          </div>
        </div>

        {/* MY DONATIONS */}
        <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/40">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <CheckCircle2 className="text-blue-500" /> My Donations
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {myDonations.length === 0 ? (
              <p className="text-slate-500 text-center py-10 font-bold text-sm">No donations yet. Be the first to help!</p>
            ) : (
              myDonations.map(don => (
                <div key={don.id} className="p-4 bg-slate-800/40 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-1 rounded">{don.type}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${don.status === 'assigned' ? 'bg-orange-500/20 text-orange-400' : don.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-green-500/20 text-green-400'}`}>
                      {don.status}
                    </span>
                  </div>
                  <p className="text-white text-sm font-medium">{don.description}</p>
                  <p className="text-slate-500 text-xs mt-1">Qty: {don.quantity}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* REQUESTS NEEDING HELP (SMART MATCH) */}
      <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/40 mt-8">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Sparkles className="text-yellow-500" /> Requests Needing Your Resources
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {nearbyRequests.slice(0, 6).map(req => (
            <div key={req.id} className="p-5 bg-slate-800/40 rounded-2xl border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 opacity-20"></div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-white">{req.category}</span>
                <span className="text-[10px] text-red-400 font-bold uppercase">{req.priority}</span>
              </div>
              <p className="text-slate-400 text-xs line-clamp-2 mb-3">{req.summary || req.description}</p>
              
              {/* SMART MATCH AI RESOURCES */}
              {req.required_resources && req.required_resources.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="w-full text-[9px] font-black text-yellow-500 uppercase tracking-widest">Needs:</span>
                  {req.required_resources.slice(0,3).map((r: string, idx: number) => (
                    <span key={idx} className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[9px] font-bold">
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
