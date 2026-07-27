/**
 * GRYD — i18n : CATALOGUE E13 « Recherche de lieu » (`/map/search`, spec
 * produit UI/UX l.926).
 *
 * ─── CE QUE CET ÉCRAN EST, ET CE QU'IL N'EST PAS ────────────────────────────
 * Spec, mot pour mot : « La recherche sert à déplacer la carte ou planifier,
 * JAMAIS à publier la position. » Aucun libellé de ce catalogue ne parle donc
 * de partage, de visibilité ni d'autres joueurs : chercher un lieu est un geste
 * de LECTURE, et la copie ne doit pas laisser croire l'inverse.
 *
 * ─── LES QUATRE ÉTATS, DISTINCTS (constitution) ─────────────────────────────
 * Sur cet écran, la source « proches » et la source « récentes » ont chacune
 * leurs états, et ils ne se confondent jamais :
 *   · LECTURE EN COURS  → `searching` / `nearbyLoading` (n'affirme RIEN) ;
 *   · VIDE HONNÊTE      → `noResult` (la recherche a abouti, rien ne correspond),
 *                         `recentEmpty` (rien n'a encore été cherché) ;
 *   · ÉCHEC DE LECTURE  → `failedTitle` / `failedBody` (on ne le déguise pas en
 *                         « aucun résultat » — la nuance est tout l'écran) ;
 *   · POSITION INCONNUE → `nearbyNoPosition` : sans fix, il n'y a pas de
 *                         « proche ». On le DIT au lieu de proposer une liste
 *                         arbitraire présentée comme voisine.
 * Il n'y a PAS d'état « pas connecté » ici : le référentiel des communes est
 * embarqué, la recherche marche déconnecté. Inventer un mur d'authentification
 * serait un bouton mort de plus.
 *
 * ─── VIE PRIVÉE : POURQUOI UNE RECHERCHE PEUT NE PAS ÊTRE RETENUE ───────────
 * Spec : « Les adresses de domicile ne sont pas ajoutées à l'historique si
 * elles se trouvent dans une zone floutée. » `recentPrivacyNote` explique cette
 * absence — sans elle, l'utilisateur croirait à un bug. Le nombre d'entrées
 * conservées vient de `PLACE_SEARCH_RECENT_MAX`, jamais d'un littéral d'écran.
 *
 * REGISTRE : tutoiement en français (registre dominant du produit) ; portugais
 * BRÉSILIEN (« você »), jamais « teu/tua ». Parité 5 langues imposée par `Entry`.
 * INVARIANTS jamais traduits : GRYD, km, m, noms propres de lieux.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Barre et champ ────────────────────────────────────────────────────────
  screenTitle: {
    fr: 'Chercher un lieu',
    en: 'Search a place',
    es: 'Buscar un lugar',
    de: 'Ort suchen',
    pt: 'Buscar um lugar',
  },
  /**
   * Placeholder du champ. Court : il vit dans une barre à 375 px (§A).
   *
   * ⚠️ IL DISAIT « Ville, quartier, rue » — CORRIGÉ le 27/07/2026 au moment de
   * brancher l'écran. La recherche interroge le référentiel EMBARQUÉ (villes
   * GeoNames ≥ 15 000 habitants) et AUCUN géocodeur : elle ne trouve ni un
   * quartier, ni une rue. Un placeholder est une promesse ; celle-là était au
   * -dessus du code, ce qui est la même faute qu'une donnée fabriquée.
   */
  fieldPlaceholder: {
    fr: 'Ville ou commune',
    en: 'City or town',
    es: 'Ciudad o municipio',
    de: 'Stadt oder Gemeinde',
    pt: 'Cidade ou município',
  },
  fieldA11y: {
    fr: 'Champ de recherche de lieu',
    en: 'Place search field',
    es: 'Campo de búsqueda de lugar',
    de: 'Suchfeld für Orte',
    pt: 'Campo de busca de lugar',
  },
  clearFieldA11y: {
    fr: 'Effacer la recherche',
    en: 'Clear the search',
    es: 'Borrar la búsqueda',
    de: 'Suche löschen',
    pt: 'Limpar a busca',
  },
  /**
   * Retour carte (spec : « retour carte »).
   *
   * ⚠️ NON RENDU au 27/07/2026 : le retour est celui de `ui/StackScreen`, dont
   * le chevron porte le libellé générique `catalog/route.back` (« Retour »)
   * partagé par tous les écrans poussés. Le COMPORTEMENT de la spec est bien là
   * — on revient à la carte, qui est restée montée dessous — mais ce texte-ci
   * n'est affiché nulle part, et prétendre le contraire serait une doc au-dessus
   * du code. Il servira le jour où E13 aura sa propre barre.
   */
  backToMap: {
    fr: 'Retour à la carte',
    en: 'Back to the map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },

  // ── Résultats proches (avant toute frappe) ────────────────────────────────
  nearbyKicker: {
    fr: 'AUTOUR DE TOI',
    en: 'AROUND YOU',
    es: 'CERCA DE TI',
    de: 'IN DEINER NÄHE',
    pt: 'PERTO DE VOCÊ',
  },
  /** Lecture EN COURS de la proximité — n'affirme rien sur ce qu'on trouvera. */
  nearbyLoading: {
    fr: 'Lecture des lieux proches…',
    en: 'Loading nearby places…',
    es: 'Cargando lugares cercanos…',
    de: 'Orte in der Nähe werden geladen…',
    pt: 'Carregando lugares próximos…',
  },
  /**
   * Aucune position : sans fix, « proche » n'a pas de sens. On ne propose donc
   * AUCUNE liste — une liste arbitraire présentée comme voisine serait fausse.
   */
  nearbyNoPosition: {
    fr: 'GRYD ne connaît pas ta position : tape un nom pour chercher.',
    en: 'GRYD doesn’t know where you are: type a name to search.',
    es: 'GRYD no sabe dónde estás: escribe un nombre para buscar.',
    de: 'GRYD kennt deinen Standort nicht: Tippe einen Namen ein.',
    pt: 'O GRYD não sabe onde você está: digite um nome para buscar.',
  },

  // ── Recherches récentes ───────────────────────────────────────────────────
  recentKicker: {
    fr: 'RECHERCHES RÉCENTES',
    en: 'RECENT SEARCHES',
    es: 'BÚSQUEDAS RECIENTES',
    de: 'LETZTE SUCHEN',
    pt: 'BUSCAS RECENTES',
  },
  recentEmpty: {
    fr: 'Aucune recherche pour l’instant.',
    en: 'No search yet.',
    es: 'Ninguna búsqueda por ahora.',
    de: 'Noch keine Suche.',
    pt: 'Nenhuma busca por enquanto.',
  },
  recentClear: {
    fr: 'Effacer l’historique',
    en: 'Clear history',
    es: 'Borrar el historial',
    de: 'Verlauf löschen',
    pt: 'Limpar o histórico',
  },
  recentClearA11y: {
    fr: 'Effacer toutes les recherches récentes',
    en: 'Clear all recent searches',
    es: 'Borrar todas las búsquedas recientes',
    de: 'Alle letzten Suchen löschen',
    pt: 'Limpar todas as buscas recentes',
  },
  /**
   * L'absence s'EXPLIQUE, sinon elle passe pour un bug (spec E13, §12) : une
   * recherche tombée dans une zone privée n'est jamais retenue.
   */
  recentPrivacyNote: {
    fr: 'Un lieu situé dans une de tes zones privées n’est jamais retenu ici.',
    en: 'A place inside one of your private zones is never kept here.',
    es: 'Un lugar dentro de una de tus zonas privadas nunca se guarda aquí.',
    de: 'Ein Ort in einer deiner privaten Zonen wird hier nie gespeichert.',
    pt: 'Um lugar dentro de uma das suas zonas privadas nunca fica guardado aqui.',
  },

  // ── Résultats d'une requête tapée ─────────────────────────────────────────
  resultsKicker: {
    fr: 'RÉSULTATS',
    en: 'RESULTS',
    es: 'RESULTADOS',
    de: 'ERGEBNISSE',
    pt: 'RESULTADOS',
  },
  /** Lecture EN COURS : un chargement n'affirme rien sur ce qui existe. */
  searching: {
    fr: 'Recherche…',
    en: 'Searching…',
    es: 'Buscando…',
    de: 'Wird gesucht…',
    pt: 'Buscando…',
  },
  /** Requête trop courte : on dit le seuil plutôt que de rendre une liste nue. */
  queryTooShort: {
    fr: 'Tape au moins {n} lettres.',
    en: 'Type at least {n} letters.',
    es: 'Escribe al menos {n} letras.',
    de: 'Tippe mindestens {n} Buchstaben.',
    pt: 'Digite pelo menos {n} letras.',
  },
  /** VIDE HONNÊTE : la recherche a abouti, rien ne correspond. */
  noResultTitle: {
    fr: 'Aucun lieu ne correspond',
    en: 'No place matches',
    es: 'Ningún lugar coincide',
    de: 'Kein Ort passt',
    pt: 'Nenhum lugar corresponde',
  },
  noResultBody: {
    fr: 'Essaie une orthographe différente, ou le nom de la commune.',
    en: 'Try a different spelling, or the name of the town.',
    es: 'Prueba otra ortografía, o el nombre del municipio.',
    de: 'Versuch eine andere Schreibweise oder den Gemeindenamen.',
    pt: 'Tente outra grafia, ou o nome do município.',
  },
  /** ÉCHEC DE LECTURE — jamais présenté comme « aucun résultat ». */
  failedTitle: {
    fr: 'Recherche impossible',
    en: 'Search failed',
    es: 'Búsqueda imposible',
    de: 'Suche fehlgeschlagen',
    pt: 'Busca impossível',
  },
  failedBody: {
    fr: 'La recherche n’a pas abouti. Rien n’est affirmé sur ce lieu tant qu’elle n’a pas répondu.',
    en: 'The search didn’t complete. Nothing is claimed about this place until it answers.',
    es: 'La búsqueda no se completó. No se afirma nada sobre este lugar hasta que responda.',
    de: 'Die Suche kam nicht durch. Über diesen Ort wird nichts behauptet, bis sie antwortet.',
    pt: 'A busca não foi concluída. Nada é afirmado sobre este lugar até ela responder.',
  },
  /**
   * ⚠️ NON RENDU PAR E13 au 27/07/2026, et ce n'est pas un oubli. L'échec de
   * recherche vient du décodage du référentiel embarqué, dont le cache est
   * PERMANENT (`parsePackedCitiesCached`, packages/shared/src/cities.ts:95) :
   * un « Réessayer » y serait un BOUTON MORT. L'entrée reste pour le jour où une
   * source RÉELLEMENT réessayable alimentera cet écran — pas avant.
   */
  retry: {
    fr: 'Réessayer',
    en: 'Retry',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ── Une ligne de résultat ─────────────────────────────────────────────────
  /** Distance à vol d'oiseau depuis la position connue. Jamais un itinéraire. */
  resultDistance: {
    fr: 'à {km} km',
    en: '{km} km away',
    es: 'a {km} km',
    de: '{km} km entfernt',
    pt: 'a {km} km',
  },
  resultOpenA11y: {
    fr: 'Ouvrir ce lieu sur la carte',
    en: 'Open this place on the map',
    es: 'Abrir este lugar en el mapa',
    de: 'Diesen Ort auf der Karte öffnen',
    pt: 'Abrir este lugar no mapa',
  },
  /**
   * Un lieu HORS terrain de jeu ouvert. On l'affiche quand même (la carte peut
   * s'y déplacer) mais on ne laisse pas croire qu'on y capture : la ville doit
   * d'abord s'ouvrir. Aucun classement, aucun crew n'y est inventé.
   */
  resultNotOpenYet: {
    fr: 'Pas encore un terrain de jeu',
    en: 'Not a playing ground yet',
    es: 'Todavía no es terreno de juego',
    de: 'Noch kein Spielfeld',
    pt: 'Ainda não é campo de jogo',
  },

  // ── AJOUTS DU BRANCHEMENT (27/07/2026) ────────────────────────────────────
  // Les libellés ci-dessus décrivaient l'écran ; ceux-ci ont manqué dès qu'il a
  // fallu le rendre. Chacun couvre un état qui EXISTE dans le code.

  /**
   * Le pendant POSITIF de `resultNotOpenYet`. Il n'est peint que si `city_zones`
   * a été RÉELLEMENT lu (troisième cran `unknown` de `placeOpenness`) : sans
   * lecture, aucune puce — ni celle-ci, ni l'autre.
   */
  resultOpenHere: {
    fr: 'Terrain de jeu ouvert',
    en: 'Playing ground open',
    es: 'Terreno de juego abierto',
    de: 'Spielfeld offen',
    pt: 'Campo de jogo aberto',
  },
  /**
   * CE QUE LA RECHERCHE COUVRE, dit à l'écran plutôt que deviné. Le référentiel
   * embarqué s'arrête à 15 000 habitants et ne porte qu'un nom par ville : sans
   * cette phrase, quelqu'un dont la commune n'y est pas en conclut que sa ville
   * n'existe pas (défaut déjà constaté sur le sélecteur de ville).
   */
  coverageNote: {
    fr: 'GRYD cherche dans sa liste embarquée de villes d’Europe : elle ne contient ni rues, ni quartiers, et s’arrête aux communes de plus de 15 000 habitants. Rien de ce que tu tapes ne quitte ton téléphone.',
    en: 'GRYD searches its built-in list of European cities: no streets, no neighbourhoods, and nothing under 15,000 inhabitants. Nothing you type leaves your phone.',
    es: 'GRYD busca en su lista integrada de ciudades de Europa: sin calles, sin barrios, y nada por debajo de 15 000 habitantes. Nada de lo que escribes sale de tu teléfono.',
    de: 'GRYD sucht in seiner eingebauten Liste europäischer Städte: keine Straßen, keine Viertel, nichts unter 15 000 Einwohnern. Nichts von dem, was du tippst, verlässt dein Telefon.',
    pt: 'O GRYD busca na sua lista embarcada de cidades da Europa: sem ruas, sem bairros, e nada abaixo de 15 000 habitantes. Nada do que você digita sai do seu telefone.',
  },
  /**
   * Position connue, mais AUCUNE ville du référentiel autour — le cas réel hors
   * d'Europe. On le DIT plutôt que de rendre une liste vide muette.
   */
  nearbyEmpty: {
    fr: 'Aucune ville de la liste embarquée autour de toi.',
    en: 'No city from the built-in list around you.',
    es: 'Ninguna ciudad de la lista integrada a tu alrededor.',
    de: 'Keine Stadt aus der eingebauten Liste in deiner Nähe.',
    pt: 'Nenhuma cidade da lista embarcada perto de você.',
  },
  /** Lecture EN COURS de l'historique local — distincte de « aucune recherche ». */
  recentLoading: {
    fr: 'Lecture de l’historique…',
    en: 'Loading history…',
    es: 'Cargando el historial…',
    de: 'Verlauf wird geladen…',
    pt: 'Carregando o histórico…',
  },
  /**
   * L'ENTRÉE de l'écran : la pill de lieu du header de carte devient un
   * poussoir. Libellé affiché UNIQUEMENT quand aucune ville n'est connue — sinon
   * la pill porte le VRAI nom de ville, et ce texte ne sert qu'à l'a11y.
   */
  entryLabel: {
    fr: 'Chercher un lieu',
    en: 'Search a place',
    es: 'Buscar un lugar',
    de: 'Ort suchen',
    pt: 'Buscar um lugar',
  },
  entryA11y: {
    fr: 'Chercher un lieu et y déplacer la carte',
    en: 'Search a place and move the map there',
    es: 'Buscar un lugar y mover el mapa allí',
    de: 'Einen Ort suchen und die Karte dorthin bewegen',
    pt: 'Buscar um lugar e mover o mapa para lá',
  },
});
