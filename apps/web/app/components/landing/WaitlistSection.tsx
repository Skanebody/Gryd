'use client';

/**
 * Section Waitlist (#waitlist) — AMENDEMENT-05 §3.11 : la waitlist devient la
 * PORTE DE LA SAISON 0 (« Saison 0 — Fondateurs · accès par vagues · crews
 * fondateurs · France ouverte en premier »), avec compteur de places restantes
 * (fictif assumé : 173/500 vague 1), bénéfices fondateur en chips et barres
 * de remplissage par ville.
 *
 * Le FORMULAIRE est INCHANGÉ côté backend : même server action joinWaitlist,
 * mêmes champs requis email + code postal (SPEC §6.2). Pays/ville/profil
 * restent des champs UI loggés en TODO(O1) au submit (cf. DISCOVERY O1).
 */

import { useActionState, type FormEvent } from 'react';
import { CITIES } from '@klaim/shared';
import { joinWaitlist, type WaitlistFormState } from '../../actions';
import { WAVE } from '../../../lib/landing';
import { FAKE_WAITLIST_COUNTS, WAITLIST_UNLOCK_THRESHOLD } from '../../../lib/waitlist';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import { useReveal } from './useReveal';
import { useCountUp } from './useCountUp';
import ui from './ui.module.css';
import formStyles from '../WaitlistForm.module.css';
import styles from './WaitlistSection.module.css';

const initialState: WaitlistFormState = { status: 'idle' };

// Données de démo de la porte de saison : WAVE (lib/landing — fictives
// assumées, déterministes ; size = WAITLIST_UNLOCK_THRESHOLD, founderCrews =
// SEASON0.crews : sources uniques AMENDEMENT-05 §4).

/** i18n locale au composant (AMENDEMENT-05 §4) — l'intégrateur peut consolider dans dictionary.ts. */
const STRINGS = {
  fr: {
    seasonTitle: 'Saison 0 — Fondateurs',
    perWave: 'accès par vague',
    founderCrews: 'crews fondateurs',
    franceFirst: 'France ouverte en premier',
    sub: 'Débloque le badge Saison 0. Crée ton crew avant l’ouverture officielle.',
    spotsLeft: 'places restantes',
    wave: 'Vague',
    waveBarAria: 'Remplissage de la vague',
    benefitsLabel: 'Ce que les fondateurs gardent à vie',
    benefits: ['Badge Saison 0 permanent', 'Crew avant l’ouverture', 'Skin jamais réédité'],
    citiesLabel: 'Les villes se remplissent',
  },
  en: {
    seasonTitle: 'Season 0 — Founders',
    perWave: 'access spots per wave',
    founderCrews: 'founder crews',
    franceFirst: 'France opens first',
    sub: 'Unlock the Season 0 badge. Build your crew before the official opening.',
    spotsLeft: 'spots left',
    wave: 'Wave',
    waveBarAria: 'Wave fill',
    benefitsLabel: 'What founders keep for life',
    benefits: ['Permanent Season 0 badge', 'Crew before the opening', 'Never-reissued skin'],
    citiesLabel: 'Cities are filling up',
  },
} as const;

export function WaitlistSection() {
  const { lang, copy, formatInt } = useLang();
  const s = STRINGS[lang];
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState);

  // Compteur de places : décompte animé démarré côté client à l'apparition
  // (useCountUp gère prefers-reduced-motion → valeur affichée directement).
  const counter = useReveal<HTMLDivElement>();
  const spotsShown = useCountUp(WAVE.spotsLeft, counter.shown);
  const takenPct = Math.round(((WAVE.size - WAVE.spotsLeft) / WAVE.size) * 100);

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

  const seasonFacts = [
    `${formatInt(WAVE.size)} ${s.perWave}`,
    `${formatInt(WAVE.founderCrews)} ${s.founderCrews}`,
    s.franceFirst,
  ];

  return (
    <section id="waitlist" className={ui.section} aria-labelledby="waitlist-title">
      <div className={ui.inner}>
        <Reveal>
          <div className={`${ui.card} ${styles.panel}`}>
            <p className={ui.kicker}>{copy.waitlist.kicker}</p>

            {/* Bandeau porte de saison — mono, neutre (le chartreuse reste au CTA). */}
            <p className={styles.seasonStrip}>
              <span className={styles.seasonName}>{s.seasonTitle}</span>
              {seasonFacts.map((fact) => (
                <span key={fact} className={styles.seasonFact}>
                  <span aria-hidden="true" className={styles.seasonDot}>
                    ·
                  </span>
                  {fact}
                </span>
              ))}
            </p>

            <h2 id="waitlist-title" className={styles.title}>
              {copy.waitlist.title}
            </h2>
            <p className={styles.sub}>{s.sub}</p>

            {/* Compteur de places restantes (fictif assumé : 173/500 vague 1). */}
            <div ref={counter.ref} className={styles.counterRow}>
              <div className={styles.spots}>
                <span className={styles.spotsNum}>{formatInt(spotsShown)}</span>
                <span className={styles.spotsLabel}>{s.spotsLeft}</span>
              </div>
              <div className={styles.waveMeta}>
                <div className={styles.waveHead}>
                  <span className={styles.waveName}>
                    {s.wave} {formatInt(WAVE.number)}
                  </span>
                  <span className={styles.waveCount}>
                    {formatInt(WAVE.spotsLeft)} / {formatInt(WAVE.size)}
                  </span>
                </div>
                <div
                  className={styles.waveTrack}
                  role="progressbar"
                  aria-label={s.waveBarAria}
                  aria-valuenow={takenPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={styles.waveFill}
                    style={{ width: counter.shown ? `${takenPct}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            {/* Bénéfices fondateur — 3 chips (cohérent SPEC §3.6 : reset saisonnier,
                badges/titres permanents). Point or = badge Fondateur (état de jeu,
                usage --or autorisé par AMENDEMENT-05 §1). */}
            <p className={ui.monoLabel}>{s.benefitsLabel}</p>
            <ul className={styles.chips}>
              {s.benefits.map((benefit, i) => (
                <li key={benefit} className={styles.chip}>
                  <span
                    aria-hidden="true"
                    className={`${styles.chipDot} ${i === 0 ? styles.chipDotOr : ''}`}
                  />
                  {benefit}
                </li>
              ))}
            </ul>

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
              <>
                {/* Barres villes conservées : visibles AVANT inscription (villes
                    qui se remplissent), mêmes styles que l'état succès. */}
                <div className={styles.cities}>
                  <p className={ui.monoLabel}>{s.citiesLabel}</p>
                  <ul className={`${formStyles.counters} ${styles.cityList}`}>
                    {Object.values(CITIES).map((cityInfo) => {
                      const count = FAKE_WAITLIST_COUNTS[cityInfo.id];
                      const pct = Math.min(
                        100,
                        Math.round((count / WAITLIST_UNLOCK_THRESHOLD) * 100),
                      );
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
                      <select
                        className={`${formStyles.input} ${styles.select}`}
                        name="country"
                        defaultValue={copy.waitlist.countries[0]}
                      >
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
                      <select
                        className={`${formStyles.input} ${styles.select}`}
                        name="profile"
                        defaultValue={copy.waitlist.profiles[0]}
                      >
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
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
