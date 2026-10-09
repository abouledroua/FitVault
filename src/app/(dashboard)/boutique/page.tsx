"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, RefreshCw } from 'lucide-react';

export default function BoutiqueRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/vente');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-4">
      <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl animate-pulse">
        <ShoppingCart className="w-8 h-8" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-800">Redirection vers le Point de Vente...</h2>
        <p className="text-xs text-slate-400 mt-1">
          La boutique a été séparée en deux sections distinctes : "Point de Vente" et "Produits & Stock".
        </p>
      </div>
      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
    </div>
  );
}
