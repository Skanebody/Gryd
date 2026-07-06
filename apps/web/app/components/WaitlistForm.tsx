'use client';

import { useActionState, useEffect } from 'react';
import { CITIES, EVENTS } from '@klaim/shared';
import { joinWaitlist, type WaitlistFormState } from '../actions';
import { trackWeb } from '../lib/analytics';
import { FAKE_WAITLIST_COUNTS, WAITLIST_UNLOCK_THRESHOLD } from '../../lib/waitlist';
import styles from './WaitlistForm.module.css';

const initialState: WaitlistFormState = { status: 'idle' };

export function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);

  // Conversion waitlist = l'event §8 le plus important du site (landing → inscrit).
  useEffect(() => {
    if (state.status === 'success') trackWeb(EVENTS.waitlistJoined);
  }, [state.status]);

  if (state.status === 'success') {
    return (
      <div className={styles.confirm} role="status">
        <p className={styles.confirmTitle}>
          Ton quartier ouvre à {WAITLIST_UNLOCK_THRESHOLD} inscrits.
        </p>
        <p className={styles.confirmSub}>Tu es sur la liste. On t’écrit quand ça débloque.</p>
        <ul className={styles.counters}>
          {Object.values(CITIES).map((city) => {
            const count = FAKE_WAITLIST_COUNTS[city.id];
            const pct = Math.min(100, Math.round((count / WAITLIST_UNLOCK_THRESHOLD) * 100));
            return (
              <li key={city.id} className={styles.counter}>
                <div className={styles.counterHead}>
                  <span className={styles.cityName}>{city.name}</span>
                  <span className={styles.cityCount}>
                    {count} / {WAITLIST_UNLOCK_THRESHOLD}
                  </span>
                </div>
                <div
                  className={styles.track}
                  role="progressbar"
                  aria-label={`Inscrits à ${city.name}`}
                  aria-valuenow={count}
                  aria-valuemin={0}
                  aria-valuemax={WAITLIST_UNLOCK_THRESHOLD}
                >
                  <div className={styles.fill} style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>E-mail</span>
          <input
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="toi@exemple.fr"
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Code postal</span>
          <input
            className={styles.input}
            type="text"
            name="postal_code"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            autoComplete="postal-code"
            placeholder="75018"
            required
          />
        </label>
      </div>
      {/* 1 seul CTA chartreuse par écran (addendum §C.3 / §F) */}
      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Inscription…' : 'Prendre mon quartier'}
      </button>
      {state.status === 'error' ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
