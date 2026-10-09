"use client";

import { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Minus, 
  Filter, 
  Calendar, 
  Dumbbell, 
  ShoppingCart, 
  Laptop, 
  User, 
  RefreshCw,
  X,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface Transaction {
  id: number;
  flowDirection: 'in' | 'out';
  moduleCategory: 'entrainement' | 'boutique' | 'general';
  transactionType: string;
  amount: string;
  motif: string;
  note: string | null;
  date: string;
  time: string;
  userName: string;
  deviceName: string;
  memberName: string | null;
  memberBarcode: string | null;
}

interface Stats {
  totalIn: string;
  totalOut: string;
  netBalance: string;
  entrainementTotal: string;
  boutiqueTotal: string;
}

export default function CaissePage() {
  const { showToast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalIn: '0.00',
    totalOut: '0.00',
    netBalance: '0.00',
    entrainementTotal: '0.00',
    boutiqueTotal: '0.00'
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'entrainement' | 'boutique' | 'general'>('all');
  const [periodFilter, setPeriodFilter] = useState<'today' | 'month' | 'all'>('today');
  const [customDate, setCustomDate] = useState('');

  // Modals state
  const [operationModalOpen, setOperationModalOpen] = useState(false);
  const [operationType, setOperationType] = useState<'alimentation' | 'retrait_general'>('alimentation');
  const [operationForm, setOperationForm] = useState({
    amount: '',
    motif: '',
    note: ''
  });
  const [submittingOp, setSubmittingOp] = useState(false);

  useEffect(() => {
    fetchCaisseData();
  }, [categoryFilter, periodFilter, customDate]);

  const fetchCaisseData = async () => {
    setLoading(true);
    try {
      let url = `/api/caisse?category=${categoryFilter}&period=${periodFilter}`;
      if (customDate) {
        url += `&date=${customDate}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setStats(data.stats || {
          totalIn: '0.00',
          totalOut: '0.00',
          netBalance: '0.00',
          entrainementTotal: '0.00',
          boutiqueTotal: '0.00'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openOperationModal = (type: 'alimentation' | 'retrait_general') => {
    setOperationType(type);
    setOperationForm({
      amount: '',
      motif: type === 'alimentation' ? 'Apport de fond de caisse' : 'Retrait espèces pour dépenses',
      note: ''
    });
    setOperationModalOpen(true);
  };

  const handleSaveOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationForm.amount || !operationForm.motif.trim()) {
      showToast('Montant et motif obligatoires', 'error');
      return;
    }

    setSubmittingOp(true);
    try {
      const res = await fetch('/api/caisse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_type: operationType,
          amount: operationForm.amount,
          motif: operationForm.motif,
          note: operationForm.note
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        setOperationModalOpen(false);
        fetchCaisseData();
      } else {
        showToast(data.error || 'Erreur lors de l\'opération', 'error');
      }
    } catch (err) {
      showToast('Erreur inattendue', 'error');
    } finally {
      setSubmittingOp(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5 sm:gap-3">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            Gestion de Caisse & Trésorerie
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            Suivi des encaissements abonnements, ventes boutique et opérations manuelles de caisse.
          </p>
        </div>

        {/* Quick Deposit / Withdraw Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={() => openOperationModal('alimentation')}
            className="flex-1 md:flex-initial justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Alimenter la Caisse
          </button>
          <button
            onClick={() => openOperationModal('retrait_general')}
            className="flex-1 md:flex-initial justify-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Minus className="w-4 h-4 text-red-400" /> Retrait de Caisse
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Net Balance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Solde Net Caisse</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-black ${parseFloat(stats.netBalance) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {stats.netBalance}
            </span>
            <span className="text-xs font-bold text-slate-400">DA</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Recettes moins Dépenses</span>
        </div>

        {/* Total In */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Entrées</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">{stats.totalIn}</span>
            <span className="text-xs font-bold text-slate-400">DA</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Flux créditeurs</span>
        </div>

        {/* Entraînement Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Part Entraînement</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-blue-600">{stats.entrainementTotal}</span>
            <span className="text-xs font-bold text-slate-400">DA</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Abonnements & Séances</span>
        </div>

        {/* Boutique Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Part Boutique</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-violet-600">{stats.boutiqueTotal}</span>
            <span className="text-xs font-bold text-slate-400">DA</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Ventes de Produits & Snacks</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Module Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tous les Flux
          </button>
          <button
            onClick={() => setCategoryFilter('entrainement')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'entrainement'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" /> Entraînement
          </button>
          <button
            onClick={() => setCategoryFilter('boutique')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'boutique'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Boutique & Produits
          </button>
          <button
            onClick={() => setCategoryFilter('general')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === 'general'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" /> Opérations de Caisse
          </button>
        </div>

        {/* Period Filter Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => { setPeriodFilter('today'); setCustomDate(''); }}
              className={`px-3 py-1 rounded-lg transition-all ${
                periodFilter === 'today' && !customDate ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => { setPeriodFilter('month'); setCustomDate(''); }}
              className={`px-3 py-1 rounded-lg transition-all ${
                periodFilter === 'month' && !customDate ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Ce Mois
            </button>
            <button
              onClick={() => { setPeriodFilter('all'); setCustomDate(''); }}
              className={`px-3 py-1 rounded-lg transition-all ${
                periodFilter === 'all' && !customDate ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              Tout
            </button>
          </div>

          {/* Specific date input */}
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800"
            title="Date spécifique"
          />

          <button
            onClick={fetchCaisseData}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 border border-slate-200"
            title="Actualiser"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transactions History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Livre Journal des Transactions
          </h3>
          <span className="text-xs text-slate-400 font-medium">({transactions.length} opération(s))</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Chargement des transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Aucune transaction enregistrée pour ces filtres.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs flex flex-col sm:table">
              <thead className="hidden sm:table-header-group">
                <tr className="border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider bg-slate-50/80">
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Catégorie</th>
                  <th className="py-3 px-4">Motif & Description</th>
                  <th className="py-3 px-4">Membre / Bénéficiaire</th>
                  <th className="py-3 px-4">Poste / Utilisateur</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="flex flex-col sm:table-row-group gap-3 sm:gap-0 divide-y-0 sm:divide-y divide-slate-100 font-medium">
                {transactions.map((t) => (
                  <tr key={t.id} className="flex flex-col sm:table-row bg-white sm:bg-transparent border border-slate-200 sm:border-0 rounded-xl sm:rounded-none p-3 sm:p-0 hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                      <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Date & Heure</span>
                      <div className="text-right sm:text-left text-slate-600 whitespace-nowrap">
                        <div className="font-bold text-slate-800">{t.date}</div>
                        <span className="text-[10px] text-slate-400">{t.time}</span>
                      </div>
                    </td>

                    <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                      <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Catégorie</span>
                      <div className="text-right sm:text-left">
                        {t.moduleCategory === 'entrainement' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 text-[10px]">
                            <Dumbbell className="w-3 h-3" /> Entraînement
                          </span>
                        )}
                        {t.moduleCategory === 'boutique' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-violet-50 text-violet-700 border border-violet-200 text-[10px]">
                            <ShoppingCart className="w-3 h-3" /> Boutique
                          </span>
                        )}
                        {t.moduleCategory === 'general' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                            <Wallet className="w-3 h-3" /> Caisse
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                      <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Motif & Description</span>
                      <div className="text-right sm:text-left">
                        <div className="font-bold text-slate-900">{t.motif}</div>
                        {t.note && <span className="text-[10px] text-slate-500 block">{t.note}</span>}
                      </div>
                    </td>

                    <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                      <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Bénéficiaire</span>
                      <div className="text-right sm:text-left">
                        {t.memberName ? (
                          <div>
                            <span className="font-bold text-slate-800">{t.memberName}</span>
                            {t.memberBarcode && <span className="text-[10px] font-mono text-slate-400 block">#{t.memberBarcode}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Comptoir / Général</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell border-b border-slate-50 sm:border-0">
                      <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Poste / User</span>
                      <div className="text-right sm:text-left text-slate-500">
                        <div>{t.userName}</div>
                        <span className="text-[10px] text-slate-400">{t.deviceName}</span>
                      </div>
                    </td>

                    <td className="py-2 sm:py-3 px-1 sm:px-4 flex justify-between items-center sm:table-cell">
                      <span className="sm:hidden font-bold text-[10px] text-slate-400 uppercase">Montant</span>
                      <div className="text-right font-black text-sm whitespace-nowrap">
                        {t.flowDirection === 'in' ? (
                          <span className="text-emerald-600">+ {t.amount} DA</span>
                        ) : (
                          <span className="text-red-500">- {t.amount} DA</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: ALIMENTATION / RETRAIT MANUEL */}
      {operationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl p-4 sm:p-6 md:p-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-5">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                {operationType === 'alimentation' ? 'Alimenter la Caisse (Dépôt)' : 'Retrait de Caisse (Dépense)'}
              </h3>
              <button
                onClick={() => setOperationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOperation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Montant en Espèces (DA) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={operationForm.amount}
                  onChange={(e) => setOperationForm({ ...operationForm, amount: e.target.value })}
                  placeholder="Ex: 500.00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Motif / Raison de l'opération <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={operationForm.motif}
                  onChange={(e) => setOperationForm({ ...operationForm, motif: e.target.value })}
                  placeholder={operationType === 'alimentation' ? 'Ex: Apport monnaie, Fond de caisse...' : 'Ex: Achat fournitures, Règlement facture...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
                  Note Complémentaire (Optionnel)
                </label>
                <textarea
                  value={operationForm.note}
                  onChange={(e) => setOperationForm({ ...operationForm, note: e.target.value })}
                  placeholder="Détails supplémentaires..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-400 h-20 resize-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOperationModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingOp}
                  className={`w-full sm:w-auto px-5 py-2 text-white rounded-xl text-xs font-bold shadow-sm transition-all ${
                    operationType === 'alimentation'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {submittingOp ? 'Enregistrement...' : 'Confirmer l\'opération'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
