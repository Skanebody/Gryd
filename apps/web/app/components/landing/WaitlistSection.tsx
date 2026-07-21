'use client';

/**
 * Section Waitlist (#waitlist) — la PORTE DE LA SAISON 0.
 *
 * ZÉRO DONNÉE FABRIQUÉE (décision fondateur 21/07/2026). Ont été retirés :
 * - « 173 places restantes · Vague 1 · 173 / 500 » et sa jauge remplie à 65 % :
 *   une rareté inventée, c'est-à-dire une pression à l'inscription fondée sur
 *   rien. C'est le pire cas de la page : ça pousse à agir avec un faux motif ;
 * - les barres « les villes se remplissent » (Paris 327/500, Lille 141/500),
 *   affichées AVANT et APRÈS inscription, alimentées par FAKE_WAITLIST_COUNTS.
 *
 * Ce qui reste est vrai : le SEUIL annoncé (un quartier ouvre à
 * WAITLIST_UNLOCK_THRESHOLD inscrits) est une règle publiée, pas une mesure ;
 * et ce que gardent les fondateurs est une promesse produit, pas un chiffre.
 * Aucun compteur ne reviendra tant que le compte réel ne sera pas lisible.
 *
 * Le FORMULAIRE est INCHANGÉ côté backend : même server action joinWaitlist,
 * mêmes champs requis email + code postal (SPEC §6.2). Pays/ville/profil
 * restent des champs UI loggés en TODO(O1) au submit (cf. DISCOVERY O1).
 */

import { useActionState, type FormEvent } from 'react';
import { CITIES, SEASON_DURATION_WEEKS } from '@klaim/shared';
import { joinWaitlist, type WaitlistFormState } from '../../actions';
import { WAITLIST_UNLOCK_THRESHOLD } from '../../../lib/waitlist';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import formStyles from '../WaitlistForm.module.css';
import styles from './WaitlistSection.module.css';

const initialState: WaitlistFormState = { status: 'idle' };

/** Villes seedées de la Saison 0 — décision produit, pas mesure d'audience. */
const SEASON0_CITY_NAMES = Object.values(CITIES).map((city) => city.name);

/** i18n locale au composant (AMENDEMENT-05 §4) — l'intégrateur peut consolider dans dictionary.ts. */
const STRINGS = {
  fr: {
    seasonTitle: 'Saison 0 — Fondateurs',
    perWave: 'inscrits et ton quartier ouvre',
    seasonWeeks: 'semaines de saison',
    franceFirst: 'France ouverte en premier',
    sub: 'Débloque le badge Saison 0. Crée ton crew avant l’ouverture officielle.',
    ruleLabel: 'La règle d’ouverture',
    ruleText: (n: string) =>
      `Un quartier ouvre quand ${n} personnes s’y sont inscrites. On n’affiche pas où en est le compteur tant qu’on ne peut pas l’afficher pour de vrai — pas de fausse file d’attente, pas de fausses places restantes.`,
    citiesLabel: 'Villes ouvertes en premier',
    benefitsLabel: 'Ce que les fondateurs gardent à vie',
    benefits: ['Badge Saison 0 permanent', 'Crew avant l’ouverture', 'Skin jamais réédité'],
  },
  en: {
    seasonTitle: 'Season 0 — Founders',
    perWave: 'sign-ups and your neighbourhood opens',
    seasonWeeks: 'week season',
    franceFirst: 'France opens first',
    sub: 'Unlock the Season 0 badge. Build your crew before the official opening.',
    ruleLabel: 'The opening rule',
    ruleText: (n: string) =>
      `A neighbourhood opens once ${n} people have signed up there. We do not show where that counter stands until we can show it for real — no fake queue, no fake remaining seats.`,
    citiesLabel: 'Cities opening first',
    benefitsLabel: 'What founders keep for life',
    benefits: ['Permanent Season 0 badge', 'Crew before the opening', 'Never-reissued skin'],
  },
} as const;

export function WaitlistSection() {
  const { lang, copy, formatInt } = useLang();
  const s = STRINGS[lang];
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

  /* Trois faits, trois sources vérifiables : un seuil produit publié, une règle
     de jeu de @klaim/shared, une décision de périmètre. Aucun décompte. */
  const seasonFacts = [
    `${formatInt(WAITLIST_UNLOCK_THRESHOLD)} ${s.perWave}`,
    `${formatInt(SEASON_DURATION_WEEKS)} ${s.seasonWeeks}`,
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

            {/* La RÈGLE d'ouverture remplace le faux décompte de places. */}
            <div className={styles.ruleBox}>
              <p className={ui.monoLabel}>{s.ruleLabel}</p>
              <p className={styles.ruleText}>{s.ruleText(formatInt(WAITLIST_UNLOCK_THRESHOLD))}</p>
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
                {/* Confirmation NUE : tu es inscrit, on t'écrira. Aucune jauge de
                    ville : on ne connaît pas encore le compte, on ne l'invente pas. */}
              </div>
            ) : (
              <>
                {/* Les villes de la Saison 0, NOMMÉES — sans jauge de remplissage :
                    dire lesquelles ouvrent est vrai, dire combien s'y sont
                    inscrits ne l'était pas. */}
                <div className={styles.cities}>
                  <p className={ui.monoLabel}>{s.citiesLabel}</p>
                  <ul className={styles.cityList}>
                    {SEASON0_CITY_NAMES.map((cityName) => (
                      <li key={cityName} className={styles.cityChip}>
                        {cityName}
                      </li>
                    ))}
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
