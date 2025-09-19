'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userType, setUserType] = useState<'doctor' | 'patient'>('patient');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'doctor' || type === 'patient') {
      setUserType(type);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError('Le password non corrispondono');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Errore aggiornamento password:', updateError);
        setError('Errore durante l\'aggiornamento della password');
        return;
      }

      setMessage('Password aggiornata con successo! Reindirizzamento...');

      // Reindirizza alla dashboard appropriata dopo 2 secondi
      setTimeout(() => {
        if (userType === 'doctor') {
          router.push('/dashboard/doctor');
        } else {
          router.push('/dashboard/patient');
        }
      }, 2000);

    } catch (error) {
      console.error('Errore:', error);
      setError('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthColors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const strengthLabels = ['Molto debole', 'Debole', 'Media', 'Forte', 'Molto forte'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Nuova Password
          </h1>
          <p className="text-gray-600">
            Scegli una password sicura per il tuo account {userType === 'doctor' ? 'medico' : 'paziente'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Nuova Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Inserisci la nuova password"
            />

            {password && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Sicurezza password</span>
                  <span>{strengthLabels[passwordStrength - 1] || 'Molto debole'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${strengthColors[passwordStrength - 1] || 'bg-red-500'}`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Conferma Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Conferma la nuova password"
            />

            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-sm text-red-600">Le password non corrispondono</p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Requisiti password:</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>
                ✓ Almeno 8 caratteri
              </li>
              <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                ✓ Una lettera maiuscola
              </li>
              <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                ✓ Una lettera minuscola
              </li>
              <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                ✓ Un numero
              </li>
              <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>
                ✓ Un carattere speciale
              </li>
            </ul>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password !== confirmPassword || passwordStrength < 3}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Aggiornamento...
              </div>
            ) : (
              'Aggiorna Password'
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-xs text-gray-500">
            © 2024 MedHubb S.r.l. - La tua piattaforma sanitaria digitale
          </p>
        </div>
      </div>
    </div>
  );
}