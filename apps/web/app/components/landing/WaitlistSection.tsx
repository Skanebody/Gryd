'use client';

/**
 * Section Waitlist (#waitlist) : étend le formulaire existant (mêmes styles,
 * même server action joinWaitlist — email + code postal FR restent les seuls
 * champs persistés, SPEC §6.2). Pays/ville/profil sont des champs UI :
 * la table waitlist n'a pas ces colonnes → on ne les invente pas, on les
 * logge côté client en TODO(O1) au submit (cf. DISCOVERY point ouvert O1).
 */

import { useActionState, type FormEvent } from 'react';
import { CITIES } from '@klaim/shared';
import { joinWaitlist, type WaitlistFormState } from '../../actions';
import { FAKE_WAITLIST_COUNTS, WAITLIST_UNLOCK_THRESHOLD } from '../../../lib/waitlist';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import formStyles from '../WaitlistForm.module.css';
import styles from './WaitlistSection.module.css';

const initialState: WaitlistFormState = { status: 'idle' };

export function WaitlistSection() {
  const { copy, formatInt } = useLang();
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Ne bloque pas la server action : on logge seulement les champs UI
    // qui n'ont PAS de colonne en base (TODO O1 — projet Supabase).
    const data = new FormData(event.currentTarget);
    const extras = {
      country: String(data.get('country') ?? ''),
      city: String(data.get('city') ?? ''),
      profile: String(data.get('profile') ?? ''),
    };
    if (extras.country || extras.city || extras.profile) {
      console.info(
        '[waitlist] TODO(O1) : colonnes pays/ville/profil absentes de la table `waitlist` — valeurs UI non persistées :',
        extras,
      );
    }
  };

  return (
    <section id="waitlist" className={ui.section} aria-labelledby="waitlist-title">
      <div className={ui.inner}>
        <Reveal>
          <div className={`${ui.card} ${styles.panel}`}>
            <p className={ui.kicker}>{copy.waitlist.kicker}</p>
            <h2 id="waitlist-title" className={styles.title}>
              {copy.waitlist.title}
            </h2>
            <p className={styles.sub}>{copy.waitlist.sub}</p>

            {state.status === 'success' ? (
              <div className={formStyles.confirm} role="status">
                <p className={formStyles.confirmTitle}>{copy.waitlist.successTitle}</p>
                <p className={formStyles.confirmSub}>{copy.waitlist.successSub}</p>
                <ul className={formStyles.counters}>
                  {Object.values(CITIES).map((cityInfo) => {
                    const count = FAKE_WAITLIST_COUNTS[cityInfo.id];
                    const pct = Math.min(100, Math.round((count / WAITLIST_UNLOCK_THRESHOLD) * 100));
                    return (
                      <li key={cityInfo.id} className={formStyles.counter}>
                        <div className={formStyles.counterHead}>
                          <span className={formStyles.cityName}>{cityInfo.name}</span>
                          <span className={formStyles.cityCount}>
                            {formatInt(count)} / {formatInt(WAITLIST_UNLOCK_THRESHOLD)}
                          </span>
                        </div>
                        <div
                          className={formStyles.track}
                          role="progressbar"
                          aria-label={cityInfo.name}
                          aria-valuenow={count}
                          aria-valuemin={0}
                          aria-valuemax={WAITLIST_UNLOCK_THRESHOLD}
                        >
                          <div className={formStyles.fill} style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <form action={formAction} onSubmit={onSubmit} className={styles.form}>
                <div className={styles.fields}>
                  <label className={formStyles.field}>
                    <span className={formStyles.label}>{copy.waitlist.email}</span>
                    <input
                      className={formStyles.input}
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder={copy.waitlist.emailPlaceholder}
                      required
                    />
                  </label>
                  <label className={formStyles.field}>
                    <span className={formStyles.label}>{copy.waitlist.postal}</span>
                    <input
                      className={formStyles.input}
                      type="text"
                      name="postal_code"
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      maxLength={5}
                      autoComplete="postal-code"
                      placeholder="75018"
                      required
                    />
                    <span className={styles.help}>{copy.waitlist.postalHelp}</span>
                  </label>
                  <label className={formStyles.field}>
                    <span className={formStyles.label}>{copy.waitlist.country}</span>
                    <select className={`${formStyles.input} ${styles.select}`} name="country" defaultValue={copy.waitlist.countries[0]}>
                      {copy.waitlist.countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={formStyles.field}>
                    <span className={formStyles.label}>{copy.waitlist.city}</span>
                    <input
                      className={formStyles.input}
                      type="text"
                      name="city"
                      autoComplete="address-level2"
                      placeholder={copy.waitlist.cityPlaceholder}
                    />
                  </label>
                  <label className={`${formStyles.field} ${styles.fullRow}`}>
                    <span className={formStyles.label}>{copy.waitlist.profile}</span>
                    <select className={`${formStyles.input} ${styles.select}`} name="profile" defaultValue={copy.waitlist.profiles[0]}>
                      {copy.waitlist.profiles.map((profile) => (
                        <option key={profile} value={profile}>
                          {profile}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* CTA chartreuse unique de la section (styles du form existant). */}
                <button className={formStyles.submit} type="submit" disabled={pending}>
                  {pending ? copy.waitlist.submitting : copy.waitlist.submit}
                </button>

                {state.status === 'error' ? (
                  <p className={formStyles.error} role="alert">
                    {state.message}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
