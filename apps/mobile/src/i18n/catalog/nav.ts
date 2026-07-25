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

  // ── Contexte lecteur d'écran des actions (verbe + pourquoi) ──
  a11yRun: {
    fr: 'Lancer une course libre',
    en: 'Start a free run',
    es: 'Inicia una carrera libre',
    de: 'Freien Lauf starten',
    pt: 'Começar uma corrida livre',
  },
  a11yDefendre: {
    fr: 'Défendre {zone} — lancer la course de défense',
    en: 'Defend {zone} — start the defense run',
    es: 'Defiende {zone} — inicia la carrera de defensa',
    de: '{zone} schützen — Verteidigungslauf starten',
    pt: 'Defender {zone} — começar a corrida de defesa',
  },
  a11yConquerir: {
    fr: 'Conquérir {zone} — lancer la course de conquête',
    en: 'Conquer {zone} — start the conquest run',
    es: 'Conquista {zone} — inicia la carrera de conquista',
    de: '{zone} erobern — Eroberungslauf starten',
    pt: 'Conquistar {zone} — começar a corrida de conquista',
  },
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
  // « Où est mon run » (fiabilité 21/07) : le slot pendingUpload rendu VISIBLE.
  pendingRunNote: {
    fr: '1 course à synchroniser — toucher pour envoyer',
    en: '1 run to sync — tap to send',
    es: '1 carrera por sincronizar — toca para enviar',
    de: '1 Lauf zu synchronisieren — tippen zum Senden',
    pt: '1 corrida para sincronizar — toque para enviar',
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

  // ── LENTILLE BIKE (planche E14) — la sheet cesse d'être défensive. Elle
  //    répond aux quatre questions (où suis-je · à quoi ça sert · quoi
  //    maintenant · ce que j'y gagne) au lieu d'énumérer trois absences.
  //    INTERDITS TENUS ICI : aucun CTA « première sortie vélo » (il serait
  //    enregistré comme une course À PIED — bouton mort ou mensonge), aucune
  //    mission vélo dessinée (ni distance ni zone n'ont de source). ──
  bikeLensLine: {
    fr: 'Carte nue pour rouler : GRYD n’enregistre pas encore les sorties vélo.',
    en: 'A bare map to ride with: GRYD doesn’t record rides yet.',
    es: 'Un mapa limpio para rodar: GRYD aún no registra salidas en bici.',
    de: 'Eine nackte Karte zum Fahren: GRYD zeichnet Ausfahrten noch nicht auf.',
    pt: 'Um mapa limpo para pedalar: a GRYD ainda não registra pedais.',
  },
  /** LA seule action vraie de cette lentille — dite positivement. */
  bikeBackToRun: {
    fr: 'Revenir à la carte Run',
    en: 'Back to the Run map',
    es: 'Volver al mapa Run',
    de: 'Zurück zur Run-Karte',
    pt: 'Voltar ao mapa Run',
  },
});
