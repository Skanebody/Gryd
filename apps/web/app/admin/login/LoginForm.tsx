'use client';

import { useActionState } from 'react';
import { loginAdmin, type LoginState } from '../auth';
import styles from './login.module.css';

const initialState: LoginState = { status: 'idle' };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <label className={styles.label} htmlFor="admin-email">
        E-mail
      </label>
      <input
        id="admin-email"
        className={styles.input}
        type="email"
        name="email"
        autoComplete="username"
        placeholder="admin@gryd.run"
        required
      />
      <label className={styles.label} htmlFor="admin-password">
        Mot de passe
      </label>
      <input
        id="admin-password"
        className={styles.input}
        type="password"
        name="password"
        autoComplete="current-password"
        required
      />
      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <button className={styles.submit} type="submit" disabled={pending}>
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  );
}
