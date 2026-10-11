"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart, 
  Activity, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight,
  UserCheck,
  ShoppingCart,
  Wallet,
  Clock,
  Dumbbell
} from "lucide-react";
import { BrandLogo } from '@/components/BrandLogo';

function DashboardMemberPhoto({ src, name }: { src?: string | null; name: string }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || !src.trim() || hasError) {
    return (
      <div 
        className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center select-none"
        title="Photo indisponible"
      >
        <Users className="w-5 h-5 text-blue-500" />
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

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30 sec poll
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const stats = data?.stats || {
    caisseNet: '0.00',
    caisseToday: '0.00',
    presentCount: 0,
    boutiqueSalesToday: '0.00',
    boutiqueCountToday: 0,
    lowStockCount: 0,
    membersCount: 0
  };

  const recentActivity = data?.recentActivity || [];
  const device = data?.device || { name: 'Poste Caisse & Accueil' };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-xs shrink-0">
            <BrandLogo className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Tableau de bord FitVault
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">Gestion Sportive, Caisse & Contrôle d'Accès</p>
          </div>
        </div>
        
        {/* Device Registration Badge */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-full shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[11px] sm:text-xs font-bold text-slate-700">Poste: {device.name}</span>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Caisse Balance */}
        <Link 
          href="/caisse"
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Caisse (Solde Net)</p>
              <h3 className="text-2xl font-black text-slate-900">
                {stats.caisseNet} <span className="text-xs font-semibold text-slate-400">DA</span>
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-emerald-600 font-semibold relative z-10 flex items-center gap-1">
            <span>Aujourd'hui:</span> <strong>{stats.caisseToday} DA</strong>
          </div>
        </Link>

        {/* Present Members */}
        <Link 
          href="/attendance"
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden group hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Membres Présents</p>
              <h3 className="text-3xl font-black text-blue-600">{stats.presentCount}</h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium relative z-10">
            Total Inscrits: <strong className="text-slate-800">{stats.membersCount}</strong>
          </div>
        </Link>

        {/* Store Revenue */}
        <Link 
          href="/vente"
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden group hover:border-violet-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Ventes Boutique</p>
              <h3 className="text-2xl font-black text-slate-900">
                {stats.boutiqueSalesToday} <span className="text-xs font-semibold text-slate-400">DA</span>
              </h3>
            </div>
            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <BarChart className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-violet-600 font-semibold relative z-10">
            {stats.boutiqueCountToday} transaction(s) aujourd'hui
          </div>
        </Link>

        {/* Alerts Stock */}
        <Link 
          href="/produits"
          className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative overflow-hidden group hover:border-amber-400 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Alertes Stock</p>
              <h3 className="text-3xl font-black text-amber-600">{stats.lowStockCount}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-slate-500 font-medium relative z-10">
            {stats.lowStockCount > 0 ? 'Articles à réapprovisionner' : 'Stock optimal'}
          </div>
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Activity */}
        <div className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Derniers Passages & Pointages</h2>
            </div>
            <Link href="/attendance" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Aucun passage enregistré aujourd'hui.</p>
            ) : (
              recentActivity.map((log: any) => {
                const memberHref = log.memberId ? `/members/${log.memberId}` : '#';
                return (
                  <div key={log.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition-all">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Link 
                        href={memberHref} 
                        className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer shadow-xs"
                        title="Voir la fiche membre"
                      >
                        <DashboardMemberPhoto src={log.photo} name={log.name} />
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={memberHref}
                          className="text-sm font-bold text-slate-900 uppercase hover:text-blue-600 transition-colors block truncate cursor-pointer"
                          title="Voir la fiche membre"
                        >
                          {log.name}
                        </Link>
                        <p className="text-xs text-slate-500 truncate">
                          {log.time} • <span className="font-semibold text-slate-700">{log.sportName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 ml-2">
                      {log.isDebtSession ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold">
                          En Dette (Sans Abonn.)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                          Abonnement Valide
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Quick Shortcuts */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-5">Raccourcis Rapides</h2>
            <div className="flex flex-col gap-3">
              <Link
                href="/attendance"
                className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-100 hover:border-blue-300 hover:bg-blue-100/70 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-blue-900 text-sm">Pointer une Présence</span>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/vente"
                className="flex items-center justify-between p-4 rounded-xl bg-violet-50 border border-violet-100 hover:border-violet-300 hover:bg-violet-100/70 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-violet-600" />
                  <span className="font-bold text-violet-900 text-sm">Point de Vente Directe</span>
                </div>
                <ArrowRight className="w-4 h-4 text-violet-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/caisse"
                className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-100/70 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                  <span className="font-bold text-emerald-900 text-sm">Gérer la Caisse (Dépôt/Retrait)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/settings"
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Dumbbell className="w-5 h-5 text-slate-700" />
                  <span className="font-bold text-slate-800 text-sm">Disciplines & Formules</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
            FitVault v1.0 • Club Management System
          </div>
        </div>
      </div>
    </div>
  );
}
