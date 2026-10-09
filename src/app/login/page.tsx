"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, Laptop, CheckCircle } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { getDeviceIdentifier } from '@/lib/device';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Device registration state
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [pendingDeviceUuid, setPendingDeviceUuid] = useState<string>('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceRegistering, setDeviceRegistering] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const deviceId = await getDeviceIdentifier();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, deviceId }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.requiresDeviceRegistration) {
          setPendingUserId(data.userId);
          setPendingDeviceUuid(data.deviceUuid || deviceId);
          setShowDeviceModal(true);
        } else {
          router.push('/');
        }
      } else {
        setError(data.error || 'Identifiants invalides');
      }
    } catch (err) {
      setError("Erreur lors de la connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setError("Le nom de l'appareil est obligatoire.");
      return;
    }

    setDeviceRegistering(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: pendingUserId,
          deviceName: deviceName.trim(),
          deviceUuid: pendingDeviceUuid,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('fitvault_device_id', pendingDeviceUuid);
        router.push('/');
      } else {
        setError(data.error || "Erreur lors de l'enregistrement de l'appareil");
      }
    } catch (err) {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setDeviceRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <BrandLogo className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-slate-900">
              FIT<span className="text-blue-600">VAULT</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm">Gestion Sportive Intelligente</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nom d'utilisateur</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                placeholder="admin"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute right-4 top-3.5 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all shadow-md mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>Authentification...</>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Se Connecter
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Mandatory Device Registration Modal */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                <Laptop className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Nouvel Appareil Détecté</h2>
              <p className="text-xs text-slate-500 mt-1">
                Cet appareil n'est pas encore enregistré. Veuillez lui attribuer un nom unique pour l'identifier dans le système de caisse et de pointage.
              </p>
            </div>

            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nom de l'Appareil <span className="text-red-500">* (Obligatoire)</span>
                </label>
                <input 
                  type="text" 
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Ex: PC Accueil Réception, Tablette Salle..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-medium"
                  required
                  autoFocus
                />
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">UUID de l'appareil:</span>
                <p className="font-mono text-slate-600 break-all">{pendingDeviceUuid}</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium text-center">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={deviceRegistering || !deviceName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all shadow-md mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deviceRegistering ? (
                  <>Enregistrement en cours...</>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Valider & Accéder à FitVault
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
