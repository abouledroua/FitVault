"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolvePromise, setResolvePromise] = useState<(value: boolean) => void>(() => {});

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    resolvePromise(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    resolvePromise(false);
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      
      {isOpen && options && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${options.isDestructive !== false ? 'bg-red-100' : 'bg-blue-100'}`}>
                  <AlertTriangle className={`w-6 h-6 ${options.isDestructive !== false ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{options.title}</h3>
                </div>
              </div>
              <p className="text-slate-600 mb-6">
                {options.message}
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {options.cancelText || 'Annuler'}
                </button>
                <button 
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 rounded-xl font-bold text-white shadow-md transition-colors ${
                    options.isDestructive !== false 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {options.confirmText || 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext);
  if (context === undefined) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
}
