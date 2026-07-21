/**
 * GRYD — copy PROPRE au partage (états d'honnêteté de la carte).
 *
 * Ces Entries respectent la règle i18n du projet (5 langues, parité forcée par
 * le type `Entry`) mais vivent ici plutôt que dans `i18n/catalog/result.ts` :
 * ce lot est produit en parallèle d'autres agents qui écrivent dans ce
 * catalogue partagé. TODO : les remonter dans `i18n/catalog/result.ts` au
 * prochain passage mono-agent (aucun changement de texte à prévoir).
 *
 * Elles couvrent le SEUL cas que le partage ne savait pas dire : « le tracé de
 * cette course n'est pas connu ». Avant, la carte de la card se contentait de ne
 * rien dessiner → un carré entièrement vide, sans explication (état vide ≠ écran
 * blanc). Ici la card dit ce qu'elle ne peut pas montrer, et garde ses chiffres.
 */
import { defineCatalog } from '../../i18n/types';

export const SHARE_COPY = defineCatalog({
  /**
   * Placeholder de la mini-carte quand le tracé de CE run est inconnu (le
   * Résultat arme `trace: []` pour une vraie course : ingest_run ne renvoie pas
   * encore la géométrie). Court — il s'affiche dans une card exportable.
   */
  traceUnavailable: {
    fr: 'Tracé indisponible',
    en: 'Route unavailable',
    es: 'Recorrido no disponible',
    de: 'Route nicht verfügbar',
    pt: 'Trajeto indisponível',
  },
  /** Ligne d'explication sous l'aperçu (écran /partage, pas dans l'image). */
  traceUnavailableNote: {
    fr: 'Le tracé de cette course n’est pas encore disponible. Les chiffres, eux, sont bien les tiens.',
    en: 'This run’s route isn’t available yet. The numbers, though, are really yours.',
    es: 'El recorrido de esta carrera aún no está disponible. Las cifras sí son tuyas.',
    de: 'Die Route dieses Laufs ist noch nicht verfügbar. Die Zahlen sind aber wirklich deine.',
    pt: 'O trajeto desta corrida ainda não está disponível. Os números, esses são seus mesmo.',
  },

  // ─── /partage SANS COURSE ARMÉE (21/07/2026) ──────────────────────────────
  // L'écran fabriquait une carte de partage COMPLÈTE (`shareRun?.card ??
  // demoCard`) : distance, allure, zones, tracé, rang — les chiffres d'un
  // persona de démonstration, prêts à partir sur Instagram sous le nom du
  // joueur. La note « Exemple » ne rachetait rien (« le bandeau n'y change
  // rien, c'est un run fabriqué à la place du sien »). Il n'y a donc plus de
  // carte du tout : trois états vides, trois copies distinctes.

  /** Titre commun de l'écran quand aucune course n'est armée. */
  emptyTitle: {
    fr: 'Rien à partager pour l’instant',
    en: 'Nothing to share yet',
    es: 'Nada que compartir por ahora',
    de: 'Noch nichts zu teilen',
    pt: 'Nada para compartilhar ainda',
  },
  /** Cas 1 — pas connecté : on invite à se connecter. */
  emptySignedOutBody: {
    fr: 'Connecte-toi : tes courses et tes zones te suivent, et tu pourras les partager.',
    en: 'Sign in: your runs and zones follow you, and you’ll be able to share them.',
    es: 'Inicia sesión: tus carreras y zonas te siguen, y podrás compartirlas.',
    de: 'Melde dich an: Deine Läufe und Zonen folgen dir – dann kannst du sie teilen.',
    pt: 'Entre na sua conta: suas corridas e zonas seguem você, e dá para compartilhar.',
  },
  emptySignedOutCta: {
    fr: 'Me connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  /** Cas 2 — connecté, mais aucune course armée : on invite à l'action. */
  emptySignedInBody: {
    fr: 'Le partage part du résultat d’une course. Cours, puis partage-la depuis son écran de résultat.',
    en: 'Sharing starts from a run’s result. Go run, then share it from its result screen.',
    es: 'Compartir empieza en el resultado de una carrera. Corre y compártela desde su resultado.',
    de: 'Geteilt wird aus dem Ergebnis eines Laufs. Lauf los und teile ihn dann von dort.',
    pt: 'Compartilhar começa no resultado de uma corrida. Corra e compartilhe pela tela de resultado.',
  },
  emptySignedInCta: {
    fr: 'Retour à la carte',
    en: 'Back to the map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },
  /**
   * Cas 3 — on ne SAIT pas encore (restauration de session en cours). Un
   * chargement n'est pas un état vide : on n'affirme rien sur le joueur tant
   * que la lecture n'a pas résolu.
   */
  emptyLoading: {
    fr: 'Chargement…',
    en: 'Loading…',
    es: 'Cargando…',
    de: 'Wird geladen…',
    pt: 'Carregando…',
  },
  /**
   * Retour de l'état vide. NEUTRE : « ← Résultat » (le libellé de l'aperçu)
   * mentirait ici, il n'y a aucun résultat derrière. C'est aussi la SEULE sortie
   * pendant le chargement, où l'écran ne propose volontairement aucun CTA.
   */
  emptyBack: {
    fr: 'Retour',
    en: 'Back',
    es: 'Volver',
    de: 'Zurück',
    pt: 'Voltar',
  },
  emptyBackA11y: {
    fr: 'Revenir en arrière',
    en: 'Go back',
    es: 'Volver atrás',
    de: 'Zurückgehen',
    pt: 'Voltar atrás',
  },
});
