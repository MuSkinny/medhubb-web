"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  userType: "doctor" | "patient";
  userName: string;
  userEmail: string;
}

export default function Sidebar({ userType, userName, userEmail }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const doctorNavItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v10a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      ),
      label: "Panoramica",
      href: "/dashboard/doctor",
      active: pathname === "/dashboard/doctor"
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4h3a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
        </svg>
      ),
      label: "Appuntamenti",
      href: "/dashboard/doctor/appointments",
      active: pathname.includes("/appointments")
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: "Richieste ricette",
      href: "/dashboard/doctor/prescriptions",
      active: pathname.includes("/prescriptions")
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: "Pazienti",
      href: "/dashboard/doctor/patients",
      active: pathname.includes("/patients")
    }
  ];

  const patientNavItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v10a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
        </svg>
      ),
      label: "Panoramica",
      href: "/dashboard/patient",
      active: pathname === "/dashboard/patient"
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4h3a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
        </svg>
      ),
      label: "Appuntamenti",
      href: "/dashboard/patient/appointments",
      active: pathname.includes("/appointments")
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: "Richieste per ricette",
      href: "/dashboard/patient/prescriptions",
      active: pathname.includes("/prescriptions")
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      label: "Profilo",
      href: "/dashboard/patient/profile",
      active: pathname.includes("/profile")
    }
  ];

  const navItems = userType === "doctor" ? doctorNavItems : patientNavItems;
  const gradientStyle = userType === "doctor"
    ? "var(--gradient-primary)"
    : "var(--gradient-secondary)";
  const glassStyle = "backdrop-blur-md bg-slate-900/95 border-r border-slate-800/50 shadow-2xl";

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          h-screen flex flex-col transition-all duration-300 z-50 ${glassStyle}
          lg:relative lg:translate-x-0
          ${isCollapsed ? 'fixed -translate-x-full lg:w-20' : 'fixed translate-x-0 lg:w-64'}
        `}
        style={{
          width: isCollapsed ? "80px" : "256px"
        }}
      >
      {/* Logo Section */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div
            className="flex items-center justify-center rounded-2xl shadow-lg"
            style={{
              width: "40px",
              height: "40px",
              background: gradientStyle
            }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-white font-bold text-xl">MedHubb</h1>
              <p className="text-xs text-slate-400 font-medium">
                {userType === "doctor" ? "Dashboard Medico" : "Area Paziente"}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                item.active
                  ? "bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className={`${item.active ? 'text-white' : 'text-slate-400 group-hover:text-white'} transition-colors`}>
                {item.icon}
              </div>
              {!isCollapsed && (
                <span className="ml-3 font-semibold text-sm">{item.label}</span>
              )}
              {!isCollapsed && item.active && (
                <div className="ml-auto">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div
            className="flex items-center justify-center rounded-full text-white font-bold shadow-lg"
            style={{
              width: "40px",
              height: "40px",
              background: gradientStyle
            }}
          >
            {userName ? userName.charAt(0).toUpperCase() : '?'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{userName || 'Utente'}</p>
              <p className="text-slate-400 text-xs truncate">{userEmail || ''}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button className="w-full mt-4 px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all duration-200 font-medium">
            <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Esci
          </button>
        )}
      </div>
    </div>
    </>
  );
}