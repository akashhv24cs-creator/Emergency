'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { Activity, Clock, ShieldAlert, Users, CheckCircle, Info, Package, Crosshair, LocateFixed, Layers } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { toast } from 'react-toastify';

// Fix Leaflet default icon issues in Next.js and add animations
const customIcon = (color: string, priority: string) => {
  const isCritical = priority?.toLowerCase() === 'critical';
  return new L.DivIcon({
    className: 'bg-transparent border-none',
    html: `<div class="relative flex justify-center items-end" style="width: 25px; height: 41px;">
             ${isCritical ? '<div class="absolute bottom-0 w-4 h-2 bg-red-500 rounded-full blur-[4px] animate-ping opacity-70"></div>' : ''}
             <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png" 
                  style="width: 25px; height: 41px; position: relative; z-index: 10;" 
                  class="transition-all duration-300 ${isCritical ? 'animate-bounce' : 'hover:scale-110 hover:-translate-y-1 drop-shadow-md'}" />
           </div>`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });
};

// Component to handle map re-centering
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Component to handle map clicks for reporting
function MapClickHandler({ onClick }: { onClick: (e: any) => void }) {
  useMapEvents({
    click: onClick,
  });
  return null;
}

const getMarkerColor = (status: string, priority: string) => {
  if (status === 'completed') return 'green';
  switch (priority?.toLowerCase()) {
    case 'critical': return 'red';
    case 'high': return 'orange';
    case 'medium': return 'yellow';
    default: return 'blue';
  }
};

export default function MapComponent() {
  const { user } = useUser();
  const [requests, setRequests] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);
  const [zoom, setZoom] = useState(5);
  const [mapTheme, setMapTheme] = useState<'dark' | 'street' | 'terrain' | 'satellite'>('dark');
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const themes = {
    dark: {
      name: 'Tactical Dark',
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      className: "map-tiles grayscale-[20%] contrast-[120%] hue-rotate-15"
    },
    street: {
      name: 'Standard Street',
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      className: "map-tiles"
    },
    terrain: {
      name: 'Terrain Topo',
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map data: &copy; OSM contributors, SRTM | Map style: &copy; OpenTopoMap',
      className: "map-tiles contrast-[110%]"
    },
    satellite: {
      name: 'Satellite View',
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; Esri',
      className: "map-tiles contrast-[110%]"
    }
  };
  
  // Reporting State
  const [reportLocation, setReportLocation] = useState<[number, number] | null>(null);
  const [reportCategory, setReportCategory] = useState('Rescue');
  const [reportDescription, setReportDescription] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const [isOffline, setIsOffline] = useState(false);

  // Auto-center map on user's location on load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
          setZoom(13);
        },
        (error) => {
          console.warn('Geolocation failed on load, using fallback center:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => { setIsOffline(false); fetchRequests(); };
      const handleOffline = () => { setIsOffline(true); fetchRequests(); };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    fetchDonations();
    const channel = supabase
      .channel('public:requests_map_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, () => fetchDonations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDonations = async () => {
    try {
      const { data } = await supabase.from('donations').select('*').eq('status', 'available');
      if (data) setDonations(data);
    } catch (err) {}
  };

  const fetchRequests = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const cached = localStorage.getItem('cached_map_markers');
      if (cached) {
        setRequests(JSON.parse(cached));
      }
      return;
    }

    try {
      const { data, error } = await supabase.from('requests').select('*').neq('status', 'solved').order('created_at', { ascending: false });
      if (!error && data) {
        setRequests(data);
        localStorage.setItem('cached_map_markers', JSON.stringify(data));
        if (zoom === 5 && data.length > 0) {
          setMapCenter([data[0].latitude, data[0].longitude]);
          setZoom(12);
        }
      }
    } catch (err) {
      const cached = localStorage.getItem('cached_map_markers');
      if (cached) setRequests(JSON.parse(cached));
    }
  };

  const handleMapClick = (e: any) => {
    setReportLocation([e.latlng.lat, e.latlng.lng]);
  };

  const submitReport = async () => {
    if (!reportLocation || !reportDescription) return;
    const lat = Number(reportLocation[0]);
    const lng = Number(reportLocation[1]);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Invalid location coordinates detected.");
      return;
    }

    setIsReporting(true);
    try {
      // 1. Get AI Triage
      const aiRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: reportDescription })
      });
      const aiData = await aiRes.json();

      // 2. Submit to DB
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: reportCategory,
          description: reportDescription,
          latitude: lat,
          longitude: lng,
          user_id: user?.id,
          ...aiData
        })
      });

      if (res.ok) {
        toast.success("Reported at selected location!");
        setMapCenter([lat, lng]);
        setZoom(14);
        setReportLocation(null);
        setReportDescription('');
        fetchRequests();
      }
    } catch (err) {
      toast.error("Failed to report");
    } finally {
      setIsReporting(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude);
        const lng = Number(position.coords.longitude);
        setReportLocation([lat, lng]);
        setMapCenter([lat, lng]);
        setZoom(14);
        toast.success("Location detected");
      },
      (error) => {
        console.error(error);
        toast.error('Could not get your location.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleAction = async (id: string, action: 'volunteer' | 'complete') => {
    const response = await fetch('/api/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action })
    });
    if ((await response.json()).success) {
      toast.success(action === 'volunteer' ? 'En Route!' : 'Completed');
      fetchRequests();
    }
  };

  return (
    <div className="h-full w-full relative z-0 bg-slate-950 overflow-hidden group">
      {/* Radar scanning animation effect overlay */}
      <div className="pointer-events-none absolute inset-0 z-[400] opacity-10 mix-blend-screen pointer-events-none" 
           style={{
             background: 'radial-gradient(circle at center, transparent 30%, #0f172a 100%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16, 185, 129, 0.1) 3px, rgba(16, 185, 129, 0.1) 3px)',
           }}>
        <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 border-t border-emerald-500/30 rounded-full animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(16, 185, 129, 0.1) 360deg)' }}></div>
      </div>
      
      {/* Map center crosshair */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] flex items-center justify-center opacity-30">
        <Crosshair className="w-8 h-8 text-emerald-500 animate-pulse" strokeWidth={1} />
        <div className="absolute w-24 h-24 border border-emerald-500/20 rounded-full"></div>
        <div className="absolute w-48 h-48 border border-emerald-500/10 rounded-full"></div>
      </div>

      {isOffline && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-500/90 text-amber-950 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg backdrop-blur-sm border border-amber-400">
          ⚠️ Map data may be outdated
        </div>
      )}
      <MapContainer center={mapCenter} zoom={zoom} className="h-full w-full [&_.leaflet-control-attribution]:!bg-transparent [&_.leaflet-control-attribution]:!text-slate-500 [&_.leaflet-control-attribution_a]:!text-emerald-500" zoomControl={false}>
        <ChangeView center={mapCenter} zoom={zoom} />
        <MapClickHandler onClick={handleMapClick} />
        <ZoomControl position="bottomleft" />
        <TileLayer 
          url={themes[mapTheme].url} 
          attribution={themes[mapTheme].attribution}
          className={themes[mapTheme].className}
        />
        
        {requests.map((req) => (
          <Marker key={req.id} position={[Number(req.latitude), Number(req.longitude)]} icon={customIcon(getMarkerColor(req.status, req.priority), req.priority)}>
            <Popup className="custom-popup">
              <div className="p-4 font-sans w-80 bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-black text-lg leading-tight uppercase tracking-tighter text-blue-400">{req.category}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        req.priority === 'Critical' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>{req.priority || 'Medium'}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        req.risk_level === 'High' ? 'bg-orange-500/20 text-orange-500 border border-orange-500/30' : 'bg-emerald-500/10 text-emerald-500'
                      }`}>{req.risk_level || 'Low'} Risk</span>
                      {/* AI VALIDATION BADGES */}
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                        req.is_fake ? 'bg-red-500/20 text-red-500 border-red-500/50' : 
                        req.is_verified ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 
                        'bg-yellow-500/20 text-yellow-500 border-yellow-500/20'
                      }`}>
                        {req.is_fake ? 'Fake' : (req.is_verified ? 'Verified' : 'Unverified')}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded-lg shrink-0">
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                {req.image_url && (
                  <div className="mb-3 w-full h-32 rounded-xl overflow-hidden border border-white/10">
                    <img src={req.image_url} alt="Incident" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <p className="text-sm font-bold text-white mb-1">{req.summary || req.category}</p>
                {req.is_fake && (
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">Warning: May be false</p>
                )}
                <p className="text-xs text-slate-400 mb-4 leading-relaxed line-clamp-2 italic">"{req.description}"</p>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-800/50 p-2 rounded-xl border border-white/5">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Users className="w-2 h-2" /> Responders
                    </div>
                    <div className="text-xs font-bold text-white">
                      {req.volunteer_count || 0} / {req.required_volunteers || 4}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded-xl border border-white/5">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <ShieldAlert className="w-2 h-2" /> People
                    </div>
                    <div className="text-xs font-bold text-white">
                      ~{req.estimated_people || 1} Affected
                    </div>
                  </div>
                </div>

                {/* RESOURCES */}
                {req.required_resources && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {req.required_resources.slice(0, 3).map((r: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[9px] font-bold border border-blue-500/20">
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {req.status !== 'completed' && (
                    <>
                      {req.volunteer_count < (req.required_volunteers || 4) ? (
                        <button onClick={() => handleAction(req.id, 'volunteer')} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-3 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2">
                          <Activity className="w-3 h-3" /> Join Mission
                        </button>
                      ) : (
                        <div className="w-full bg-slate-800 text-emerald-500 text-[10px] font-black py-3 rounded-xl text-center uppercase tracking-widest border border-emerald-500/20">
                          ✔ Fully Covered
                        </div>
                      )}
                    </>
                  )}
                  {user?.id === req.user_id && req.status !== 'completed' && (
                    <button onClick={() => handleAction(req.id, 'complete')} className="w-full bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] font-black py-3 rounded-xl transition-all border border-emerald-500/30 uppercase tracking-widest flex items-center justify-center gap-2">
                      <CheckCircle className="w-3 h-3" /> Mark Solved
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {donations.map((don) => {
          let donColor = 'violet';
          if (don.type === 'food') donColor = 'green';
          if (don.type === 'blood') donColor = 'red';
          if (don.type === 'medical') donColor = 'blue';

          return (
            <Marker key={`don-${don.id}`} position={[Number(don.latitude), Number(don.longitude)]} icon={customIcon(donColor, 'normal')}>
              <Popup className="custom-popup">
                <div className="p-4 font-sans w-64 bg-slate-900 text-white rounded-2xl border border-white/10 shadow-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-sm uppercase tracking-widest text-emerald-400">Available Resource</h3>
                    <span className="text-[9px] font-black uppercase bg-slate-800 text-slate-300 px-2 py-1 rounded">Qty: {don.quantity}</span>
                  </div>
                  <div className="mb-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-${donColor}-500/20 text-${donColor}-400`}>
                      {don.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mb-4">{don.description}</p>
                  
                  <button 
                    onClick={async () => {
                      toast.info("Navigate to dashboard to assign to a specific request.");
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black py-2 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    Assign to Request
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* CLICK TO REPORT POPUP */}
        {reportLocation && (
          <Popup position={reportLocation} onClose={() => setReportLocation(null)}>
            <div className="p-4 w-72 bg-slate-900 text-white rounded-xl border border-white/10 shadow-2xl">
              <h3 className="font-black text-sm uppercase tracking-widest text-emerald-400 mb-2">Report From This Spot</h3>
              <p className="text-[9px] font-mono text-slate-500 mb-4 bg-slate-950 p-2 rounded-lg border border-white/5">
                Lat: {Number(reportLocation[0]).toFixed(6)}, Lng: {Number(reportLocation[1]).toFixed(6)}
              </p>
              
              <button 
                onClick={useMyLocation}
                className="w-full mb-3 bg-slate-800 hover:bg-slate-700 text-blue-400 text-[10px] font-black py-2 rounded-lg transition-all uppercase tracking-widest flex items-center justify-center gap-2 border border-blue-500/20"
              >
                📍 Use My Location
              </button>

              <select 
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white mb-3 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option>Rescue</option>
                <option>Food</option>
                <option>Medical</option>
                <option>Shelter</option>
              </select>
              <textarea 
                placeholder="What is happening? (e.g. food for 10 people)"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="w-full h-24 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-white mb-4 outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
              <button 
                onClick={submitReport}
                disabled={isReporting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-black py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                {isReporting ? 'Analyzing...' : 'Dispatch SOS'}
              </button>
            </div>
          </Popup>
        )}
      </MapContainer>
      
      {/* Floating Theme Switcher */}
      <div className="absolute top-20 right-6 z-[1000]">
        <button 
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="bg-slate-900/80 hover:bg-emerald-600 border border-white/10 hover:border-emerald-500 p-3 rounded-full shadow-2xl backdrop-blur-md text-emerald-400 hover:text-white transition-all group active:scale-95"
          title="Change Map Theme"
        >
          <Layers className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        
        {showThemeMenu && (
          <div className="absolute top-14 right-0 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-48 animate-in slide-in-from-top-2 fade-in duration-200">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => { setMapTheme(key as any); setShowThemeMenu(false); }}
                className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${mapTheme === key ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                {theme.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Recenter Button */}
      <button 
        onClick={useMyLocation}
        className="absolute top-6 right-6 z-[1000] bg-slate-900/80 hover:bg-emerald-600 border border-white/10 hover:border-emerald-500 p-3 rounded-full shadow-2xl backdrop-blur-md text-emerald-400 hover:text-white transition-all group active:scale-95"
        title="Find My Location"
      >
        <LocateFixed className="w-5 h-5 group-hover:animate-pulse" />
      </button>

      {/* Legend */}
      <div className="absolute bottom-6 right-6 z-[1000] glass-panel p-4 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-700/50 bg-slate-900/80 backdrop-blur-xl hidden md:block">
        <h4 className="text-white font-black mb-4 flex items-center gap-2 uppercase tracking-widest text-xs"><Activity className="w-4 h-4 text-emerald-400"/> Map Intelligence</h4>
        <div className="space-y-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div> Critical Rescue</div>
          <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-blue-500"></div> General Need</div>
          <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-300"></div> Donor Supply</div>
          <div className="flex items-center gap-2 text-emerald-400 mt-4 pt-3 border-t border-white/10">
            <Crosshair className="w-4 h-4" /> Click map to report!
          </div>
        </div>
      </div>
    </div>
  );
}
