"use client";

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import InlineSectionLoader from './InlineSectionLoader';
import { useSectionTransition } from '@/hooks/useSectionTransition';

interface DashboardLayoutProps {
  children: ReactNode;
  userType: "doctor" | "patient";
  userName: string;
  userEmail: string;
  className?: string;
}

export default function DashboardLayout({
  children,
  userType,
  userName,
  userEmail,
  className = ""
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const { isLoading, currentSection, startSectionTransition } = useSectionTransition();
  const [previousPath, setPreviousPath] = useState(pathname);

  // Mappa delle sezioni per nome user-friendly
  const sectionNames: Record<string, string> = {
    '/dashboard/doctor': 'Panoramica',
    '/dashboard/doctor/appointments': 'Appuntamenti',
    '/dashboard/doctor/patients': 'Pazienti',
    '/dashboard/doctor/prescriptions': 'Prescrizioni',
    '/dashboard/doctor/requests': 'Richieste',
    '/dashboard/doctor/offices': 'Ambulatori',
    '/dashboard/patient': 'Panoramica',
    '/dashboard/patient/appointments': 'Appuntamenti',
    '/dashboard/patient/prescriptions': 'Prescrizioni',
    '/dashboard/patient/select-doctor': 'Selezione Medico',
  };

  // Effetto per gestire i cambi di rotta
  useEffect(() => {
    if (pathname !== previousPath) {
      const sectionName = sectionNames[pathname] || 'Sezione';
      
      // Simula il caricamento della sezione con tempo variabile
      startSectionTransition(sectionName, async () => {
        // Simula diverse velocità di caricamento per diverse sezioni
        const loadingTime = pathname.includes('appointments') ? 1200 : 
                           pathname.includes('patients') ? 900 : 
                           pathname.includes('prescriptions') ? 800 : 600;
        await new Promise(resolve => setTimeout(resolve, loadingTime));
      });
      
      setPreviousPath(pathname);
    }
  }, [pathname, previousPath, startSectionTransition, sectionNames]);

  const bgGradient = userType === "doctor"
    ? "from-blue-50/30 via-white to-green-50/30"
    : "from-green-50/30 via-white to-blue-50/30";

  return (
    <div className={`main-layout bg-gradient-to-br ${bgGradient} min-h-screen ${className}`}>
      <Sidebar
        userType={userType}
        userName={userName}
        userEmail={userEmail}
      />

      <div className="main-content">
        {/* Contenuto con transizione */}
        <div className="relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-50 loading-overlay">
              <InlineSectionLoader 
                sectionName={currentSection}
                userType={userType}
              />
            </div>
          )}

          {/* Contenuto principale con animazione */}
          <div 
            className={`transition-all duration-500 ease-out ${
              isLoading ? 'content-blur' : 'opacity-100 scale-100'
            } ${isLoading ? 'section-exit' : 'section-enter'}`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
