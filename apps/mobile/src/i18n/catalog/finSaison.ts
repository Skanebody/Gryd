/**
 * GRYD — i18n : E61 « Fin de saison » (bilan).
 *
 * ─── CE QUE L'ÉCRAN DIT, ET CE QU'IL NE PEUT PAS DIRE ─────────────────────────
 * La spéc E61 compose : rang final · bilan · récompenses · prochaine saison ·
 * règles de remise à zéro · CTA `RÉCUPÉRER`. Ce catalogue couvre les six, MAIS
 * il refuse deux affirmations que le code ne tient pas :
 *
 *  1. LE TERRITOIRE « ACQUIS ». La spéc E59 écrit « territoires et badges acquis
 *     ne disparaissent pas ». LE CODE LE CONFIRME DEPUIS LE 28/07/2026 :
 *     `season_close/index.ts#resetSeason` ne supprime plus une seule ligne
 *     `hex_claims` ni un seul bouclier, et `SEASON_RESET_KEEPS.territory` /
 *     `.shields` valent `true` dans game-rules. `reglesCarteConservee` reprend
 *     donc le CODE — qui se trouve enfin dire la même chose que la planche.
 *     Ce paragraphe affirmait l'inverse en capitales jusqu'au 01/08/2026 (« LE
 *     CODE DIT LE CONTRAIRE ») : il avait raison quatre jours de trop. La règle
 *     de lecture est inchangée — le code gagne toujours — seul son résultat a
 *     changé. Ne jamais recopier la planche sans relire `resetSeason`.
 *
 *  2. LA RÉCOMPENSE « RÉCUPÉRÉE ». Les médailles de fin de saison sont décernées
 *     PAR LE SERVEUR (`season_close` → `founderBadges`, paliers
 *     `SEASON_RANK_TIERS`). Le CTA n'en réclame aucune : il accuse réception et
 *     mène à la collection. Le libellé le dit (`ctaVoirMesBadges`) plutôt que
 *     de mimer un « claim » qui n'existe pas. `ctaRecuperer` reste disponible
 *     pour le jour où une remise réelle existera — il n'est pas à peindre avant.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS CONFONDUS ───────────────────────────────────────
 * pas connecté (`etatDeconnecte*`) · lu mais sans résultat, parce qu'on n'a pas
 * participé (`etatSansResultat*`) · échec de lecture (`etatEchec*`) · lecture en
 * cours (`etatChargement`). La base étant VIDE, ces états sont le cas DOMINANT :
 * ils sont de première classe, pas des repli.
 *
 * §A : libellés courts, l'allemand reformulé concis (jamais de troncature à
 * 375 px). Le français TUTOIE. Le portugais est BRÉSILIEN (« você » ; jamais
 * « teu/tua/tens/podes »).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ══════════════ En-tête ════════════════════════════════════════════════════
  titre: {
    fr: 'Fin de saison',
    en: 'Season over',
    es: 'Fin de temporada',
    de: 'Saisonende',
    pt: 'Fim de temporada',
  },
  /** `{n}` = numéro RÉEL de la saison close, lu en base — jamais figé. */
  kickerSaisonClose: {
    fr: 'SAISON {n} · TERMINÉE',
    en: 'SEASON {n} · OVER',
    es: 'TEMPORADA {n} · FINALIZADA',
    de: 'SAISON {n} · BEENDET',
    pt: 'TEMPORADA {n} · ENCERRADA',
  },

  // ══════════════ Rang final ═════════════════════════════════════════════════
  sectionRangFinal: {
    fr: 'Ton rang final',
    en: 'Your final rank',
    es: 'Tu rango final',
    de: 'Dein Endrang',
    pt: 'Sua posição final',
  },
  rangFinal: {
    fr: '#{rank} sur {total}',
    en: '#{rank} of {total}',
    es: '#{rank} de {total}',
    de: '#{rank} von {total}',
    pt: '#{rank} de {total}',
  },
  /** Ex æquo assumé (§13.6 du règlement) : le rang est PARTAGÉ, on le dit. */
  rangExAequo: {
    fr: 'Rang partagé',
    en: 'Tied rank',
    es: 'Rango compartido',
    de: 'Geteilter Rang',
    pt: 'Posição empatada',
  },

  // ══════════════ Bilan ══════════════════════════════════════════════════════
  sectionBilan: {
    fr: 'Ton bilan',
    en: 'Your season',
    es: 'Tu balance',
    de: 'Deine Bilanz',
    pt: 'Seu balanço',
  },
  /**
   * LE PÉRIMÈTRE DU BILAN, DIT (28/07/2026). Les trois chiffres du bilan sont
   * bornés à UNE discipline (`seasonRecapSummary(runRows, recap.activity)`) sous
   * des libellés génériques — « sorties », « jours actifs », « distance ». Sans
   * cette ligne, un athlète hybride lisait un total partiel comme un total.
   * `{discipline}` est un libellé INVARIANT (RUN / BIKE), pas une traduction :
   * même mot dans les cinq langues, comme partout dans l'app.
   */
  bilanPerimetre: {
    fr: 'Ces chiffres ne comptent que tes sorties {discipline}.',
    en: 'These figures only count your {discipline} sessions.',
    es: 'Estas cifras solo cuentan tus salidas {discipline}.',
    de: 'Diese Zahlen zählen nur deine {discipline}-Einheiten.',
    pt: 'Estes números contam apenas suas atividades {discipline}.',
  },
  bilanZones: {
    fr: 'Zones prises',
    en: 'Zones taken',
    es: 'Zonas tomadas',
    de: 'Zonen erobert',
    pt: 'Zonas tomadas',
  },
  bilanDefenses: {
    fr: 'Défenses',
    en: 'Defences',
    es: 'Defensas',
    de: 'Verteidigungen',
    pt: 'Defesas',
  },
  /**
   * Sorties VALIDÉES de la fenêtre (valid + partial) — même définition que
   * `buildScoreInputs` côté serveur, pour qu'aucun chiffre du bilan ne
   * contredise le classement qui l'a produit.
   */
  bilanSorties: {
    fr: 'Sorties',
    en: 'Activities',
    es: 'Salidas',
    de: 'Einheiten',
    pt: 'Atividades',
  },
  bilanDistance: {
    fr: 'Distance',
    en: 'Distance',
    es: 'Distancia',
    de: 'Distanz',
    pt: 'Distância',
  },
  bilanJoursActifs: {
    fr: 'Jours actifs',
    en: 'Active days',
    es: 'Días activos',
    de: 'Aktive Tage',
    pt: 'Dias ativos',
  },

  // ══════════════ Récompenses ════════════════════════════════════════════════
  sectionRecompenses: {
    fr: 'Tes récompenses',
    en: 'Your rewards',
    es: 'Tus recompensas',
    de: 'Deine Belohnungen',
    pt: 'Suas recompensas',
  },
  /** Ce que valent RÉELLEMENT les paliers : des badges, rien d'autre. */
  recompensesNature: {
    fr: 'Des badges, décernés par le serveur. Aucun avantage de jeu.',
    en: 'Badges, awarded by the server. No gameplay advantage.',
    es: 'Insignias otorgadas por el servidor. Ninguna ventaja de juego.',
    de: 'Abzeichen, vom Server vergeben. Kein Spielvorteil.',
    pt: 'Emblemas concedidos pelo servidor. Nenhuma vantagem de jogo.',
  },
  recompensesAucune: {
    fr: 'Aucun palier atteint cette saison.',
    en: 'No tier reached this season.',
    es: 'Ningún nivel alcanzado esta temporada.',
    de: 'Diese Saison keine Stufe erreicht.',
    pt: 'Nenhum patamar alcançado nesta temporada.',
  },

  // ══════════════ Remise à zéro (E59 « reset de rang clair ») ════════════════
  sectionRemiseAZero: {
    fr: 'Ce qui repart, ce qui reste',
    en: 'What resets, what stays',
    es: 'Qué se reinicia, qué se queda',
    de: 'Was zurückgesetzt wird, was bleibt',
    pt: 'O que zera, o que fica',
  },
  reglesRepartAZero: {
    fr: 'Points et rang de saison repartent à zéro.',
    en: 'Season points and rank reset to zero.',
    es: 'Los puntos y el rango de temporada vuelven a cero.',
    de: 'Saisonpunkte und -rang starten bei null.',
    pt: 'Pontos e posição da temporada voltam a zero.',
  },
  reglesConserve: {
    fr: 'Badges, XP, niveau et Foulées restent : ils ne se perdent jamais.',
    en: 'Badges, XP, level and Strides stay: they are never lost.',
    es: 'Insignias, XP, nivel y Zancadas se quedan: nunca se pierden.',
    de: 'Abzeichen, XP, Level und Schritte bleiben — sie gehen nie verloren.',
    pt: 'Emblemas, XP, nível e Passadas ficam: nunca se perdem.',
  },
  /**
   * LA CARTE EST CONSERVÉE — dit d'après le code (`resetSeason`), pas d'après la
   * planche. Les boucliers restent avec elle.
   *
   * Cette entrée s'appelait `reglesCarteRepartAZero` et affirmait le contraire
   * (« les zones capturées sont libérées, les boucliers aussi »). C'était exact
   * jusqu'au 28/07/2026 ; `SEASON_RESET_KEEPS.territory`/`.shields` valent `true`
   * depuis, et `resetSeason` ne supprime plus une seule ligne. LE NOM DE LA CLÉ
   * A ÉTÉ CHANGÉ AVEC LA PHRASE : une clé qui dit « RepartAZero » sur un texte
   * qui dit l'inverse se relit de travers au premier coup d'œil, et c'est
   * exactement comme ça qu'on réintroduit l'ancienne promesse par distraction.
   */
  reglesCarteConservee: {
    fr: 'La carte, elle, ne bouge pas : tes zones capturées et tes boucliers restent.',
    en: 'The map itself does not move: your captured zones and shields stay.',
    es: 'El mapa no se mueve: tus zonas capturadas y tus escudos se quedan.',
    de: 'Die Karte selbst bleibt: eroberte Zonen und Schilde behältst du.',
    pt: 'O mapa não muda: suas zonas capturadas e seus escudos ficam.',
  },
  /** Le gel de 24 h et le J+1 des résultats viennent de game-rules, jamais du texte. */
  reglesGel: {
    fr: 'Les scores sont gelés {h} h, les résultats tombent le lendemain.',
    en: 'Scores freeze for {h} h; results land the next day.',
    es: 'Las puntuaciones se congelan {h} h; los resultados llegan al día siguiente.',
    de: 'Punkte werden {h} h eingefroren, Ergebnisse folgen am nächsten Tag.',
    pt: 'As pontuações congelam por {h} h e os resultados saem no dia seguinte.',
  },

  // ══════════════ Prochaine saison ═══════════════════════════════════════════
  sectionProchaine: {
    fr: 'Prochaine saison',
    en: 'Next season',
    es: 'Próxima temporada',
    de: 'Nächste Saison',
    pt: 'Próxima temporada',
  },
  prochaineDansJours: {
    fr: 'Ouverture dans {n} j',
    en: 'Opens in {n} d',
    es: 'Abre en {n} d',
    de: 'Start in {n} T',
    pt: 'Abre em {n} d',
  },
  /** On ne connaît pas la date : on le DIT, on n'en invente pas une. */
  prochaineDateInconnue: {
    fr: 'La date d’ouverture n’est pas encore fixée.',
    en: 'The opening date is not set yet.',
    es: 'La fecha de apertura aún no está fijada.',
    de: 'Der Starttermin steht noch nicht fest.',
    pt: 'A data de abertura ainda não foi definida.',
  },

  // ══════════════ CTA ════════════════════════════════════════════════════════
  /** CTA HONNÊTE aujourd'hui : rien n'est « récupéré », tout est déjà décerné. */
  ctaVoirMesBadges: {
    fr: 'Voir mes badges',
    en: 'View my badges',
    es: 'Ver mis insignias',
    de: 'Meine Abzeichen',
    pt: 'Ver meus emblemas',
  },
  /** Réservé au jour où une remise RÉELLE existera. Ne pas peindre avant. */
  ctaRecuperer: {
    fr: 'Récupérer',
    en: 'Claim',
    es: 'Reclamar',
    de: 'Abholen',
    pt: 'Resgatar',
  },

  // ══════════════ Les quatre états non nominaux ══════════════════════════════
  etatChargement: {
    fr: 'Lecture du bilan…',
    en: 'Loading your season…',
    es: 'Cargando tu balance…',
    de: 'Bilanz wird geladen …',
    pt: 'Carregando seu balanço…',
  },
  etatDeconnecteTitre: {
    fr: 'Connecte-toi pour voir ton bilan',
    en: 'Sign in to see your season',
    es: 'Inicia sesión para ver tu balance',
    de: 'Melde dich an für deine Bilanz',
    pt: 'Entre para ver seu balanço',
  },
  etatDeconnecteCorps: {
    fr: 'Un bilan de saison appartient à un compte. Sans compte, il n’y a rien à afficher.',
    en: 'A season recap belongs to an account. Without one, there is nothing to show.',
    es: 'Un balance de temporada pertenece a una cuenta. Sin cuenta, no hay nada que mostrar.',
    de: 'Eine Saisonbilanz gehört zu einem Konto. Ohne Konto gibt es nichts zu zeigen.',
    pt: 'Um balanço de temporada pertence a uma conta. Sem conta, não há nada para mostrar.',
  },
  etatSansResultatTitre: {
    fr: 'Pas de classement cette saison',
    en: 'No ranking this season',
    es: 'Sin clasificación esta temporada',
    de: 'Diese Saison keine Wertung',
    pt: 'Sem classificação nesta temporada',
  },
  etatSansResultatCorps: {
    fr: 'Aucune sortie validée n’a été enregistrée. Une seule suffira la saison prochaine.',
    en: 'No validated activity was recorded. One will be enough next season.',
    es: 'No se registró ninguna actividad validada. Con una bastará la próxima temporada.',
    de: 'Keine gültige Aktivität erfasst. Nächste Saison genügt eine.',
    pt: 'Nenhuma atividade validada foi registrada. Uma só já basta na próxima temporada.',
  },
  etatEchecTitre: {
    fr: 'Bilan indisponible',
    en: 'Recap unavailable',
    es: 'Balance no disponible',
    de: 'Bilanz nicht verfügbar',
    pt: 'Balanço indisponível',
  },
  etatEchecCorps: {
    fr: 'La lecture a échoué. Ton rang n’est pas perdu — il est côté serveur.',
    en: 'The read failed. Your rank is not lost — it lives on the server.',
    es: 'La lectura falló. Tu rango no se ha perdido: está en el servidor.',
    de: 'Das Laden schlug fehl. Dein Rang ist nicht verloren — er liegt auf dem Server.',
    pt: 'A leitura falhou. Sua posição não se perdeu — ela está no servidor.',
  },
  reessayer: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
});
