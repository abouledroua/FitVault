"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, UserCheck, UserMinus, Clock, ChevronRight, ChevronDown, Users, LogOut } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { playScanSuccessSound, playScanErrorSound } from '@/lib/sound';

interface PresentMember {
  id: number;
  memberId: number;
  name: string;
  photo: string;
  lastInscription: string;
  expiryDate: string;
  arrivalTime: string;
  departureTime?: string | null;
  status: string;
  attendanceStatus?: string;
  isPresent: boolean;
}

function AttendancePhoto({ src, name }: { src?: string; name: string }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div 
        className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400 select-none"
        title="Photo indisponible"
      >
        <Users className="w-5 h-5 text-slate-400" />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={name} 
      className="w-full h-full object-cover" 
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

export function AttendanceSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [presentMembers, setPresentMembers] = useState<PresentMember[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [filterMode, setFilterMode] = useState<'all' | 'present' | 'departed'>('all');
  const [isPresentExpanded, setIsPresentExpanded] = useState(true);
  const [isDepartedExpanded, setIsDepartedExpanded] = useState(true);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const presentCount = useMemo(() => presentMembers.filter(m => m.isPresent).length, [presentMembers]);
  const departedCount = useMemo(() => presentMembers.filter(m => !m.isPresent).length, [presentMembers]);

  const displayedMembers = useMemo(() => {
    // Sort present members to the top, then sort by arrival time descending
    const sorted = [...presentMembers].sort((a, b) => {
      if (a.isPresent && !b.isPresent) return -1;
      if (!a.isPresent && b.isPresent) return 1;
      return 0;
    });

    if (filterMode === 'present') return sorted.filter(m => m.isPresent);
    if (filterMode === 'departed') return sorted.filter(m => !m.isPresent);
    return sorted;
  }, [presentMembers, filterMode]);

  const handleMemberClick = (memberId: number) => {
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsOpen(false);
    }
    router.push(`/members/${memberId}`);
  };

  useEffect(() => {
    // Open by default on wide desktop screens (>= 1280px), closed on tablets and mobile
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      setIsOpen(true);
    }
  }, []);

  // Automatically give focus to the search/scan bar when on the dashboard
  useEffect(() => {
    if (pathname === '/' && isOpen) {
      const timer = setTimeout(() => {
        scanInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pathname, isOpen]);

  const fetchPresentMembers = async () => {
    try {
      const res = await fetch('/api/attendance/present');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.allToday || data.present || []);
        setPresentMembers(list);
        if (data.totalToday !== undefined) {
          setTotalToday(Number(data.totalToday));
        }
      }
    } catch (error) {
      console.error('Failed to fetch present members:', error);
    }
  };

  useEffect(() => {
    fetchPresentMembers();
    const interval = setInterval(fetchPresentMembers, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDepart = async (id: number) => {
    try {
      const res = await fetch('/api/attendance/depart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_id: id })
      });
      
      if (res.ok) {
        showToast('Départ enregistré', 'info');
        fetchPresentMembers();
      }
    } catch (error) {
      console.error('Failed to mark departure:', error);
    }
  };

  const handleQuickScanCheckin = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const barcode = searchQuery.trim();
      // Always empty the input immediately upon Enter
      setSearchQuery('');

      try {
        const res = await fetch('/api/attendance/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode })
        });
        const data = await res.json();
        if (res.ok) {
          playScanSuccessSound();
          fetchPresentMembers();
          if (data.alreadyPresent) {
            showToast(data.message || 'Membre déjà présent', 'info');
          } else if (data.departed) {
            showToast(data.message || 'Départ enregistré', 'info');
          } else {
            showToast(data.message || `Pointage validé : ${data.member_name || barcode}`, 'success');
          }
        } else {
          playScanErrorSound();
          showToast(data.error || 'Code-barres introuvable ou membre inexistant', 'error');
        }
      } catch (err) {
        playScanErrorSound();
        console.error('Scan error:', err);
        showToast('Erreur lors du pointage', 'error');
      }
    }
  };

  return (
    <>
      {/* Mobile / Tablet Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 xl:hidden animate-in fade-in transition-opacity" 
          aria-hidden="true"
        />
      )}

      <div className="relative">
        <aside 
          className={`transition-all duration-300 bg-white border-slate-200 shadow-2xl xl:shadow-sm flex flex-col z-50 xl:z-20 h-screen overflow-hidden fixed xl:relative inset-y-0 right-0 ${
            isOpen ? 'w-80 sm:w-96 border-l translate-x-0' : 'w-0 border-l-0 translate-x-full xl:translate-x-0'
          }`}
        >
          <div className="w-80 sm:w-96 h-full flex flex-col">
            {/* Top Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur-md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-slate-900 font-bold flex items-center gap-2 text-base sm:text-lg">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Pointage & Présences
                </h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="xl:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Fermer le panneau"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  ref={scanInputRef}
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-xs sm:text-sm transition-all"
                  placeholder="Scanner badge + Entrée..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleQuickScanCheckin}
                />
              </div>

              {/* Attendance Statistics (Present & Total Today) */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                <div 
                  onClick={() => setFilterMode(filterMode === 'present' ? 'all' : 'present')}
                  className={`border rounded-xl p-2.5 flex items-center gap-2.5 cursor-pointer transition-all ${
                    filterMode === 'present' 
                      ? 'bg-blue-100/90 border-blue-300 ring-2 ring-blue-200' 
                      : 'bg-blue-50/80 border-blue-100 hover:bg-blue-100/60'
                  }`}
                  title="Filtrer uniquement les membres actuellement présents"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight block">Présents</span>
                    <span className="text-base font-black text-slate-900 leading-none">{presentCount}</span>
                  </div>
                </div>

                <div 
                  onClick={() => setFilterMode('all')}
                  className={`border rounded-xl p-2.5 flex items-center gap-2.5 cursor-pointer transition-all ${
                    filterMode === 'all' 
                      ? 'bg-emerald-100/90 border-emerald-300 ring-2 ring-emerald-200' 
                      : 'bg-emerald-50/80 border-emerald-100 hover:bg-emerald-100/60'
                  }`}
                  title="Afficher tous les passages d'aujourd'hui"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight block">Aujourd'hui</span>
                    <span className="text-base font-black text-slate-900 leading-none">{totalToday || presentMembers.length}</span>
                  </div>
                </div>
              </div>

              {/* Quick Filter Tabs */}
              <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-colors text-center ${
                    filterMode === 'all'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  Tous ({presentMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('present')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-colors text-center ${
                    filterMode === 'present'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  En salle ({presentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('departed')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-colors text-center ${
                    filterMode === 'departed'
                      ? 'bg-slate-600 text-white font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  Sortis ({departedCount})
                </button>
              </div>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4">
              {displayedMembers.length === 0 ? (
                <div className="text-center text-slate-400 py-10 text-xs sm:text-sm">
                  {filterMode === 'present' 
                    ? 'Aucun membre actuellement en salle.' 
                    : filterMode === 'departed' 
                      ? 'Aucun membre sorti aujourd\'hui.' 
                      : 'Aucun passage enregistré aujourd\'hui.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* PRESENT MEMBERS SECTION */}
                  {displayedMembers.some(m => m.isPresent) && (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={() => setIsPresentExpanded(!isPresentExpanded)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 transition-all text-left group"
                        title={isPresentExpanded ? "Replier la liste des présents" : "Déplier la liste des présents"}
                      >
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Présents en salle ({presentCount})
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <span className="text-[10px] uppercase">{isPresentExpanded ? 'Replier' : 'Déplier'}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPresentExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        </div>
                      </button>

                      {isPresentExpanded && (
                        <div className="space-y-1.5">
                          {displayedMembers.filter(m => m.isPresent).map(member => (
                            <div 
                              key={member.id} 
                              onClick={() => handleMemberClick(member.memberId)}
                              className="rounded-lg p-2 flex flex-col gap-1.5 transition-all group cursor-pointer border bg-white border-emerald-300 hover:border-emerald-500 shadow-2xs hover:shadow-xs"
                              title="Cliquer pour voir la fiche membre"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full border border-emerald-500 ring-1 ring-emerald-100 bg-emerald-50 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                  <AttendancePhoto src={member.photo} name={member.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                      {member.name}
                                    </p>
                                    <span className="text-[10px] font-bold text-emerald-700 shrink-0 flex items-center gap-0.5">
                                      <Clock className="w-3 h-3 text-emerald-600" />
                                      {member.arrivalTime}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded font-black text-[9px] bg-emerald-500 text-white leading-tight">
                                      EN SALLE
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded border font-semibold text-[9px] leading-tight ${
                                      member.status === 'debt' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                      member.status === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                      member.status === 'expired' ? 'bg-red-50 text-red-600 border-red-200' : 
                                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    }`}>
                                      {member.status === 'debt' ? 'Dette' : member.status === 'valid' ? 'Actif' : member.status === 'warning' ? 'Expire Bientôt' : 'Expiré'}
                                    </span>
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDepart(member.id);
                                  }}
                                  className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-md transition-all shrink-0 border border-red-200 hover:border-red-500"
                                  title="Marquer le départ"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-600">
                                <span className="truncate max-w-[50%]">
                                  <span className="text-slate-400">Inscr:</span> <strong className="font-semibold text-slate-700">{member.lastInscription}</strong>
                                </span>
                                <span className="truncate max-w-[50%] text-right">
                                  <span className="text-slate-400">Exp:</span> <strong className="font-semibold text-slate-700">{member.expiryDate}</strong>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* DEPARTED MEMBERS SECTION */}
                  {displayedMembers.some(m => !m.isPresent) && (
                    <div className="space-y-1.5 pt-2 border-t-2 border-dashed border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsDepartedExpanded(!isDepartedExpanded)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-amber-100/70 hover:bg-amber-100 border border-amber-300/80 transition-all text-left group"
                        title={isDepartedExpanded ? "Replier la liste des sortis" : "Déplier la liste des sortis"}
                      >
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <LogOut className="w-3.5 h-3.5 text-amber-700" />
                          Déjà sortis aujourd'hui ({departedCount})
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                          <span className="text-[10px] uppercase">{isDepartedExpanded ? 'Replier' : 'Déplier'}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDepartedExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        </div>
                      </button>

                      {isDepartedExpanded && (
                        <div className="space-y-1.5">
                          {displayedMembers.filter(m => !m.isPresent).map(member => (
                            <div 
                              key={member.id} 
                              onClick={() => handleMemberClick(member.memberId)}
                              className="rounded-lg p-2 flex flex-col gap-1.5 transition-all group cursor-pointer border bg-amber-50/70 border-amber-200/90 hover:bg-amber-100/80 hover:border-amber-300 shadow-2xs"
                              title="Cliquer pour voir la fiche membre (Déjà sorti)"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full border border-amber-300 bg-amber-100 flex items-center justify-center overflow-hidden shrink-0">
                                  <AttendancePhoto src={member.photo} name={member.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-bold text-slate-800 group-hover:text-amber-900 transition-colors truncate">
                                      {member.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600 shrink-0">
                                      <span className="text-slate-500">{member.arrivalTime}</span>
                                      {member.departureTime && (
                                        <span className="font-bold text-amber-800 flex items-center gap-0.5">
                                          <LogOut className="w-2.5 h-2.5 text-amber-600" />
                                          {member.departureTime}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded font-black text-[9px] bg-amber-200 text-amber-900 border border-amber-300 leading-tight">
                                      <LogOut className="w-2 h-2" />
                                      SORTI
                                    </span>
                                    <span className={`px-1.5 py-0.2 rounded border font-semibold text-[9px] leading-tight ${
                                      member.status === 'debt' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                      member.status === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                      member.status === 'expired' ? 'bg-red-50 text-red-600 border-red-200' : 
                                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    }`}>
                                      {member.status === 'debt' ? 'Dette' : member.status === 'valid' ? 'Actif' : member.status === 'warning' ? 'Expire Bientôt' : 'Expiré'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-white/80 border border-amber-200/70 text-slate-600">
                                <span className="truncate max-w-[50%]">
                                  <span className="text-slate-400">Inscr:</span> <strong className="font-semibold text-slate-700">{member.lastInscription}</strong>
                                </span>
                                <span className="truncate max-w-[50%] text-right">
                                  <span className="text-slate-400">Exp:</span> <strong className="font-semibold text-slate-700">{member.expiryDate}</strong>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Toggle Button for Right Sidebar - Hidden when drawer open on mobile */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed xl:absolute top-4 xl:top-6 z-40 bg-white p-2 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all duration-300 shadow-md flex items-center justify-center ${
            isOpen 
              ? 'hidden xl:flex left-0 -translate-x-1/2 rounded-full w-8 h-8' 
              : 'right-3 sm:right-4 rounded-xl'
          }`}
          title={isOpen ? 'Masquer la barre des présences' : 'Ouvrir la barre des présences'}
          aria-label="Contrôle des présences"
        >
          {isOpen ? <ChevronRight className="w-4 h-4" /> : (
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span className="sm:hidden text-[11px] font-black text-blue-600">{presentMembers.length}</span>
              <span className="hidden sm:inline text-xs font-bold text-slate-700">
                Présents: <span className="text-blue-600 font-extrabold">{presentMembers.length}</span> <span className="text-slate-400 font-normal">| Total: <strong className="text-emerald-600 font-bold">{totalToday}</strong></span>
              </span>
            </div>
          )}
        </button>
      </div>
    </>
  );
}
