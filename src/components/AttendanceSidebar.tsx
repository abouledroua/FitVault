"use client";

import { useState, useEffect } from 'react';
import { Search, UserCheck, UserMinus, Clock, ChevronRight, Users } from 'lucide-react';

interface PresentMember {
  id: number;
  memberId: number;
  name: string;
  photo: string;
  lastInscription: string;
  expiryDate: string;
  arrivalTime: string;
  status: string;
}

export function AttendanceSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [presentMembers, setPresentMembers] = useState<PresentMember[]>([]);

  useEffect(() => {
    // Open by default on wide desktop screens (>= 1280px), closed on tablets and mobile
    if (typeof window !== 'undefined' && window.innerWidth >= 1280) {
      setIsOpen(true);
    }
  }, []);

  const fetchPresentMembers = async () => {
    try {
      const res = await fetch('/api/attendance/present');
      if (res.ok) {
        const data = await res.json();
        setPresentMembers(data);
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
        setPresentMembers(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Failed to mark departure:', error);
    }
  };

  const handleQuickScanCheckin = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      try {
        const res = await fetch('/api/attendance/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode: searchQuery.trim() })
        });
        const data = await res.json();
        if (res.ok) {
          fetchPresentMembers();
          setSearchQuery('');
        }
      } catch (err) {
        console.error('Scan error:', err);
      }
    }
  };

  const filteredMembers = presentMembers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                  type="text"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-xs sm:text-sm transition-all"
                  placeholder="Scanner badge + Entrée..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleQuickScanCheckin}
                />
              </div>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredMembers.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-xs sm:text-sm">
                  Aucun membre présent.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredMembers.map(member => (
                    <div key={member.id} className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 flex flex-col gap-3 hover:border-blue-200 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                          {member.photo ? (
                            <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{member.name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {member.arrivalTime}</span>
                            <span className={`px-1.5 py-0.5 rounded-full border font-medium text-[10px] ${
                              member.status === 'debt' ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold' :
                              member.status === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                              member.status === 'expired' ? 'bg-red-50 text-red-600 border-red-200' : 
                              'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}>
                              {member.status === 'debt' ? 'Dette' : member.status === 'valid' ? 'Actif' : member.status === 'warning' ? 'Expire Bientôt' : 'Expiré'}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDepart(member.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Marquer Départ"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2">
                        <div className="bg-slate-50 rounded p-1.5 border border-slate-100 text-center">
                          <p className="text-slate-400 mb-0.5 text-[10px]">Dernière Inscr.</p>
                          <p className="font-semibold text-slate-700 text-xs truncate">{member.lastInscription}</p>
                        </div>
                        <div className="bg-slate-50 rounded p-1.5 border border-slate-100 text-center">
                          <p className="text-slate-400 mb-0.5 text-[10px]">Expiration</p>
                          <p className="font-semibold text-slate-700 text-xs truncate">{member.expiryDate}</p>
                        </div>
                      </div>
                    </div>
                  ))}
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
              <span className="hidden sm:inline text-xs font-bold text-slate-700">Présences ({presentMembers.length})</span>
            </div>
          )}
        </button>
      </div>
    </>
  );
}
