/**
 * GRYD — i18n : E70 « Zone attaquée » (feuille basse sur carte).
 *
 * ─── L'ÉCRAN, ET SON TON ──────────────────────────────────────────────────────
 * Entrée : notification, ou tap sur une zone contestée. Carte en haut, polygone
 * contesté, feuille basse : titre · nom de zone · rival public · temps restant ·
 * boucle de défense estimée · surface · CTA `DÉFENDRE` · secondaire
 * `Alerter le crew`.
 *
 * La spéc impose le ton en toutes lettres : « Des faits, une échéance, une
 * décision. Pas d'alarme anxiogène. » Aucune chaîne de ce catalogue ne crie, ne
 * culpabilise, ni ne compte à rebours à la seconde : on donne l'heure qu'il
 * reste et ce qu'il faut courir. Le titre de la planche VOUVOIE (« VOTRE ZONE
 * EST CONTESTÉE ») ; le dépôt TUTOIE (arbitrage A5) — c'est le dépôt qui gagne.
 *
 * ─── CE QUI NE PEUT PAS ÊTRE DIT ──────────────────────────────────────────────
 * · LE RIVAL. §12 (confidentialité géospatiale) et O1 : aucune identité
 *   cross-utilisateur consentie n'est lisible aujourd'hui. `rivalInconnu` est
 *   donc la formulation par défaut — on nomme la MENACE, jamais une personne
 *   inventée. `rivalHandle` n'est à utiliser que si un handle PUBLIC a
 *   réellement été résolu.
 * · L'HEURE PRÉCISE de l'attaque : elle situerait le rival dans la ville. On
 *   énonce un temps RESTANT, jamais un horodatage (cf. `PUBLIC_TIMESTAMP_TRUNC`).
 * · LA BOUCLE DE DÉFENSE est une ESTIMATION dérivée de la couverture exigée
 *   (`DEFENSE_COVER_LONGE_MIN` / `DEFENSE_COVER_FULL_MIN`), et le texte le dit :
 *   « environ ». Le serveur reste seul juge de la défense.
 *
 * ─── LES QUATRE ÉTATS ─────────────────────────────────────────────────────────
 * Une contestation vient d'une lecture (`territory_contests`) : elle peut être
 * EN COURS de lecture, ÉCHOUER, ou avoir EXPIRÉ entre la notification et
 * l'ouverture de l'écran (`etatResolueTitre` — la spéc E69 exige que les
 * éléments obsolètes disparaissent ; ici l'écran est déjà ouvert, il doit donc
 * le DIRE). Le cas « pas connecté » n'a pas de zone à défendre : `etatDeconnecte*`.
 *
 * §A : libellés courts dans les cinq langues, l'allemand reformulé concis.
 * Portugais BRÉSILIEN (« você » ; jamais « teu/tua/tens/podes »).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ══════════════ Titre et identité de la zone ═══════════════════════════════
  titre: {
    fr: 'Ta zone est contestée',
    en: 'Your zone is contested',
    es: 'Tu zona está en disputa',
    de: 'Deine Zone wird umkämpft',
    pt: 'Sua zona está em disputa',
  },
  /** Nom de secteur RÉEL (sectorName), jamais un lieu inventé. */
  a11yZoneContestee: {
    fr: 'Zone contestée sur la carte',
    en: 'Contested zone on the map',
    es: 'Zona en disputa en el mapa',
    de: 'Umkämpfte Zone auf der Karte',
    pt: 'Zona em disputa no mapa',
  },
  /** La zone n'a pas de nom lisible : on ne lui en fabrique pas un. */
  zoneSansNom: {
    fr: 'Zone sans nom',
    en: 'Unnamed zone',
    es: 'Zona sin nombre',
    de: 'Zone ohne Namen',
    pt: 'Zona sem nome',
  },

  // ══════════════ Rival (public seulement) ═══════════════════════════════════
  labelRival: {
    fr: 'Rival',
    en: 'Rival',
    es: 'Rival',
    de: 'Rivale',
    pt: 'Rival',
  },
  /** Le cas NORMAL aujourd'hui : la menace est réelle, l'identité ne l'est pas. */
  rivalInconnu: {
    fr: 'Non public',
    en: 'Not public',
    es: 'No público',
    de: 'Nicht öffentlich',
    pt: 'Não público',
  },

  // ══════════════ Échéance ═══════════════════════════════════════════════════
  labelTempsRestant: {
    fr: 'Temps restant',
    en: 'Time left',
    es: 'Tiempo restante',
    de: 'Verbleibend',
    pt: 'Tempo restante',
  },
  restantHeures: {
    fr: '{n} h',
    en: '{n} h',
    es: '{n} h',
    de: '{n} Std.',
    pt: '{n} h',
  },
  restantMoinsUneHeure: {
    fr: 'Moins d’une heure',
    en: 'Under an hour',
    es: 'Menos de una hora',
    de: 'Unter einer Stunde',
    pt: 'Menos de uma hora',
  },
  /** On ne sait pas : on le dit plutôt que d'afficher un décompte inventé. */
  restantInconnu: {
    fr: 'Échéance inconnue',
    en: 'Deadline unknown',
    es: 'Plazo desconocido',
    de: 'Frist unbekannt',
    pt: 'Prazo desconhecido',
  },

  // ══════════════ Ce qu'il faut courir, et ce que ça vaut ════════════════════
  labelBoucleEstimee: {
    fr: 'Boucle de défense',
    en: 'Defence loop',
    es: 'Bucle de defensa',
    de: 'Verteidigungsrunde',
    pt: 'Volta de defesa',
  },
  boucleEnviron: {
    fr: 'Environ {km} km',
    en: 'About {km} km',
    es: 'Unos {km} km',
    de: 'Etwa {km} km',
    pt: 'Cerca de {km} km',
  },
  /** L'estimation n'est pas calculable : ne rien avancer. */
  boucleInconnue: {
    fr: 'Distance non estimée',
    en: 'Distance not estimated',
    es: 'Distancia no estimada',
    de: 'Distanz nicht geschätzt',
    pt: 'Distância não estimada',
  },
  labelSurface: {
    fr: 'Surface en jeu',
    en: 'Area at stake',
    es: 'Superficie en juego',
    de: 'Fläche im Spiel',
    pt: 'Área em jogo',
  },
  /** Le serveur tranche, l'écran ne promet aucune reprise. */
  serveurDecide: {
    fr: 'Le serveur tranche à l’arrivée. Courir ne garantit rien.',
    en: 'The server decides on arrival. Running guarantees nothing.',
    es: 'El servidor decide al llegar. Correr no garantiza nada.',
    de: 'Der Server entscheidet am Ende. Laufen garantiert nichts.',
    pt: 'O servidor decide na chegada. Correr não garante nada.',
  },

  // ══════════════ Décisions ══════════════════════════════════════════════════
  /** CTA unique et chartreuse (§A4). */
  ctaDefendre: {
    fr: 'Défendre',
    en: 'Defend',
    es: 'Defender',
    de: 'Verteidigen',
    pt: 'Defender',
  },
  /** Secondaire — à ne peindre QUE si le joueur a un crew (sinon bouton mort). */
  secondaireAlerterCrew: {
    fr: 'Alerter le crew',
    en: 'Alert the crew',
    es: 'Avisar al crew',
    de: 'Crew alarmieren',
    pt: 'Avisar o crew',
  },
  crewAlerteEnvoyee: {
    fr: 'Le crew est prévenu.',
    en: 'The crew has been told.',
    es: 'El crew ha sido avisado.',
    de: 'Die Crew ist informiert.',
    pt: 'O crew foi avisado.',
  },
  crewAlerteEchec: {
    fr: 'L’alerte n’est pas partie. Réessaie.',
    en: 'The alert did not go out. Try again.',
    es: 'La alerta no se envió. Inténtalo de nuevo.',
    de: 'Die Warnung ging nicht raus. Versuch es erneut.',
    pt: 'O alerta não foi enviado. Tente de novo.',
  },

  // ══════════════ Les états non nominaux ═════════════════════════════════════
  etatChargement: {
    fr: 'Lecture de la contestation…',
    en: 'Loading the contest…',
    es: 'Cargando la disputa…',
    de: 'Angriff wird geladen …',
    pt: 'Carregando a disputa…',
  },
  etatDeconnecteTitre: {
    fr: 'Connecte-toi pour défendre',
    en: 'Sign in to defend',
    es: 'Inicia sesión para defender',
    de: 'Melde dich an zum Verteidigen',
    pt: 'Entre para defender',
  },
  etatDeconnecteCorps: {
    fr: 'Une zone se défend avec le compte qui l’a prise.',
    en: 'A zone is defended by the account that took it.',
    es: 'Una zona se defiende con la cuenta que la tomó.',
    de: 'Eine Zone verteidigt das Konto, das sie erobert hat.',
    pt: 'Uma zona é defendida pela conta que a conquistou.',
  },
  etatResolueTitre: {
    fr: 'Contestation terminée',
    en: 'Contest over',
    es: 'Disputa terminada',
    de: 'Angriff beendet',
    pt: 'Disputa encerrada',
  },
  etatResolueCorps: {
    fr: 'Cette attaque n’est plus en cours. Rien à défendre ici pour l’instant.',
    en: 'This attack is no longer running. Nothing to defend here for now.',
    es: 'Este ataque ya no está en curso. Nada que defender aquí por ahora.',
    de: 'Dieser Angriff läuft nicht mehr. Hier gibt es gerade nichts zu verteidigen.',
    pt: 'Este ataque não está mais em andamento. Nada a defender aqui por enquanto.',
  },
  etatEchecTitre: {
    fr: 'Zone indisponible',
    en: 'Zone unavailable',
    es: 'Zona no disponible',
    de: 'Zone nicht verfügbar',
    pt: 'Zona indisponível',
  },
  etatEchecCorps: {
    fr: 'La lecture a échoué. On ne sait pas si l’attaque court encore.',
    en: 'The read failed. We do not know if the attack is still running.',
    es: 'La lectura falló. No sabemos si el ataque sigue en curso.',
    de: 'Das Laden schlug fehl. Ob der Angriff läuft, ist unbekannt.',
    pt: 'A leitura falhou. Não sabemos se o ataque continua.',
  },
  reessayer: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  voirSurLaCarte: {
    fr: 'Voir sur la carte',
    en: 'View on map',
    es: 'Ver en el mapa',
    de: 'Auf der Karte',
    pt: 'Ver no mapa',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // AJOUTS DU CÂBLAGE (27/07/2026) — les états que la lecture RÉELLE produit
  //
  // Le bloc ci-dessus a été écrit AVANT que l'écran soit branché sur
  // `public.territory_contests`. Le câblage (`features/notifications/
  // contestedZone.ts` + `useContestedZone.ts`) a fait apparaître trois
  // situations que la première rédaction ne couvrait pas, et deux faits
  // serveur qu'elle ne pouvait pas encore nommer. Ils s'ajoutent ici plutôt
  // que de réécrire l'existant.
  // ══════════════════════════════════════════════════════════════════════════

  // ─── Barre d'en-tête (le bloc initial décrivait une feuille, pas un écran) ─
  /** §A.9 : rendu avec `ellipsizeMode="clip"` — jamais coupé par « … ». */
  screenTitle: {
    fr: 'Zone attaquée',
    en: 'Zone under attack',
    es: 'Zona atacada',
    de: 'Angegriffenes Gebiet',
    pt: 'Zona atacada',
  },
  backA11y: {
    fr: 'Revenir à l’écran précédent',
    en: 'Back to the previous screen',
    es: 'Volver a la pantalla anterior',
    de: 'Zurück zum vorherigen Bildschirm',
    pt: 'Voltar à tela anterior',
  },

  // ─── Introuvable : n'existe pas, OU ne m'est pas visible ───────────────────
  /**
   * `territory_contests_select_parties` (0078 §4) ne rend la ligne qu'aux DEUX
   * camps. « Aucune ligne » couvre donc deux causes, rendues INDISTINGUABLES à
   * dessein : les séparer ferait de l'écran un oracle d'existence de
   * contestations (même arbitrage que `rivalZones.notFound`).
   */
  etatIntrouvableTitre: {
    fr: 'Contestation introuvable',
    en: 'Contest not found',
    es: 'Disputa no encontrada',
    de: 'Angriff nicht gefunden',
    pt: 'Disputa não encontrada',
  },
  etatIntrouvableCorps: {
    fr: 'Cette contestation n’existe pas, ou elle ne te concerne pas.',
    en: 'This contest doesn’t exist, or it doesn’t involve you.',
    es: 'Esta disputa no existe, o no tiene que ver contigo.',
    de: 'Dieser Angriff existiert nicht oder betrifft dich nicht.',
    pt: 'Esta disputa não existe, ou não tem a ver com você.',
  },

  // ─── Visible, mais je ne suis pas le camp qui défend ───────────────────────
  /**
   * DEUX situations réelles sous un seul texte : (a) c'est MOI qui attaque — la
   * policy m'ouvre les deux camps, et titrer « ta zone est contestée » sur ma
   * propre offensive serait faux ; (b) la zone appartient à mon CREW, et savoir
   * si j'en suis défenseur exige une lecture de `crew_members` que ce lot
   * n'écrit pas. Les nommer toutes les deux vaut mieux qu'un message qui n'en
   * couvrirait qu'une.
   */
  etatPasDefenseurTitre: {
    fr: 'Ce n’est pas une zone que tu défends',
    en: 'This isn’t a zone you defend',
    es: 'No es una zona que defiendas',
    de: 'Das ist keine Zone, die du verteidigst',
    pt: 'Esta não é uma zona que você defende',
  },
  etatPasDefenseurCorps: {
    fr: 'Soit c’est toi qui attaques, soit la zone appartient à ton crew — la défense de crew n’est pas encore suivie ici.',
    en: 'Either you’re the attacker, or the zone belongs to your crew — crew defence isn’t tracked here yet.',
    es: 'O eres tú quien ataca, o la zona pertenece a tu crew: la defensa de crew aún no se sigue aquí.',
    de: 'Entweder greifst du selbst an, oder die Zone gehört deiner Crew — Crew-Verteidigung wird hier noch nicht verfolgt.',
    pt: 'Ou é você que ataca, ou a zona pertence ao seu crew — a defesa de crew ainda não é acompanhada aqui.',
  },

  // ─── Encore ouverte en base, mais l'échéance est passée ────────────────────
  /**
   * `resolve_due_contests` (0080) est un CRON : il existe donc une fenêtre où la
   * base dit encore `active` alors que le temps de défendre est écoulé. On
   * décrit ce délai — jamais un rebours à « 0 h », qui laisserait croire qu'il
   * reste une chance de courir.
   */
  etatFenetreFermeeTitre: {
    fr: 'Fenêtre de défense fermée',
    en: 'Defence window closed',
    es: 'Ventana de defensa cerrada',
    de: 'Verteidigungsfenster geschlossen',
    pt: 'Janela de defesa fechada',
  },
  etatFenetreFermeeCorps: {
    fr: 'L’échéance est passée. L’issue se décide côté serveur, elle apparaîtra ici sous peu.',
    en: 'The deadline has passed. The outcome is decided server-side and will show here shortly.',
    es: 'El plazo venció. El resultado se decide en el servidor y aparecerá aquí en breve.',
    de: 'Die Frist ist abgelaufen. Der Ausgang wird serverseitig entschieden und erscheint hier bald.',
    pt: 'O prazo passou. O resultado é decidido no servidor e aparece aqui em breve.',
  },

  // ─── Les trois issues de §19.3, dites une par une ──────────────────────────
  // `etatResolueCorps` (générique, plus haut) reste le texte du statut INCONNU :
  // une valeur ajoutée par une migration future ne doit pas être interprétée.
  etatResolueDefendue: {
    fr: 'Tu as tenu cette zone. Il n’y a plus rien à défendre ici.',
    en: 'You held this zone. There’s nothing left to defend here.',
    es: 'Mantuviste esta zona. Ya no hay nada que defender aquí.',
    de: 'Du hast diese Zone gehalten. Hier gibt es nichts mehr zu verteidigen.',
    pt: 'Você segurou esta zona. Não há mais nada a defender aqui.',
  },
  etatResolueTransferee: {
    fr: 'Cette zone a changé de main à l’échéance.',
    en: 'This zone changed hands at the deadline.',
    es: 'Esta zona cambió de manos al vencer el plazo.',
    de: 'Diese Zone hat mit Fristende den Besitzer gewechselt.',
    pt: 'Esta zona mudou de dono no fim do prazo.',
  },
  etatResolueAnnulee: {
    fr: 'Cette contestation a été annulée. Ta zone n’a pas bougé.',
    en: 'This contest was cancelled. Your zone didn’t move.',
    es: 'Esta disputa se anuló. Tu zona no se movió.',
    de: 'Dieser Angriff wurde abgebrochen. Deine Zone blieb unverändert.',
    pt: 'Esta disputa foi cancelada. Sua zona não mudou.',
  },

  // ─── Deux faits SERVEUR que la première rédaction ne pouvait pas nommer ────
  /**
   * `overlap_ratio` est MESURÉ par le moteur et PERSISTÉ (0078) : ce n'est ni
   * une estimation, ni un recalcul client. Il reste explicable des mois plus
   * tard, même après un changement de seuil.
   */
  couverture: {
    fr: 'Sa boucle a couvert {p} % de ta zone.',
    en: 'Their loop covered {p} % of your zone.',
    es: 'Su bucle cubrió el {p} % de tu zona.',
    de: 'Seine Runde deckte {p} % deiner Zone ab.',
    pt: 'A volta dele cobriu {p} % da sua zona.',
  },
  /** `geometry_generalized` absente : la carte disparaît, et on dit pourquoi. */
  contourAbsent: {
    fr: 'Le contour de cette zone n’est pas encore calculé — l’échéance, elle, est bien réelle.',
    en: 'This zone’s outline isn’t computed yet — the deadline is real all the same.',
    es: 'El contorno de esta zona aún no está calculado; el plazo sí es real.',
    de: 'Der Umriss dieser Zone ist noch nicht berechnet — die Frist ist trotzdem echt.',
    pt: 'O contorno desta zona ainda não foi calculado — o prazo, esse é real.',
  },

  // ─── Décision : ce que le CTA fait vraiment, et ce qu'aucun achat ne fait ──
  a11yDefendre: {
    fr: 'Préparer une sortie de défense',
    en: 'Set up a defence activity',
    es: 'Preparar una actividad de defensa',
    de: 'Eine Verteidigungs-Aktivität vorbereiten',
    pt: 'Preparar uma atividade de defesa',
  },
  /** ANTI-PAY-TO-WIN dit à l'endroit exact où l'envie d'acheter naîtrait. */
  defendreExplication: {
    fr: 'Reboucler cette zone avant l’échéance est le seul moyen de la garder. Aucun achat ne défend un territoire.',
    en: 'Looping this zone again before the deadline is the only way to keep it. No purchase defends a territory.',
    es: 'Volver a rodear esta zona antes del plazo es la única forma de conservarla. Ninguna compra defiende un territorio.',
    de: 'Diese Zone vor Fristende erneut zu umrunden ist der einzige Weg, sie zu behalten. Kein Kauf verteidigt ein Gebiet.',
    pt: 'Fechar o laço nesta zona antes do prazo é o único jeito de mantê-la. Nenhuma compra defende um território.',
  },

  // ─── Ce qui n'existe pas encore, dit à sa place (gris, en bas) ─────────────
  /**
   * `secondaireAlerterCrew` / `crewAlerteEnvoyee` / `crewAlerteEchec` ont été
   * rédigés en prévision d'un envoi qui N'EXISTE PAS : aucune surface de l'app
   * n'écrit dans `crew_messages`. Le bouton n'est donc PAS peint, et son
   * absence est nommée par ce texte. Les trois clés restent en place pour le
   * jour où l'écriture existera.
   */
  absenceAlerteCrew: {
    fr: 'Prévenir ton crew depuis cet écran n’existe pas encore : aucun message ne partirait.',
    en: 'Alerting your crew from this screen doesn’t exist yet: no message would go out.',
    es: 'Avisar a tu crew desde esta pantalla aún no existe: no saldría ningún mensaje.',
    de: 'Deine Crew von hier zu warnen, gibt es noch nicht: Es würde keine Nachricht rausgehen.',
    pt: 'Avisar seu crew por esta tela ainda não existe: nenhuma mensagem sairia.',
  },
  /**
   * `boucleEnviron` supposait une distance dérivable. Rien dans le dépôt ne
   * sait produire, POUR CE POLYGONE, une distance de défense qui ne soit pas
   * une invention : la ligne est ABSENTE et son absence est dite.
   */
  absenceBoucleEstimee: {
    fr: 'GRYD ne calcule pas encore de boucle de défense pour cette zone : la distance reste masquée tant qu’elle ne serait qu’une estimation.',
    en: 'GRYD doesn’t compute a defence loop for this zone yet: the distance stays hidden as long as it would only be a guess.',
    es: 'GRYD todavía no calcula un bucle de defensa para esta zona: la distancia queda oculta mientras solo sea una estimación.',
    de: 'GRYD berechnet für diese Zone noch keine Verteidigungsrunde: Die Distanz bleibt verborgen, solange sie nur geschätzt wäre.',
    pt: 'O GRYD ainda não calcula uma volta de defesa para esta zona: a distância fica oculta enquanto for só uma estimativa.',
  },
});
