"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Dumbbell, 
  CreditCard, 
  ShoppingCart, 
  Printer, 
  Plus, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  X,
  Tag,
  DollarSign,
  Receipt,
  Trash2,
  Edit,
  Banknote
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isWithinInterval, 
  startOfWeek, 
  endOfWeek,
  setYear,
  setMonth
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/contexts/ToastContext';
import { MemberBadgeModal } from '@/components/MemberBadgeModal';

interface Inscription {
  id: number;
  offer_id: number;
  offer_title: string;
  offer_price: string;
  duration_type: string;
  duration_value: number;
  start_date: string;
  end_date: string;
  remaining_sessions: number | null;
  status: string;
  total_paid: string;
  payment_status: string;
  sports_included: string;
}

interface AttendanceLog {
  id: number;
  checked_in_at: string;
  checked_out_at: string | null;
  status: string;
  is_debt_session: boolean;
  sport_name: string;
  debt_amount: string | null;
}

interface PaymentItem {
  id: number | string;
  flow_direction: string;
  module_category: string;
  transaction_type: string;
  amount: string | number;
  transaction_date: string;
  motif: string;
  note: string | null;
  user_name?: string | null;
}

interface MemberDetails {
  member: any;
  inscriptions: Inscription[];
  attendance: AttendanceLog[];
  debts: any[];
  payments?: PaymentItem[];
}

export default function MemberDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { showToast } = useToast();
  
  const [data, setData] = useState<MemberDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals state
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [inscriptionModalOpen, setInscriptionModalOpen] = useState(false);
  const [offersList, setOffersList] = useState<any[]>([]);

  // Inscription form state
  const [selectedOfferId, setSelectedOfferId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submittingInsc, setSubmittingInsc] = useState(false);

  // Payment form state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMotif, setPaymentMotif] = useState('Règlement Dette');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchMemberData();
    fetchOffers();
  }, [id]);

  const fetchMemberData = async () => {
    try {
      const res = await fetch(`/api/members/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        router.push('/members');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await fetch('/api/offers');
      if (res.ok) {
        const json = await res.json();
        setOffersList(json.filter((o: any) => o.is_active));
        if (json.length > 0) {
          setSelectedOfferId(json[0].id);
          setAmountPaid(json[0].price);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOfferChange = (offerId: number) => {
    setSelectedOfferId(offerId);
    const chosen = offersList.find(o => o.id === offerId);
    if (chosen) {
      setAmountPaid(chosen.price);
    }
  };

  const handleCreateInscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferId) {
      showToast('Veuillez choisir une formule', 'error');
      return;
    }

    setSubmittingInsc(true);
    try {
      const res = await fetch(`/api/members/${id}/inscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offer_id: selectedOfferId,
          start_date: startDate,
          amount_paid: amountPaid,
          payment_method: paymentMethod
        })
      });

      if (res.ok) {
        showToast('Abonnement enregistré avec succès !', 'success');
        setInscriptionModalOpen(false);
        fetchMemberData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de l\'enregistrement', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur inattendue', 'error');
    } finally {
      setSubmittingInsc(false);
    }
  };

  const handleDeleteInscription = async (inscId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet abonnement ? Toutes les données associées (dont les paiements en caisse liés) seront également supprimées.')) return;
    
    try {
      const res = await fetch(`/api/inscriptions/${inscId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Abonnement supprimé', 'success');
        fetchMemberData();
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleDeletePayment = async (paymentId: number | string) => {
    if (typeof paymentId === 'string' && paymentId.startsWith('insc-')) {
      showToast('Ce paiement est lié à un abonnement. Veuillez supprimer l\'abonnement correspondant.', 'error');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paiement de la caisse ?')) return;
    
    try {
      const res = await fetch(`/api/caisse/${paymentId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Paiement supprimé', 'success');
        fetchMemberData();
      } else {
        showToast('Erreur lors de la suppression', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur inattendue', 'error');
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) {
      showToast('Veuillez saisir un montant', 'error');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/caisse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: id,
          amount: paymentAmount,
          motif: paymentMotif,
          note: paymentNote,
          flow_direction: 'in',
          module_category: 'autre'
        })
      });

      if (res.ok) {
        showToast('Paiement enregistré avec succès !', 'success');
        setPaymentModalOpen(false);
        setPaymentAmount('');
        setPaymentNote('');
        fetchMemberData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Erreur lors de l\'enregistrement', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur inattendue', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleYearChange = (year: number) => {
    setCurrentDate(setYear(currentDate, year));
  };

  const handleMonthChange = (monthIdx: number) => {
    setCurrentDate(setMonth(currentDate, monthIdx));
  };

  const renderCalendar = () => {
    if (!data) return null;

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDateGrid = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDateGrid = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDateGrid, end: endDateGrid });
    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    // Generate years for select dropdown (5 years past to 5 years future)
    const currentYear = currentDate.getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
        {/* Calendar Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Calendrier d'Entraînement & Validité
          </h3>

          <div className="flex items-center gap-2">
            <button 
              onClick={prevMonth} 
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>

            {/* Month selector */}
            <select
              value={currentDate.getMonth()}
              onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {months.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>

            {/* Year selector */}
            <select
              value={currentYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button 
              onClick={nextMonth} 
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-blue-100 border border-blue-300"></span>
            <span>Jours Couverts (Abonnement Actif)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500"></span>
            <span>Séance Entraînement Valide</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-amber-500"></span>
            <span>Séance en Dette (Sans Abonnement)</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
          {weekDays.map(day => (
            <div key={day} className="bg-slate-100 py-2.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
              {day}
            </div>
          ))}
          
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            
            // Check if day is covered by any paid active inscription
            const activeInsc = data.inscriptions.find(insc => {
              const start = new Date(insc.start_date);
              const end = new Date(insc.end_date);
              return isWithinInterval(day, { start, end });
            });
            const isPaidDay = Boolean(activeInsc);

            // Find attendance sessions for this day
            const dayAttendance = data.attendance.filter(att => 
              isSameDay(new Date(att.checked_in_at), day)
            );

            let bgClass = "bg-white";
            if (!isCurrentMonth) {
              bgClass = "bg-slate-100/70 text-slate-400";
            } else if (isPaidDay) {
              bgClass = "bg-blue-50/70";
            }

            return (
              <div 
                key={day.toString()} 
                className={`min-h-[95px] p-2 relative ${bgClass} transition-all hover:bg-blue-50/30 border-t border-slate-100`}
              >
                <span className={`text-xs font-bold ${!isCurrentMonth ? 'text-slate-400' : 'text-slate-800'}`}>
                  {format(day, dateFormat)}
                </span>
                
                <div className="mt-1.5 flex flex-col gap-1">
                  {isPaidDay && isCurrentMonth && (
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded w-fit">
                      Abonné
                    </span>
                  )}

                  {dayAttendance.map((session, sIdx) => {
                    if (session.is_debt_session) {
                      return (
                        <div 
                          key={sIdx}
                          className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded shadow-xs"
                          title={`Séance en dette: ${session.debt_amount || '50'} DA (${session.sport_name || 'Sport'})`}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          <span className="truncate">Dette: {session.debt_amount || 50} DA</span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={sIdx}
                        className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded shadow-xs"
                        title={`Séance effectuée: ${session.sport_name || 'Entraînement'}`}
                      >
                        <Dumbbell className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{session.sport_name || 'Entraînement'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const { member, inscriptions, debts, payments = [] } = data;
  const activeInscription = inscriptions.find(i => i.status === 'active') || inscriptions[0] || null;
  const totalPaidSum = payments.reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0);

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button 
            onClick={() => router.push('/members')} 
            className="p-2 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
            aria-label="Retour à la liste"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 truncate flex flex-wrap items-center gap-1.5 sm:gap-2">
              Dossier Membre: <span className="text-blue-600">{member.first_name} {member.last_name}</span>
            </h1>
            <p className="text-xs text-slate-500">Code Barre: <span className="font-mono font-bold text-slate-700">{member.barcode}</span></p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => setBadgeModalOpen(true)}
            className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
            Imprimer Badge
          </button>
          <button
            onClick={() => setInscriptionModalOpen(true)}
            className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Nouvel Abonnement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Member Card & Financials */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden mb-4">
                {member.photo_url ? (
                  <img src={member.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 uppercase">{member.first_name} {member.last_name}</h2>
              <span className="inline-block mt-1 px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200 font-bold font-mono">
                #{member.barcode}
              </span>
            </div>

            <div className="mt-6 space-y-3 pt-6 border-t border-slate-100">
              {member.phone && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-blue-500" /> {member.phone}
                </div>
              )}
              {member.email && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-blue-500" /> {member.email}
                </div>
              )}
              {member.date_of_birth && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <CalendarIcon className="w-4 h-4 text-blue-500" /> {formatDate(member.date_of_birth)}
                </div>
              )}
              {member.address && (
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-blue-500" /> {member.address}
                </div>
              )}
            </div>

            {/* Total Debt Widget */}
            <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dette Globale</span>
                <span className={`text-xl font-black ${parseFloat(member.total_debt) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {parseFloat(member.total_debt).toFixed(2)} DA
                </span>
              </div>
              {parseFloat(member.total_debt) > 0 && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  Comprend les séances sans abonnement et/ou restes à payer.
                </p>
              )}
            </div>
          </div>

          {/* Subscriptions List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" /> Historique des Abonnements
              </h3>
              <span className="text-xs font-semibold text-slate-400">({inscriptions.length})</span>
            </div>

            {inscriptions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Aucun abonnement souscrit.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {inscriptions.map((insc) => (
                  <div key={insc.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 relative group transition-colors hover:border-blue-300">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* 
                      <button className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-md transition-colors" title="Modifier l'abonnement">
                        <Edit className="w-3.5 h-3.5" />
                      </button> 
                      */}
                      <button 
                        onClick={() => handleDeleteInscription(insc.id)} 
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors" 
                        title="Supprimer l'abonnement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex justify-between font-bold text-slate-900 pr-12">
                      <span>{insc.offer_title}</span>
                      <span className="text-blue-600">{insc.offer_price} DA</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Du {formatDate(insc.start_date)} au {formatDate(insc.end_date)}
                    </div>
                    {insc.sports_included && (
                      <div className="text-[10px] text-blue-600 font-semibold truncate">
                        Disciplines: {insc.sports_included}
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        insc.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        insc.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {insc.payment_status === 'paid' ? 'Payé Intégral' :
                         insc.payment_status === 'partial' ? 'Paiement Partiel' : 'En Attente'}
                      </span>
                      <span className="text-slate-500">Payé: {insc.total_paid} DA</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Calendar & Payments */}
        <div className="lg:col-span-2 space-y-6">
          {renderCalendar()}

          {/* Member Payments History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Historique des Règlements & Paiements
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tous les encaissements enregistrés pour ce membre (abonnements, boutique, dettes)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-sm transition-all"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nouveau Paiement</span>
                  <span className="sm:hidden">Payer</span>
                </button>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide hidden sm:inline">Total Encaissé :</span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono">
                    {totalPaidSum.toFixed(2)} DA
                  </span>
                </div>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-600">Aucun paiement enregistré pour le moment</p>
                <p className="text-xs text-slate-400 mt-1">Les règlements d'abonnements et achats en boutique apparaîtront ici.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse flex flex-col sm:table">
                  <thead className="hidden sm:table-header-group">
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4">Date & Heure</th>
                      <th className="py-3 px-4">Type / Catégorie</th>
                      <th className="py-3 px-4">Motif & Détails</th>
                      <th className="py-3 px-4">Caissier / Agent</th>
                      <th className="py-3 px-4 text-right">Montant (DA)</th>
                    </tr>
                  </thead>
                  <tbody className="flex flex-col sm:table-row-group gap-3 sm:gap-0 divide-y-0 sm:divide-y divide-slate-100 text-xs p-3 sm:p-0">
                    {payments.map((p, idx) => {
                      const isBoutique = p.module_category === 'boutique';
                      const isAbonnement = p.module_category === 'entrainement' || p.transaction_type === 'paiement_inscription';

                      return (
                        <tr key={p.id || idx} className="group flex flex-col sm:table-row bg-white sm:bg-transparent border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0 hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0 font-mono text-slate-600 sm:whitespace-nowrap">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Date</span>
                            <span>{formatDateTime(p.transaction_date)}</span>
                          </td>
                          <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0 sm:whitespace-nowrap">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Catégorie</span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                              isBoutique 
                                ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                : isAbonnement 
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {isBoutique ? 'Boutique' : isAbonnement ? 'Abonnement' : 'Caisse'}
                            </span>
                          </td>
                          <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Détails</span>
                            <div className="text-right sm:text-left">
                              <p className="font-bold text-slate-900">{p.motif || 'Règlement'}</p>
                              {p.note && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{p.note}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0 text-slate-600 font-medium sm:whitespace-nowrap">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Caissier</span>
                            <span>{p.user_name || 'Caissier'}</span>
                          </td>
                          <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell text-right sm:whitespace-nowrap group-hover:bg-slate-50 transition-colors">
                            <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Montant</span>
                            <div className="flex items-center justify-end gap-3">
                              <span className="font-black font-mono text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                                + {parseFloat(String(p.amount)).toFixed(2)} DA
                              </span>
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 hidden sm:block"
                                title="Supprimer ce paiement"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="sm:hidden mt-2 border-t border-slate-100 pt-2 flex justify-end">
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                className="px-3 py-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: PRINT BADGE */}
      {badgeModalOpen && (
        <MemberBadgeModal
          member={member}
          activeInscription={activeInscription}
          onClose={() => setBadgeModalOpen(false)}
        />
      )}

      {/* MODAL: NOUVEL ABONNEMENT */}
      {inscriptionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                Souscrire un Abonnement
              </h2>
              <button
                onClick={() => setInscriptionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Choisir la Formule / Offre <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedOfferId}
                  onChange={(e) => handleOfferChange(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-semibold"
                  required
                >
                  {offersList.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.title} — {off.price} DA ({off.sport_names})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                    Montant Payé (DA) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Mode de Paiement
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                >
                  <option value="cash">Espèces (Cash Caisse)</option>
                  <option value="card">Carte Bancaire / TPE</option>
                  <option value="debt">Crédit / Dette (Payer plus tard)</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-xs text-blue-800">
                L'encaissement sera automatiquement crédité dans la caisse principale, et tout reliquat impayé sera inscrit dans la dette du membre.
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInscriptionModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingInsc}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md text-xs sm:text-sm transition-all disabled:opacity-50"
                >
                  {submittingInsc ? 'Enregistrement...' : 'Valider l\'Abonnement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOUVEAU PAIEMENT MANUEL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                Nouveau Paiement (Caisse)
              </h2>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Motif du paiement <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMotif}
                  onChange={(e) => setPaymentMotif(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 font-semibold"
                  required
                >
                  <option value="Règlement Dette">Règlement de Dette</option>
                  <option value="Achat Boutique (Manuel)">Achat Boutique (Manuel)</option>
                  <option value="Autre">Autre Encaissement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Montant Encaissé (DA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400"
                  required
                  placeholder="Ex: 1500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Note / Détails (Optionnel)
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 text-sm"
                  placeholder="Ex: Espèces..."
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-800">
                Ce montant sera directement ajouté à la caisse de ce jour.
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs sm:text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md text-xs sm:text-sm transition-all disabled:opacity-50"
                >
                  {submittingPayment ? 'Enregistrement...' : 'Valider le Paiement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
