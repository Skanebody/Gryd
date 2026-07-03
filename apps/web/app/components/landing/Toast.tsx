'use client';

/**
 * Toast global — pill bas-centre. Charte §F : slide-up NOIR (carbone), texte blanc,
 * accent chartreuse limité au dot « gain », auto-dismiss 2,5 s (token motion).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { motion } from '@klaim/shared';
import { useLang } from './LangProvider';
import styles from './Toast.module.css';

type ToastContextValue = { showToast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { copy } = useLang();

  const showToast = useCallback((next: string) => {
    setMessage(next);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), motion.toastDismissMs);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className={`${styles.toast} ${visible ? styles.visible : ''}`}
        role="status"
        aria-live="polite"
        aria-label={copy.toastAria}
      >
        {message ? (
          <>
            <span className={styles.dot} aria-hidden="true" />
            {message}
          </>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être appelé sous <ToastProvider>.');
  return ctx;
}
