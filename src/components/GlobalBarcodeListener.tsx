"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Scan, 
  User, 
  UserCheck, 
  LogOut, 
  ExternalLink, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  CreditCard 
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { playScanSuccessSound, playScanErrorSound } from '@/lib/sound';
import { formatCurrency } from '@/lib/formatters';

export function GlobalBarcodeListener() {
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  const [scannedMember, setScannedMember] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  // Barcode keystroke buffer
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept barcodes on the vente / POS page (it handles its own scanning)
      if (pathname?.includes('/vente')) {
        bufferRef.current = '';
        return;
      }

      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isInput) {
        bufferRef.current = '';
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 3) {
          const barcode = bufferRef.current.trim();
          bufferRef.current = '';
          handleBarcodeDetected(barcode);
        }
        bufferRef.current = '';
        return;
      }

      // If key is printable character (letters, numbers)
      if (e.key.length === 1) {
        // Barcode scanners type very quickly (typically < 45ms per character)
        if (timeDiff > 100 && !isInput) {
          // Reset buffer if delay too long outside input
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeDetected = async (barcode: string) => {
    try {
      const res = await fetch(`/api/members`);
      if (!res.ok) return;

      const members = await res.json();
      const found = members.find((m: any) => 
        String(m.barcode).trim() === barcode || 
        String(m.phone).trim() === barcode ||
        String(m.id) === barcode
      );

      if (found) {
        playScanSuccessSound();
        setPhotoError(false);
        setScannedMember(found);
        setModalOpen(true);
        showToast(`Code-barres détecté : ${found.first_name} ${found.last_name}`, 'info');
      } else if (!pathname?.includes('/boutique') && !pathname?.includes('/vente') && !pathname?.includes('/produits') && !pathname?.includes('/products')) {
        playScanErrorSound();
        showToast(`Aucun membre trouvé pour le code : ${barcode}`, 'warning');
      }
    } catch (err) {
      playScanErrorSound();
      console.error('Barcode lookup error:', err);
    }
  };

  const handleCheckIn = async () => {
    if (!scannedMember) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: scannedMember.barcode })
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
        setModalOpen(false);
      } else {
        playScanErrorSound();
        showToast(data.error || 'Erreur lors du pointage', 'error');
      }
    } catch (err) {
      playScanErrorSound();
      showToast('Erreur inattendue', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleGoToProfile = () => {
    if (!scannedMember) return;
    setModalOpen(false);
    router.push(`/members/${scannedMember.id}`);
  };

  if (!modalOpen || !scannedMember) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scan className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Scan Badge Détecté</h3>
          </div>
          <button
            onClick={() => setModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member preview card */}
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-xs flex-shrink-0">
            {scannedMember.photo_url && !photoError ? (
              <img 
                src={scannedMember.photo_url} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={() => setPhotoError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-1 text-center w-full h-full bg-slate-100">
                <User className="w-7 h-7 text-slate-300" />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Indisponible</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-black text-slate-900 text-base uppercase truncate">
              {scannedMember.first_name} {scannedMember.last_name}
            </h4>
            <p className="text-xs text-slate-500 font-mono">Code #{scannedMember.barcode}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-xs font-bold ${parseFloat(scannedMember.total_debt) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                Dette: {formatCurrency(scannedMember.total_debt, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-2.5">
          <button
            onClick={handleCheckIn}
            disabled={loadingAction}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <UserCheck className="w-4 h-4" />
            Pointer Entrée / Vérifier Abonnement
          </button>

          <button
            onClick={handleGoToProfile}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ouvrir Dossier Membre Complet
          </button>
        </div>
      </div>
    </div>
  );
}
