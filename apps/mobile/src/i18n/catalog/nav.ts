/**
 * GRYD — i18n : catalogue du domaine « nav-tabs ».
 * Onglets (layout tabs), départ glissé (SlideToStart), verbes du bouton
 * d'action contextuel (contextualAction) et ligne mission de la Carte (index).
 *
 * INVARIANTS (jamais traduits, donc PAS ici) : GRYD, GO, Crew (onglet et
 * concept), noms propres (République…), km, min. « RUN » est le verbe produit
 * de la course libre (AMENDEMENT-29) : identique dans les 5 langues, mais
 * gardé en Entry pour la parité et un éventuel arbitrage futur.
 *
 * §A CONTRAIGNANT : les verbes du bouton central et les libellés d'action
 * restent COURTS dans toutes les langues (l'allemand est reformulé concis :
 * SCHÜTZEN, EROBERN, BEENDEN — jamais de mot composé à rallonge).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Onglets (layout tabs) — « Crew » reste invariant, hors catalogue ──
  tabCarte: {
    fr: 'Carte',
    en: 'Map',
    es: 'Mapa',
    de: 'Karte',
    pt: 'Mapa',
  },
  tabMissions: {
    fr: 'Missions',
    en: 'Missions',
    es: 'Misiones',
    de: 'Missionen',
    pt: 'Missões',
  },
  tabSaison: {
    fr: 'Saison',
    en: 'Season',
    es: 'Temporada',
    de: 'Saison',
    pt: 'Temporada',
  },
  // Onglet Profil (planche E02/E03/E15 : « Profil »).
  tabMoi: {
    fr: 'Profil',
    en: 'Profile',
    es: 'Perfil',
    de: 'Profil',
    pt: 'Perfil',
  },

  // ── Départ de course : libellé lecteur d'écran. Le composant « glisser
  //    pour courir » (SlideToStart) a été SUPPRIMÉ le 25/07/2026 — il n'était
  //    plus importé nulle part depuis que le départ est un simple tap sur GO.
  //    L'entrée reste : elle décrit encore le départ, et le typage impose ses
  //    5 langues le jour où une surface la reprend. ──
  slideToStartA11y: {
    fr: '{label} — glisse pour lancer la course',
    en: '{label} — slide to start the run',
    es: '{label} — desliza para empezar la carrera',
    de: '{label} — schieb, um den Lauf zu starten',
    pt: '{label} — deslize para começar a corrida',
  },

  // ── Verbes du bouton central (contextualAction) — COURTS partout (§A) ──
  actionRun: {
    fr: 'RUN',
    en: 'RUN',
    es: 'RUN',
    de: 'RUN',
    pt: 'RUN',
  },
  actionDefendre: {
    fr: 'DÉFENDRE',
    en: 'DEFEND',
    es: 'DEFIENDE',
    de: 'SCHÜTZEN',
    pt: 'DEFENDER',
  },
  actionConquerir: {
    fr: 'CONQUÉRIR',
    en: 'CONQUER',
    es: 'CONQUISTA',
    de: 'EROBERN',
    pt: 'CONQUISTAR',
  },
  actionTerminer: {
    fr: 'TERMINER',
    en: 'FINISH',
    es: 'TERMINA',
    de: 'BEENDEN',
    pt: 'TERMINAR',
  },
  actionRejoindre: {
    fr: 'REJOINDRE',
    en: 'JOIN',
    es: 'ÚNETE',
    de: 'MITLAUFEN',
    pt: 'ENTRAR',
  },

  /**
   * DISCIPLINE ANNONCÉE PAR LE BOUTON GO (E14, 26/07/2026).
   *
   * Le bouton dit « GO » dans les deux mondes (override fondateur
   * AMENDEMENT-38 : le mot ne change jamais) et sa seule marque visuelle de
   * discipline est un PICTO. Un picto n'est pas lu par VoiceOver : sans ces
   * deux entrées, un utilisateur non-voyant appuierait sur « GO » sans savoir
   * s'il enregistre une course ou une sortie vélo — c'est-à-dire exactement la
   * décision silencieuse que l'arbitrage du 25/07 interdit.
   * Elles nomment CE QUI VA ÊTRE ENREGISTRÉ, pas la lentille de la carte.
   */
  goActivityRunA11y: {
    fr: 'course à pied',
    en: 'run',
    es: 'carrera a pie',
    de: 'Lauf',
    pt: 'corrida a pé',
  },
  goActivityBikeA11y: {
    fr: 'sortie vélo',
    en: 'bike ride',
    es: 'salida en bici',
    de: 'Radausfahrt',
    pt: 'pedal',
  },

  /**
   * ── Contexte lecteur d'écran des actions (verbe + pourquoi) ───────────────
   *
   * TROIS PAIRES, PAS TROIS PHRASES (26/07/2026). Ces libellés sont COLLÉS au
   * mot de discipline (`goActivity*A11y`) dans l'énoncé du bouton GO. Tant
   * qu'ils disaient « course » quelle que soit la lentille, VoiceOver annonçait
   * mot pour mot « GO — sortie vélo — Lancer une course libre » : la seule
   * phrase de l'app qui se contredise DANS LA MÊME RESPIRATION, sur le CTA le
   * plus important, et pour les seuls utilisateurs qui ne peuvent pas la
   * contourner du regard. La Carte PORTE la lentille (elle l'affiche et elle la
   * déclare au départ) : le correctif juste est donc un JUMEAU par discipline,
   * pas une neutralisation — l'écran sait de quel monde il parle.
   *
   * Convention du repo (`historique.ts` : `a11yRunEffort` / `a11yRunEffortBike`)
   * : la clé NUE est le monde « à pied », le suffixe `Bike` son jumeau.
   *
   * ⚠️ L'ALLEMAND A ÉTÉ REFORMULÉ, ET CE N'EST PAS COSMÉTIQUE. « Verteidigungs-
   * lauf » / « Eroberungslauf » nomment bel et bien la course à pied, mais le
   * garde-fou (`disciplineVocabulary.ts`) cherche `\bLauf\b` : dans un composé
   * soudé il n'y a PAS de frontière de mot, et ces deux phrases passaient donc
   * pour neutres. Un jumeau que le filet ne voit pas n'est pas verrouillé. La
   * forme analytique (« Lauf zur Verteidigung ») dit exactement la même chose
   * et reste lisible par le test.
   */
  a11yRun: {
    fr: 'Lancer une course libre',
    en: 'Start a free run',
    es: 'Inicia una carrera libre',
    de: 'Freien Lauf starten',
    pt: 'Começar uma corrida livre',
  },
  /** Jumeau VÉLO de `a11yRun` (course libre → sortie vélo libre). */
  a11yRunBike: {
    fr: 'Lancer une sortie vélo libre',
    en: 'Start a free ride',
    es: 'Inicia una salida en bici libre',
    de: 'Freie Radausfahrt starten',
    pt: 'Começar um pedal livre',
  },
  a11yDefendre: {
    fr: 'Défendre {zone} — lancer la course de défense',
    en: 'Defend {zone} — start the defense run',
    es: 'Defiende {zone} — inicia la carrera de defensa',
    de: '{zone} schützen — Lauf zur Verteidigung starten',
    pt: 'Defender {zone} — começar a corrida de defesa',
  },
  /** Jumeau VÉLO de `a11yDefendre`. */
  a11yDefendreBike: {
    fr: 'Défendre {zone} — lancer la sortie vélo de défense',
    en: 'Defend {zone} — start the defense ride',
    es: 'Defiende {zone} — inicia la salida en bici de defensa',
    de: '{zone} schützen — Radausfahrt zur Verteidigung starten',
    pt: 'Defender {zone} — começar o pedal de defesa',
  },
  a11yConquerir: {
    fr: 'Conquérir {zone} — lancer la course de conquête',
    en: 'Conquer {zone} — start the conquest run',
    es: 'Conquista {zone} — inicia la carrera de conquista',
    de: '{zone} erobern — Lauf zur Eroberung starten',
    pt: 'Conquistar {zone} — começar a corrida de conquista',
  },
  /** Jumeau VÉLO de `a11yConquerir`. */
  a11yConquerirBike: {
    fr: 'Conquérir {zone} — lancer la sortie vélo de conquête',
    en: 'Conquer {zone} — start the conquest ride',
    es: 'Conquista {zone} — inicia la salida en bici de conquista',
    de: '{zone} erobern — Radausfahrt zur Eroberung starten',
    pt: 'Conquistar {zone} — começar o pedal de conquista',
  },
  /**
   * PAS DE JUMEAU ICI, ET C'EST LE CORRECTIF (26/07/2026). `a11yTerminer` et
   * `a11yRejoindre` ne nomment AUCUNE discipline : refermer une boucle de crew
   * et rejoindre une mission se disent à l'identique dans les deux mondes. Leur
   * fabriquer un doublon « à vélo » n'ajouterait pas une information, il
   * ajouterait un texte de plus à maintenir — et il suggérerait deux mécaniques
   * là où il n'en existe qu'une. Le mot de discipline reste porté UNE fois, par
   * le préfixe du bouton (`goActivity*A11y`).
   */
  a11yTerminer: {
    fr: 'Terminer {zone} — refermer la boucle du crew',
    en: 'Finish {zone} — close the crew loop',
    es: 'Termina {zone} — cierra el circuito del crew',
    de: '{zone} beenden — die Crew-Runde schließen',
    pt: 'Terminar {zone} — fechar o circuito do crew',
  },
  a11yRejoindre: {
    fr: 'Rejoindre la mission du crew — {mission}',
    en: 'Join the crew mission — {mission}',
    es: 'Únete a la misión del crew — {mission}',
    de: 'Der Crew-Mission beitreten — {mission}',
    pt: 'Entrar na missão do crew — {mission}',
  },

  // ── Désignations de zone injectées dans les a11y ci-dessus ──
  zoneThis: {
    fr: 'cette zone',
    en: 'this zone',
    es: 'esta zona',
    de: 'diese Zone',
    pt: 'esta zona',
  },
  zoneYours: {
    fr: 'ta zone',
    en: 'your zone',
    es: 'tu zona',
    de: 'deine Zone',
    pt: 'sua zona',
  },
  crewMissionFallback: {
    fr: 'mission crew',
    en: 'crew mission',
    es: 'misión del crew',
    de: 'Crew-Mission',
    pt: 'missão do crew',
  },

  // ── Ligne mission de la Carte (index) ──
  zonesOne: {
    fr: '{n} zone',
    en: '{n} zone',
    es: '{n} zona',
    de: '{n} Zone',
    pt: '{n} zona',
  },
  zonesMany: {
    fr: '{n} zones',
    en: '{n} zones',
    es: '{n} zonas',
    de: '{n} Zonen',
    pt: '{n} zonas',
  },
  missionDetailMeta: {
    fr: '{km} · +{pts} pts crew',
    en: '{km} · +{pts} crew pts',
    es: '{km} · +{pts} pts crew',
    de: '{km} · +{pts} Crew-Pkt.',
    pt: '{km} · +{pts} pts crew',
  },
  rivalShare: {
    fr: '{name} · {pct} %',
    en: '{name} · {pct}%',
    es: '{name} · {pct} %',
    de: '{name} · {pct} %',
    pt: '{name} · {pct}%',
  },
  sectorHeadA11y: {
    fr: 'Secteur {sector}, données {freshness}. Rival principal {rival}, {pct} pour cent.',
    en: 'Sector {sector}, data {freshness}. Main rival {rival}, {pct} percent.',
    es: 'Sector {sector}, datos {freshness}. Rival principal {rival}, {pct} por ciento.',
    de: 'Sektor {sector}, Daten {freshness}. Hauptrivale {rival}, {pct} Prozent.',
    pt: 'Setor {sector}, dados {freshness}. Rival principal {rival}, {pct} por cento.',
  },
  missionDetailOpenA11y: {
    fr: 'voir le détail de la mission',
    en: 'view mission details',
    es: 'ver el detalle de la misión',
    de: 'Missionsdetails anzeigen',
    pt: 'ver os detalhes da missão',
  },
  missionDetailCloseA11y: {
    fr: 'fermer le détail de la mission',
    en: 'close mission details',
    es: 'cerrar el detalle de la misión',
    de: 'Missionsdetails schließen',
    pt: 'fechar os detalhes da missão',
  },
  // Header du Home (planche E02/E03 ①) : l'avatar ouvre le profil.
  headerProfileA11y: {
    fr: 'Mon profil',
    en: 'My profile',
    es: 'Mi perfil',
    de: 'Mein Profil',
    pt: 'Meu perfil',
  },
  // ── La CLOCHE du header (planche E02/E03 ①, → /activite) ──
  // Elle n'est peinte QUE quand au moins une zone est réellement à défendre
  // (`bell.ts`), donc son libellé n'a jamais à couvrir le cas « 0 » : le
  // singulier et le pluriel suffisent. `{n}` porte le compte EXACT, jamais le
  // texte plafonné « 99+ » de la pastille — un lecteur d'écran n'a pas de
  // contrainte de largeur, il n'a aucune raison d'hériter d'un arrondi.
  headerBellA11yOne: {
    fr: 'Activité — {n} zone à défendre',
    en: 'Activity — {n} zone to defend',
    es: 'Actividad — {n} zona que defender',
    de: 'Aktivität — {n} Zone zu verteidigen',
    pt: 'Atividade — {n} zona a defender',
  },
  headerBellA11yMany: {
    fr: 'Activité — {n} zones à défendre',
    en: 'Activity — {n} zones to defend',
    es: 'Actividad — {n} zonas que defender',
    de: 'Aktivität — {n} Zonen zu verteidigen',
    pt: 'Atividade — {n} zonas a defender',
  },
  planRoute: {
    fr: 'Planifier un parcours',
    en: 'Plan a route',
    es: 'Planificar una ruta',
    de: 'Route planen',
    pt: 'Planejar uma rota',
  },
  planRouteA11y: {
    fr: "Planifier un parcours — ouvrir le planificateur d'itinéraire",
    en: 'Plan a route — open the route planner',
    es: 'Planificar una ruta — abrir el planificador de rutas',
    de: 'Route planen — den Routenplaner öffnen',
    pt: 'Planejar uma rota — abrir o planejador de rotas',
  },
  // Barre « Sauvegarder / Annuler » qui suit le clavier (retour terrain 20/07 :
  // le CTA de sauvegarde était caché par le clavier dès qu'on tapait du texte).
  // Labels COURTS : la barre est étroite, rien ne doit être tronqué (§A).
  saveBarQuestion: {
    fr: 'Enregistrer les modifications ?',
    en: 'Save your changes?',
    es: '¿Guardar los cambios?',
    de: 'Änderungen speichern?',
    pt: 'Salvar as alterações?',
  },
  saveBarSave: {
    fr: 'Enregistrer',
    en: 'Save',
    es: 'Guardar',
    de: 'Speichern',
    pt: 'Salvar',
  },
  saveBarCancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },
  /**
   * « Où est mon run » (fiabilité 21/07) : le slot pendingUpload rendu VISIBLE.
   *
   * NEUTRALISÉ le 26/07/2026, et surtout PAS jumelé. La tentation était de
   * suivre la lentille de la Carte comme le fait GO deux composants plus haut —
   * ç'aurait été un mensonge d'un genre plus retors : l'envoi en attente est
   * une sortie DÉJÀ TERMINÉE, sa discipline est celle du jour où elle a été
   * courue (ou roulée), pas celle du commutateur d'aujourd'hui. Un cycliste
   * regardant la lentille Run aurait lu « 1 course à synchroniser » pour son
   * pedal. Et la source ne permet même pas de trancher : `hasPendingUpload()`
   * (`lib/pendingUpload.ts:56`) rend un BOOLÉEN — la discipline du payload
   * n'est pas exposée. On dit donc le seul mot vrai dans les deux cas.
   */
  pendingRunNote: {
    fr: '1 sortie à synchroniser — toucher pour envoyer',
    en: '1 activity to sync — tap to send',
    es: '1 salida por sincronizar — toca para enviar',
    de: '1 Aktivität zu synchronisieren — tippen zum Senden',
    pt: '1 atividade para sincronizar — toque para enviar',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // ÉTATS DE POSITION AGISSANTS (retour fondateur 25/07/2026)
  //
  // « Active la localisation pour te voir » est un CONSTAT. Le fondateur :
  // « l'utilisateur n'a pas besoin d'une phrase, il a besoin d'une action
  // dirigée ». Ces entrées portent donc les trois états DISTINCTS de la matrice
  // (`map/locationState.ts`) avec, chacun, sa VRAIE issue :
  //   · jamais demandé → un geste dans l'app suffit (resolveLocation) ;
  //   · refusé         → les réglages système… ou, sur web, l'explication seule,
  //                      parce qu'aucune API n'y mène aux réglages du navigateur
  //                      (un bouton qui échoue à coup sûr est un bouton mort) ;
  //   · introuvable    → réessayer, le capteur peut répondre cette fois.
  // Les phrases de la PILL de carte (`catalog/map.ts`, dataNoteLocation*) restent
  // ce qu'elles sont : un état lu à distance. Ici on écrit ce qui se TOUCHE.
  // ═════════════════════════════════════════════════════════════════════════
  locGrantTitle: {
    fr: 'Vois-toi sur la carte',
    en: 'See yourself on the map',
    es: 'Verte en el mapa',
    de: 'Sieh dich auf der Karte',
    pt: 'Veja-se no mapa',
  },
  /** Le POURQUOI, et la limite de vie privée dite dans la même phrase. */
  locGrantLine: {
    fr: 'GRYD centre la carte sur toi. Ta position n’est jamais partagée en direct.',
    en: 'GRYD centres the map on you. Your position is never shared live.',
    es: 'GRYD centra el mapa en ti. Tu ubicación nunca se comparte en directo.',
    de: 'GRYD zentriert die Karte auf dich. Dein Standort wird nie live geteilt.',
    pt: 'A GRYD centra o mapa em você. Sua posição nunca é compartilhada ao vivo.',
  },
  locGrantCta: {
    fr: 'Activer ma position',
    en: 'Turn on my location',
    es: 'Activar mi ubicación',
    de: 'Standort aktivieren',
    pt: 'Ativar minha localização',
  },
  locDeniedTitle: {
    fr: 'Localisation bloquée',
    en: 'Location blocked',
    es: 'Ubicación bloqueada',
    de: 'Standort blockiert',
    pt: 'Localização bloqueada',
  },
  /** Variante NATIVE : il existe un écran de réglages, et un bouton y mène. */
  locDeniedLineSettings: {
    fr: 'L’accès à ta position est refusé. Il se réactive dans les réglages de ton téléphone.',
    en: 'Location access is denied. You can switch it back on in your phone settings.',
    es: 'El acceso a tu ubicación está denegado. Se reactiva en los ajustes del teléfono.',
    de: 'Der Standortzugriff ist verweigert. In den Telefoneinstellungen lässt er sich wieder aktivieren.',
    pt: 'O acesso à sua localização está negado. Ele se reativa nos ajustes do telefone.',
  },
  /** Variante WEB : aucune API ne mène aux réglages — on dit OÙ, sans bouton. */
  locDeniedLineBrowser: {
    fr: 'Ton navigateur bloque la position pour ce site. Autorise-la dans ses réglages.',
    en: 'Your browser blocks location for this site. Allow it in its settings.',
    es: 'Tu navegador bloquea la ubicación para este sitio. Permítela en sus ajustes.',
    de: 'Dein Browser blockiert den Standort für diese Seite. Erlaube ihn in seinen Einstellungen.',
    pt: 'Seu navegador bloqueia a localização deste site. Permita nas configurações dele.',
  },
  locSettingsCta: {
    fr: 'Ouvrir les réglages',
    en: 'Open settings',
    es: 'Abrir ajustes',
    de: 'Einstellungen öffnen',
    pt: 'Abrir ajustes',
  },
  locRetryTitle: {
    fr: 'Position introuvable',
    en: 'Position not found',
    es: 'Ubicación no encontrada',
    de: 'Standort nicht gefunden',
    pt: 'Posição não encontrada',
  },
  locRetryLine: {
    fr: 'Le capteur n’a rien renvoyé. Vérifie que la localisation du téléphone est allumée.',
    en: 'The sensor returned nothing. Check that your phone location is switched on.',
    es: 'El sensor no devolvió nada. Comprueba que la ubicación del teléfono esté activada.',
    de: 'Der Sensor lieferte nichts. Prüfe, ob die Ortung des Telefons an ist.',
    pt: 'O sensor não retornou nada. Verifique se a localização do telefone está ligada.',
  },
  locRetryCta: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ── BARRE HAUTE non bloquante (planche E02) : l'état ET son verbe sur une
  //    seule ligne. Elle n'apparaît QUE si elle porte une action réelle (la
  //    matrice le garantit) — sinon ce serait une phrase de plus. Courte :
  //    elle partage sa rangée avec le commutateur Run/Bike. ──
  locBarGrant: {
    fr: 'Position inconnue · Activer',
    en: 'Position unknown · Turn on',
    es: 'Ubicación desconocida · Activar',
    de: 'Standort unbekannt · Aktivieren',
    pt: 'Posição desconhecida · Ativar',
  },
  locBarDenied: {
    fr: 'Localisation bloquée · Réglages',
    en: 'Location blocked · Settings',
    es: 'Ubicación bloqueada · Ajustes',
    de: 'Standort blockiert · Einstellungen',
    pt: 'Localização bloqueada · Ajustes',
  },
  locBarRetry: {
    fr: 'Position introuvable · Réessayer',
    en: 'Position not found · Retry',
    es: 'Ubicación no hallada · Reintentar',
    de: 'Standort nicht gefunden · Erneut',
    pt: 'Posição não encontrada · Repetir',
  },
  /** Tentative EN COURS : un état, pas une promesse — et l'action est verrouillée. */
  locSearching: {
    fr: 'Recherche de ta position…',
    en: 'Finding your position…',
    es: 'Buscando tu ubicación…',
    de: 'Standort wird gesucht…',
    pt: 'Procurando sua posição…',
  },

  /**
   * SKELETON de la sheet (planche E02 : « chargement : fond de carte d'abord,
   * skeleton dans la sheet, AUCUN spinner plein écran »). Le lecteur d'écran doit
   * entendre « ça charge » — pas le silence d'un bloc décoratif.
   */
  sheetLoadingA11y: {
    fr: 'Chargement de ton territoire',
    en: 'Loading your turf',
    es: 'Cargando tu territorio',
    de: 'Dein Gebiet wird geladen',
    pt: 'Carregando seu território',
  },

  // ── RETIRÉ LE 26/07/2026 : `bikeLensLine` (« carte nue pour rouler : GRYD
  //    n'enregistre pas encore les sorties vélo ») et `bikeBackToRun`
  //    (« Revenir à la carte Run »). Les deux servaient un peek qui n'existe
  //    plus : le vélo enregistre, la lentille Bike montre le même HUD que la
  //    lentille Run, et « revenir en Run » est une bascule de commutateur, pas
  //    une action d'écran. Laisser la phrase aurait fait dire à l'app qu'elle
  //    n'enregistre pas ce qu'elle enregistre. ──
});
