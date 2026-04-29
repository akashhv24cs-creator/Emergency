'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { LayoutDashboard, Map, UserCircle, LogOut, ShieldAlert, Activity, Menu, X, Building } from 'lucide-react';
import { toast } from 'react-toastify';
import ThemeToggle from '../../components/ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<string>('victim');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    // Relying on Clerk for auth, so we just check the profile in Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Middleware should handle this, but we'll be safe

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (profile?.role) {
        setRole(profile.role);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    router.push('/');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Live Map', href: '/map', icon: Map },
    { name: 'Profile', href: '/profile', icon: UserCircle },
  ];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-text">Loading...</div>;

  return (
    <div className="min-h-screen bg-background flex font-sans transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-surface border-r border-slate-800 dark:border-slate-800 transition-colors duration-300">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-text">Sahay<span className="text-blue-500">Sathi</span></span>
          </Link>
          <div className="mt-6 flex items-center gap-2 px-3 py-1.5 bg-surface-hover rounded-lg border border-slate-700">
            {role === 'ngo' ? (
              <>
                <Building className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-slate-300 capitalize">NGO Portal</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-300 capitalize">Responder Account</span>
              </>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface border-b border-slate-800 dark:border-slate-800 z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-500" />
          <span className="text-lg font-bold text-text">SahaySathi</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-text">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-surface z-40 flex flex-col">
          <nav className="p-4 space-y-2 flex-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-xl font-medium ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-800">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-4 w-full text-red-400 font-medium"
            >
              <LogOut className="w-6 h-6" />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto pt-16 md:pt-0 pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950 border-t border-slate-800 z-40 flex justify-around items-center px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center p-2 min-w-[64px] ${
                isActive ? 'text-blue-500' : 'text-slate-500'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
