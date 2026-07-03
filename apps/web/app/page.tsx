import { CITIES, DECAY_DAYS, HEX_LOCK_HOURS, MIN_AGE_YEARS } from '@klaim/shared';
import { HexMap } from './components/HexMap';
import { WaitlistForm } from './components/WaitlistForm';
import { WAITLIST_UNLOCK_THRESHOLD } from '../lib/waitlist';
import styles from './page.module.css';

const STEPS = [
  {
    index: '01',
    title: 'Cours',
    body: 'Lance une course, n’importe où dans ta ville. Ton tracé GPS dessine ta trace, rue après rue.',
  },
  {
    index: '02',
    title: 'Capture',
    body: `Chaque rue parcourue capture des hexagones de territoire réel. Ceux des crews adverses se volent — un hex fraîchement pris est involable ${HEX_LOCK_HOURS} h.`,
  },
  {
    index: '03',
    title: 'Défends',
    body: `Re-parcours ton quartier pour le tenir. ${DECAY_DAYS} jours sans y courir, et il redevient neutre — quelqu’un d’autre le prendra.`,
  },
] as const;

const CITY_NAMES = Object.values(CITIES)
  .map((city) => city.name)
  .join(' + ');

export default function Page() {
  return (
    <>
      <main className={styles.main}>
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.tag}>
              <span className={styles.dot} aria-hidden="true" />
              Saison 0 · {CITY_NAMES}
            </p>
            <h1 className={styles.title}>
              Cours.
              <br />
              Capture.
              <br />
              Défends.
            </h1>
            <p className={styles.subtitle}>
              Chaque foulée capture du territoire réel. Conquiers ton quartier hexagone par
              hexagone, vole ceux des crews adverses — et défends les tiens avant qu’ils ne
              s’effacent.
            </p>
            <p className={styles.heroHint}>
              <a className={styles.heroLink} href="#waitlist">
                Rejoindre la waitlist ↓
              </a>
            </p>
          </div>
          <div className={styles.heroMap}>
            <HexMap />
          </div>
        </section>

        {/* ── Comment ça marche ────────────────────────────────── */}
        <section className={styles.how} aria-labelledby="how-title">
          <p className={styles.sectionLab} id="how-title">
            Comment ça marche
          </p>
          <div className={styles.cards}>
            {STEPS.map((step) => (
              <article key={step.index} className={styles.card}>
                <p className={styles.cardIndex}>{step.index}</p>
                <h2 className={styles.cardTitle}>{step.title}</h2>
                <p className={styles.cardBody}>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Waitlist ─────────────────────────────────────────── */}
        <section className={styles.waitlist} id="waitlist" aria-labelledby="waitlist-title">
          <div className={styles.waitlistCard}>
            <p className={styles.sectionLab}>Waitlist</p>
            <h2 className={styles.waitlistTitle} id="waitlist-title">
              Prends ton quartier avant les autres.
            </h2>
            <p className={styles.waitlistSub}>
              Saison 0 : {CITY_NAMES}. Ta ville n’y est pas encore ? Inscris ton code postal —
              ton quartier ouvre à {WAITLIST_UNLOCK_THRESHOLD} inscrits.
            </p>
            <WaitlistForm />
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerBrand}>GRYD</p>
          <ul className={styles.footerLinks}>
            <li>Réservé aux {MIN_AGE_YEARS} ans et plus</li>
            <li>
              {/* TODO(légal) : page vie privée à rédiger (SPEC §7). */}
              <a className={styles.footerLink} href="#">
                Vie privée
              </a>
            </li>
            <li>SASU Nexus 1993</li>
          </ul>
        </div>
      </footer>
    </>
  );
}
