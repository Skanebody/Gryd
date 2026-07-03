'use client';

/** Toast §F : slide-up noir, auto-dismiss 2,5 s. Un seul toast à la fois. */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import ui from './ui.module.css';

export function useToast(): { toast: ReactNode; showToast: (message: string) => void } {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const showToast = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2500);
  }, []);

  const toast = message
    ? (
      <div className={ui.toast} role="status">
        {message}
      </div>
    )
    : null;

  return { toast, showToast };
}
