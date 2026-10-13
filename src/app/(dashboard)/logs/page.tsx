"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  User, 
  Laptop, 
  Trash2, 
  X, 
  Database, 
  Eye, 
  Info, 
  FileText 
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/formatters';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface AuditLogItem {
  id: number;
  timestamp: string;
  user_id: number | null;
  device_uuid: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  details: string | null;
  user_name: string | null;
  device_name: string | null;
  ip_address: string | null;
  username?: string | null;
  current_user_fullname?: string | null;
  user_role?: string | null;
  current_device_name?: string | null;
}

interface LogStats {
  total_logs: number;
  unique_users: number;
  unique_devices: number;
  today_logs: number;
}

export default function LogsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<LogStats>({
    total_logs: 0,
    unique_users: 0,
    unique_devices: 0,
    today_logs: 0
  });

  const [availableFilters, setAvailableFilters] = useState<{
    actions: string[];
    tables: string[];
  }>({
    actions: [],
    tables: []
  });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Verifier que l'utilisateur est admin
  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (!data?.authenticated || data?.user?.role !== 'admin') {
          showToast('Accès restreint aux administrateurs', 'error');
          router.replace('/');
        }
      })
      .catch(() => router.replace('/'));
  }, [router, showToast]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());
      if (selectedAction) params.set('action', selectedAction);
      if (selectedTable) params.set('tableName', selectedTable);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.status === 403) {
        showToast('Accès réservé exclusivement à l\'administrateur', 'error');
        router.replace('/');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
        if (data.stats) setStats(data.stats);
        if (data.availableFilters) setAvailableFilters(data.availableFilters);
      } else {
        showToast('Erreur lors du chargement des logs', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Erreur réseau lors de la récupération des logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedAction, selectedTable, startDate, endDate, router, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedAction('');
    setSelectedTable('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const handlePurgeLogs = async () => {
    const isConfirmed = await confirm({
      title: 'Purger les anciens logs d\'audit',
      message: 'Êtes-vous sûr de vouloir supprimer les logs datant de plus de 90 jours ? Cette action libérera de l\'espace tout en conservant l\'activité récente.',
      confirmText: 'Purger (> 90 jours)',
      cancelText: 'Annuler',
      isDestructive: true,
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch('/api/logs?days=90', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Logs purgés avec succès', 'success');
        fetchLogs();
      } else {
        showToast(data.error || 'Erreur lors de la purge', 'error');
      }
    } catch {
      showToast('Erreur réseau lors de la purge', 'error');
    }
  };

  const formatTimestampStr = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;
      return `${formatDate(date)} à ${formatTime(date)}`;
    } catch {
      return timestamp;
    }
  };

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('PURGE')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (act.includes('CREATE') || act.includes('LOGIN') || act.includes('CHECKIN')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('EDIT')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('LOGOUT') || act.includes('ARCHIVE')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Journal d&apos;Audit Système
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                    Admin Exclusif
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Traçabilité intégrale de toutes les actions en base de données avec horodatage, utilisateur et UUID du poste.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Rafraîchir les logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>

            <button
              onClick={handlePurgeLogs}
              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              title="Purger les logs anciens de plus de 90 jours"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purger (&gt; 90j)</span>
            </button>
          </div>
        </div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total des Logs</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">{stats.total_logs}</p>
            <p className="text-[11px] text-slate-400 mt-1">Événements enregistrés</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Aujourd&apos;hui</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600 font-mono">{stats.today_logs}</p>
            <p className="text-[11px] text-slate-400 mt-1">Actions ce jour</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Utilisateurs</span>
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">{stats.unique_users}</p>
            <p className="text-[11px] text-slate-400 mt-1">Comptes distincts tracés</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Postes / UUID</span>
              <Laptop className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 font-mono">{stats.unique_devices}</p>
            <p className="text-[11px] text-slate-400 mt-1">Appareils enregistrés</p>
          </div>
        </div>

        {/* Barre de Recherche et Filtres */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par action, table, utilisateur, UUID d'appareil, détails..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-xs sm:text-sm font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Filtrer</span>
            </button>
            {(search || selectedAction || selectedTable || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Réinitialiser</span>
              </button>
            )}
          </form>

          {/* Filtres détaillés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
            {/* Action */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Action</label>
              <select
                value={selectedAction}
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Toutes les actions</option>
                {availableFilters.actions.map((act) => (
                  <option key={act} value={act}>
                    {act}
                  </option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Table BDD</label>
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Toutes les tables</option>
                {availableFilters.tables.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Date début */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Du (inclus)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Date fin */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Au (inclus)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Tableau des Logs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {totalCount} événement{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Lignes par page :</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-4">Date &amp; Heure</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Table / ID</th>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Poste (UUID)</th>
                  <th className="py-3 px-4">Détails</th>
                  <th className="py-3 px-4 text-right">Vue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                      <span>Chargement du journal d&apos;audit...</span>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Info className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      <span>Aucun log ne correspond aux critères sélectionnés.</span>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Horodatage */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTimestampStr(log.timestamp)}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Table / ID */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-slate-800">
                          <Database className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.table_name || '-'}</span>
                          {log.record_id && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                              #{log.record_id}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Utilisateur */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                            {log.user_name ? log.user_name.slice(0, 2).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              {log.user_name || log.current_user_fullname || (log.user_id ? `User #${log.user_id}` : 'Système')}
                            </p>
                            {log.user_role && (
                              <span className="text-[10px] text-slate-400 capitalize">
                                {log.user_role === 'admin' ? 'Administrateur' : 'Staff'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Poste (UUID) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <span className="font-mono text-[11px] font-bold text-blue-600">
                              {log.device_uuid || '-'}
                            </span>
                            {log.device_name && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                {log.device_name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Aperçu des détails */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-500 font-mono text-[11px]">
                        {log.details ? (
                          <span title={log.details}>
                            {log.details.length > 50 ? `${log.details.slice(0, 50)}...` : log.details}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Bouton voir */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-100/50 transition-colors"
                          title="Voir les détails complets"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-500">
                Page <strong className="text-slate-800">{page}</strong> sur <strong className="text-slate-800">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Détails du Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Détail de l&apos;Action #{selectedLog.id}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enregistré le {formatTimestampStr(selectedLog.timestamp)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps Modal */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Action</span>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded font-mono font-bold text-[11px] border ${getActionBadge(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Table Ciblée</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    {selectedLog.table_name || 'Non spécifiée'} {selectedLog.record_id ? `(#${selectedLog.record_id})` : ''}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Utilisateur / Compte</span>
                  <span className="font-bold text-slate-800">
                    {selectedLog.user_name || selectedLog.username || `ID #${selectedLog.user_id || 'Système'}`}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Poste (UUID)</span>
                  <span className="font-mono font-bold text-blue-600">
                    {selectedLog.device_uuid || '-'}
                  </span>
                  {selectedLog.device_name && (
                    <span className="block text-[10px] text-slate-400">
                      {selectedLog.device_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Payload JSON / Details */}
              <div>
                <span className="block text-[11px] font-bold text-slate-700 mb-1.5">Données enregistrées (Payload JSON / Détails) :</span>
                <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed">
                  <pre>{(() => {
                    try {
                      if (!selectedLog.details) return 'Aucun détail supplémentaire.';
                      const parsed = JSON.parse(selectedLog.details);
                      return JSON.stringify(parsed, null, 2);
                    } catch {
                      return selectedLog.details;
                    }
                  })()}</pre>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
