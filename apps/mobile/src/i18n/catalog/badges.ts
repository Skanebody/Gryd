/**
 * GRYD — i18n : catalogue du domaine BADGES (/badges, collection).
 *
 * Nouveau catalogue (21/07/2026) : l'écran Collection était intégralement en
 * français en dur — chrome, états, accessibilité. Tout ce qu'il ÉCRIT lui-même
 * passe désormais par une `Entry` (parité 5 langues imposée par le type).
 *
 * CE QUI RESTE EN FRANÇAIS, ET POURQUOI : les NOMS et CONDITIONS des ~200
 * badges, ainsi que les noms de familles, vivent dans le catalogue de jeu
 * (`@klaim/shared/badges`, partagé avec les Edge Functions). Les traduire est un
 * chantier de contenu à part entière, côté `packages/shared` — hors du périmètre
 * de cet écran. Ce fichier ne couvre donc que le châssis.
 *
 * Invariants jamais traduits : GRYD, les noms de tiers (Bronze, Argent…) tels
 * que définis par le catalogue de jeu.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Chrome ────────────────────────────────────────────────────────────────
  kicker: {
    fr: 'PROFIL · BADGES',
    en: 'PROFILE · BADGES',
    es: 'PERFIL · INSIGNIAS',
    de: 'PROFIL · ABZEICHEN',
    pt: 'PERFIL · INSÍGNIAS',
  },
  title: {
    fr: 'Collection',
    en: 'Collection',
    es: 'Colección',
    de: 'Sammlung',
    pt: 'Coleção',
  },
  backToProfile: {
    fr: 'Profil',
    en: 'Profile',
    es: 'Perfil',
    de: 'Profil',
    pt: 'Perfil',
  },
  a11yBackToProfile: {
    fr: 'Revenir au profil',
    en: 'Back to profile',
    es: 'Volver al perfil',
    de: 'Zurück zum Profil',
    pt: 'Voltar ao perfil',
  },
  /** Sous le chiffre héros : « 12 / 200 · badges débloqués ». */
  unlockedLabel: {
    fr: 'badges débloqués',
    en: 'badges unlocked',
    es: 'insignias desbloqueadas',
    de: 'Abzeichen freigeschaltet',
    pt: 'insígnias desbloqueadas',
  },
  maxTier: {
    fr: 'Tier max : {tier}',
    en: 'Top tier: {tier}',
    es: 'Nivel máx.: {tier}',
    de: 'Höchste Stufe: {tier}',
    pt: 'Nível máx.: {tier}',
  },

  // ─── Filtres ───────────────────────────────────────────────────────────────
  filterAll: { fr: 'Tous', en: 'All', es: 'Todos', de: 'Alle', pt: 'Todos' },
  filterSecrets: {
    fr: 'Secrets',
    en: 'Secrets',
    es: 'Secretos',
    de: 'Geheime',
    pt: 'Secretos',
  },
  a11yFilter: {
    fr: 'Filtre {label}',
    en: '{label} filter',
    es: 'Filtro {label}',
    de: 'Filter {label}',
    pt: 'Filtro {label}',
  },
  secretFamily: {
    fr: 'Secret',
    en: 'Secret',
    es: 'Secreto',
    de: 'Geheim',
    pt: 'Secreto',
  },
  tiersLegend: { fr: 'TIERS', en: 'TIERS', es: 'NIVELES', de: 'STUFEN', pt: 'NÍVEIS' },

  // ─── Proches du déblocage ──────────────────────────────────────────────────
  nearlyTitle: {
    fr: 'Proches du déblocage',
    en: 'Almost unlocked',
    es: 'Casi desbloqueadas',
    de: 'Fast freigeschaltet',
    pt: 'Quase desbloqueadas',
  },
  a11yNearlyBadge: {
    fr: 'Badge {name}, {value} sur {threshold}',
    en: 'Badge {name}, {value} of {threshold}',
    es: 'Insignia {name}, {value} de {threshold}',
    de: 'Abzeichen {name}, {value} von {threshold}',
    pt: 'Insígnia {name}, {value} de {threshold}',
  },

  // ─── Détail (bottom sheet) ─────────────────────────────────────────────────
  a11yCloseSheet: {
    fr: 'Fermer le détail du badge',
    en: 'Close badge details',
    es: 'Cerrar el detalle de la insignia',
    de: 'Abzeichen-Details schließen',
    pt: 'Fechar o detalhe da insígnia',
  },
  stateLocked: {
    fr: 'Verrouillé',
    en: 'Locked',
    es: 'Bloqueada',
    de: 'Gesperrt',
    pt: 'Bloqueada',
  },
  stateUnlocked: {
    fr: 'Débloqué',
    en: 'Unlocked',
    es: 'Desbloqueada',
    de: 'Freigeschaltet',
    pt: 'Desbloqueada',
  },
  stateUnlockedOn: {
    fr: 'Débloqué le {date}',
    en: 'Unlocked on {date}',
    es: 'Desbloqueada el {date}',
    de: 'Freigeschaltet am {date}',
    pt: 'Desbloqueada em {date}',
  },
  stateSecret: {
    fr: 'Badge secret',
    en: 'Secret badge',
    es: 'Insignia secreta',
    de: 'Geheimes Abzeichen',
    pt: 'Insígnia secreta',
  },
  secretRequirement: {
    fr: 'Condition secrète — continue à courir pour la découvrir.',
    en: 'Secret condition — keep running to find it.',
    es: 'Condición secreta: sigue corriendo para descubrirla.',
    de: 'Geheime Bedingung – lauf weiter, um sie zu entdecken.',
    pt: 'Condição secreta — continue correndo para descobrir.',
  },
  reward: {
    fr: 'Récompense : {reward}',
    en: 'Reward: {reward}',
    es: 'Recompensa: {reward}',
    de: 'Belohnung: {reward}',
    pt: 'Recompensa: {reward}',
  },
  nextLevel: {
    fr: 'Prochain niveau : {name}',
    en: 'Next level: {name}',
    es: 'Siguiente nivel: {name}',
    de: 'Nächste Stufe: {name}',
    pt: 'Próximo nível: {name}',
  },

  // ─── Les trois états ───────────────────────────────────────────────────────
  signedOutTitle: {
    fr: 'Connecte-toi pour voir ta collection.',
    en: 'Sign in to see your collection.',
    es: 'Inicia sesión para ver tu colección.',
    de: 'Melde dich an, um deine Sammlung zu sehen.',
    pt: 'Entre para ver sua coleção.',
  },
  signedOutBody: {
    fr: 'Voici tous les badges du jeu. Les tiens sont rattachés à ton compte.',
    en: 'Here are all the game’s badges. Yours are tied to your account.',
    es: 'Aquí están todas las insignias del juego. Las tuyas van con tu cuenta.',
    de: 'Hier sind alle Abzeichen des Spiels. Deine hängen an deinem Konto.',
    pt: 'Aqui estão todas as insígnias do jogo. As suas ficam na sua conta.',
  },
  noBackendTitle: {
    fr: 'Voici tous les badges du jeu.',
    en: 'Here are all the game’s badges.',
    es: 'Aquí están todas las insignias del juego.',
    de: 'Hier sind alle Abzeichen des Spiels.',
    pt: 'Aqui estão todas as insígnias do jogo.',
  },
  noBackendBody: {
    fr: 'Cet aperçu n’est relié à aucun serveur : aucun déblocage à afficher.',
    en: 'This preview isn’t connected to a server: no unlocks to show.',
    es: 'Esta vista previa no está conectada a ningún servidor: nada que mostrar.',
    de: 'Diese Vorschau ist mit keinem Server verbunden: keine Freischaltungen.',
    pt: 'Esta prévia não está ligada a nenhum servidor: nada a mostrar.',
  },
  signIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  emptyLine: {
    fr: 'Aucun badge encore — ta première course en ouvre un.',
    en: 'No badge yet — your first run opens one.',
    es: 'Ninguna insignia aún: tu primera carrera abre una.',
    de: 'Noch kein Abzeichen – dein erster Lauf öffnet eines.',
    pt: 'Nenhuma insígnia ainda — sua primeira corrida abre uma.',
  },
  failedTitle: {
    fr: 'On n’a pas pu charger tes badges.',
    en: 'We couldn’t load your badges.',
    es: 'No pudimos cargar tus insignias.',
    de: 'Wir konnten deine Abzeichen nicht laden.',
    pt: 'Não conseguimos carregar suas insígnias.',
  },
  failedBody: {
    fr: 'Tes déblocages sont intacts. Vérifie ta connexion, puis réessaie.',
    en: 'Your unlocks are safe. Check your connection, then try again.',
    es: 'Tus desbloqueos están intactos. Revisa tu conexión y reinténtalo.',
    de: 'Deine Freischaltungen sind sicher. Prüfe deine Verbindung, dann erneut.',
    pt: 'Seus desbloqueios estão intactos. Verifique sua conexão e tente de novo.',
  },
  retry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  loading: {
    fr: 'Chargement de ta collection…',
    en: 'Loading your collection…',
    es: 'Cargando tu colección…',
    de: 'Deine Sammlung wird geladen …',
    pt: 'Carregando sua coleção…',
  },
});
