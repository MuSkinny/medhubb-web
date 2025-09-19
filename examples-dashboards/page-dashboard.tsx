'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, userType, loading, session, isInPasswordSetup } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Se non c'è sessione, vai al login
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      // Se l'utente è in fase di setup password, reindirizza
      if (isInPasswordSetup) {
        router.push('/auth/set-password');
        return;
      }
      
      // Se non c'è user profile ma c'è sessione, aspetta il caricamento
      if (!user) {
        return;
      }

      // Reindirizza in base al tipo utente
      if (userType) {
        if (userType === 'paziente') {
          router.push('/dashboard/patient');
        } else if (userType === 'medico') {
          router.push('/dashboard/doctor');
        } else if (userType === 'admin') {
          router.push('/admin');
        } else if (userType === 'medico_pending') {
          router.push('/dashboard/medico-pending');
        }
      }
    }
  }, [user, userType, loading, session, isInPasswordSetup, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  return null;
}