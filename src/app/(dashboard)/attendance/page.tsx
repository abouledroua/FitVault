"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  UserCheck, 
  UserMinus, 
  Search, 
  Calendar as CalendarIcon, 
  Dumbbell, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle, 
  ArrowRight,
  Filter,
  RefreshCw,
  LogOut,
  Users,
  Camera,
  X
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';
import { playScanSuccessSound, playScanErrorSound } from '@/lib/sound';
import { formatCurrency } from '@/lib/formatters';

interface PresentMember {
  id: number;
  memberId: number;
  barcode: string;
  name: string;
  photo: string;
  arrivalTime: string;
  lastInscription: string;
  expiryDate: string;
  status: 'valid' | 'warning' | 'expired' | 'debt';
  isDebtSession: boolean;
  sportName: string;
  debtAmount: string | null;
}

interface HistoryLog {
  id: number;
  memberId: number;
  barcode: string;
  name: string;
  photo: string | null;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  isDebtSession: boolean;
  debtAmount: string | null;
  sportName: string;
  offerTitle: string;
  status: string;
}

function AttendanceMemberPhoto({ src, name, compact = false }: { src: string | null; name: string; compact?: boolean }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div 
        className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 select-none p-0.5"
        title="Photo indisponible"
      >
        <Users className={compact ? "w-4 h-4 text-slate-400" : "w-6 h-6 text-slate-400"} />
        {!compact && (
          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Indisponible</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover"
    />
  );
}

export default function AttendancePage() {
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<'present' | 'history'>('present');

  // Present state
  const [presentMembers, setPresentMembers] = useState<PresentMember[]>([]);
  const [loadingPresent, setLoadingPresent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCheckinInput, setQuickCheckinInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      setIsCameraSupported(true);
    }
  }, []);

  // History state
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchPresentMembers();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, selectedDate]);

  const fetchPresentMembers = async () => {
    setLoadingPresent(true);
    try {
      const res = await fetch('/api/attendance/present');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.present || []);
        setPresentMembers(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPresent(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/attendance/history?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleQuickCheckin = async (e?: React.FormEvent, forceInput?: string) => {
    if (e) e.preventDefault();
    const inputVal = forceInput || quickCheckinInput.trim();
    if (!inputVal) return;

    setCheckingIn(true);
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: inputVal })
      });

      const data = await res.json();

      if (res.ok) {
        playScanSuccessSound();
        if (data.alreadyPresent) {
          showToast(data.message, 'info');
        } else if (data.departed) {
          showToast(data.message, 'info');
        } else if (data.isDebtSession) {
          showToast(data.message, 'warning');
        } else {
          showToast(data.message, 'success');
        }
        setQuickCheckinInput('');
        fetchPresentMembers();
      } else {
        playScanErrorSound();
        showToast(data.error || 'Erreur lors du pointage', 'error');
      }
    } catch (err) {
      playScanErrorSound();
      console.error(err);
      showToast('Erreur inattendue', 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleDepart = async (id: number, memberName: string) => {
    const isConfirmed = await confirm({
      title: 'Confirmer la sortie',
      message: `Enregistrer le départ de ${memberName} de la salle ?`,
      confirmText: 'Marquer Sortie',
      cancelText: 'Annuler',
      isDestructive: false
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch('/api/attendance/depart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_id: id })
      });

      if (res.ok) {
        showToast(`Départ de ${memberName} enregistré`, 'success');
        setPresentMembers(prev => prev.filter(m => m.id !== id));
      } else {
        showToast('Erreur lors du départ', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    }
  };

  const filteredPresent = presentMembers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.barcode.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-blue-600" />
          Gestion des Présences & Pointage
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Contrôle des accès en temps réel, alertes d'abonnement et historique des arrivées/départs.
        </p>
      </div>

      {/* Redesigned Section Selector Under the Title (Matching Settings Screen) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Option 1: Présents Actuellement */}
          <button
            type="button"
            onClick={() => setActiveTab('present')}
            className={`group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'present'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'present'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Présents Actuellement</span>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    activeTab === 'present'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {presentMembers.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Membres en salle & pointage en direct
              </p>
            </div>
          </button>

          {/* Option 2: Registre & Historique */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all text-left ${
              activeTab === 'history'
                ? 'bg-blue-50/80 border-blue-300 text-blue-900 shadow-xs ring-1 ring-blue-200/50'
                : 'bg-slate-50/50 border-transparent hover:bg-slate-100/80 hover:border-slate-200 text-slate-600'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'bg-white text-slate-500 border border-slate-200 group-hover:text-blue-600 group-hover:border-blue-200'
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-sm truncate">Registre & Historique</span>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    activeTab === 'history'
                      ? 'bg-blue-200/70 text-blue-800'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {historyLogs.length > 0 ? historyLogs.length : 'Filtres'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                Journal des entrées & sorties par date
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* TAB 1: PRESENT NOW */}
      {activeTab === 'present' && (
        <div className="space-y-6">
          {/* Quick Pointage Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <form onSubmit={handleQuickCheckin} className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={quickCheckinInput}
                  onChange={(e) => setQuickCheckinInput(e.target.value)}
                  placeholder="Scanner un badge ou taper le code-barres / numéro..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-11 py-3 text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  autoFocus
                />
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                {quickCheckinInput && (
                  <button
                    type="button"
                    onClick={() => setQuickCheckinInput('')}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              {isCameraSupported && (
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold flex flex-col sm:flex-row items-center justify-center transition-all shadow-xs"
                  title="Scanner avec la caméra"
                >
                  <Camera className="w-5 h-5" />
                </button>
              )}
              <button
                type="submit"
                disabled={checkingIn || !quickCheckinInput.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <UserCheck className="w-5 h-5" />
                <span className="hidden sm:inline">{checkingIn ? 'Pointage...' : 'Pointer l\'Entrée'}</span>
                <span className="sm:hidden">{checkingIn ? '...' : 'Valider'}</span>
              </button>
            </form>
          </div>

          {/* Members Grid Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Membres Actuellement en Salle</h2>
              <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-full border border-blue-200">
                {filteredPresent.length} Personne(s)
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Filtrer la liste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-auto flex-1 sm:flex-initial bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={fetchPresentMembers}
                className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition-colors shrink-0"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Present Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPresent.length === 0 ? (
              <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">Aucun membre actuellement présent dans la salle</p>
                <p className="text-xs text-slate-400 mt-1">Utilisez la barre ci-dessus pour pointer les arrivées par code-barres.</p>
              </div>
            ) : (
              filteredPresent.map((m) => (
                <div
                  key={m.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4 mb-3">
                      <Link 
                        href={`/members/${m.memberId}`}
                        className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 hover:ring-2 hover:ring-blue-400 hover:opacity-95 transition-all cursor-pointer"
                        title="Voir la fiche membre"
                      >
                        <AttendanceMemberPhoto src={m.photo} name={m.name} />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/members/${m.memberId}`}
                          className="font-bold text-slate-900 text-base uppercase truncate block hover:text-blue-600 transition-colors cursor-pointer"
                          title="Voir la fiche membre"
                        >
                          {m.name}
                        </Link>
                        <p className="text-xs font-mono text-slate-500">#{m.barcode}</p>
                        
                        <div className="mt-1 flex items-center gap-1.5">
                          <Dumbbell className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-bold text-blue-700">{m.sportName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Heure d'arrivée:</span>
                        <strong className="text-slate-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {m.arrivalTime}
                        </strong>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                        <span className="text-slate-500">Statut d'accès:</span>
                        {m.isDebtSession ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Dette ({formatCurrency(m.debtAmount || 50, 2)})
                          </span>
                        ) : m.status === 'valid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Abonné Valide
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            Expiré
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex gap-2">
                    <button
                      onClick={() => handleDepart(m.id, m.name)}
                      className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-red-200"
                    >
                      <LogOut className="w-4 h-4" />
                      Marquer la Sortie
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIQUE / REGISTRE */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Registre des Passages & Séances</h2>
                <p className="text-xs text-slate-500">Consultez l'historique complet des présences à n'importe quelle date.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-600 uppercase">Choisir la Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loadingHistory ? (
              <div className="p-12 text-center text-slate-500">Chargement du registre...</div>
            ) : historyLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                Aucun enregistrement trouvé pour la date sélectionnée ({selectedDate}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs flex flex-col sm:table">
                  <thead className="hidden sm:table-header-group">
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase font-bold tracking-wider">
                      <th className="py-3 px-4">Membre</th>
                      <th className="py-3 px-4">Discipline</th>
                      <th className="py-3 px-4">Heure Arrivée</th>
                      <th className="py-3 px-4">Heure Sortie</th>
                      <th className="py-3 px-4">Type de Séance</th>
                    </tr>
                  </thead>
                  <tbody className="flex flex-col sm:table-row-group gap-3 sm:gap-0 divide-y-0 sm:divide-y divide-slate-100 font-medium p-3 sm:p-0">
                    {historyLogs.map((log) => (
                      <tr key={log.id} className="flex flex-col sm:table-row bg-white sm:bg-transparent border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0 hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Membre</span>
                          <div className="flex items-center gap-3 text-right sm:text-left justify-end sm:justify-start">
                            <Link
                              href={`/members/${log.memberId}`}
                              className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 hover:ring-2 hover:ring-blue-400 hover:opacity-95 transition-all cursor-pointer"
                              title="Voir la fiche membre"
                            >
                              <AttendanceMemberPhoto src={log.photo} name={log.name} compact={true} />
                            </Link>
                            <div className="min-w-0">
                              <Link
                                href={`/members/${log.memberId}`}
                                className="font-bold text-slate-900 uppercase hover:text-blue-600 transition-colors block truncate cursor-pointer"
                                title="Voir la fiche membre"
                              >
                                {log.name}
                              </Link>
                              <span className="font-mono text-[10px] text-slate-400">#{log.barcode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Discipline</span>
                          <span className="text-slate-700 font-semibold">{log.sportName}</span>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Heure Arrivée</span>
                          <span className="font-bold text-blue-600">{log.checkInTime}</span>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Heure Sortie</span>
                          <span className="text-slate-600">{log.checkOutTime}</span>
                        </td>
                        <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell">
                          <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Type de Séance</span>
                          <div>
                            {log.isDebtSession ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Séance en Dette ({log.debtAmount || 50} DA)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                {log.offerTitle}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CAMERA SCANNER MODAL */}
      {cameraOpen && (
        <BarcodeScannerModal
          onClose={() => setCameraOpen(false)}
          onScan={(decodedText) => {
            setQuickCheckinInput(decodedText);
            setCameraOpen(false);
            // Small delay to allow react state to settle before submission
            setTimeout(() => {
              handleQuickCheckin(undefined, decodedText);
            }, 150);
          }}
        />
      )}
    </div>
  );
}

// Separate component to prevent SSR issues with html5-qrcode
function BarcodeScannerModal({ onClose, onScan }: { onClose: () => void, onScan: (decoded: string) => void }) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    // Give time for modal animation to render the div
    const timer = setTimeout(() => {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (html5QrCode && html5QrCode.isScanning) {
             html5QrCode.stop().then(() => {
               onScan(decodedText);
             }).catch(err => {
               console.error("Failed to stop scanning", err);
               onScan(decodedText);
             });
          }
        },
        (err) => {
          // ignore scan failures
        }
      ).catch(err => {
         console.error("Failed to start scanner", err);
         setErrorMsg("Erreur caméra : " + (err?.message || err || "Accès refusé ou non supporté."));
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error("Failed to stop scanner", e));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Scanner le code-barres
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {errorMsg ? (
          <div className="p-6 text-center space-y-4" style={{ minHeight: '300px' }}>
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-8 h-8" />
            </div>
            <p className="font-bold text-slate-900">{errorMsg}</p>
            <p className="text-sm text-slate-500">
              Sur téléphone, le navigateur bloque la caméra sur les réseaux locaux HTTP par sécurité.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl text-xs text-left text-slate-600 space-y-2">
              <p><strong>Solution Android (Chrome) :</strong></p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Allez sur <code>chrome://flags</code></li>
                <li>Cherchez <strong>Insecure origins treated as secure</strong></li>
                <li>Ajoutez votre adresse IP <code>http://192.168...</code></li>
                <li>Activez l'option et redémarrez Chrome.</li>
              </ol>
            </div>
          </div>
        ) : (
          <div id="reader" className="w-full overflow-hidden" style={{ minHeight: '300px' }}></div>
        )}
        
        <div className="p-4 bg-slate-50 text-xs text-slate-500 text-center font-medium">
          Placez le code-barres du badge au centre de la zone de scan
        </div>
      </div>
    </div>
  );
}
