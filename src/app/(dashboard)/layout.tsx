"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { AttendanceSidebar } from '@/components/AttendanceSidebar';
import { GlobalBarcodeListener } from '@/components/GlobalBarcodeListener';
import { LayoutDashboard, Wallet, Users, Clock, Settings, LogOut, ChevronLeft, Menu, ShoppingCart, Package, X, ShieldAlert } from 'lucide-react';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    fullName: string;
    role: string;
    photoUrl?: string | null;
  } | null>(null);

  useEffect(() => {
    // Open left sidebar by default on desktop screens (>= 1024px)
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setLeftSidebarOpen(true);
    }
  }, []);

  const refreshUserSession = () => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.authenticated && data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error('Failed to load user session:', err));
  };

  useEffect(() => {
    refreshUserSession();
    window.addEventListener('session-updated', refreshUserSession);
    return () => window.removeEventListener('session-updated', refreshUserSession);
  }, []);

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const navSections = [
    {
      id: 'main',
      items: [
        { name: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
      ]
    },
    {
      id: 'club',
      label: 'Club & Présences',
      items: [
        { name: 'Membres', icon: Users, path: '/members' },
        { name: 'Présences', icon: Clock, path: '/attendance' },
      ]
    },
    {
      id: 'commerce',
      label: 'Finance & Ventes',
      items: [
        { name: 'Point de Vente', icon: ShoppingCart, path: '/vente' },
        { name: 'Produits & Stock', icon: Package, path: '/produits' },
        { name: 'Caisse', icon: Wallet, path: '/caisse' },
      ]
    },
    {
      id: 'config',
      label: 'Système',
      items: [
        { name: 'Paramètres', icon: Settings, path: '/settings' },
        ...(currentUser?.role === 'admin' ? [{ name: 'Journal d\'audit (Logs)', icon: ShieldAlert, path: '/logs' }] : []),
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Drawer Backdrop */}
      {leftSidebarOpen && (
        <div 
          onClick={() => setLeftSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden animate-in fade-in transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <div className="relative">
        <aside className={`transition-all duration-300 bg-white border-slate-200 flex flex-col z-50 lg:z-20 h-screen overflow-hidden shadow-2xl lg:shadow-sm fixed lg:relative inset-y-0 left-0 ${leftSidebarOpen ? 'w-72 sm:w-64 border-r translate-x-0' : 'w-0 border-r-0 -translate-x-full lg:translate-x-0'}`}>
          <div className="w-72 sm:w-64 h-full flex flex-col">
            <div className="p-5 sm:p-6 flex items-center justify-between gap-3 border-b border-slate-100 lg:border-none">
              <div className="flex items-center gap-3">
                <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10 text-blue-600" />
                <h1 className="text-xl font-bold tracking-wider text-slate-900">FIT<span className="text-blue-600">VAULT</span></h1>
              </div>
              <button
                type="button"
                onClick={() => setLeftSidebarOpen(false)}
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <nav className="flex-1 px-4 py-3 space-y-4 overflow-y-auto">
              {navSections.map((section, sIdx) => (
                <div key={section.id || sIdx} className="space-y-1">
                  {section.label && (
                    <div className="pt-2 pb-1">
                      <div className="flex items-center gap-2 px-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {section.label}
                        </span>
                        <div className="flex-1 h-px bg-slate-100"></div>
                      </div>
                    </div>
                  )}

                  {section.items.map((item) => {
                    const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path));
                    return (
                      <Link 
                        key={item.path} 
                        href={item.path}
                        onClick={() => {
                          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                            setLeftSidebarOpen(false);
                          }
                        }}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          isActive 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* User Profile & Logout Section */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs mb-2">
                {/* User Avatar Photo or Initials */}
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-100 border border-blue-200 shrink-0 flex items-center justify-center relative shadow-xs">
                  {currentUser?.photoUrl ? (
                    <img 
                      key={currentUser.photoUrl}
                      src={currentUser.photoUrl} 
                      alt={currentUser.fullName || currentUser.username}
                      className="w-full h-full object-cover" 
                      onError={(e) => { 
                        (e.target as HTMLElement).style.display = 'none';
                        const fallback = (e.target as HTMLElement).nextElementSibling;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center tracking-wider ${currentUser?.photoUrl ? 'hidden' : ''}`}>
                    {getUserInitials(currentUser?.fullName || currentUser?.username || 'Admin')}
                  </div>
                </div>

                {/* User Name & Role */}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-xs truncate">
                    {currentUser?.fullName || currentUser?.username || 'Utilisateur'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium capitalize truncate flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0"></span>
                    {currentUser?.role === 'admin' ? 'Administrateur' : currentUser?.role || 'Connecté'}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 px-3 py-2 w-full rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all font-bold text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Toggle Button for Left Sidebar (Desktop only) */}
        <button 
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className={`hidden lg:flex absolute top-6 z-30 bg-white p-2 border border-slate-200 text-slate-500 hover:text-slate-900 transition-all duration-300 shadow-sm items-center justify-center ${leftSidebarOpen ? 'right-0 translate-x-1/2 rounded-full w-8 h-8' : 'left-0 translate-x-4 rounded-xl'}`}
          aria-label={leftSidebarOpen ? 'Réduire le menu' : 'Agrandir le menu'}
        >
          {leftSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Mobile Sticky Top Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setLeftSidebarOpen(true)}
              className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo className="w-7 h-7 text-blue-600" />
              <span className="text-base font-black tracking-wider text-slate-900">FIT<span className="text-blue-600">VAULT</span></span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl overflow-hidden bg-blue-100 border border-blue-200 shrink-0 flex items-center justify-center relative shadow-xs">
              {currentUser?.photoUrl ? (
                <img 
                  key={currentUser.photoUrl}
                  src={currentUser.photoUrl} 
                  alt={currentUser.fullName || currentUser.username}
                  className="w-full h-full object-cover" 
                  onError={(e) => { 
                    (e.target as HTMLElement).style.display = 'none';
                    const fallback = (e.target as HTMLElement).nextElementSibling;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-black text-[11px] flex items-center justify-center tracking-wider ${currentUser?.photoUrl ? 'hidden' : ''}`}>
                {getUserInitials(currentUser?.fullName || currentUser?.username || 'Admin')}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Viewport */}
        <main className="flex-1 relative overflow-y-auto overflow-x-hidden min-w-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[30%] bg-blue-500 opacity-[0.03] blur-[150px] rounded-full pointer-events-none"></div>
          
          <div className="p-4 sm:p-6 lg:p-8 relative z-10 max-w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Right Sidebar - Attendance */}
      <AttendanceSidebar />

      {/* Global Barcode Scanner Listener */}
      <GlobalBarcodeListener />
    </div>
  );
}

import { Suspense } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
