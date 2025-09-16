"use client";

import { useState } from "react";
import Link from "next/link";

export default function DoctorRegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/auth/register/doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password, order_number: orderNumber }),
    });

    const data = await res.json();
    setMessage(data.message || data.error);
    setLoading(false);

    if (data.message) {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setOrderNumber("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F5F7FA' }}>
      <div className="w-full max-w-lg">
        {/* Header Card */}
        <div
          className="text-center mb-6 p-6 rounded-xl"
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #F0F0F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div className="flex justify-center mb-4">
            <div
              className="flex items-center justify-center"
              style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, #4A90E2 0%, #5DADE2 100%)',
                borderRadius: '12px'
              }}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM9 9a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </div>
          </div>
          <h1
            className="font-bold mb-2"
            style={{
              fontSize: '24px',
              color: '#2C3E50',
              fontWeight: 700
            }}
          >
            Registrazione Medico
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#34495E'
          }}>
            Unisciti alla rete di professionisti sanitari
          </p>
        </div>

        {/* Registration Form Card */}
        <div
          className="p-8 rounded-xl"
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #F0F0F0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
        >
          {message && (
            <div
              className="p-4 rounded-lg border-l-4 flex items-start mb-6"
              style={{
                background: message.includes('errore') || message.includes('error') ? '#FDF2F2' : '#F0FDF4',
                borderColor: message.includes('errore') || message.includes('error') ? '#EF4444' : '#22C55E',
                color: message.includes('errore') || message.includes('error') ? '#DC2626' : '#16A34A'
              }}
            >
              <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                {message.includes('errore') || message.includes('error') ? (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                )}
              </svg>
              <p style={{ fontSize: '14px' }}>{message}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block mb-2"
                  style={{
                    fontSize: '14px',
                    color: '#2C3E50',
                    fontWeight: 500
                  }}
                >
                  Nome
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                  style={{
                    borderColor: '#BDC3C7',
                    fontSize: '16px',
                    color: '#2C3E50'
                  }}
                  placeholder="Mario"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block mb-2"
                  style={{
                    fontSize: '14px',
                    color: '#2C3E50',
                    fontWeight: 500
                  }}
                >
                  Cognome
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                  style={{
                    borderColor: '#BDC3C7',
                    fontSize: '16px',
                    color: '#2C3E50'
                  }}
                  placeholder="Rossi"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block mb-2"
                style={{
                  fontSize: '14px',
                  color: '#2C3E50',
                  fontWeight: 500
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#BDC3C7',
                  fontSize: '16px',
                  color: '#2C3E50'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4A90E2'
                  e.target.style.boxShadow = '0 0 0 2px rgba(74, 144, 226, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#BDC3C7'
                  e.target.style.boxShadow = 'none'
                }}
                placeholder="mario.rossi@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-2"
                style={{
                  fontSize: '14px',
                  color: '#2C3E50',
                  fontWeight: 500
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#BDC3C7',
                  fontSize: '16px',
                  color: '#2C3E50'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4A90E2'
                  e.target.style.boxShadow = '0 0 0 2px rgba(74, 144, 226, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#BDC3C7'
                  e.target.style.boxShadow = 'none'
                }}
                placeholder="inserisci una password sicura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="orderNumber"
                className="block mb-2"
                style={{
                  fontSize: '14px',
                  color: '#2C3E50',
                  fontWeight: 500
                }}
              >
                Numero Ordine dei Medici
              </label>
              <input
                id="orderNumber"
                type="text"
                required
                className="w-full px-4 py-3 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#BDC3C7',
                  fontSize: '16px',
                  color: '#2C3E50'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4A90E2'
                  e.target.style.boxShadow = '0 0 0 2px rgba(74, 144, 226, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#BDC3C7'
                  e.target.style.boxShadow = 'none'
                }}
                placeholder="es. RM12345"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
              <p style={{ fontSize: '12px', color: '#BDC3C7', marginTop: '4px' }}>
                Il numero di iscrizione all'Ordine dei Medici
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #4A90E2 0%, #5DADE2 100%)',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrazione in corso...
                </span>
              ) : (
                'Registrati come Medico'
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="text-center mb-4">
              <p style={{ fontSize: '14px', color: '#34495E' }}>
                Hai già un account?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg text-center text-white transition-all duration-150"
                style={{
                  background: 'linear-gradient(135deg, #4A90E2 0%, #5DADE2 100%)',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                Accedi
              </Link>
              <Link
                href="/register/patient"
                className="px-4 py-2 rounded-lg text-center text-white transition-all duration-150"
                style={{
                  background: 'linear-gradient(135deg, #27AE60 0%, #2ECC71 100%)',
                  fontSize: '12px',
                  fontWeight: 500
                }}
              >
                Paziente
              </Link>
            </div>

            <div className="text-center">
              <Link
                href="/"
                className="inline-flex items-center transition-colors duration-150"
                style={{
                  fontSize: '12px',
                  color: '#BDC3C7'
                }}
                className="hover:opacity-70"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Torna alla home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
