'use client';

import dynamic from 'next/dynamic';
import DashboardLayout from '../dashboard/layout';
import { Loader2 } from 'lucide-react';

// Dynamically import MapComponent with ssr: false to prevent Next.js from trying to render Leaflet on the server
const MapComponent = dynamic(() => import('../../components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-white dark:bg-[#0D1117] transition-colors duration-300">
      <div className="flex flex-col items-center text-gray-600 dark:text-gray-300 transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500 transition-colors duration-300" />
        <p>Loading Live Map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return (
    <DashboardLayout>
      <div className="h-full w-full flex flex-col transition-colors duration-300">
        <div className="md:hidden p-4 bg-white dark:bg-[#0D1117] border-b border-slate-800 shrink-0 transition-colors duration-300">
          <h1 className="text-xl font-bold text-black dark:text-white transition-colors duration-300">Live Emergency Map</h1>
        </div>
        <div className="flex-1 relative transition-colors duration-300">
          <MapComponent />
        </div>
      </div>
    </DashboardLayout>
  );
}
