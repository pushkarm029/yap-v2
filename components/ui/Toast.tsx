'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const variants = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle size={20} className="text-green-600" />,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle size={20} className="text-red-600" />,
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: <Info size={20} className="text-blue-600" />,
    },
  };

  const variant = variants[type];

  return (
    <div
      className={`fixed top-4 right-4 z-[200] max-w-md animate-slide-in-right ${variant.bg} ${variant.border} border rounded-lg shadow-lg`}
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 mt-0.5">{variant.icon}</div>
        <p className={`flex-1 text-sm font-medium ${variant.text}`}>{message}</p>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${variant.text} hover:opacity-70 transition-opacity`}
          aria-label="Close notification"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
