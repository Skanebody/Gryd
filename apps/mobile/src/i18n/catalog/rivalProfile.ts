/**
 * GRYD — i18n : CATALOGUE E26 « Profil rival · vue publique ».
 *
 * La planche montre un rival concret (Nina M., Saint-Rémy, #2). GRYD ne le
 * fabrique PAS : lire le profil public d'un autre joueur suppose des lectures
 * cross-utilisateur consenties (public_profiles + faits territoriaux publics
 * gouvernés par la confidentialité E25), chemin non câblé aujourd'hui (O1). Tant
 * qu'aucune source réelle n'existe, l'écran affiche un ÉTAT HONNÊTE
 * « indisponible » — jamais un adversaire d'illustration. Cette copie sert donc
 * uniquement cet état, et énonce ce que l'écran montrera quand la source
 * existera (contours généralisés, votre rivalité, faits publics).
 *
 * Parité 5 langues imposée par le type `Entry`. « GRYD » invariant.
 */
import { defineCatalog } from '../types';

export const RIVAL_C = defineCatalog({
  /** Titre de la barre (planche : gabarit E15). */
  screenTitle: {
    fr: 'Profil rival',
    en: 'Rival profile',
    es: 'Perfil rival',
    de: 'Rivalen-Profil',
    pt: 'Perfil rival',
  },

  // ── État honnête : profil indisponible (O1 non levé) ──────────────────────
  unavailableTitle: {
    fr: 'Profil rival indisponible',
    en: 'Rival profile unavailable',
    es: 'Perfil rival no disponible',
    de: 'Rivalen-Profil nicht verfügbar',
    pt: 'Perfil rival indisponível',
  },
  unavailableBody: {
    fr: 'Afficher le profil public d’un autre coureur demande de lire les faits qu’il a consenti à rendre publics — ce qu’aucune connexion entre joueurs ne permet encore. GRYD n’invente pas d’adversaire : tant que la source n’existe pas, cet écran reste vide plutôt que faux.',
    en: 'Showing another runner’s public profile means reading the facts they’ve agreed to make public — something no cross-player connection supports yet. GRYD never invents an opponent: until that source exists, this screen stays empty rather than fake.',
    es: 'Mostrar el perfil público de otro corredor exige leer los datos que ha aceptado hacer públicos, algo que ninguna conexión entre jugadores permite todavía. GRYD no inventa rivales: mientras no exista esa fuente, esta pantalla queda vacía en vez de falsa.',
    de: 'Das öffentliche Profil eines anderen Läufers zu zeigen bedeutet, die von ihm öffentlich freigegebenen Fakten zu lesen – was noch keine spielerübergreifende Verbindung erlaubt. GRYD erfindet keine Gegner: Solange diese Quelle fehlt, bleibt dieser Bildschirm leer statt falsch.',
    pt: 'Mostrar o perfil público de outro corredor exige ler os factos que ele aceitou tornar públicos — algo que nenhuma ligação entre jogadores permite ainda. O GRYD não inventa adversários: enquanto essa fonte não existir, este ecrã fica vazio em vez de falso.',
  },

  // ── « Ce que cet écran montrera » (fidèle à la planche, énoncé au futur) ──
  whatKicker: {
    fr: 'Ce que cet écran montrera',
    en: 'What this screen will show',
    es: 'Lo que mostrará esta pantalla',
    de: 'Was dieser Bildschirm zeigen wird',
    pt: 'O que este ecrã vai mostrar',
  },
  whatTerritory: {
    fr: 'Son territoire public — contours généralisés, jamais sa position.',
    en: 'Their public territory — generalized outlines, never their location.',
    es: 'Su territorio público: contornos generalizados, nunca su ubicación.',
    de: 'Sein öffentliches Territorium – verallgemeinerte Umrisse, nie sein Standort.',
    pt: 'O território público dele — contornos generalizados, nunca a localização.',
  },
  whatRivalry: {
    fr: 'Votre rivalité — la relation territoriale entre vous, calculée de faits publics.',
    en: 'Your rivalry — the territorial relationship between you, computed from public facts.',
    es: 'Vuestra rivalidad: la relación territorial entre ambos, calculada con datos públicos.',
    de: 'Eure Rivalität – die territoriale Beziehung zwischen euch, aus öffentlichen Fakten berechnet.',
    pt: 'A vossa rivalidade — a relação territorial entre vocês, calculada a partir de dados públicos.',
  },
  whatFacts: {
    fr: 'Ses faits publics récents — captures et badges, jamais ses courses privées.',
    en: 'Their recent public facts — captures and badges, never their private runs.',
    es: 'Sus datos públicos recientes: capturas e insignias, nunca sus carreras privadas.',
    de: 'Seine jüngsten öffentlichen Fakten – Eroberungen und Abzeichen, nie seine privaten Läufe.',
    pt: 'Os factos públicos recentes dele — capturas e emblemas, nunca as corridas privadas.',
  },
});
