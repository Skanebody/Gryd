/**
 * GRYD — i18n : CATALOGUE E15 « Carte des zones d'un rival »
 * (`/player/:playerId/zones`, spec produit UI/UX l.991).
 *
 * ─── CE QUE CET ÉCRAN A LE DROIT DE MONTRER ─────────────────────────────────
 * Spec, mot pour mot : « carte plein écran ; header avec identité réduite ;
 * contours GÉNÉRALISÉS ; CTA de retour ; AUCUNE position actuelle. » Et §12 :
 * aucun départ, aucune arrivée, aucun horaire précis, aucune trace brute d'un
 * tiers. Ce catalogue tient cette frontière EN COPIE : il n'existe ici aucun
 * libellé d'heure, de trajet, de rue ni de « en course maintenant ».
 *
 * La source est la vue serveur `public_territories` (migration 0077), qui rend
 * `geometry_generalized` et un `controlled_since` TRONQUÉ À L'HEURE
 * (`PUBLIC_TIMESTAMP_TRUNC`), après le délai de publication
 * (`TERRITORY_PUBLISH_DELAY_MINUTES`). D'où `sinceHour` plus bas : on annonce
 * la précision qu'on a, pas une minute qu'on n'a pas.
 *
 * ⚠ NE PAS CONFONDRE AVEC `rivalProfile.ts`, qui sert l'écran PROFIL d'un rival
 * (E26) et son état « indisponible ». Ici on parle de sa CARTE. Les deux
 * peuvent coexister : le profil reste fermé tant que O1 n'est pas levé, la
 * carte publique a, elle, une vue serveur.
 *
 * ─── LES QUATRE ÉTATS, DISTINCTS (constitution) ─────────────────────────────
 *   · LECTURE EN COURS → `loading` — n'affirme RIEN sur ce que ce joueur tient ;
 *   · VIDE HONNÊTE     → `emptyTitle` / `emptyBody` : lecture aboutie, ce joueur
 *                        ne tient AUCUN territoire publié. Ce n'est pas « zéro
 *                        zone » jeté nu, c'est une phrase vraie ;
 *   · ÉCHEC DE LECTURE → `failedTitle` / `failedBody` ;
 *   · PAS CONNECTÉ     → `signedOut`.
 * Aucun repli, aucun contour d'illustration : une carte vide reste vide.
 *
 * REGISTRE : tutoiement en français ; portugais BRÉSILIEN (« você »), jamais
 * « teu/tua ». Parité 5 langues imposée par `Entry`.
 * INVARIANTS jamais traduits : GRYD, km², pseudos, noms de lieux.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Header (identité RÉDUITE : un pseudo, rien d'autre) ───────────────────
  screenTitle: {
    fr: 'Ses territoires',
    en: 'Their territories',
    es: 'Sus territorios',
    de: 'Seine Gebiete',
    pt: 'Os territórios dele',
  },
  /** Sous-titre du header. `{name}` = le pseudo public, jamais un nom civil. */
  headerSubtitle: {
    fr: 'Territoires publics de {name}',
    en: '{name}’s public territories',
    es: 'Territorios públicos de {name}',
    de: 'Öffentliche Gebiete von {name}',
    pt: 'Territórios públicos de {name}',
  },
  backA11y: {
    fr: 'Revenir à l’écran précédent',
    en: 'Back to the previous screen',
    es: 'Volver a la pantalla anterior',
    de: 'Zurück zum vorherigen Bildschirm',
    pt: 'Voltar à tela anterior',
  },

  // ── Faits publics (les SEULS que la vue 0077 autorise) ────────────────────
  zonesHeld: {
    fr: '{n} zones tenues',
    en: '{n} zones held',
    es: '{n} zonas retenidas',
    de: '{n} Zonen gehalten',
    pt: '{n} zonas mantidas',
  },
  zonesHeldOne: {
    fr: '1 zone tenue',
    en: '1 zone held',
    es: '1 zona retenida',
    de: '1 Zone gehalten',
    pt: '1 zona mantida',
  },
  /** Surface publique. L'unité km² est INVARIANTE, jamais traduite. */
  surface: {
    fr: 'Surface {v} km²',
    en: 'Area {v} km²',
    es: 'Superficie {v} km²',
    de: 'Fläche {v} km²',
    pt: 'Área {v} km²',
  },
  /**
   * Ancienneté du contrôle, À L'HEURE PRÈS — la granularité que la vue publique
   * autorise (`PUBLIC_TIMESTAMP_TRUNC`). Écrire « depuis 7 h 12 » publierait une
   * habitude ; « depuis {h} h » situe sans dessiner un emploi du temps.
   */
  sinceHours: {
    fr: 'Tenu depuis {h} h',
    en: 'Held for {h} h',
    es: 'Retenido desde hace {h} h',
    de: 'Gehalten seit {h} h',
    pt: 'Mantido há {h} h',
  },
  sinceDays: {
    fr: 'Tenu depuis {d} j',
    en: 'Held for {d} d',
    es: 'Retenido desde hace {d} d',
    de: 'Gehalten seit {d} T',
    pt: 'Mantido há {d} d',
  },

  // ── La frontière de vie privée, DITE (spec l.991 + §12) ───────────────────
  /**
   * Sans cette phrase, l'absence de tracé passe pour une carte incomplète. Avec
   * elle, c'est une garantie lisible — et c'en est une que le code TIENT : la
   * vue 0077 n'expose ni `geometry` exacte, ni `source_run_id`, ni horodatage
   * fin.
   */
  privacyNote: {
    fr: 'Contours approchés. Ni tracé, ni départ, ni horaire : personne ne voit ça de personne.',
    en: 'Approximate outlines. No route, no start point, no timing: nobody sees that of anyone.',
    es: 'Contornos aproximados. Ni recorrido, ni salida, ni horario: nadie ve eso de nadie.',
    de: 'Ungefähre Umrisse. Keine Strecke, kein Start, keine Uhrzeit — das sieht niemand von niemandem.',
    pt: 'Contornos aproximados. Sem percurso, sem partida, sem horário: ninguém vê isso de ninguém.',
  },
  /** Rappel explicite que la position en direct n'existe pas ici (spec l.991). */
  noLivePosition: {
    fr: 'Aucune position en direct.',
    en: 'No live location.',
    es: 'Ninguna ubicación en directo.',
    de: 'Kein Live-Standort.',
    pt: 'Nenhuma localização ao vivo.',
  },

  // ── LECTURE EN COURS ──────────────────────────────────────────────────────
  loading: {
    fr: 'Lecture des territoires publics…',
    en: 'Loading public territories…',
    es: 'Cargando los territorios públicos…',
    de: 'Öffentliche Gebiete werden geladen…',
    pt: 'Carregando os territórios públicos…',
  },

  // ── VIDE HONNÊTE (lecture aboutie, rien à montrer) ────────────────────────
  emptyTitle: {
    fr: 'Aucun territoire public',
    en: 'No public territory',
    es: 'Ningún territorio público',
    de: 'Kein öffentliches Gebiet',
    pt: 'Nenhum território público',
  },
  emptyBody: {
    fr: 'Ce joueur ne tient aucune zone publiée. Rien n’est masqué : il n’y a rien.',
    en: 'This player holds no published zone. Nothing is hidden: there is nothing.',
    es: 'Este jugador no retiene ninguna zona publicada. No se oculta nada: no hay nada.',
    de: 'Diese Person hält keine veröffentlichte Zone. Nichts ist verborgen — es gibt nichts.',
    pt: 'Este jogador não mantém nenhuma zona publicada. Nada está oculto: não há nada.',
  },
  /**
   * Cas VOISIN mais différent : il a capturé, la publication est différée
   * (`TERRITORY_PUBLISH_DELAY_MINUTES`). On ne le confond pas avec « rien ».
   */
  emptyPendingPublication: {
    fr: 'Une capture récente peut n’être pas encore publiée.',
    en: 'A recent capture may not be published yet.',
    es: 'Una captura reciente puede no estar publicada aún.',
    de: 'Eine kürzliche Eroberung ist vielleicht noch nicht veröffentlicht.',
    pt: 'Uma captura recente pode ainda não estar publicada.',
  },

  // ── ÉCHEC DE LECTURE (jamais déguisé en vide) ─────────────────────────────
  failedTitle: {
    fr: 'Lecture impossible',
    en: 'Couldn’t load',
    es: 'No se pudo leer',
    de: 'Laden fehlgeschlagen',
    pt: 'Não foi possível ler',
  },
  failedBody: {
    fr: 'La carte n’a pas pu être lue. Rien n’est affirmé sur ce joueur tant que la lecture n’a pas abouti.',
    en: 'The map couldn’t be read. Nothing is claimed about this player until the read succeeds.',
    es: 'No se pudo leer el mapa. No se afirma nada sobre este jugador hasta que la lectura funcione.',
    de: 'Die Karte konnte nicht gelesen werden. Über diese Person wird nichts behauptet, bis das Lesen klappt.',
    pt: 'Não foi possível ler o mapa. Nada é afirmado sobre este jogador até a leitura funcionar.',
  },
  retry: {
    fr: 'Réessayer',
    en: 'Retry',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ── PAS CONNECTÉ / introuvable ────────────────────────────────────────────
  signedOut: {
    fr: 'Connecte-toi pour voir les territoires publics des autres joueurs.',
    en: 'Sign in to see other players’ public territories.',
    es: 'Inicia sesión para ver los territorios públicos de otros jugadores.',
    de: 'Melde dich an, um öffentliche Gebiete anderer zu sehen.',
    pt: 'Entre para ver os territórios públicos de outros jogadores.',
  },
  notFound: {
    fr: 'Ce joueur n’existe pas ou n’est plus visible.',
    en: 'This player doesn’t exist or is no longer visible.',
    es: 'Este jugador no existe o ya no es visible.',
    de: 'Diese Person existiert nicht oder ist nicht mehr sichtbar.',
    pt: 'Este jogador não existe ou não está mais visível.',
  },
  notFoundTitle: {
    fr: 'Joueur introuvable',
    en: 'Player not found',
    es: 'Jugador no encontrado',
    de: 'Person nicht gefunden',
    pt: 'Jogador não encontrado',
  },
  signedOutTitle: {
    fr: 'Connexion requise',
    en: 'Sign-in required',
    es: 'Se requiere iniciar sesión',
    de: 'Anmeldung erforderlich',
    pt: 'É preciso entrar',
  },

  // ── CARTE MASQUÉE PAR SON PROPRIÉTAIRE (user_profiles.map_sharing) ────────
  /**
   * État à part entière, JAMAIS confondu avec « vide » : il tient peut-être des
   * zones, il a simplement demandé à ne pas les montrer. Dire « aucun
   * territoire » à sa place serait un mensonge — et lui en prêter serait pire.
   */
  hiddenTitle: {
    fr: 'Carte non partagée',
    en: 'Map not shared',
    es: 'Mapa no compartido',
    de: 'Karte nicht geteilt',
    pt: 'Mapa não compartilhado',
  },
  hiddenBody: {
    fr: 'Ce joueur a choisi de ne pas partager sa carte. On ne dit rien de ce qu’il tient.',
    en: 'This player chose not to share their map. We say nothing about what they hold.',
    es: 'Este jugador eligió no compartir su mapa. No decimos nada de lo que retiene.',
    de: 'Diese Person teilt ihre Karte nicht. Über ihren Besitz sagen wir nichts.',
    pt: 'Este jogador escolheu não compartilhar o mapa. Não dizemos nada sobre o que ele mantém.',
  },

  // ── LIGNES REVENUES, AUCUNE DESSINABLE ───────────────────────────────────
  /**
   * Ni un vide, ni un échec : la lecture a abouti, mais aucun contour publiable
   * n'était exploitable. On ne dit surtout pas « il ne tient rien ».
   */
  unreadableTitle: {
    fr: 'Contours indisponibles',
    en: 'Outlines unavailable',
    es: 'Contornos no disponibles',
    de: 'Umrisse nicht verfügbar',
    pt: 'Contornos indisponíveis',
  },
  unreadableBody: {
    fr: 'Ses zones existent, mais aucun contour public n’a pu être dessiné. On ne devine pas une forme.',
    en: 'Their zones exist, but no public outline could be drawn. We don’t guess a shape.',
    es: 'Sus zonas existen, pero no se pudo dibujar ningún contorno público. No inventamos una forma.',
    de: 'Ihre Zonen existieren, aber kein öffentlicher Umriss war zeichenbar. Wir raten keine Form.',
    pt: 'As zonas dele existem, mas nenhum contorno público pôde ser desenhado. Não adivinhamos uma forma.',
  },
  /** Note de bas de carte quand une PARTIE seulement a été écartée. */
  partialFootnote: {
    fr: '{n} zone(s) sans contour public : elles ne sont pas dessinées.',
    en: '{n} zone(s) without a public outline: they are not drawn.',
    es: '{n} zona(s) sin contorno público: no se dibujan.',
    de: '{n} Zone(n) ohne öffentlichen Umriss: nicht gezeichnet.',
    pt: '{n} zona(s) sem contorno público: não são desenhadas.',
  },

  // ── Accessibilité ────────────────────────────────────────────────────────
  /** Nom accessible de la carte : ce qu'elle montre, en une phrase. */
  mapA11y: {
    fr: 'Contours approchés des territoires publics de {name}',
    en: 'Approximate outlines of {name}’s public territories',
    es: 'Contornos aproximados de los territorios públicos de {name}',
    de: 'Ungefähre Umrisse der öffentlichen Gebiete von {name}',
    pt: 'Contornos aproximados dos territórios públicos de {name}',
  },
});
