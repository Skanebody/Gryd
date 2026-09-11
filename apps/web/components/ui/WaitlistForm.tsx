'use client';

/**
 * GRYD — LA LISTE D'ATTENTE (lot W2).
 *
 * Le SEUL formulaire du site, et il enregistre vraiment : il appelle la RPC
 * `waitlist_join` (migration 0034, `SECURITY DEFINER`, accordée à `anon`) via
 * `lib/waitlistJoin.ts`. Rien n'est confirmé avant le retour du serveur.
 *
 * ─── CE QUI A DISPARU DE L'ANCIEN FORMULAIRE ────────────────────────────────
 * Le seuil « ton quartier ouvre à 500 inscrits » (`WAITLIST_UNLOCK_THRESHOLD`)
 * ne s'affiche plus : les communes s'ouvrent par PRÉSENCE RÉELLE, dès la
 * première boucle fermée, et pas par un compteur d'inscrits. La constante reste
 * dans le code ; elle ne décrit plus rien de vivant.
 *
 * ─── QUATRE ÉTATS DISTINCTS, JAMAIS UN DE PLUS ──────────────────────────────
 *  · repos      — le formulaire, rien d'autre ;
 *  · en cours   — le bouton est occupé et désactivé, il le DIT (`aria-busy`) ;
 *  · échec      — un message qui nomme la cause, dans un `role="alert"` ;
 *  · succès     — le formulaire disparaît, remplacé par un `role="status"`.
 * Un « succès » sans insert réel serait le mensonge exact que la constitution
 * interdit : `joinWaitlist` ne renvoie `success` que sur un retour de RPC.
 */
import { useId, useState } from 'react';
import { joinWaitlist, type WaitlistFormState } from '../../lib/waitlistJoin';
import { CtaButton } from './CtaButton';
import styles from './WaitlistForm.module.css';

export interface WaitlistFormProps {
  readonly emailLabel: string;
  readonly postalLabel: string;
  readonly postalHelp: string;
  readonly submitLabel: string;
  readonly successMessage: string;
}

export function WaitlistForm({
  emailLabel,
  postalLabel,
  postalHelp,
  submitLabel,
  successMessage,
}: WaitlistFormProps) {
  const [state, setState] = useState<WaitlistFormState>({ status: 'idle' });
  const [busy, setBusy] = useState(false);
  const emailId = useId();
  const postalId = useId();
  const helpId = useId();

  if (state.status === 'success') {
    return (
      <p className={styles.success} role="status">
        {successMessage}
      </p>
    );
  }

  const failed = state.status === 'error';

  return (
    <form
      className={styles.form}
      aria-busy={busy || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (busy) return;
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setState({ status: 'idle' });
        void joinWaitlist(data)
          .then(setState)
          .finally(() => setBusy(false));
      }}
    >
      <div className={styles.fields}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={emailId}>
            {emailLabel}
          </label>
          <input
            className={styles.input}
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={failed || undefined}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={postalId}>
            {postalLabel}
          </label>
          <input
            className={styles.input}
            id={postalId}
            name="postal_code"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[0-9]{5}"
            maxLength={5}
            required
            aria-describedby={helpId}
            aria-invalid={failed || undefined}
          />
        </div>
      </div>

      <p className={styles.help} id={helpId}>
        {postalHelp}
      </p>

      <CtaButton type="submit" variant="primary" disabled={busy}>
        {submitLabel}
      </CtaButton>

      {failed ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
