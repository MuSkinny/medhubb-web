'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Settings, LogOut, ChevronDown } from 'lucide-react';

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
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSettings = () => {
    if (userType === 'patient') {
      router.push('/dashboard/patient/settings');
    } else {
      router.push('/dashboard/doctor/settings');
    }
  };

  const userInitials = userName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${className}`}
        >
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-semibold">
              {userInitials}
            </span>
          </div>
          <span className="hidden sm:inline">{userName}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            {userEmail && (
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Impostazioni profilo</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Esci</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
