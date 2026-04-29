'use client';

import Link from 'next/link';
import { useUser, UserButton } from '@clerk/nextjs';
import { Shield, Users, Clock, MapPin, Activity, Heart, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans transition-colors duration-300">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Sahay<span className="text-blue-500">Sathi</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link href="#features" className="hover:text-blue-500 dark:hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-blue-500 dark:hover:text-white transition-colors">How it works</Link>
            {isLoaded && isSignedIn && (
              <Link href="/dashboard" className="hover:text-blue-500 dark:hover:text-white transition-colors">Dashboard</Link>
            )}
            {isLoaded && !isSignedIn && (
              <Link href="/sign-in" className="hover:text-blue-500 dark:hover:text-white transition-colors">Login</Link>
            )}
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isLoaded && isSignedIn ? (
              <div className="flex items-center gap-4">
                <UserButton />
              </div>
            ) : (
              <Link href="/sign-up" className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                Get Started
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mb-8 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              Live Emergency Coordination
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Right Help. <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Right Place.</span> <br className="md:hidden" />
              Right Time.
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              Hyperlocal Disaster Volunteer Coordination Platform. Connecting victims with nearby volunteers and essential resources in real-time.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link 
                href={isSignedIn ? "/dashboard?view=report" : `/sign-in?redirect_url=${encodeURIComponent('/dashboard?view=report')}`} 
                className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2"
              >
                <Shield className="w-5 h-5" />
                Request Help
              </Link>
              <Link 
                href={isSignedIn ? "/dashboard?view=missions" : `/sign-up?redirect_url=${encodeURIComponent('/dashboard?view=missions')}`} 
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                Volunteer Now
              </Link>
            </div>
            <div className="mt-8">
              <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4">
                NGO Portal
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-y border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: 'Active Volunteers', value: '2,400+' },
                { label: 'People Rescued', value: '15,000+' },
                { label: 'Avg Response Time', value: '< 8 mins' },
                { label: 'Shelters Active', value: '142' },
              ].map((stat, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm font-medium text-slate-400 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Powered by AI & Real-time Tech</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">Our platform uses advanced technologies to ensure resources are routed efficiently during crises.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: <Clock className="w-6 h-6 text-emerald-400" />, title: 'Real-time Coordination', desc: 'Live map updates and instant WebSocket notifications keep everyone synced.' },
                { icon: <Activity className="w-6 h-6 text-blue-400" />, title: 'AI Urgency Analysis', desc: 'Groq AI automatically categorizes and prioritizes requests based on severity.' },
                { icon: <MapPin className="w-6 h-6 text-red-400" />, title: 'Hyperlocal Matching', desc: 'Connects victims with the closest available volunteers automatically.' },
                { icon: <Shield className="w-6 h-6 text-purple-400" />, title: 'Verified NGOs', desc: 'Trusted administrative layer for resource allocation and broad coordination.' },
                { icon: <Heart className="w-6 h-6 text-pink-400" />, title: 'Resource Tracking', desc: 'Live inventory of food, medical supplies, and shelter availability.' },
                { icon: <Users className="w-6 h-6 text-yellow-400" />, title: 'Offline Mode Support', desc: 'Save requests locally when network drops and auto-sync when back online.' },
              ].map((f, i) => (
                <div key={i} className="glass-panel p-8 rounded-2xl hover:bg-slate-800/80 transition-colors group">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-6 border border-slate-700 group-hover:scale-110 transition-transform">
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{f.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-900/20"></div>
          <div className="max-w-4xl mx-auto px-4 relative z-10 text-center glass-panel p-12 rounded-3xl">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to make a difference?</h2>
            <p className="text-xl text-slate-300 mb-10">Join thousands of volunteers already helping their communities.</p>
            <Link 
              href={isSignedIn ? "/dashboard" : "/sign-up"} 
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-bold text-lg hover:bg-slate-100 transition-colors"
            >
              {isSignedIn ? 'Go to Dashboard' : 'Join the Platform'} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          <p>© {new Date().getFullYear()} SahaySathi. Built for emergency response.</p>
        </div>
      </footer>
    </div>
  );
}
