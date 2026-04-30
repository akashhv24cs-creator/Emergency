'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../dashboard/layout';
import { supabase } from '../../lib/supabase';
import { UserCircle, Save, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

import { useUser } from '@clerk/nextjs';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    blood_group: '',
    skills: '',
    availability: 'Available',
    address: '',
    emergency_contact: ''
  });

  useEffect(() => {
    if (isLoaded && user) {
      fetchProfile();
    }
  }, [isLoaded, user]);

  const fetchProfile = async () => {
    try {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (data) {
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            blood_group: data.blood_group || '',
            skills: data.skills || '',
            availability: data.availability || 'Available',
            address: data.address || '',
            emergency_contact: data.emergency_contact || ''
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !user) {
      toast.error('Session loading... please wait');
      return;
    }
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          ...profile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-black dark:text-white transition-colors duration-300">Loading profile...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto transition-colors duration-300">
        <header className="mb-8 flex items-center gap-4 transition-colors duration-300">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-black dark:text-white transition-colors duration-300">
            <UserCircle className="w-10 h-10 transition-colors duration-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white transition-colors duration-300">My Profile</h1>
            <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Manage your personal information and preferences.</p>
          </div>
        </header>

        <form onSubmit={handleSave} className="glass-panel p-6 md:p-8 rounded-2xl transition-colors duration-300">
          <div className="grid md:grid-cols-2 gap-6 transition-colors duration-300">
            <div className="space-y-2 transition-colors duration-300">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-300">Full Name</label>
              <input 
                type="text" 
                value={profile.full_name}
                onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                className="w-full bg-gray-100 dark:bg-slate-800 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2 transition-colors duration-300">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-300">Phone Number</label>
              <input 
                type="tel" 
                value={profile.phone}
                onChange={(e) => setProfile({...profile, phone: e.target.value})}
                className="w-full bg-gray-100 dark:bg-slate-800 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2 transition-colors duration-300">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-300">Blood Group</label>
              <select 
                value={profile.blood_group}
                onChange={(e) => setProfile({...profile, blood_group: e.target.value})}
                className="w-full bg-gray-100 dark:bg-slate-800 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
              >
                <option value="">Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 transition-colors duration-300">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-300">Availability Status</label>
              <select 
                value={profile.availability}
                onChange={(e) => setProfile({...profile, availability: e.target.value})}
                className="w-full bg-gray-100 dark:bg-slate-800 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
              >
                <option value="Available">🟢 Available to Help</option>
                <option value="Busy">🟡 Busy</option>
                <option value="Offline">🔴 Offline</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2 transition-colors duration-300">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-300">Special Skills (comma separated)</label>
              <input 
                type="text" 
                value={profile.skills}
                onChange={(e) => setProfile({...profile, skills: e.target.value})}
                className="w-full bg-gray-100 dark:bg-slate-800 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
                placeholder="First Aid, CPR, Boat Driving, Medical..."
              />
            </div>

            <div className="space-y-2 md:col-span-2 transition-colors duration-300">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-300">Address / Common Location</label>
              <textarea 
                value={profile.address}
                onChange={(e) => setProfile({...profile, address: e.target.value})}
                className="w-full bg-gray-100 dark:bg-slate-800 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-colors duration-300"
                placeholder="123 Main St..."
              ></textarea>
            </div>

            <div className="space-y-2 md:col-span-2 transition-colors duration-300">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 transition-colors duration-300">Emergency Contact</label>
              <input 
                type="text" 
                value={profile.emergency_contact}
                onChange={(e) => setProfile({...profile, emergency_contact: e.target.value})}
                className="w-full bg-gray-100 dark:bg-slate-800 border border-slate-700 text-black dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-colors duration-300"
                placeholder="Name - Phone"
              />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end transition-colors duration-300">
            <button 
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-black dark:text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-70 disabled:cursor-not-allowed transition-colors duration-300"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin transition-colors duration-300" /> : <Save className="w-5 h-5 transition-colors duration-300" />}
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
