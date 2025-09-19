'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Settings, LogOut, ChevronDown, User } from 'lucide-react';

interface UserProfileDropdownProps {
  userName: string;
  userEmail?: string;
  userType: 'patient' | 'doctor';
  className?: string;
}

export function UserProfileDropdown({
  userName,
  userEmail,
  userType,
  className = ""
}: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    setIsOpen(false);
  };

  const handleSettings = () => {
    if (userType === 'patient') {
      router.push('/dashboard/patient/settings');
    } else {
      router.push('/dashboard/doctor/settings');
    }
    setIsOpen(false);
  };

  const userInitials = userName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const gradientStyle = userType === 'doctor'
    ? 'bg-gradient-to-br from-blue-500 to-green-500'
    : 'bg-gradient-to-br from-green-500 to-blue-500';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 medical-btn medical-btn-ghost text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 min-w-fit"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${gradientStyle}`}>
          <span className="text-sm text-white font-bold">
            {userInitials}
          </span>
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-semibold">{userName}</span>
          <span className="text-xs text-slate-500 capitalize">{userType}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-50 animate-fade-in">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${gradientStyle}`}>
                <span className="text-sm text-white font-bold">
                  {userInitials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                {userEmail && (
                  <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                )}
                <p className="text-xs text-slate-400 capitalize">{userType}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleSettings}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
            >
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <Settings className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <span className="text-sm font-medium">Impostazioni profilo</span>
                <p className="text-xs text-slate-500">Gestisci il tuo account</p>
              </div>
            </button>

            <button
              onClick={() => router.push('/calendar')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
            >
              <div className="p-1.5 bg-slate-100 rounded-lg">
                <User className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <span className="text-sm font-medium">Calendario</span>
                <p className="text-xs text-slate-500">Visualizza appuntamenti</p>
              </div>
            </button>
          </div>

          {/* Separator */}
          <div className="border-t border-slate-100 my-1"></div>

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
            >
              <div className="p-1.5 bg-red-100 rounded-lg">
                <LogOut className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <span className="text-sm font-medium">Esci</span>
                <p className="text-xs text-red-500">Termina la sessione</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
