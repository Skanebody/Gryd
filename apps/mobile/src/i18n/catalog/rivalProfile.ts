/**
 * GRYD — i18n : CATALOGUE E56 « Profil public / rival » (planche E26).
 *
 * ══ CE QUI A CHANGÉ LE 27/07/2026 ═══════════════════════════════════════════
 * L'en-tête d'avant disait « chemin non câblé (O1) : l'écran affiche un état
 * indisponible ». C'est PÉRIMÉ : la lecture consentie existe (profil borné par
 * `user_profiles_select_visible`, territoire par la vue `public_territories`
 * qui respecte `map_sharing` depuis 0087) et l'écran s'en sert. La copie
 * « ce que cet écran montrera » a donc été SUPPRIMÉE : elle décrivait au futur
 * ce que le code fait au présent, ce qui est un mensonge de plus, à l'envers.
 *
 * Ce qui n'a PAS changé : la base est VIDE. Les états honnêtes (introuvable,
 * aucune zone publiée, carte masquée) sont donc ce qu'on voit aujourd'hui —
 * et ils sont de première classe, pas des placeholders.
 *
 * ⚠️ RESTENT POSÉES, JAMAIS PEINTES : `actionSuivre` / `actionNePlusSuivre` /
 * `actionDefier` (aucun backend de suivi ni de défi entre joueurs), `statRang`
 * (aucune lecture de classement d'autrui), `identiteNiveau` (le niveau d'un
 * tiers n'est lu nulle part) et le bloc `rivalite*` (rien ne rattache un
 * contour public à un secteur commun aux deux joueurs). Les peindre serait un
 * bouton mort ou une donnée fabriquée. Elles attendent leur source.
 *
 * Parité 5 langues imposée par le type `Entry`. « GRYD » invariant. Tutoiement
 * en français ; portugais BRÉSILIEN (« você »).
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
  /**
   * Deux causes, UNE seule phrase — à dessein : ce handle n'existe pas, ou son
   * profil ne t'est pas visible. Les distinguer ferait de l'écran un oracle
   * d'existence de comptes. On dit donc ce qu'on sait, et qu'on n'en sait pas
   * plus.
   */
  unavailableBody: {
    fr: 'Ce profil ne t’est pas accessible. Il n’existe pas, ou son propriétaire ne le partage pas avec toi — GRYD ne dit pas lequel des deux, ce serait déjà en dire trop sur quelqu’un.',
    en: 'This profile is not available to you. Either it does not exist, or its owner does not share it with you — GRYD will not say which, as that would already reveal too much about someone.',
    es: 'Este perfil no está a tu alcance. O no existe, o su propietario no lo comparte contigo: GRYD no dice cuál de los dos, ya sería revelar demasiado sobre alguien.',
    de: 'Dieses Profil ist für dich nicht verfügbar. Entweder existiert es nicht, oder sein Inhaber teilt es nicht mit dir – GRYD sagt nicht, was davon zutrifft: das verriete bereits zu viel über jemanden.',
    pt: 'Este perfil não está disponível para você. Ou ele não existe, ou o dono não compartilha com você — o GRYD não diz qual dos dois, isso já revelaria demais sobre alguém.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // E56 · LA COMPOSITION RÉELLE — posée le 27/07/2026, CÂBLÉE le même jour.
  //
  // Ce qui est peint aujourd'hui : identité consentie, surface publique, zones,
  // état du territoire, et le CTA « Voir ses zones » — ce dernier UNIQUEMENT
  // quand des contours dessinables existent (`canOpenZones`), sinon il mènerait
  // à une carte vide, c'est-à-dire à un bouton mort déguisé (§A4).
  // Ce qui reste posé sans être peint est listé dans l'en-tête du fichier.
  //
  // CE QUE CES LIBELLÉS N'AUTORISENT JAMAIS, MÊME À O1 LEVÉ (spéc E56
  // « Interdits ») : heure précise des sorties · départ/arrivée · position en
  // direct · historique complet · données privées · comparaisons impossibles.
  // Aucune clé ci-dessous ne les nomme, et il ne faut en ajouter aucune.
  // ══════════════════════════════════════════════════════════════════════════

  // ── Identité publique ─────────────────────────────────────────────────────
  /** `{handle}` = handle PUBLIC réellement résolu — jamais le segment d'URL. */
  identiteHandle: {
    fr: '@{handle}',
    en: '@{handle}',
    es: '@{handle}',
    de: '@{handle}',
    pt: '@{handle}',
  },
  identiteNiveau: {
    fr: 'Niveau {n}',
    en: 'Level {n}',
    es: 'Nivel {n}',
    de: 'Level {n}',
    pt: 'Nível {n}',
  },

  // ── Les trois faits publics (spéc : surface, zones, rang) ─────────────────
  statSurfacePublique: {
    fr: 'Surface publique',
    en: 'Public area',
    es: 'Superficie pública',
    de: 'Öffentliche Fläche',
    pt: 'Área pública',
  },
  statZones: {
    fr: 'Zones',
    en: 'Zones',
    es: 'Zonas',
    de: 'Zonen',
    pt: 'Zonas',
  },
  statRang: {
    fr: 'Rang',
    en: 'Rank',
    es: 'Rango',
    de: 'Rang',
    pt: 'Posição',
  },
  /** Un fait non consenti n'est pas un zéro : il est ABSENT, et on le dit. */
  statNonPublic: {
    fr: 'Non public',
    en: 'Not public',
    es: 'No público',
    de: 'Nicht öffentlich',
    pt: 'Não público',
  },

  // ── Bloc « rivalité » (spéc : la relation, dérivée de faits publics) ──────
  sectionRivalite: {
    fr: 'Votre rivalité',
    en: 'Your rivalry',
    es: 'Vuestra rivalidad',
    de: 'Eure Rivalität',
    pt: 'A rivalidade de vocês',
  },
  /** `{zone}` = nom de secteur RÉEL, `{handle}` = handle public résolu. */
  rivaliteTientZone: {
    fr: '{handle} tient {zone}, ton ancienne zone.',
    en: '{handle} holds {zone}, your former zone.',
    es: '{handle} controla {zone}, tu antigua zona.',
    de: '{handle} hält {zone}, deine frühere Zone.',
    pt: '{handle} controla {zone}, sua antiga zona.',
  },
  rivaliteReprises: {
    fr: 'Tu t’es repris {n} zones cette saison.',
    en: 'You took back {n} zones this season.',
    es: 'Has recuperado {n} zonas esta temporada.',
    de: 'Du hast diese Saison {n} Zonen zurückgeholt.',
    pt: 'Você retomou {n} zonas nesta temporada.',
  },
  /** Aucun fait commun : on ne fabrique pas une rivalité pour remplir le bloc. */
  rivaliteAucune: {
    fr: 'Aucun territoire échangé avec ce coureur pour l’instant.',
    en: 'No territory has changed hands with this runner yet.',
    es: 'Aún no has intercambiado territorio con este corredor.',
    de: 'Mit diesem Läufer hat noch kein Gebiet gewechselt.',
    pt: 'Nenhum território mudou de mãos com este corredor ainda.',
  },

  // ── Territoire et faits publics ───────────────────────────────────────────
  sectionTerritoirePublic: {
    fr: 'Son territoire public',
    en: 'Their public territory',
    es: 'Su territorio público',
    de: 'Sein öffentliches Territorium',
    pt: 'O território público dele',
  },
  territoireGeneralise: {
    fr: 'Contours généralisés, publiés en différé.',
    en: 'Generalized outlines, published with a delay.',
    es: 'Contornos generalizados, publicados con retraso.',
    de: 'Verallgemeinerte Umrisse, zeitversetzt veröffentlicht.',
    pt: 'Contornos generalizados, publicados com atraso.',
  },
  /** Lecture ABOUTIE, rien de publié — une phrase vraie, jamais un « 0 » nu. */
  territoireAucun: {
    fr: 'Aucune zone publiée pour l’instant.',
    en: 'No published zone yet.',
    es: 'Ninguna zona publicada por ahora.',
    de: 'Noch keine veröffentlichte Zone.',
    pt: 'Nenhuma zona publicada por enquanto.',
  },
  /** Des lignes sont revenues, aucune n'était dessinable : on ne dit pas « rien ». */
  territoireIllisible: {
    fr: 'Son territoire public n’a pas pu être dessiné. On ne prétend pas qu’il est vide.',
    en: 'Their public territory could not be drawn. We are not claiming it is empty.',
    es: 'No se pudo dibujar su territorio público. No decimos que esté vacío.',
    de: 'Sein öffentliches Territorium konnte nicht gezeichnet werden. Wir behaupten nicht, es sei leer.',
    pt: 'O território público dele não pôde ser desenhado. Não afirmamos que está vazio.',
  },
  /** Refus explicite du propriétaire — un choix respecté, pas une panne. */
  territoireMasque: {
    fr: 'Ce coureur ne partage pas sa carte. C’est son droit, et GRYD le respecte.',
    en: 'This runner does not share their map. That is their right, and GRYD respects it.',
    es: 'Este corredor no comparte su mapa. Está en su derecho y GRYD lo respeta.',
    de: 'Dieser Läufer teilt seine Karte nicht. Das ist sein Recht, und GRYD achtet es.',
    pt: 'Este corredor não compartilha o mapa dele. É um direito dele, e o GRYD respeita.',
  },
  /** Nom accessible du CTA — dit OÙ il mène, pas seulement ce qu'il dit. */
  ctaVoirSesZonesA11y: {
    fr: 'Voir la carte des zones publiques de ce coureur',
    en: 'View this runner’s public zones map',
    es: 'Ver el mapa de zonas públicas de este corredor',
    de: 'Karte der öffentlichen Zonen dieses Läufers ansehen',
    pt: 'Ver o mapa das zonas públicas deste corredor',
  },
  sectionFaitsPublics: {
    fr: 'Faits publics récents',
    en: 'Recent public facts',
    es: 'Datos públicos recientes',
    de: 'Jüngste öffentliche Fakten',
    pt: 'Fatos públicos recentes',
  },
  faitsAucun: {
    fr: 'Rien de public récemment.',
    en: 'Nothing public recently.',
    es: 'Nada público recientemente.',
    de: 'Zuletzt nichts Öffentliches.',
    pt: 'Nada público recentemente.',
  },

  // ── Actions (O1) ──────────────────────────────────────────────────────────
  actionSuivre: {
    fr: 'Suivre',
    en: 'Follow',
    es: 'Seguir',
    de: 'Folgen',
    pt: 'Seguir',
  },
  actionNePlusSuivre: {
    fr: 'Ne plus suivre',
    en: 'Unfollow',
    es: 'Dejar de seguir',
    de: 'Nicht mehr folgen',
    pt: 'Deixar de seguir',
  },
  /** Le suivi n'ouvre AUCUNE donnée de localisation supplémentaire (spéc E57). */
  suivreNoteViePrivee: {
    fr: 'Suivre ne donne accès à aucune position.',
    en: 'Following grants no access to any location.',
    es: 'Seguir no da acceso a ninguna ubicación.',
    de: 'Folgen gibt keinen Zugriff auf Standorte.',
    pt: 'Seguir não dá acesso a nenhuma localização.',
  },
  actionDefier: {
    fr: 'Défier',
    en: 'Challenge',
    es: 'Retar',
    de: 'Herausfordern',
    pt: 'Desafiar',
  },
  /** CTA unique et chartreuse de l'écran (§A4). */
  ctaVoirSesZones: {
    fr: 'Voir ses zones',
    en: 'View their zones',
    es: 'Ver sus zonas',
    de: 'Zonen ansehen',
    pt: 'Ver as zonas',
  },

  // ── Les quatre états, jamais confondus ────────────────────────────────────
  etatChargement: {
    fr: 'Lecture du profil…',
    en: 'Loading profile…',
    es: 'Cargando el perfil…',
    de: 'Profil wird geladen …',
    pt: 'Carregando o perfil…',
  },
  etatDeconnecteTitre: {
    fr: 'Connecte-toi pour voir ce profil',
    en: 'Sign in to see this profile',
    es: 'Inicia sesión para ver este perfil',
    de: 'Melde dich an für dieses Profil',
    pt: 'Entre para ver este perfil',
  },
  etatDeconnecteCorps: {
    fr: 'Les faits publics d’un coureur ne se lisent qu’avec un compte.',
    en: 'A runner’s public facts are readable only with an account.',
    es: 'Los datos públicos de un corredor solo se leen con una cuenta.',
    de: 'Öffentliche Fakten eines Läufers sind nur mit Konto lesbar.',
    pt: 'Os fatos públicos de um corredor só são lidos com uma conta.',
  },
  etatEchecTitre: {
    fr: 'Lecture impossible',
    en: 'Could not load',
    es: 'No se pudo cargar',
    de: 'Laden fehlgeschlagen',
    pt: 'Não foi possível carregar',
  },
  etatEchecCorps: {
    fr: 'La lecture a échoué. On ne sait pas si ce profil existe.',
    en: 'The read failed. We do not know whether this profile exists.',
    es: 'La lectura falló. No sabemos si este perfil existe.',
    de: 'Das Laden schlug fehl. Ob dieses Profil existiert, ist unbekannt.',
    pt: 'A leitura falhou. Não sabemos se este perfil existe.',
  },
  reessayer: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
});
