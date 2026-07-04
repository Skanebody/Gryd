'use client';

/**
 * FAQ accordéon accessible (boutons aria-expanded/aria-controls, panneaux
 * role=region + hidden). AMENDEMENT-05 §3.12 : les 4 questions historiques
 * (dictionary.ts) + 6 questions GAMEPLAY dont les réponses sont construites
 * depuis les VRAIES règles @klaim/shared (lock 24 h, decay 21 j, saison
 * 8 semaines, bouclier 2/sem, seuils mode Guerre, pionnier, Verify) —
 * aucun nombre de règle en dur.
 */

import { useState } from 'react';
import {
  DECAY_DAYS,
  HEX_LOCK_HOURS,
  INTERSEASON_DAYS,
  OUTPOST_MIN_HEXES,
  OUTPOST_RADIUS_KM,
  POINTS_NEUTRAL_HEX,
  POINTS_PIONEER_BONUS_BY_DENSITY,
  POINTS_STOLEN_HEX,
  RUN_AVG_PACE_MAX_S_KM,
  RUN_AVG_PACE_MIN_S_KM,
  SEASON_DURATION_WEEKS,
  SEGMENT_PACE_MAX_S_KM,
  SEGMENT_PACE_MIN_S_KM,
  SHIELD_DURATION_HOURS,
  SHIELD_MAX_ACTIVE_PER_WEEK,
  WAR_MODE_MIN_ACTIVE_RUNNERS,
  WAR_MODE_RADIUS_KM,
  WAR_MODE_WINDOW_DAYS,
} from '@klaim/shared';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './FaqSection.module.css';

function formatPace(secondsPerKm: number): string {
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = secondsPerKm % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * i18n locale au composant (AMENDEMENT-05 §4). Les valeurs de règles sont
 * interpolées depuis @klaim/shared au chargement du module (déterministe).
 */
const STRINGS = {
  fr: {
    items: [
      {
        q: 'Comment je prends un quartier ?',
        a: `Tu cours dedans, littéralement. Chaque zone traversée par ta trace GPS bascule dans ton camp à la fin de la course. Une zone fraîchement capturée est verrouillée ${HEX_LOCK_HOURS} h — involable, le temps de savourer. Ensuite, entretiens-la : une zone que personne ne re-court pendant ${DECAY_DAYS} jours redevient neutre.`,
      },
      {
        q: 'Comment mon crew gagne une saison ?',
        a: `Une saison dure ${SEASON_DURATION_WEEKS} semaines. Chaque course d’un membre ajoute des points et des zones au total du crew ; le classement de fin de saison sacre les vainqueurs par ville et par secteur. Puis la carte est remise à zéro (${INTERSEASON_DAYS} jours d’intersaison) — les badges, les titres et l’XP restent à vie.`,
      },
      {
        q: 'Que se passe-t-il si on me vole une zone ?',
        a: `Tu reçois une notification et un raccourci revanche : re-cours la zone pour la reprendre — une zone volée rapporte d’ailleurs ${POINTS_STOLEN_HEX} points contre ${POINTS_NEUTRAL_HEX} pour une neutre. Tes captures fraîches restent involables ${HEX_LOCK_HOURS} h, et tu peux poser un bouclier de ${SHIELD_DURATION_HOURS} h sur un secteur — maximum ${SHIELD_MAX_ACTIVE_PER_WEEK} par semaine, pour que défendre reste un choix tactique.`,
      },
      {
        q: 'Comment une ville passe en mode Guerre ?',
        a: `Dès que ${WAR_MODE_MIN_ACTIVE_RUNNERS} coureurs sont actifs sur ${WAR_MODE_WINDOW_DAYS} jours dans un rayon de ${WAR_MODE_RADIUS_KM} km, la zone bascule en mode Guerre : raids, alertes de vol en direct et titres de secteur s’activent. Sous ce seuil, la zone reste en exploration — on n’impose pas le PvP à un village.`,
      },
      {
        q: 'Je peux jouer en campagne ?',
        a: `Oui — et c’est même un avantage. Une zone jamais possédée rapporte un bonus pionnier, jusqu’à +${POINTS_PIONEER_BONUS_BY_DENSITY.pioneer} points en zone pionnière ou sauvage. À partir de ${OUTPOST_MIN_HEXES} zones dans un rayon de ${OUTPOST_RADIUS_KM} km, tu fondes un avant-poste visible sur la carte de France. L’exploration écrit la carte autant que la guerre.`,
      },
      {
        q: 'Comment fonctionne GRYD Verify ?',
        a: `Chaque course est vérifiée côté serveur : signal GPS, cohérence du mouvement et allure. Une allure moyenne hors de ${formatPace(RUN_AVG_PACE_MIN_S_KM)}–${formatPace(RUN_AVG_PACE_MAX_S_KM)} min/km ne capture rien ; un segment couru hors de ${formatPace(SEGMENT_PACE_MIN_S_KM)}–${formatPace(SEGMENT_PACE_MAX_S_KM)} min/km est exclu du claim sans annuler la course. Résultat : course validée, partielle (seuls les segments propres capturent) ou signalée.`,
      },
    ],
  },
  en: {
    items: [
      {
        q: 'How do I take a district?',
        a: `You run through it, literally. Every zone your GPS trace crosses flips to your side when the run ends. A freshly captured zone is locked for ${HEX_LOCK_HOURS} h — unstealable while you savour it. Then keep it alive: a zone nobody re-runs for ${DECAY_DAYS} days turns neutral again.`,
      },
      {
        q: 'How does my crew win a season?',
        a: `A season lasts ${SEASON_DURATION_WEEKS} weeks. Every member’s run adds points and zones to the crew total; the end-of-season ranking crowns the winners per city and per sector. Then the map resets (${INTERSEASON_DAYS} days of off-season) — badges, titles and XP are yours for life.`,
      },
      {
        q: 'What happens if someone steals my zone?',
        a: `You get a notification and a revenge shortcut: re-run the zone to take it back — a stolen zone is worth ${POINTS_STOLEN_HEX} points versus ${POINTS_NEUTRAL_HEX} for a neutral one. Your fresh captures stay unstealable for ${HEX_LOCK_HOURS} h, and you can drop a ${SHIELD_DURATION_HOURS} h shield on a sector — capped at ${SHIELD_MAX_ACTIVE_PER_WEEK} per week, so defending stays a tactical choice.`,
      },
      {
        q: 'How does a city switch to War mode?',
        a: `As soon as ${WAR_MODE_MIN_ACTIVE_RUNNERS} runners are active over ${WAR_MODE_WINDOW_DAYS} days within a ${WAR_MODE_RADIUS_KM} km radius, the zone flips to War mode: raids, live theft alerts and sector titles switch on. Below that threshold the zone stays in exploration — no forced PvP on a village.`,
      },
      {
        q: 'Can I play in the countryside?',
        a: `Yes — it’s even an advantage. A never-owned zone grants a pioneer bonus, up to +${POINTS_PIONEER_BONUS_BY_DENSITY.pioneer} points in pioneer or wild zones. From ${OUTPOST_MIN_HEXES} zones within a ${OUTPOST_RADIUS_KM} km radius you found an outpost, visible on the map of France. Exploration writes the map as much as war does.`,
      },
      {
        q: 'How does GRYD Verify work?',
        a: `Every run is verified server-side: GPS signal, motion consistency and pace. An average pace outside ${formatPace(RUN_AVG_PACE_MIN_S_KM)}–${formatPace(RUN_AVG_PACE_MAX_S_KM)} min/km captures nothing; a segment run outside ${formatPace(SEGMENT_PACE_MIN_S_KM)}–${formatPace(SEGMENT_PACE_MAX_S_KM)} min/km is excluded from the claim without voiding the run. Outcome: a run is valid, partial (only clean segments capture) or flagged.`,
      },
    ],
  },
} as const;

export function FaqSection() {
  const { lang, copy } = useLang();
  const [open, setOpen] = useState<number | null>(0);

  // 4 questions historiques (dictionary) + 6 questions gameplay (locales).
  const items: ReadonlyArray<{ q: string; a: string }> = [
    ...copy.faq.items.map((item) => ({
      q: item.q,
      a: item.a
        .replace('{min}', formatPace(RUN_AVG_PACE_MIN_S_KM))
        .replace('{max}', formatPace(RUN_AVG_PACE_MAX_S_KM)),
    })),
    ...STRINGS[lang].items,
  ];

  return (
    <section className={ui.section} aria-labelledby="faq-title">
      <div className={`${ui.inner} ${styles.narrow}`}>
        <Reveal>
          <p className={ui.kicker}>{copy.faq.kicker}</p>
          <h2 id="faq-title" className={ui.sectionTitle}>
            {copy.faq.title}
          </h2>
        </Reveal>

        <div className={styles.list}>
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delayMs={i * 60}>
                <div className={styles.item}>
                  <h3 className={styles.question}>
                    <button
                      type="button"
                      id={`faq-btn-${i}`}
                      className={styles.trigger}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span>{item.q}</span>
                      <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        </svg>
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    className={styles.panel}
                    hidden={!isOpen}
                  >
                    <p className={styles.answer}>{item.a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
