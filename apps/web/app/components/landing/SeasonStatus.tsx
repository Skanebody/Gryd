'use client';

/**
 * Bandeau « Saison 0 » du hero — REMPLACE l'ancien SeasonCountdown.
 *
 * L'ancien composant affichait « J-18 · 30 crews inscrits · 1 240 runners en
 * attente » avec une horloge qui tournait. Rien de tout cela n'était réel :
 * ni le décompte (il repartait de 18 jours à chaque chargement de page), ni les
 * crews, ni les runners. Sur une page publique, ces chiffres n'étaient pas une
 * « démo » — c'était une fausse preuve sociale.
 *
 * Ce qui s'affiche ici est vrai, vérifiable, et ne prétend rien mesurer :
 * - la Saison 0 n'a pas encore ouvert (état, pas chiffre) ;
 * - elle ouvre d'abord sur les villes seedées (CITIES, @klaim/shared) ;
 * - une saison dure SEASON_DURATION_WEEKS semaines (règle de jeu réelle).
 * Aucune date de lancement n'est annoncée tant qu'elle n'est pas décidée.
 */

import { CITIES, SEASON_DURATION_WEEKS } from '@klaim/shared';
import { useLang } from './LangProvider';
import styles from './SeasonStatus.module.css';

const CITY_NAMES = Object.values(CITIES).map((city) => city.name);

const STRINGS = {
  fr: {
    season: 'Saison 0',
    state: 'Pas encore ouverte',
    cities: (list: string) => `${list} en premier`,
    weeks: (n: string) => `${n} semaines de saison`,
    note: 'La date d’ouverture est annoncée aux inscrits, jamais avant qu’elle soit sûre.',
  },
  en: {
    season: 'Season 0',
    state: 'Not open yet',
    cities: (list: string) => `${list} first`,
    weeks: (n: string) => `${n}-week season`,
    note: 'The opening date goes to the waitlist first — never before it is certain.',
  },
} as const;

export function SeasonStatus() {
  const { lang, formatInt } = useLang();
  const S = STRINGS[lang];
  const cityList = CITY_NAMES.join(' · ');

  return (
    <div className={styles.strip}>
      <span className={styles.chip}>
        <span className={styles.chipDot} aria-hidden="true" />
        {S.season}
      </span>

      <span className={styles.state}>{S.state}</span>

      <span className={styles.sep} aria-hidden="true" />

      <span className={styles.meta}>{S.cities(cityList)}</span>
      <span className={styles.meta}>{S.weeks(formatInt(SEASON_DURATION_WEEKS))}</span>

      <p className={styles.note}>{S.note}</p>
    </div>
  );
}
