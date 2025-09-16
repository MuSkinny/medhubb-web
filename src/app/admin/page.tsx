"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  order_number: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface DoctorStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function AdminPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [stats, setStats] = useState<DoctorStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const router = useRouter();

  useEffect(() => {
    // Verifica sessione admin
    const sessionData = localStorage.getItem("admin_session");
    if (!sessionData) {
      router.push("/admin/login");
      return;
    }

    try {
      const session = JSON.parse(sessionData);

      // Verifica scadenza
      if (Date.now() > session.expires) {
        localStorage.removeItem("admin_session");
        router.push("/admin/login");
        return;
      }

      setAuthenticated(true);

      // Carica tutti i dottori
      fetchAllDoctors(session.token);
    } catch (error) {
      localStorage.removeItem("admin_session");
      router.push("/admin/login");
    }
  }, [router]);

  const fetchAllDoctors = async (token: string) => {
    try {
      const response = await fetch("/api/admin/doctors/all", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        // Token non valido, reindirizza al login
        localStorage.removeItem("admin_session");
        router.push("/admin/login");
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setDoctors(data.data || []);
        setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0 });
        applyFilter("all", data.data || []);
      } else {
        console.error("Errore API:", data.error);
      }
    } catch (error) {
      console.error("Errore nel caricamento:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = (filter: string, doctorsList = doctors) => {
    setActiveFilter(filter);
    let filtered = doctorsList;

    if (filter !== "all") {
      filtered = doctorsList.filter(doctor => doctor.status === filter);
    }

    setFilteredDoctors(filtered);
  };

  useEffect(() => {
    applyFilter(activeFilter);
  }, [doctors]);

  const handleApprove = async (id: string) => {
    const sessionData = localStorage.getItem("admin_session");
    if (!sessionData) {
      router.push("/admin/login");
      return;
    }

    const session = JSON.parse(sessionData);
    const token = session.token;

    try {
      const response = await fetch(`/api/admin/doctors/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (response.ok) {
        // Ricarica tutti i dottori per avere i dati aggiornati
        const sessionData = localStorage.getItem("admin_session");
        if (sessionData) {
          const session = JSON.parse(sessionData);
          fetchAllDoctors(session.token);
        }
        alert("Medico approvato con successo!");
      } else if (response.status === 401) {
        localStorage.removeItem("admin_session");
        router.push("/admin/login");
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore approvazione:", error);
      alert("Errore durante l'approvazione");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Sei sicuro di voler rifiutare questo medico?")) {
      return;
    }

    const sessionData = localStorage.getItem("admin_session");
    if (!sessionData) {
      router.push("/admin/login");
      return;
    }

    const session = JSON.parse(sessionData);
    const token = session.token;

    try {
      const response = await fetch(`/api/admin/doctors/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (response.ok) {
        // Ricarica tutti i dottori per avere i dati aggiornati
        const sessionData = localStorage.getItem("admin_session");
        if (sessionData) {
          const session = JSON.parse(sessionData);
          fetchAllDoctors(session.token);
        }
        alert("Medico rifiutato con successo!");
      } else if (response.status === 401) {
        console.log("Reject - 401 response, redirecting to login");
        localStorage.removeItem("admin_session");
        router.push("/admin/login");
      } else {
        alert(`Errore: ${data.error}`);
      }
    } catch (error) {
      console.error("Errore rifiuto:", error);
      alert("Errore durante il rifiuto");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    router.push("/admin/login");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">MedHubb Admin</h1>
              <p className="text-gray-300 text-sm">Pannello di amministrazione</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
            >
              ← Home
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500/20 text-red-200 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Gestione Medici</h2>
          <p className="text-gray-600">Gestisci tutte le richieste di registrazione dei medici</p>
        </div>

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Totale</h3>
              <p className="text-gray-600 text-sm">Tutte le richieste</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.pending}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">In Attesa</h3>
              <p className="text-gray-600 text-sm">Richiedono approvazione</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.approved}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Approvati</h3>
              <p className="text-gray-600 text-sm">Medici attivi</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </div>
                <span className="text-2xl font-bold text-gray-900">{stats.rejected}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Rifiutati</h3>
              <p className="text-gray-600 text-sm">Richieste respinte</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        {!loading && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { key: "all", label: "Tutti", count: stats.total },
                  { key: "pending", label: "In Attesa", count: stats.pending },
                  { key: "approved", label: "Approvati", count: stats.approved },
                  { key: "rejected", label: "Rifiutati", count: stats.rejected },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => applyFilter(tab.key)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeFilter === tab.key
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3 text-lg text-gray-600">Caricamento...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredDoctors.length === 0 && doctors.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun medico trovato</h3>
            <p className="text-gray-600">Non ci sono ancora richieste di registrazione.</p>
          </div>
        )}

        {/* Empty Filter State */}
        {!loading && filteredDoctors.length === 0 && doctors.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nessun risultato per questo filtro</h3>
            <p className="text-gray-600">Prova a selezionare un altro filtro per vedere i medici.</p>
          </div>
        )}

        {/* Doctors List */}
        {!loading && filteredDoctors.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {filteredDoctors.length} {filteredDoctors.length === 1 ? 'medico' : 'medici'}
                  {activeFilter !== "all" && ` - ${activeFilter}`}
                </h3>
                <div className="flex items-center text-sm text-gray-500">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  Filtro: {activeFilter === "all" ? "Tutti" : activeFilter}
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredDoctors.map((doctor) => {
                const getStatusColor = (status: string) => {
                  switch (status) {
                    case "approved": return "bg-green-100 text-green-800";
                    case "rejected": return "bg-red-100 text-red-800";
                    case "pending": return "bg-yellow-100 text-yellow-800";
                    default: return "bg-gray-100 text-gray-800";
                  }
                };

                const getStatusIcon = (status: string) => {
                  switch (status) {
                    case "approved":
                      return <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
                    case "rejected":
                      return <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>;
                    case "pending":
                      return <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
                    default:
                      return <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
                  }
                };

                return (
                <div key={doctor.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold text-gray-900">
                            Dr. {doctor.first_name} {doctor.last_name}
                          </h4>
                          <p className="text-gray-600">{doctor.email}</p>
                        </div>
                      </div>

                      <div className="ml-16">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"/>
                            </svg>
                            Ordine dei Medici: <strong className="ml-1">{doctor.order_number}</strong>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            {getStatusIcon(doctor.status)}
                            <span className="ml-2">Status: </span>
                            <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doctor.status)}`}>
                              {doctor.status === "approved" ? "Approvato" :
                               doctor.status === "rejected" ? "Rifiutato" :
                               doctor.status === "pending" ? "In Attesa" : doctor.status}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            Creato: <span className="ml-1 font-medium">{new Date(doctor.created_at).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3 ml-6">
                      {doctor.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(doctor.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Approva
                          </button>
                          <button
                            onClick={() => handleReject(doctor.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                            Rifiuta
                          </button>
                        </>
                      )}

                      {doctor.status === "approved" && (
                        <div className="flex items-center text-sm text-green-700 bg-green-50 px-4 py-2 rounded-lg">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          Medico attivo
                        </div>
                      )}

                      {doctor.status === "rejected" && (
                        <div className="flex items-center text-sm text-red-700 bg-red-50 px-4 py-2 rounded-lg">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          Richiesta respinta
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}