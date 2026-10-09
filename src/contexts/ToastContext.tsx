"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl border min-w-[320px] max-w-md transform transition-all duration-300 translate-y-0 opacity-100
              ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : ''}
              ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : ''}
              ${toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : ''}
              ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
            {toast.type === 'error' && <XCircle className="w-6 h-6 text-red-500" />}
            {toast.type === 'warning' && <AlertCircle className="w-6 h-6 text-amber-500" />}
            {toast.type === 'info' && <Info className="w-6 h-6 text-blue-500" />}
            
            <p className="font-semibold flex-1 text-sm">{toast.message}</p>
            
            <button onClick={() => removeToast(toast.id)} className="opacity-50 hover:opacity-100 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
