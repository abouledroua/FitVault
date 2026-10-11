"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit2, Trash2, X, User, Phone, Mail, Calendar, MapPin, AlertTriangle, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { fr } from 'date-fns/locale';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

function MemberPhoto({ src, name, size = "md" }: { src: string | null; name: string; size?: "sm" | "md" | "lg" }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div 
        className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 select-none group-hover:bg-slate-200/60 transition-colors"
        title={!src ? "Aucune photo" : "Photo indisponible"}
      >
        <User className={size === "lg" ? "w-10 h-10 text-slate-400" : size === "sm" ? "w-4 h-4 text-slate-400" : "w-6 h-6 text-slate-400"} />
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

interface Member {
  id: number;
  barcode: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  emergency_contact: string | null;
  photo_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  total_debt: string;
  initial_debt?: string;
  sales_count?: number;
  inscriptions_count?: number;
  attendance_count?: number;
  caisse_count?: number;
  debts_count?: number;
}

export default function MembersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'debt'>('all');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  
  interface FormData {
    barcode: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    emergency_contact: string;
    photo_url: string;
    gender: string;
    date_of_birth: Date | string | null;
    address: string;
    initial_debt: string;
  }

  const [formData, setFormData] = useState<FormData>({
    barcode: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    emergency_contact: '',
    photo_url: '',
    gender: '',
    date_of_birth: null,
    address: '',
    initial_debt: '0'
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFormModalOpen && firstNameRef.current) {
      setTimeout(() => firstNameRef.current?.focus(), 100);
    }
  }, [isFormModalOpen]);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur de chargement des membres', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleOpenForm = (member?: Member) => {
    setSelectedPhoto(null);
    if (member) {
      setEditingMember(member);
      let dob: Date | null = null;
      if (member.date_of_birth) {
        dob = new Date(member.date_of_birth);
      }
      
      setFormData({
        barcode: member.barcode || '',
        first_name: member.first_name,
        last_name: member.last_name,
        phone: member.phone,
        email: member.email || '',
        emergency_contact: member.emergency_contact || '',
        photo_url: member.photo_url || '',
        gender: member.gender || '',
        date_of_birth: dob,
        address: member.address || '',
        initial_debt: member.initial_debt !== undefined && member.initial_debt !== null ? String(parseFloat(member.initial_debt) || 0) : '0'
      });
    } else {
      setEditingMember(null);
      setFormData({ barcode: '', first_name: '', last_name: '', phone: '', email: '', emergency_contact: '', photo_url: '', gender: '', date_of_birth: null, address: '', initial_debt: '0' });
    }
    setIsFormModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingMember ? 'PUT' : 'POST';
      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members';
      
      const form = new FormData();
      form.append('barcode', formData.barcode);
      form.append('first_name', formData.first_name);
      form.append('last_name', formData.last_name);
      form.append('phone', formData.phone);
      form.append('email', formData.email);
      form.append('emergency_contact', formData.emergency_contact);
      form.append('gender', formData.gender);
      
      let finalDob = formData.date_of_birth;
      if (finalDob) {
        if (finalDob instanceof Date) {
          const d = String(finalDob.getDate()).padStart(2, '0');
          const m = String(finalDob.getMonth() + 1).padStart(2, '0');
          const y = finalDob.getFullYear();
          finalDob = `${y}-${m}-${d}`;
        }
      }
      form.append('date_of_birth', (finalDob as string) || '');
      
      form.append('address', formData.address);
      form.append('initial_debt', formData.initial_debt || '0');
      
      if (selectedPhoto) {
        form.append('photo', selectedPhoto);
      }
      
      const res = await fetch(url, {
        method,
        body: form
      });
      
      if (res.ok) {
        setIsFormModalOpen(false);
        fetchMembers();
        showToast(editingMember ? 'Membre mis à jour avec succès' : 'Membre ajouté avec succès', 'success');
      } else {
        showToast('Erreur lors de la sauvegarde', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleDeleteMember = async (member: Member) => {
    // 1. Strictly block if products were sold to this member
    if (Number(member.sales_count) > 0) {
      showToast('Suppression impossible : ce membre possède des achats enregistrés dans la boutique (des articles lui ont été vendus).', 'error');
      return;
    }

    // 2. Block if member has inscriptions
    if (Number(member.inscriptions_count) > 0) {
      showToast('Suppression impossible : ce membre possède des abonnements / inscriptions enregistrés.', 'error');
      return;
    }

    // 3. Block if member has debts
    if (Number(member.debts_count) > 0 || parseFloat(member.total_debt || '0') > 0) {
      showToast('Suppression impossible : ce membre possède des dettes ou reliquats impayés.', 'error');
      return;
    }

    // 4. Block if attendance exists
    if (Number(member.attendance_count) > 0) {
      showToast('Suppression impossible : ce membre possède un historique de séances ou de présences.', 'error');
      return;
    }

    // 5. Block if caisse transactions exist
    if (Number(member.caisse_count) > 0) {
      showToast('Suppression impossible : ce membre possède des transactions enregistrées en caisse.', 'error');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer définitivement le membre "${member.first_name} ${member.last_name}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      isDestructive: true
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/members/${member.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMembers();
        showToast('Membre supprimé avec succès', 'success');
      } else {
        const errData = await res.json().catch(() => null);
        showToast(errData?.error || 'Erreur lors de la suppression', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('Erreur inattendue', 'error');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(36);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, debtFilter, itemsPerPage]);

  const debtMembersCount = useMemo(() => {
    return members.filter(m => parseFloat(m.total_debt || '0') > 0).length;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter(m => {
      const matchesSearch = 
        !q ||
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.barcode && m.barcode.includes(q));

      const matchesDebt = debtFilter === 'all' || parseFloat(m.total_debt || '0') > 0;

      return matchesSearch && matchesDebt;
    });
  }, [members, search, debtFilter]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const renderPagination = (isTop = false) => {
    if (filteredMembers.length === 0) return null;

    return (
      <div className={`bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 ${isTop ? '' : 'mt-auto'}`}>
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500 font-medium">
          <span>
            Affichage de <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredMembers.length)}</span> à{' '}
            <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredMembers.length)}</span> sur{' '}
            <span className="font-bold text-slate-800">{filteredMembers.length}</span> membres
          </span>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-xs text-slate-400">Afficher :</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 cursor-pointer transition-all"
            >
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={36}>36 / page</option>
              <option value={48}>48 / page</option>
              <option value={96}>96 / page</option>
              <option value={150}>150 / page</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 text-xs font-semibold">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .reduce<(number | string)[]>((acc, page, idx, arr) => {
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                  acc.push('...');
                }
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                typeof item === 'string' ? (
                  <span key={`dots-${isTop ? 'top' : 'bot'}-${idx}`} className="px-1.5 text-slate-400">...</span>
                ) : (
                  <button
                    key={`${isTop ? 'top' : 'bot'}-${item}`}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={`min-w-8 h-8 px-2 rounded-lg font-bold transition-all ${
                      currentPage === item
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 sm:p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5 sm:gap-3">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            Gestion des Membres
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">Consultez, ajoutez et gérez vos membres</p>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-sm text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Nouveau Membre
        </button>
      </div>

      {/* Search Bar & Debt Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
        <div className="relative shadow-sm flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
            placeholder="Rechercher par nom, téléphone ou code barre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-xs shrink-0">
          <button
            type="button"
            onClick={() => setDebtFilter('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              debtFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Tous</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              debtFilter === 'all' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/80 text-slate-600'
            }`}>
              {members.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDebtFilter('debt')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              debtFilter === 'debt'
                ? 'bg-red-500 text-white shadow-xs'
                : 'text-red-600 hover:text-red-700 hover:bg-red-50/50'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${debtFilter === 'debt' ? 'text-white' : 'text-red-500'}`} />
            <span>Avec Dettes</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              debtFilter === 'debt' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
            }`}>
              {debtMembersCount}
            </span>
          </button>
        </div>
      </div>

      {/* Top Pagination Controls */}
      {renderPagination(true)}

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-4">
        {loading ? (
          <div className="col-span-full text-center py-10 text-slate-400">Chargement...</div>
        ) : filteredMembers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-2">
            <p className="font-semibold text-slate-700">
              {debtFilter === 'debt' ? 'Aucun membre avec des dettes en cours.' : 'Aucun membre trouvé.'}
            </p>
            {debtFilter === 'debt' && (
              <button
                type="button"
                onClick={() => setDebtFilter('all')}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Afficher tous les membres
              </button>
            )}
          </div>
        ) : (
          paginatedMembers.map(member => (
            <div key={member.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-all group relative overflow-hidden shadow-sm flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push(`/members/${member.id}`)}>
                  <div className="w-14 h-14 rounded-full bg-slate-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    <MemberPhoto 
                      src={member.photo_url} 
                      name={`${member.first_name} ${member.last_name}`} 
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {member.first_name} {member.last_name}
                    </h3>
                    {member.phone && member.phone.trim() !== '' && (
                      <p className="text-slate-500 text-sm flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {member.phone}
                      </p>
                    )}
                    {member.date_of_birth && (
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" /> {formatDate(member.date_of_birth)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleOpenForm(member)} 
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier le membre"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteMember(member)} 
                    className={`p-2 rounded-lg transition-colors ${
                      Number(member.sales_count) > 0 || Number(member.inscriptions_count) > 0 || Number(member.debts_count) > 0
                        ? 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'
                        : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                    }`}
                    title={
                      Number(member.sales_count) > 0
                        ? "Suppression impossible : des articles lui ont été vendus"
                        : Number(member.inscriptions_count) > 0
                        ? "Suppression impossible : abonnements existants"
                        : Number(member.debts_count) > 0
                        ? "Suppression impossible : dettes enregistrées"
                        : "Supprimer le membre"
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {parseFloat(member.total_debt || '0') > 0 && (
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm relative z-10 cursor-pointer mt-auto" onClick={() => router.push(`/members/${member.id}`)}>
                  <span className="text-slate-500 font-medium">Dette Actuelle:</span>
                  <span className="font-bold text-red-500">
                    {member.total_debt} DA
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Pagination Controls */}
      {renderPagination(false)}

      {/* Add/Edit Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">{editingMember ? 'Modifier Membre' : 'Nouveau Membre'}</h2>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <form id="member-form" onSubmit={handleSaveMember} className="p-4 sm:p-6 flex flex-col md:flex-row gap-6 md:gap-10 overflow-y-auto">
              
              {/* Left Column: Photo Upload */}
              <div className="flex flex-col items-center gap-3 sm:gap-4 w-full md:w-1/3">
                <label className="block text-xs sm:text-sm font-bold text-slate-900 w-full text-center">Photo de Profil</label>
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center overflow-hidden hover:bg-slate-100 hover:border-blue-400 transition-colors group cursor-pointer shadow-sm">
                  {selectedPhoto ? (
                    <img src={URL.createObjectURL(selectedPhoto)} alt="Aperçu" className="w-full h-full object-cover" />
                  ) : editingMember?.photo_url ? (
                    <img src={editingMember.photo_url} alt="Aperçu" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500 transition-colors">
                      <User className="w-12 h-12 mb-3" />
                      <span className="text-xs text-center font-medium px-4 leading-tight">Cliquez ou glissez une photo ici</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedPhoto(e.target.files[0]);
                    }
                  }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <p className="text-xs text-slate-500 text-center font-medium">Format JPG ou PNG (Max 5Mo)</p>
              </div>

              {/* Right Column: Form Fields */}
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600"/> Informations Personnelles
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Code-barres / N° de Carte</label>
                      <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" placeholder="Laisser vide pour générer automatiquement" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Prénom *</label>
                      <input ref={firstNameRef} required type="text" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm uppercase" placeholder="Ex: AHMED" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Nom *</label>
                      <input required type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm uppercase" placeholder="Ex: ALAOUI" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Sexe *</label>
                      <select required value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm">
                        <option value="">Sélectionner</option>
                        <option value="M">Homme (M)</option>
                        <option value="F">Femme (F)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Date de Naissance *</label>
                      <DatePicker
                        selected={formData.date_of_birth ? (typeof formData.date_of_birth === 'string' ? new Date(formData.date_of_birth) : formData.date_of_birth) : null}
                        onChange={(date: Date | null) => setFormData({...formData, date_of_birth: date})}
                        dateFormat="dd/MM/yyyy"
                        locale={fr}
                        placeholderText="JJ/MM/AAAA"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                        wrapperClassName="w-full"
                        required
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600"/> Coordonnées
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Téléphone</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" placeholder="06 00 00 00 00" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" placeholder="exemple@email.com" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Adresse</label>
                      <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm resize-none h-20" placeholder="Adresse complète..."></textarea>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-red-500"/> Urgence
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nom & Téléphone du contact d'urgence</label>
                    <input type="text" value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} placeholder="Ex: Mère - 0600000000" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-500"/> Situation Financière Initiale
                  </h3>
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                    <label className="block text-xs font-bold text-amber-900">Dette Initiale / Solde Antérieur (DA)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0"
                        step="any"
                        value={formData.initial_debt} 
                        onChange={e => setFormData({...formData, initial_debt: e.target.value})} 
                        placeholder="0.00" 
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-xs" 
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">DA</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Solde débiteur restant avant le passage à FitVault. Ce montant est automatiquement comptabilisé dans la dette globale du membre.
                    </p>
                  </div>
                </div>
              </div>
            </form>
            
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 mt-auto">
              <button type="button" onClick={() => setIsFormModalOpen(false)} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-medium transition-colors text-xs sm:text-sm">
                Annuler
              </button>
              <button form="member-form" type="submit" className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-md text-xs sm:text-sm">
                {editingMember ? 'Mettre à jour le membre' : 'Enregistrer le membre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
