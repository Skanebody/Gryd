/**
 * GRYD — i18n : catalogue du domaine « reglages-docs ».
 * Paramètres (liste + sous-pages), Confidentialité, Support, Code de conduite.
 *
 * INVARIANTS (jamais traduits, donc PAS ici) : GRYD, GO, GRYD VERIFIED, Crew
 * (concept), @handles, noms propres (Paris, Lille…), H3, km, min, valeurs
 * moteur figées (« 24 h », « 80 m »), version d'app.
 *
 * §A CONTRAIGNANT : labels de lignes, CTA et kickers restent COURTS dans les
 * 5 langues (l'allemand est reformulé concis : « Spieler melden », « Endgültig
 * löschen » — jamais de composé à rallonge qui tronque à 375px).
 *
 * ─── VOCABULAIRE NEUTRALISÉ LE 26/07/2026 (vélo = discipline RÉELLE) ─────────
 * AUCUN des écrans servis par ce catalogue ne porte le commutateur E14 :
 * Paramètres, ses sous-pages, Confidentialité, Aide et le Code de conduite ne
 * LISENT jamais de discipline, ils gouvernent les DEUX. Le remède n'est donc
 * PAS un jumeau par discipline (il n'y aurait aucune surface pour le choisir),
 * c'est la NEUTRALISATION : ces textes ne nomment plus « la course » quand ils
 * parlent de n'importe quelle sortie — réglages pendant l'effort, statut de
 * validation, export RGPD, suppression de compte, règles de conduite.
 *
 * Choix de mots, tenu partout ici : FR « sortie » (le terme déjà employé par
 * les CGU, le Résultat et l'écran de course), et « activité » dans les quatre
 * autres langues, où c'est le neutre naturel — « Lauf » dit la course, et
 * « Ausfahrt » dit le vélo. SEULE EXCEPTION en FR : un libellé de LIGNE seul,
 * où « Sortie » se lirait « Quitter » dans une liste de réglages ; là aussi
 * c'est « Activité ».
 *
 * CE QUI N'EST PAS NEUTRALISÉ, ET POURQUOI : `tagline` (« Cours pour ton crew.
 * Conquiers ta ville. ») est la BASELINE de marque (AMENDEMENT-42, CLAUDE.md).
 * Une signature de marque n'est pas une description de fonctionnalité ; la
 * réécrire serait changer le produit, pas corriger un mensonge.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Sélecteur de langue (demande fondateur 20/07) ──────────────────────────
  langueTitle: {
    fr: 'Langue',
    en: 'Language',
    es: 'Idioma',
    de: 'Sprache',
    pt: 'Idioma',
  },
  langueKicker: {
    fr: 'RÉGLAGES · LANGUE',
    en: 'SETTINGS · LANGUAGE',
    es: 'AJUSTES · IDIOMA',
    de: 'EINSTELLUNGEN · SPRACHE',
    pt: 'AJUSTES · IDIOMA',
  },
  langueSubtitle: {
    fr: 'Toute l’app change immédiatement. Par défaut, GRYD suit la langue de ton téléphone.',
    en: 'The whole app changes instantly. By default, GRYD follows your phone’s language.',
    es: 'Toda la app cambia al instante. Por defecto, GRYD sigue el idioma de tu teléfono.',
    de: 'Die ganze App wechselt sofort. Standardmäßig folgt GRYD deiner Handysprache.',
    pt: 'Todo o app muda na hora. Por padrão, o GRYD segue o idioma do seu telefone.',
  },
  langueDetail: {
    fr: 'Français, English, Español…',
    en: 'English, Français, Español…',
    es: 'Español, English, Français…',
    de: 'Deutsch, English, Français…',
    pt: 'Português, English, Français…',
  },
  langueSelected: {
    fr: 'Langue actuelle',
    en: 'Current language',
    es: 'Idioma actual',
    de: 'Aktuelle Sprache',
    pt: 'Idioma atual',
  },
  // ── Partagé (boutons d'Alert, actions récurrentes) ──
  compris: {
    fr: 'Compris',
    en: 'Got it',
    es: 'Entendido',
    de: 'Alles klar',
    pt: 'Entendi',
  },
  fermer: {
    fr: 'Fermer',
    en: 'Close',
    es: 'Cerrar',
    de: 'Schließen',
    pt: 'Fechar',
  },
  exporterMesDonnees: {
    fr: 'Exporter mes données',
    en: 'Export my data',
    es: 'Exportar mis datos',
    de: 'Meine Daten exportieren',
    pt: 'Exportar meus dados',
  },
  supprimerMonCompte: {
    fr: 'Supprimer mon compte',
    en: 'Delete my account',
    es: 'Eliminar mi cuenta',
    de: 'Konto löschen',
    pt: 'Excluir minha conta',
  },
  bientot: {
    fr: 'Bientôt',
    en: 'Soon',
    es: 'Pronto',
    de: 'Bald',
    pt: 'Em breve',
  },

  // ── Paramètres (liste) ──
  paramsTitle: {
    fr: 'Paramètres',
    en: 'Settings',
    es: 'Ajustes',
    de: 'Einstellungen',
    pt: 'Ajustes',
  },
  paramsKicker: {
    fr: 'RÉGLAGES',
    en: 'SETTINGS',
    es: 'AJUSTES',
    de: 'SETUP',
    pt: 'AJUSTES',
  },
  paramsSecExplicabilite: {
    fr: 'EXPLICABILITÉ',
    en: 'HOW IT WORKS',
    es: 'CÓMO FUNCIONA',
    de: 'TRANSPARENZ',
    pt: 'COMO FUNCIONA',
  },
  explainZonesTitle: {
    fr: 'Comment GRYD calcule tes zones',
    en: 'How GRYD scores your zones',
    es: 'Cómo GRYD calcula tus zonas',
    de: 'So berechnet GRYD deine Zonen',
    pt: 'Como o GRYD calcula suas zonas',
  },
  explainZonesDetail: {
    fr: 'Ligne, boucle, défense, crew, bonus, Verify',
    en: 'Line, loop, defense, crew, bonus, Verify',
    es: 'Línea, bucle, defensa, crew, bonus, Verify',
    de: 'Linie, Runde, Abwehr, Crew, Bonus, Verify',
    pt: 'Linha, volta, defesa, crew, bônus, Verify',
  },
  explainFaqTitle: {
    fr: 'Calculs & règles du jeu',
    en: 'Scoring & game rules',
    es: 'Cálculos y reglas del juego',
    de: 'Berechnung & Spielregeln',
    pt: 'Cálculos e regras do jogo',
  },
  explainFaqDetail: {
    fr: 'La FAQ complète, détails au tap',
    en: 'The full FAQ, details on tap',
    es: 'La FAQ completa, detalles al tocar',
    de: 'Die ganze FAQ, Details per Tipp',
    pt: 'A FAQ completa, detalhes ao tocar',
  },

  // ══════════════════ LISTE PARAMÈTRES — GROUPES ET LIGNES ══════════════════
  //
  // Ces entrées existent parce que `SETTINGS_GROUPS` portait ses libellés en
  // FRANÇAIS EN DUR : neuf lignes sur quinze restaient françaises en anglais, en
  // allemand ou en portugais, dans le même écran où la ligne « Langue » — elle —
  // se traduisait. Trois groupes seulement (au lieu de sept sur-titres) : c'est
  // §A « comprendre l'écran en moins de 3 s ».
  grpCompte: {
    fr: 'COMPTE',
    en: 'ACCOUNT',
    es: 'CUENTA',
    de: 'KONTO',
    pt: 'CONTA',
  },
  grpJeu: {
    fr: 'JEU',
    en: 'GAME',
    es: 'JUEGO',
    de: 'SPIEL',
    pt: 'JOGO',
  },
  grpAide: {
    fr: 'AIDE & APP',
    en: 'HELP & APP',
    es: 'AYUDA Y APP',
    de: 'HILFE & APP',
    pt: 'AJUDA E APP',
  },
  rowCompte: {
    fr: 'Compte',
    en: 'Account',
    es: 'Cuenta',
    de: 'Konto',
    pt: 'Conta',
  },
  // Le détail ne promet plus « E-mail, connexion, sécurité » : ces deux réglages
  // n'existent pas (leurs lignes ouvraient une Alert « bientôt »). Il décrit ce
  // que la sous-page fait VRAIMENT.
  rowCompteDetail: {
    fr: 'Connexion, export, suppression',
    en: 'Sign-in, export, deletion',
    es: 'Acceso, exportación, eliminación',
    de: 'Login, Export, Löschung',
    pt: 'Acesso, exportação, exclusão',
  },
  rowProfil: {
    fr: 'Profil',
    en: 'Profile',
    es: 'Perfil',
    de: 'Profil',
    pt: 'Perfil',
  },
  rowProfilDetail: {
    fr: 'Nom affiché, titre, visibilité',
    en: 'Display name, title, visibility',
    es: 'Nombre, título, visibilidad',
    de: 'Anzeigename, Titel, Sichtbarkeit',
    pt: 'Nome exibido, título, visibilidade',
  },
  rowCrew: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  rowCrewDetail: {
    fr: 'Notifications, quitter le crew',
    en: 'Notifications, leave the crew',
    es: 'Notificaciones, salir del crew',
    de: 'Mitteilungen, Crew verlassen',
    pt: 'Notificações, sair do crew',
  },
  rowPrivacy: {
    fr: 'Confidentialité',
    en: 'Privacy',
    es: 'Privacidad',
    de: 'Privatsphäre',
    pt: 'Privacidade',
  },
  rowPrivacyDetail: {
    fr: 'Visibilité, blocage, RGPD',
    en: 'Visibility, blocking, GDPR',
    es: 'Visibilidad, bloqueo, RGPD',
    de: 'Sichtbarkeit, Blockieren, DSGVO',
    pt: 'Visibilidade, bloqueio, LGPD',
  },
  /**
   * Ligne « Jeu » → sous-page `/parametres/course`. Elle s'appelait « Course »
   * / « Run » / « Lauf », alors qu'elle gouverne le style de jeu, les retours
   * haptiques et les unités de TOUTE sortie, vélo compris. Le SLUG de route
   * reste `course` : une URL déjà installée ne se réécrit pas pour un libellé.
   */
  rowActivite: {
    fr: 'Activité',
    en: 'Activity',
    es: 'Actividad',
    de: 'Aktivität',
    pt: 'Atividade',
  },
  rowActiviteDetail: {
    fr: 'Style de jeu, vibrations, unités',
    en: 'Play style, haptics, units',
    es: 'Estilo de juego, vibración, unidades',
    de: 'Spielstil, Haptik, Einheiten',
    pt: 'Estilo de jogo, vibração, unidades',
  },
  rowNotifs: {
    fr: 'Notifications',
    en: 'Notifications',
    es: 'Notificaciones',
    de: 'Mitteilungen',
    pt: 'Notificações',
  },
  rowNotifsDetail: {
    fr: 'Frontières, défenses, rivaux',
    en: 'Borders, defenses, rivals',
    es: 'Fronteras, defensas, rivales',
    de: 'Grenzen, Abwehr, Rivalen',
    pt: 'Fronteiras, defesas, rivais',
  },
  rowCarte: {
    fr: 'Carte',
    en: 'Map',
    es: 'Mapa',
    de: 'Karte',
    pt: 'Mapa',
  },
  // « Couche par défaut, trace » annonçait un réglage : la sous-page n'en a
  // aucun, elle EXPLIQUE comment la carte choisit seule.
  rowCarteDetail: {
    fr: 'Comment la carte choisit, ta trace',
    en: 'How the map picks, your trail',
    es: 'Cómo elige el mapa, tu trazado',
    de: 'Wie die Karte wählt, deine Spur',
    pt: 'Como o mapa escolhe, seu traçado',
  },
  rowSources: {
    fr: 'Sources connectées',
    en: 'Connected sources',
    es: 'Fuentes conectadas',
    de: 'Verbundene Quellen',
    pt: 'Fontes conectadas',
  },
  // « GPS, Apple Health, Strava, WHOOP… » citait quatre sources dont TROIS ne
  // sont pas dans le Hub (retirées faute de compte développeur / entitlement).
  // Le détail ne cite plus que ce que l'écran liste réellement.
  rowSourcesDetail: {
    fr: 'GPS GRYD, import de fichier GPX',
    en: 'GRYD GPS, GPX file import',
    es: 'GPS GRYD, importar archivo GPX',
    de: 'GRYD-GPS, GPX-Datei importieren',
    pt: 'GPS GRYD, importar arquivo GPX',
  },
  rowArsenal: {
    fr: 'Abonnement & achats',
    en: 'Subscription & purchases',
    es: 'Suscripción y compras',
    de: 'Abo & Käufe',
    pt: 'Assinatura e compras',
  },
  rowArsenalDetail: {
    fr: 'GRYD Club, skins, objets',
    en: 'GRYD Club, skins, items',
    es: 'GRYD Club, skins, objetos',
    de: 'GRYD Club, Skins, Objekte',
    pt: 'GRYD Club, skins, itens',
  },
  rowAide: {
    fr: 'Aide',
    en: 'Help',
    es: 'Ayuda',
    de: 'Hilfe',
    pt: 'Ajuda',
  },
  /** L'Aide explique le refus d'une sortie QUELLE QUE SOIT sa discipline. */
  rowAideDetail: {
    fr: 'Sortie non comptée, signalement',
    en: 'Activity not counted, reporting',
    es: 'Actividad no contada, reportes',
    de: 'Aktivität nicht gezählt, Meldungen',
    pt: 'Atividade não contada, denúncias',
  },
  rowApropos: {
    fr: 'À propos',
    en: 'About',
    es: 'Acerca de',
    de: 'Über',
    pt: 'Sobre',
  },
  rowAproposDetail: {
    fr: 'Version, conditions, licences',
    en: 'Version, terms, licenses',
    es: 'Versión, condiciones, licencias',
    de: 'Version, Bedingungen, Lizenzen',
    pt: 'Versão, termos, licenças',
  },
  rowAvance: {
    fr: 'Avancé',
    en: 'Advanced',
    es: 'Avanzado',
    de: 'Erweitert',
    pt: 'Avançado',
  },
  rowAvanceDetail: {
    fr: 'Règles du jeu, diagnostics',
    en: 'Game rules, diagnostics',
    es: 'Reglas del juego, diagnósticos',
    de: 'Spielregeln, Diagnose',
    pt: 'Regras do jogo, diagnósticos',
  },

  // ── Sous-page Compte ──
  secIdentifiants: {
    fr: 'IDENTIFIANTS',
    en: 'SIGN-IN',
    es: 'ACCESO',
    de: 'LOGIN',
    pt: 'ACESSO',
  },
  connectedAs: {
    fr: 'Connecté en tant que',
    en: 'Signed in as',
    es: 'Conectado como',
    de: 'Angemeldet als',
    pt: 'Conectado como',
  },
  /**
   * REMPLACE trois copies « bientôt » (`accountSoonNote`, `emailSoonBody`,
   * `securitySoonBody`) et les DEUX lignes qui les portaient. « E-mail » et
   * « Sécurité » avaient un chevron et ouvraient une `Alert` : elles échouaient
   * à 100 % des taps, sur toutes les plateformes — la définition d'un bouton
   * mort. « Bientôt » sans date ni code n'est pas un état honnête ; l'absence,
   * elle, se dit et se lit en une phrase.
   */
  accountNoEditNote: {
    fr: 'GRYD ne permet pas encore de changer l’adresse e-mail du compte ni de gérer les connexions Apple / Google depuis l’app. Ces deux réglages n’existent pas : aucune date n’est annoncée tant qu’ils ne sont pas faits.',
    en: 'GRYD can’t yet change the account email or manage Apple / Google sign-ins from the app. Those two settings don’t exist: no date is announced until they’re done.',
    es: 'GRYD todavía no permite cambiar el correo de la cuenta ni gestionar los accesos Apple / Google desde la app. Esos dos ajustes no existen: no se anuncia ninguna fecha hasta que estén hechos.',
    de: 'GRYD kann die Konto-E-Mail noch nicht ändern und Apple-/Google-Logins nicht in der App verwalten. Diese beiden Einstellungen gibt es nicht — ein Datum wird erst genannt, wenn sie fertig sind.',
    pt: 'O GRYD ainda não permite trocar o e-mail da conta nem gerenciar os logins Apple / Google pelo app. Esses dois ajustes não existem: nenhuma data é anunciada enquanto não estiverem prontos.',
  },
  // ── Slug de sous-page inconnu (deep link /parametres/xyz) ──
  // Le repli silencieux `isSection(raw) ? raw : 'compte'` affichait Compte sans
  // jamais dire que la section demandée n'existait pas.
  sectionUnknownTitle: {
    fr: 'Cette page de réglages n’existe pas',
    en: 'That settings page doesn’t exist',
    es: 'Esa página de ajustes no existe',
    de: 'Diese Einstellungsseite gibt es nicht',
    pt: 'Essa página de ajustes não existe',
  },
  sectionUnknownBody: {
    fr: 'Le lien pointe vers une section que GRYD ne connaît pas. Rien n’a été modifié.',
    en: 'The link points to a section GRYD doesn’t know. Nothing was changed.',
    es: 'El enlace apunta a una sección que GRYD no conoce. No se cambió nada.',
    de: 'Der Link zeigt auf einen Bereich, den GRYD nicht kennt. Es wurde nichts geändert.',
    pt: 'O link aponta para uma seção que o GRYD não conhece. Nada foi alterado.',
  },
  sectionUnknownCta: {
    fr: 'Voir tous les réglages',
    en: 'See all settings',
    es: 'Ver todos los ajustes',
    de: 'Alle Einstellungen ansehen',
    pt: 'Ver todos os ajustes',
  },
  // ── Notifications : l'appareil ne peut être enregistré que sous session ──
  notifSignedOutTitle: {
    fr: 'Pas de compte, pas d’envoi',
    en: 'No account, no delivery',
    es: 'Sin cuenta, sin envíos',
    de: 'Kein Konto, kein Versand',
    pt: 'Sem conta, sem envio',
  },
  notifSignedOutBody: {
    fr: 'Tes canaux sont gardés sur ce téléphone, mais GRYD ne peut enregistrer l’appareil — donc rien ne partira — tant que tu n’as pas de compte.',
    en: 'Your channels are kept on this phone, but GRYD can’t register the device — so nothing will be sent — until you have an account.',
    es: 'Tus canales se guardan en este teléfono, pero GRYD no puede registrar el dispositivo — así que no se enviará nada — hasta que tengas una cuenta.',
    de: 'Deine Kanäle bleiben auf diesem Handy, aber GRYD kann das Gerät nicht registrieren — es wird also nichts gesendet — solange du kein Konto hast.',
    pt: 'Seus canais ficam neste telefone, mas o GRYD não consegue registrar o aparelho — então nada será enviado — enquanto você não tiver conta.',
  },
  secCompte: {
    fr: 'COMPTE',
    en: 'ACCOUNT',
    es: 'CUENTA',
    de: 'KONTO',
    pt: 'CONTA',
  },
  exportDataDetail: {
    fr: 'Copie RGPD de tes sorties et zones',
    en: 'GDPR copy of your activities and zones',
    es: 'Copia RGPD de tus actividades y zonas',
    de: 'DSGVO-Kopie deiner Aktivitäten und Zonen',
    pt: 'Cópia RGPD das suas atividades e zonas',
  },
  deleteAccountDetail: {
    fr: "Depuis l'app — irréversible, c'est ton droit",
    en: 'From the app — irreversible, and your right',
    es: 'Desde la app — irreversible, y es tu derecho',
    de: 'Direkt in der App — endgültig, dein gutes Recht',
    pt: 'Pelo app — irreversível, é seu direito',
  },

  // ── Sous-page Profil ──
  secApparence: {
    fr: 'APPARENCE PUBLIQUE',
    en: 'PUBLIC PROFILE',
    es: 'PERFIL PÚBLICO',
    de: 'ÖFFENTLICHES PROFIL',
    pt: 'PERFIL PÚBLICO',
  },
  displayName: {
    fr: 'Nom affiché',
    en: 'Display name',
    es: 'Nombre visible',
    de: 'Anzeigename',
    pt: 'Nome exibido',
  },
  titleLabel: {
    fr: 'Titre',
    en: 'Title',
    es: 'Título',
    de: 'Titel',
    pt: 'Título',
  },
  editProfile: {
    fr: 'Modifier le profil',
    en: 'Edit profile',
    es: 'Editar perfil',
    de: 'Profil bearbeiten',
    pt: 'Editar perfil',
  },
  editProfileDetail: {
    fr: 'Nom, titre, avatar, cadre',
    en: 'Name, title, avatar, frame',
    es: 'Nombre, título, avatar, marco',
    de: 'Name, Titel, Avatar, Rahmen',
    pt: 'Nome, título, avatar, moldura',
  },
  whoSeesProfile: {
    fr: 'Qui voit mon profil',
    en: 'Who sees my profile',
    es: 'Quién ve mi perfil',
    de: 'Wer mein Profil sieht',
    pt: 'Quem vê meu perfil',
  },
  whoSeesProfileDetail: {
    fr: 'Visibilité, mode privé',
    en: 'Visibility, private mode',
    es: 'Visibilidad, modo privado',
    de: 'Sichtbarkeit, Privatmodus',
    pt: 'Visibilidade, modo privado',
  },

  // ── Sous-page Crew ──
  secMonCrew: {
    fr: 'MON CREW',
    en: 'MY CREW',
    es: 'MI CREW',
    de: 'MEINE CREW',
    pt: 'MEU CREW',
  },
  crewMissions: {
    fr: 'Missions du crew',
    en: 'Crew missions',
    es: 'Misiones del crew',
    de: 'Crew-Missionen',
    pt: 'Missões do crew',
  },
  crewMissionsDetail: {
    fr: 'Frontières ouvertes, défenses',
    en: 'Open borders, defenses',
    es: 'Fronteras abiertas, defensas',
    de: 'Offene Grenzen, Abwehr',
    pt: 'Fronteiras abertas, defesas',
  },
  crewNotifs: {
    fr: 'Notifications crew',
    en: 'Crew notifications',
    es: 'Notificaciones del crew',
    de: 'Crew-Mitteilungen',
    pt: 'Notificações do crew',
  },
  crewNotifsDetail: {
    fr: 'Défenses, frontières à fermer',
    en: 'Defenses, borders to close',
    es: 'Defensas, fronteras por cerrar',
    de: 'Abwehr, offene Grenzen',
    pt: 'Defesas, fronteiras a fechar',
  },
  leaveCrew: {
    fr: 'Quitter le crew',
    en: 'Leave the crew',
    es: 'Salir del crew',
    de: 'Crew verlassen',
    pt: 'Sair do crew',
  },
  leaveCrewDetail: {
    fr: 'Tu perds ta contribution au coffre',
    en: 'You lose your vault contribution',
    es: 'Pierdes tu aporte al cofre',
    de: 'Dein Tresor-Beitrag geht verloren',
    pt: 'Você perde sua contribuição ao cofre',
  },
  // `leaveCrewSoonBody` / `leaveCrewSoonNote` SUPPRIMÉS (21/07/2026) : ils
  // annonçaient « quitter un crew arrive bientôt » alors que la RPC `leave_crew`
  // est câblée et que le flux complet vit dans l'écran Crew. Une promesse de
  // fonctionnalité déjà livrée est un mensonge comme un autre — et laisser les
  // clés en place aurait invité à les réutiliser.

  // ── Sous-page Course ──
  secStyleJeu: {
    fr: 'STYLE DE JEU',
    en: 'PLAY STYLE',
    es: 'ESTILO DE JUEGO',
    de: 'SPIELSTIL',
    pt: 'ESTILO DE JOGO',
  },
  setStyle: {
    fr: 'Régler mon style',
    en: 'Set my style',
    es: 'Ajustar mi estilo',
    de: 'Stil festlegen',
    pt: 'Definir meu estilo',
  },
  setStyleDetail: {
    fr: 'Focus solo · Mixte · Guerre de crew',
    en: 'Solo focus · Mixed · Crew war',
    es: 'Foco solo · Mixto · Guerra de crew',
    de: 'Solo-Fokus · Mix · Crew-Krieg',
    pt: 'Foco solo · Misto · Guerra de crew',
  },
  /**
   * Sur-titre des réglages qui s'appliquent PENDANT l'effort (haptiques,
   * unités). Il disait « PENDANT LA COURSE » sur une sous-page qui n'a aucune
   * lentille et qui règle aussi bien une sortie vélo : un cycliste y lisait un
   * réglage qui semblait ne pas le concerner.
   */
  secPendantSortie: {
    fr: 'PENDANT LA SORTIE',
    en: 'DURING THE ACTIVITY',
    es: 'DURANTE LA ACTIVIDAD',
    de: 'WÄHREND DER AKTIVITÄT',
    pt: 'DURANTE A ATIVIDADE',
  },
  hapticsTitle: {
    fr: 'Retours haptiques',
    en: 'Haptic feedback',
    es: 'Respuesta háptica',
    de: 'Haptisches Feedback',
    pt: 'Feedback háptico',
  },
  hapticsSubtitle: {
    fr: 'Vibrations légères sur les captures, badges et victoires.',
    en: 'Light vibrations on captures, badges and wins.',
    es: 'Vibraciones suaves en capturas, insignias y victorias.',
    de: 'Leichte Vibration bei Captures, Badges und Siegen.',
    pt: 'Vibrações leves em capturas, badges e vitórias.',
  },
  unites: {
    fr: 'Unités',
    en: 'Units',
    es: 'Unidades',
    de: 'Einheiten',
    pt: 'Unidades',
  },
  kilometres: {
    fr: 'Kilomètres',
    en: 'Kilometers',
    es: 'Kilómetros',
    de: 'Kilometer',
    pt: 'Quilômetros',
  },

  // ── Sous-page Notifications ──
  secCeQueTuRecois: {
    fr: 'CE QUE TU REÇOIS',
    en: 'WHAT YOU GET',
    es: 'LO QUE RECIBES',
    de: 'WAS DU BEKOMMST',
    pt: 'O QUE VOCÊ RECEBE',
  },
  // ── Notifications sur CET appareil (PÉRIMÈTRE 3) ──
  // Chaque statut a son propre texte : l'écran doit pouvoir dire POURQUOI il ne
  // notifie pas, jamais afficher un bouton qui ne fait rien.
  pushDeviceLabel: {
    fr: 'Notifications sur ce téléphone',
    en: 'Notifications on this phone',
    es: 'Notificaciones en este teléfono',
    de: 'Mitteilungen auf diesem Handy',
    pt: 'Notificações neste telefone',
  },
  pushIdle: {
    fr: 'Pas encore activées — touche pour recevoir l’alerte quand une zone s’efface',
    en: 'Not on yet — tap to get an alert when a zone is fading',
    es: 'Aún no activadas — toca para recibir un aviso cuando una zona se borra',
    de: 'Noch nicht aktiv — tippe, um bei verblassenden Zonen benachrichtigt zu werden',
    pt: 'Ainda não ativadas — toque para receber aviso quando uma zona sumir',
  },
  pushRegistered: {
    fr: 'Activées sur cet appareil — touche pour les couper',
    en: 'On for this device — tap to turn them off',
    es: 'Activadas en este dispositivo — toca para desactivarlas',
    de: 'Auf diesem Gerät aktiv — tippe zum Ausschalten',
    pt: 'Ativadas neste aparelho — toque para desligar',
  },
  pushBusy: {
    fr: 'Enregistrement en cours…',
    en: 'Registering…',
    es: 'Registrando…',
    de: 'Wird registriert…',
    pt: 'Registrando…',
  },
  pushDenied: {
    fr: 'Refusées pour GRYD dans les réglages du téléphone — tu peux les réautoriser là-bas',
    en: 'Denied for GRYD in your phone settings — you can allow them again there',
    es: 'Denegadas para GRYD en los ajustes del teléfono — puedes permitirlas de nuevo allí',
    de: 'In den Handy-Einstellungen für GRYD abgelehnt — du kannst sie dort wieder erlauben',
    pt: 'Negadas para o GRYD nos ajustes do telefone — você pode permitir de novo lá',
  },
  pushUnsupported: {
    fr: 'Indisponible dans le navigateur — depuis l’app installée uniquement',
    en: 'Not available in the browser — from the installed app only',
    es: 'No disponible en el navegador — solo desde la app instalada',
    de: 'Im Browser nicht verfügbar — nur in der installierten App',
    pt: 'Indisponível no navegador — só pelo app instalado',
  },
  /** `module_missing` UNIQUEMENT : build antérieur à expo-notifications. */
  pushUnavailable: {
    fr: 'Pas encore disponibles sur cette version de l’app',
    en: 'Not available yet in this version of the app',
    es: 'Todavía no disponibles en esta versión de la app',
    de: 'In dieser App-Version noch nicht verfügbar',
    pt: 'Ainda não disponíveis nesta versão do app',
  },
  /**
   * `unavailable` : aucun jeton délivré — les identifiants d'envoi ne sont pas
   * configurés côté serveur (ou on est sur simulateur). Texte DÉDIÉ : partager
   * celui de `module_missing` imputait la cause à la version de l'app, ce qui
   * est faux et enverrait le joueur mettre à jour pour rien.
   */
  pushNoCredentials: {
    fr: 'Pas encore configurées de notre côté — rien à faire de ton côté',
    en: 'Not set up on our side yet — nothing for you to do',
    es: 'Aún no configuradas de nuestro lado — no tienes que hacer nada',
    de: 'Bei uns noch nicht eingerichtet — du musst nichts tun',
    pt: 'Ainda não configuradas do nosso lado — nada a fazer da sua parte',
  },
  pushNotConfigured: {
    fr: 'Connecte-toi pour recevoir les alertes de tes zones',
    en: 'Sign in to get alerts about your zones',
    es: 'Inicia sesión para recibir avisos de tus zonas',
    de: 'Melde dich an, um Hinweise zu deinen Zonen zu bekommen',
    pt: 'Entre na conta para receber avisos das suas zonas',
  },
  pushError: {
    fr: 'Impossible d’enregistrer cet appareil pour l’instant — réessaie plus tard',
    en: 'Couldn’t register this device right now — try again later',
    es: 'No se pudo registrar este dispositivo ahora — inténtalo más tarde',
    de: 'Gerät konnte gerade nicht registriert werden — versuch es später',
    pt: 'Não deu para registrar este aparelho agora — tente mais tarde',
  },
  // Les heures et le plafond sont INTERPOLÉS depuis game-rules (PUSH_QUIET_HOURS_*,
  // PUSH_MAX_PER_DAY) : aucun nombre de règle ne vit dans une chaîne.
  pushQuietNote: {
    fr: 'Rien entre {start} h et {end} h, {max} notifications par jour au maximum, et jamais une par sortie.',
    en: 'Nothing between {start}:00 and {end}:00, {max} notifications a day at most, and never one per activity.',
    es: 'Nada entre las {start} h y las {end} h, {max} notificaciones al día como máximo, y nunca una por actividad.',
    de: 'Nichts zwischen {start} und {end} Uhr, höchstens {max} Mitteilungen pro Tag, und nie eine pro Aktivität.',
    pt: 'Nada entre {start} h e {end} h, no máximo {max} notificações por dia, e nunca uma por atividade.',
  },
  notifsNote: {
    fr: 'Frontières ouvertes, défenses, rivaux : seulement ce qui compte pour toi. Jamais de rappel culpabilisant.',
    en: 'Open borders, defenses, rivals: only what matters to you. Never a guilt-trip reminder.',
    es: 'Fronteras abiertas, defensas, rivales: solo lo que te importa. Nunca recordatorios que te hagan sentir culpable.',
    de: 'Offene Grenzen, Abwehr, Rivalen: nur, was dir wichtig ist. Nie Erinnerungen mit schlechtem Gewissen.',
    pt: 'Fronteiras abertas, defesas, rivais: só o que importa para você. Nunca lembretes que fazem você se sentir culpado.',
  },

  // ── Sous-page Carte ──
  secAffichageCarte: {
    fr: 'AFFICHAGE DE LA CARTE',
    en: 'MAP DISPLAY',
    es: 'VISTA DEL MAPA',
    de: 'KARTENANSICHT',
    pt: 'EXIBIÇÃO DO MAPA',
  },
  carteNote: {
    fr: 'La carte choisit seule la bonne couche selon le contexte (défense, route, rival). Tu peux forcer une couche via le bouton Couches sur la carte.',
    en: 'The map picks the right layer on its own based on context (defense, route, rival). You can force a layer via the Layers button on the map.',
    es: 'El mapa elige solo la capa adecuada según el contexto (defensa, ruta, rival). Puedes forzar una capa con el botón Capas en el mapa.',
    de: 'Die Karte wählt die passende Ebene selbst, je nach Kontext (Abwehr, Route, Rivale). Über den Button Ebenen auf der Karte kannst du eine Ebene erzwingen.',
    pt: 'O mapa escolhe sozinho a camada certa conforme o contexto (defesa, rota, rival). Você pode forçar uma camada pelo botão Camadas no mapa.',
  },
  maTrace: {
    fr: 'Ma trace sur la carte',
    en: 'My trail on the map',
    es: 'Mi trazado en el mapa',
    de: 'Meine Spur auf der Karte',
    pt: 'Meu trajeto no mapa',
  },
  maTraceDetail: {
    fr: 'Précise, simplifiée ou masquée',
    en: 'Precise, simplified or hidden',
    es: 'Preciso, simplificado u oculto',
    de: 'Genau, vereinfacht oder verborgen',
    pt: 'Preciso, simplificado ou oculto',
  },

  // ── Sous-page À propos ──
  version: {
    fr: 'Version',
    en: 'Version',
    es: 'Versión',
    de: 'Version',
    pt: 'Versão',
  },
  saison: {
    fr: 'Saison',
    en: 'Season',
    es: 'Temporada',
    de: 'Saison',
    pt: 'Temporada',
  },
  saisonValue: {
    fr: 'Saison 0 · Paris + Lille',
    en: 'Season 0 · Paris + Lille',
    es: 'Temporada 0 · Paris + Lille',
    de: 'Saison 0 · Paris + Lille',
    pt: 'Temporada 0 · Paris + Lille',
  },
  secLegal: {
    fr: 'LÉGAL',
    en: 'LEGAL',
    es: 'LEGAL',
    de: 'RECHTLICHES',
    pt: 'LEGAL',
  },
  cgu: {
    fr: "Conditions d'utilisation",
    en: 'Terms of use',
    es: 'Condiciones de uso',
    de: 'Nutzungsbedingungen',
    pt: 'Termos de uso',
  },
  privacyPolicy: {
    fr: 'Politique de confidentialité',
    en: 'Privacy policy',
    es: 'Política de privacidad',
    de: 'Datenschutzerklärung',
    pt: 'Política de privacidade',
  },
  cgv: {
    fr: 'Conditions de vente (CGV)',
    en: 'Terms of sale',
    es: 'Condiciones de venta',
    de: 'Verkaufsbedingungen',
    pt: 'Termos de venda',
  },
  cgvDetail: {
    fr: 'Abonnement, paiement, rétractation',
    en: 'Subscription, payment, withdrawal',
    es: 'Suscripción, pago, desistimiento',
    de: 'Abo, Zahlung, Widerruf',
    pt: 'Assinatura, pagamento, cancelamento',
  },
  mentions: {
    fr: 'Mentions légales',
    en: 'Legal notice',
    es: 'Aviso legal',
    de: 'Impressum',
    pt: 'Aviso legal',
  },
  mentionsDetail: {
    fr: 'Éditeur, hébergement',
    en: 'Publisher, hosting',
    es: 'Editor, alojamiento',
    de: 'Anbieter, Hosting',
    pt: 'Editor, hospedagem',
  },
  licences: {
    fr: 'Licences open source',
    en: 'Open source licenses',
    es: 'Licencias open source',
    de: 'Open-Source-Lizenzen',
    pt: 'Licenças open source',
  },
  tagline: {
    fr: 'Cours pour ton crew. Conquiers ta ville.',
    en: 'Run for your crew. Conquer your city.',
    es: 'Corre por tu crew. Conquista tu ciudad.',
    de: 'Lauf für deine Crew. Erobere deine Stadt.',
    pt: 'Corra pelo seu crew. Conquiste sua cidade.',
  },

  // ── Sous-page Avancé ──
  secReglesJeu: {
    fr: 'RÈGLES DE JEU',
    en: 'GAME RULES',
    es: 'REGLAS DEL JUEGO',
    de: 'SPIELREGELN',
    pt: 'REGRAS DO JOGO',
  },
  reglesNote: {
    fr: 'Ces valeurs sont décidées côté serveur (moteur GRYD) et affichées ici pour transparence. On ne les règle jamais depuis le téléphone.',
    en: 'These values are set server-side (GRYD engine) and shown here for transparency. They are never adjusted from the phone.',
    es: 'Estos valores se deciden en el servidor (motor GRYD) y se muestran aquí por transparencia. Nunca se ajustan desde el teléfono.',
    de: 'Diese Werte legt der Server fest (GRYD-Engine); sie stehen hier zur Transparenz. Am Handy werden sie nie verändert.',
    pt: 'Esses valores são decididos no servidor (motor GRYD) e mostrados aqui por transparência. Nunca são ajustados pelo telefone.',
  },
  fermetureFrontiere: {
    fr: 'Fermeture de frontière crew',
    en: 'Crew border closing',
    es: 'Cierre de frontera del crew',
    de: 'Crew-Grenzschluss',
    pt: 'Fechamento de fronteira do crew',
  },
  toleranceJonction: {
    fr: 'Tolérance de jonction (ville)',
    en: 'Junction tolerance (city)',
    es: 'Tolerancia de unión (ciudad)',
    de: 'Verbindungstoleranz (Stadt)',
    pt: 'Tolerância de junção (cidade)',
  },
  contributionMin: {
    fr: 'Contribution min. du finisher',
    en: 'Finisher min. contribution',
    es: 'Aporte mín. del finisher',
    de: 'Min. Finisher-Beitrag',
    pt: 'Contribuição mín. do finisher',
  },
  // `contributionMinValue` SUPPRIMÉ : il figeait « 400 m ou 15 % » dans les cinq
  // langues, en doublon des constantes du moteur. Remplacé par
  // `contributionMinBoth`, interpolé depuis FINISHER_MIN_SEGMENT_M /
  // FINISHER_MIN_SHARE — la ligne « pour transparence » dit désormais la vérité
  // même si le moteur change.
  secDiagnostics: {
    fr: 'DIAGNOSTICS',
    en: 'DIAGNOSTICS',
    es: 'DIAGNÓSTICO',
    de: 'DIAGNOSE',
    pt: 'DIAGNÓSTICO',
  },
  fiabiliteVerify: {
    fr: 'Fiabilité GRYD Verify',
    en: 'GRYD Verify reliability',
    es: 'Fiabilidad de GRYD Verify',
    de: 'GRYD Verify: Verlässlichkeit',
    pt: 'Confiabilidade do GRYD Verify',
  },
  fiabiliteVerifyDetail: {
    fr: 'GPS, mouvement, sources connectées',
    en: 'GPS, motion, connected sources',
    es: 'GPS, movimiento, fuentes conectadas',
    de: 'GPS, Bewegung, verbundene Quellen',
    pt: 'GPS, movimento, fontes conectadas',
  },

  // ── Confidentialité — écran ──
  privTitle: {
    fr: 'Confidentialité',
    en: 'Privacy',
    es: 'Privacidad',
    de: 'Datenschutz',
    pt: 'Privacidade',
  },
  privKicker: {
    fr: 'RÉGLAGES · TES DONNÉES',
    en: 'SETTINGS · YOUR DATA',
    es: 'AJUSTES · TUS DATOS',
    de: 'EINSTELLUNGEN · DEINE DATEN',
    pt: 'AJUSTES · SEUS DADOS',
  },
  /**
   * TROISIÈME version de ce sous-titre, et la première qui soit vérifiable.
   * La v1 promettait « tout est fermé par défaut » (faux depuis l'ouverture du
   * 20/07). La v2 promettait trois protections — mais deux d'entre elles
   * (position en direct, données de santé) décrivaient des INTERRUPTEURS sans
   * consommateur : elles étaient vraies par accident, pas par construction.
   * Celle-ci ne décrit que ce que le code fait, aujourd'hui, dans ce build.
   */
  privSubtitle: {
    fr: 'GRYD n’expose ton profil ni tes sorties à aucun autre joueur pour l’instant : il n’y a ni profil public, ni fil d’activité. La seule chose que tu peux publier toi-même, c’est un partage — et ses extrémités sont floutées par défaut.',
    en: 'GRYD does not expose your profile or your activities to any other player yet: there is no public profile and no activity feed. The only thing you can publish yourself is a share — and its endpoints are blurred by default.',
    es: 'GRYD todavía no expone tu perfil ni tus actividades a ningún otro jugador: no hay perfil público ni feed de actividad. Lo único que puedes publicar tú es un compartido — y sus extremos se difuminan por defecto.',
    de: 'GRYD zeigt dein Profil und deine Aktivitäten bisher keinem anderen Spieler: Es gibt weder ein öffentliches Profil noch einen Aktivitäts-Feed. Das Einzige, was du selbst veröffentlichen kannst, ist eine geteilte Aktivität — und deren Enden sind standardmäßig unscharf.',
    pt: 'O GRYD ainda não expõe seu perfil nem suas atividades a nenhum outro jogador: não existe perfil público nem feed de atividade. A única coisa que você mesmo pode publicar é um compartilhamento — e as pontas dele ficam borradas por padrão.',
  },
  // ── Libellés de visibilité du profil (ex-`features/privacy/labels.ts`, FR en
  //    dur : c'était la valeur affichée dans l'en-tête de la card) ──
  visPublic: {
    fr: 'Public',
    en: 'Public',
    es: 'Público',
    de: 'Öffentlich',
    pt: 'Público',
  },
  visCrew: {
    fr: 'Mon crew',
    en: 'My crew',
    es: 'Mi crew',
    de: 'Meine Crew',
    pt: 'Meu crew',
  },
  visFriends: {
    fr: 'Mes amis',
    en: 'My friends',
    es: 'Mis amigos',
    de: 'Meine Freunde',
    pt: 'Meus amigos',
  },
  visPrivate: {
    fr: 'Moi seul',
    en: 'Only me',
    es: 'Solo yo',
    de: 'Nur ich',
    pt: 'Só eu',
  },
  /**
   * L'étendue RÉELLE du réglage de visibilité. Sans cette phrase, la card
   * laisserait croire que « Moi seul » retire quelque chose à quelqu'un — alors
   * qu'aucun écran ne montre encore un profil à un autre joueur, et que le choix
   * n'est enregistré que sur ce téléphone (aucun miroir serveur, O1).
   */
  visScopeNote: {
    fr: 'Ce choix est enregistré sur ce téléphone et repris par ton profil. Il ne cache rien à personne aujourd’hui — GRYD ne montre encore aucun profil à un autre joueur — et il ne suivra pas sur un autre appareil.',
    en: 'This choice is stored on this phone and mirrored on your profile. It hides nothing from anyone today — GRYD does not show any profile to another player yet — and it will not follow you to another device.',
    es: 'Esta elección se guarda en este teléfono y se refleja en tu perfil. Hoy no oculta nada a nadie — GRYD todavía no muestra ningún perfil a otro jugador — y no te seguirá a otro dispositivo.',
    de: 'Diese Wahl wird auf diesem Handy gespeichert und in deinem Profil gespiegelt. Sie verbirgt heute vor niemandem etwas — GRYD zeigt noch keinem anderen Spieler ein Profil — und sie wandert nicht auf ein anderes Gerät mit.',
    pt: 'Essa escolha fica guardada neste telefone e aparece no seu perfil. Hoje ela não esconde nada de ninguém — o GRYD ainda não mostra nenhum perfil a outro jogador — e não vai junto para outro aparelho.',
  },
  /** Ce que « masquer départ & arrivée » fait EXACTEMENT, avec la vraie valeur. */
  maskScopeNote: {
    fr: 'Les {m} premiers et {m} derniers mètres sont retirés du tracé quand tu le partages. Le reste de l’app n’affiche ta trace qu’à toi.',
    en: 'The first {m} and last {m} metres are removed from the trail when you share it. Everywhere else, your trail is shown to you only.',
    es: 'Se quitan los primeros {m} y los últimos {m} metros del trazado cuando lo compartes. En el resto de la app tu trazado solo lo ves tú.',
    de: 'Beim Teilen werden die ersten {m} und die letzten {m} Meter der Spur entfernt. Sonst sieht deine Spur nur du.',
    pt: 'Os primeiros {m} e os últimos {m} metros saem do traçado quando você compartilha. No resto do app, seu traçado só você vê.',
  },

  // ── Confidentialité — alerts (signaler / bloquer / export / suppression) ──
  pseudoManquantTitle: {
    fr: 'Pseudo manquant',
    en: 'Missing username',
    es: 'Falta el usuario',
    de: 'Nutzername fehlt',
    pt: 'Falta o usuário',
  },
  reportMissingBody: {
    fr: 'Entre le pseudo du joueur à signaler.',
    en: 'Enter the username of the player to report.',
    es: 'Escribe el usuario del jugador a reportar.',
    de: 'Gib den Nutzernamen des Spielers ein, den du melden willst.',
    pt: 'Digite o usuário do jogador a denunciar.',
  },
  blockMissingBody: {
    fr: 'Entre le pseudo du joueur à bloquer.',
    en: 'Enter the username of the player to block.',
    es: 'Escribe el usuario del jugador a bloquear.',
    de: 'Gib den Nutzernamen des Spielers ein, den du blockieren willst.',
    pt: 'Digite o usuário do jogador a bloquear.',
  },
  reportSentTitle: {
    fr: 'Signalement envoyé',
    en: 'Report sent',
    es: 'Reporte enviado',
    de: 'Meldung gesendet',
    pt: 'Denúncia enviada',
  },
  reportSentBody: {
    fr: 'Ton signalement est enregistré et transmis à la modération GRYD. Une personne l’examine sous {h} h.',
    en: 'Your report is recorded and sent to GRYD moderation. A person reviews it within {h} h.',
    es: 'Tu reporte queda registrado y se envía a la moderación de GRYD. Una persona lo revisa en un plazo de {h} h.',
    de: 'Deine Meldung wird gespeichert und an die GRYD-Moderation übermittelt. Ein Mensch prüft sie innerhalb von {h} Std.',
    pt: 'Sua denúncia é registrada e enviada à moderação do GRYD. Uma pessoa analisa em até {h} h.',
  },
  playerBlockedTitle: {
    fr: 'Joueur bloqué',
    en: 'Player blocked',
    es: 'Jugador bloqueado',
    de: 'Spieler blockiert',
    pt: 'Jogador bloqueado',
  },
  /**
   * PROMETTAIT CE QUE LE CODE NE TIENT PAS (audit App Store, B3) : « ne peut
   * plus te voir, te contacter, ni interagir avec toi » — GRYD n'a aucune
   * messagerie, aucune interaction directe, et rien côté serveur n'empêche
   * l'autre de voir mon pseudo. Ce que `blockMember` fait RÉELLEMENT, depuis
   * que `isBlocked` est consommé : son pseudo devient « Joueur bloqué » sur les
   * deux surfaces qui l'affichaient (roster de crew, classement). On l'écrit,
   * exactement.
   */
  playerBlockedBody: {
    fr: '{pseudo} apparaît désormais comme « Joueur bloqué » dans ton crew et au classement. Il n’est jamais prévenu, et tu peux le débloquer ici.',
    en: '{pseudo} now shows as “Blocked player” in your crew and the leaderboard. They are never notified, and you can unblock here.',
    es: '{pseudo} aparece ahora como «Jugador bloqueado» en tu crew y en la clasificación. Nunca se le avisa, y puedes desbloquearlo aquí.',
    de: '{pseudo} erscheint ab jetzt als „Blockierter Spieler“ in deinem Crew und der Rangliste. Er wird nie benachrichtigt, und du kannst hier entsperren.',
    pt: '{pseudo} agora aparece como “Jogador bloqueado” no seu crew e no ranking. Ele nunca é avisado, e você pode desbloquear aqui.',
  },
  deleteFailTitle: {
    fr: 'Suppression impossible',
    en: 'Deletion failed',
    es: 'No se pudo eliminar',
    de: 'Löschen fehlgeschlagen',
    pt: 'Não foi possível excluir',
  },
  deleteFailBody: {
    fr: "Ton compte n'a pas pu être supprimé. Réessaie dans un instant ou contacte le support.",
    en: 'Your account could not be deleted. Try again in a moment or contact support.',
    es: 'No se pudo eliminar tu cuenta. Inténtalo de nuevo en un momento o contacta con soporte.',
    de: 'Dein Konto konnte nicht gelöscht werden. Versuch es gleich noch mal oder wende dich an den Support.',
    pt: 'Sua conta não pôde ser excluída. Tente de novo em instantes ou fale com o suporte.',
  },
  exportUnavailableTitle: {
    fr: 'Export indisponible',
    en: 'Export unavailable',
    es: 'Exportación no disponible',
    de: 'Export nicht verfügbar',
    pt: 'Exportação indisponível',
  },
  exportUnavailableBody: {
    fr: 'Connecte-toi pour exporter tes données.',
    en: 'Sign in to export your data.',
    es: 'Inicia sesión para exportar tus datos.',
    de: 'Melde dich an, um deine Daten zu exportieren.',
    pt: 'Entre na conta para exportar seus dados.',
  },
  exportFailTitle: {
    fr: 'Export impossible',
    en: 'Export failed',
    es: 'No se pudo exportar',
    de: 'Export fehlgeschlagen',
    pt: 'Falha na exportação',
  },
  exportFailBody: {
    fr: 'Réessaie dans un instant ou contacte le support.',
    en: 'Try again in a moment or contact support.',
    es: 'Inténtalo de nuevo en un momento o contacta con soporte.',
    de: 'Versuch es gleich noch mal oder wende dich an den Support.',
    pt: 'Tente de novo em instantes ou fale com o suporte.',
  },
  exportShareTitle: {
    fr: 'Mes données GRYD (RGPD)',
    en: 'My GRYD data (GDPR)',
    es: 'Mis datos GRYD (RGPD)',
    de: 'Meine GRYD-Daten (DSGVO)',
    pt: 'Meus dados GRYD (RGPD)',
  },

  // ── Confidentialité — cards ──
  profilVisiblePar: {
    fr: 'Profil visible par',
    en: 'Profile visible to',
    es: 'Perfil visible para',
    de: 'Profil sichtbar für',
    pt: 'Perfil visível para',
  },
  departArrivee: {
    fr: 'Départ & arrivée',
    en: 'Start & finish',
    es: 'Salida y llegada',
    de: 'Start & Ziel',
    pt: 'Largada e chegada',
  },
  visibles: {
    fr: 'Visibles',
    en: 'Visible',
    es: 'Visibles',
    de: 'Sichtbar',
    pt: 'Visíveis',
  },
  masquerDepartArrivee: {
    fr: 'Masquer départ et arrivée',
    en: 'Hide start and finish',
    es: 'Ocultar salida y llegada',
    de: 'Start und Ziel verbergen',
    pt: 'Ocultar largada e chegada',
  },
  /**
   * Décrivait un masquage « autour de tes lieux sensibles » — or aucun écran ne
   * permet de déclarer une adresse : les lieux sensibles n'existaient pas. Ce
   * qui existe, c'est le retrait des extrémités du tracé partagé.
   */
  masquerDepartSub: {
    fr: 'Le début et la fin de ton tracé sont retirés avant tout partage.',
    en: 'The start and end of your trail are removed before any share.',
    es: 'El inicio y el final de tu trazado se quitan antes de cualquier compartido.',
    de: 'Anfang und Ende deiner Spur werden vor jedem Teilen entfernt.',
    pt: 'O início e o fim do seu traçado são removidos antes de qualquer compartilhamento.',
  },

  // ── Confidentialité — blocage & signalement ──
  blocageSignalement: {
    fr: 'Blocage & signalement',
    en: 'Blocking & reporting',
    es: 'Bloqueo y reportes',
    de: 'Blockieren & Melden',
    pt: 'Bloqueio e denúncia',
  },
  blockedOne: {
    fr: '{n} bloqué',
    en: '{n} blocked',
    es: '{n} bloqueado',
    de: '{n} blockiert',
    pt: '{n} bloqueado',
  },
  blockedMany: {
    fr: '{n} bloqués',
    en: '{n} blocked',
    es: '{n} bloqueados',
    de: '{n} blockiert',
    pt: '{n} bloqueados',
  },
  /**
   * Promettait un examen humain « sous {h} h » à TOUS les signalements, y compris
   * ceux d'un joueur non connecté — qui ne quittent jamais le téléphone
   * (`crew/moderation.ts` n'écrit dans `content_reports` que s'il y a une
   * session). L'écran distingue maintenant les deux cas, et cette note ne parle
   * que du blocage, qui, lui, agit toujours.
   */
  /**
   * « masque immédiatement ce joueur PARTOUT où GRYD l'afficherait » promettait
   * une disparition que le code ne faisait pas (aucun appelant d'`isBlocked`) —
   * et qu'il ne DOIT pas faire au classement : retirer une ligne décalerait
   * tous les rangs en dessous. La copie décrit maintenant le geste exact, et
   * nomme les deux surfaces où il agit.
   */
  blockNote: {
    fr: 'Bloquer remplace son pseudo par « Joueur bloqué » dans ton crew et au classement, sans jamais le prévenir. Sa place au classement reste, pour que les rangs restent justes. Tu peux débloquer ici quand tu veux.',
    en: 'Blocking replaces their name with “Blocked player” in your crew and the leaderboard, without ever notifying them. Their leaderboard place stays, so ranks stay true. You can unblock here whenever you want.',
    es: 'Bloquear sustituye su usuario por «Jugador bloqueado» en tu crew y en la clasificación, sin avisarle nunca. Su puesto se mantiene, para que los rangos sigan siendo correctos. Puedes desbloquear aquí cuando quieras.',
    de: 'Blockieren ersetzt seinen Namen in deinem Crew und der Rangliste durch „Blockierter Spieler“ — ohne ihn je zu benachrichtigen. Sein Platz bleibt, damit die Ränge stimmen. Du kannst hier jederzeit entsperren.',
    pt: 'Bloquear troca o nome dele por “Jogador bloqueado” no seu crew e no ranking, sem nunca avisá-lo. A posição dele continua, para os rankings seguirem certos. Você pode desbloquear aqui quando quiser.',
  },
  /**
   * LE CHEMIN COURT, dit AVANT le formulaire. Le pseudo GRYD par défaut est un
   * identifiant machine (`runner_` + 12 hexadécimaux) affiché tronqué : le
   * retaper à la main était la seule voie, et c'est ce qui faisait échouer la
   * Guideline 1.2. Le formulaire reste — pour signaler quelqu'un qu'on ne
   * croise plus nulle part — mais il n'est plus la porte principale.
   */
  blockShortcutNote: {
    fr: 'Plus simple : touche « … » sur la ligne du joueur, dans ton crew ou au classement — le pseudo y est déjà rempli.',
    en: 'Simpler: tap “…” on the player’s row, in your crew or the leaderboard — the name is already filled in.',
    es: 'Más simple: toca «…» en la fila del jugador, en tu crew o en la clasificación — el usuario ya viene puesto.',
    de: 'Einfacher: Tippe auf „…“ in der Zeile des Spielers, im Crew oder in der Rangliste — der Name ist schon eingetragen.',
    pt: 'Mais simples: toque em “…” na linha do jogador, no seu crew ou no ranking — o nome já vem preenchido.',
  },
  pseudoJoueurLabel: {
    fr: 'PSEUDO DU JOUEUR',
    en: 'PLAYER USERNAME',
    es: 'USUARIO DEL JUGADOR',
    de: 'NUTZERNAME DES SPIELERS',
    pt: 'USUÁRIO DO JOGADOR',
  },
  pseudoInputA11y: {
    fr: 'Pseudo du joueur à signaler ou bloquer',
    en: 'Username of the player to report or block',
    es: 'Usuario del jugador a reportar o bloquear',
    de: 'Nutzername des Spielers zum Melden oder Blockieren',
    pt: 'Usuário do jogador a denunciar ou bloquear',
  },
  pseudoPlaceholder: {
    fr: 'Ex. K.Runner75',
    en: 'E.g. K.Runner75',
    es: 'Ej. K.Runner75',
    de: 'Z. B. K.Runner75',
    pt: 'Ex.: K.Runner75',
  },
  motifSignalement: {
    fr: 'MOTIF DU SIGNALEMENT',
    en: 'REPORT REASON',
    es: 'MOTIVO DEL REPORTE',
    de: 'GRUND DER MELDUNG',
    pt: 'MOTIVO DA DENÚNCIA',
  },
  signalerJoueur: {
    fr: 'Signaler ce joueur',
    en: 'Report this player',
    es: 'Reportar al jugador',
    de: 'Spieler melden',
    pt: 'Denunciar jogador',
  },
  bloquerJoueur: {
    fr: 'Bloquer ce joueur',
    en: 'Block this player',
    es: 'Bloquear al jugador',
    de: 'Spieler blockieren',
    pt: 'Bloquear jogador',
  },
  joueursBloques: {
    fr: 'JOUEURS BLOQUÉS',
    en: 'BLOCKED PLAYERS',
    es: 'JUGADORES BLOQUEADOS',
    de: 'BLOCKIERTE SPIELER',
    pt: 'JOGADORES BLOQUEADOS',
  },
  debloquerA11y: {
    fr: 'Débloquer {pseudo}',
    en: 'Unblock {pseudo}',
    es: 'Desbloquear a {pseudo}',
    de: '{pseudo} entsperren',
    pt: 'Desbloquear {pseudo}',
  },
  debloquer: {
    fr: 'Débloquer',
    en: 'Unblock',
    es: 'Desbloquear',
    de: 'Entsperren',
    pt: 'Desbloquear',
  },
  /**
   * Renvoyait vers « le chat du crew (appui long sur le message) ». Il n'y a ni
   * route, ni onglet, ni écran de chat dans GRYD — le chat libre est refusé
   * (A-43 §9) et l'écran Crew le dit lui-même. La note décrit maintenant la
   * seule cible qui existe : un joueur, par son pseudo.
   */
  signalerMessageNote: {
    fr: 'Le signalement porte sur un JOUEUR, par son pseudo : GRYD n’a pas de messagerie, il n’y a donc aucun message à signaler.',
    en: 'A report targets a PLAYER, by username: GRYD has no messaging, so there is no message to report.',
    es: 'El reporte apunta a un JUGADOR, por su usuario: GRYD no tiene mensajería, así que no hay ningún mensaje que reportar.',
    de: 'Eine Meldung betrifft eine SPIELERIN oder einen Spieler, per Nutzername: GRYD hat keine Nachrichten, es gibt also nichts zu melden.',
    pt: 'A denúncia é sobre um JOGADOR, pelo usuário: o GRYD não tem mensagens, então não há mensagem a denunciar.',
  },
  lireCodeConduite: {
    fr: 'Lire le code de conduite',
    en: 'Read the code of conduct',
    es: 'Leer el código de conducta',
    de: 'Verhaltenskodex lesen',
    pt: 'Ler o código de conduta',
  },

  // ── Confidentialité — RGPD, export & suppression ──
  secQuiVoitQuoi: {
    fr: 'CE QUE LES AUTRES VOIENT',
    en: 'WHAT OTHERS SEE',
    es: 'LO QUE VEN LOS DEMÁS',
    de: 'WAS ANDERE SEHEN',
    pt: 'O QUE OS OUTROS VEEM',
  },
  masquees: {
    fr: 'Masqués',
    en: 'Hidden',
    es: 'Ocultos',
    de: 'Verborgen',
    pt: 'Ocultos',
  },
  // ── Motifs de signalement (ex-`features/crew/moderation.ts`, FR en dur) ──
  reasonSpam: {
    fr: 'Spam',
    en: 'Spam',
    es: 'Spam',
    de: 'Spam',
    pt: 'Spam',
  },
  reasonSpamHint: {
    fr: 'Pub, arnaque, sollicitation répétée.',
    en: 'Ads, scams, repeated soliciting.',
    es: 'Publicidad, estafas, insistencia repetida.',
    de: 'Werbung, Betrug, wiederholte Anmache.',
    pt: 'Publicidade, golpe, insistência repetida.',
  },
  reasonHate: {
    fr: 'Haine',
    en: 'Hate',
    es: 'Odio',
    de: 'Hass',
    pt: 'Ódio',
  },
  reasonHateHint: {
    fr: 'Racisme, insulte, contenu haineux.',
    en: 'Racism, insults, hateful content.',
    es: 'Racismo, insultos, contenido de odio.',
    de: 'Rassismus, Beleidigung, hasserfüllte Inhalte.',
    pt: 'Racismo, insulto, conteúdo de ódio.',
  },
  reasonHarass: {
    fr: 'Harcèlement',
    en: 'Harassment',
    es: 'Acoso',
    de: 'Belästigung',
    pt: 'Assédio',
  },
  reasonHarassHint: {
    fr: 'Intimidation, menaces, acharnement.',
    en: 'Intimidation, threats, relentless pursuit.',
    es: 'Intimidación, amenazas, ensañamiento.',
    de: 'Einschüchterung, Drohungen, Nachstellen.',
    pt: 'Intimidação, ameaças, perseguição.',
  },
  reasonOther: {
    fr: 'Autre',
    en: 'Other',
    es: 'Otro',
    de: 'Anderes',
    pt: 'Outro',
  },
  reasonOtherHint: {
    fr: 'Un autre problème à examiner.',
    en: 'Another problem to review.',
    es: 'Otro problema que revisar.',
    de: 'Ein anderes Problem zur Prüfung.',
    pt: 'Outro problema a analisar.',
  },
  // ── Signalement : le SEUL cas où il part vraiment est « connecté » ──
  // `crew/moderation.ts` n'écrit dans `content_reports` que s'il y a une
  // session ; sinon le signalement reste sur le téléphone et n'atteint
  // personne. On ne peint donc pas « Signaler » hors session.
  reportSignedOutTitle: {
    fr: 'Signaler demande un compte',
    en: 'Reporting needs an account',
    es: 'Reportar requiere una cuenta',
    de: 'Melden braucht ein Konto',
    pt: 'Denunciar exige uma conta',
  },
  reportSignedOutBody: {
    fr: 'Sans compte, un signalement resterait sur ce téléphone et n’atteindrait personne. Bloquer, en revanche, fonctionne tout de suite.',
    en: 'Without an account a report would stay on this phone and reach no one. Blocking, on the other hand, works right away.',
    es: 'Sin cuenta, un reporte se quedaría en este teléfono y no llegaría a nadie. Bloquear, en cambio, funciona de inmediato.',
    de: 'Ohne Konto bliebe eine Meldung auf diesem Handy und erreichte niemanden. Blockieren funktioniert dagegen sofort.',
    pt: 'Sem conta, uma denúncia ficaria neste telefone e não chegaria a ninguém. Bloquear, por outro lado, funciona na hora.',
  },
  secMesDonneesRgpd: {
    fr: 'MES DONNÉES (RGPD)',
    en: 'MY DATA (GDPR)',
    es: 'MIS DATOS (RGPD)',
    de: 'MEINE DATEN (DSGVO)',
    pt: 'MEUS DADOS (RGPD)',
  },
  ageMinimum: {
    fr: 'Âge minimum : 16 ans — confirmé à ton inscription.',
    en: 'Minimum age: 16 — confirmed at sign-up.',
    es: 'Edad mínima: 16 años — confirmada al registrarte.',
    de: 'Mindestalter: 16 Jahre — bei der Anmeldung bestätigt.',
    pt: 'Idade mínima: 16 anos — confirmada no cadastro.',
  },
  exportSuppression: {
    fr: 'Export & suppression',
    en: 'Export & deletion',
    es: 'Exportar y eliminar',
    de: 'Export & Löschung',
    pt: 'Exportar e excluir',
  },
  exporterRgpdLabel: {
    fr: 'EXPORTER (RGPD)',
    en: 'EXPORT (GDPR)',
    es: 'EXPORTAR (RGPD)',
    de: 'EXPORT (DSGVO)',
    pt: 'EXPORTAR (RGPD)',
  },
  exportNote: {
    fr: "Récupère une copie de toutes tes données — sorties, zones, profil — au format JSON, via le partage. Ça n'efface rien.",
    en: 'Get a copy of all your data — activities, zones, profile — as JSON, via the share sheet. Nothing gets deleted.',
    es: 'Recibe una copia de todos tus datos — actividades, zonas, perfil — en formato JSON, mediante el menú de compartir. No borra nada.',
    de: 'Hol dir eine Kopie all deiner Daten — Aktivitäten, Zonen, Profil — als JSON über das Teilen-Menü. Es wird nichts gelöscht.',
    pt: 'Receba uma cópia de todos os seus dados — atividades, zonas, perfil — em JSON, pelo compartilhamento. Nada é apagado.',
  },
  /**
   * ÉTAT ① « pas connecté » du bloc RGPD. Le CTA « Exporter » était peint quel
   * que soit l'état de session : l'utilisateur tapait, puis apprenait par une
   * `Alert` qu'il fallait un compte. Le coût était payé avant le message.
   */
  rgpdSignedOutTitle: {
    fr: 'Rien à exporter sans compte',
    en: 'Nothing to export without an account',
    es: 'Nada que exportar sin cuenta',
    de: 'Ohne Konto nichts zu exportieren',
    pt: 'Nada a exportar sem conta',
  },
  rgpdSignedOutBody: {
    fr: 'L’export rassemble ce que le serveur GRYD a enregistré pour toi. Sans compte, il n’a rien enregistré : il n’y a pas de fichier à te rendre.',
    en: 'The export gathers what the GRYD server has recorded for you. Without an account it has recorded nothing, so there is no file to hand back.',
    es: 'La exportación reúne lo que el servidor de GRYD ha registrado de ti. Sin cuenta no ha registrado nada: no hay ningún archivo que devolverte.',
    de: 'Der Export bündelt, was der GRYD-Server über dich gespeichert hat. Ohne Konto hat er nichts gespeichert — es gibt keine Datei zurückzugeben.',
    pt: 'A exportação reúne o que o servidor do GRYD registrou sobre você. Sem conta ele não registrou nada: não há arquivo para devolver.',
  },
  /** L'effacement PARTIEL n'existe pas — et il n'a plus deux fausses lignes. */
  partialDeleteAbsence: {
    fr: 'GRYD ne sait pas encore effacer une PARTIE de tes données (historique seul, données sportives seules). Les deux gestes qui existent vraiment sont ci-dessus et ci-dessous : exporter, ou supprimer le compte.',
    en: 'GRYD cannot yet erase PART of your data (history alone, sport data alone). The two gestures that really exist are above and below: export, or delete the account.',
    es: 'GRYD todavía no sabe borrar una PARTE de tus datos (solo el historial, solo los datos deportivos). Los dos gestos que existen de verdad están arriba y abajo: exportar o eliminar la cuenta.',
    de: 'GRYD kann noch keinen TEIL deiner Daten löschen (nur Verlauf, nur Sportdaten). Die zwei Aktionen, die es wirklich gibt, stehen darüber und darunter: exportieren oder Konto löschen.',
    pt: 'O GRYD ainda não sabe apagar uma PARTE dos seus dados (só o histórico, só os dados esportivos). Os dois gestos que existem de verdade estão acima e abaixo: exportar ou excluir a conta.',
  },
  // ── Suppression différée : les quatre états de la LECTURE serveur ──
  deletionReading: {
    fr: 'Lecture de l’état de ton compte…',
    en: 'Reading your account status…',
    es: 'Leyendo el estado de tu cuenta…',
    de: 'Kontostatus wird gelesen…',
    pt: 'Lendo o status da sua conta…',
  },
  deletionUnknownTitle: {
    fr: 'État de suppression inconnu',
    en: 'Deletion status unknown',
    es: 'Estado de eliminación desconocido',
    de: 'Löschstatus unbekannt',
    pt: 'Status de exclusão desconhecido',
  },
  deletionUnknownBody: {
    fr: 'GRYD n’a pas pu lire si une suppression est en cours sur ton compte. Un réseau qui lâche ne prouve pas qu’il n’y en a pas.',
    en: 'GRYD could not read whether a deletion is under way on your account. A network that drops does not prove there is none.',
    es: 'GRYD no pudo leer si hay una eliminación en curso en tu cuenta. Una red que falla no prueba que no la haya.',
    de: 'GRYD konnte nicht lesen, ob für dein Konto eine Löschung läuft. Ein abbrechendes Netz beweist nicht, dass es keine gibt.',
    pt: 'O GRYD não conseguiu ler se há uma exclusão em andamento na sua conta. Uma rede que cai não prova que não exista.',
  },
  deletionRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  secSuppressionCompte: {
    fr: 'SUPPRESSION DU COMPTE',
    en: 'ACCOUNT DELETION',
    es: 'ELIMINACIÓN DE CUENTA',
    de: 'KONTO LÖSCHEN',
    pt: 'EXCLUSÃO DA CONTA',
  },
  deleteCardText: {
    fr: "Tu peux supprimer ton compte GRYD directement depuis l'app. Ton compte devient invisible tout de suite, puis il est définitivement supprimé {d} jours plus tard. Tu peux revenir avant l'échéance.",
    en: 'You can delete your GRYD account right from the app. Your account becomes invisible immediately, then it is permanently deleted {d} days later. You can come back before the deadline.',
    es: 'Puedes eliminar tu cuenta GRYD directamente desde la app. Tu cuenta se vuelve invisible al instante y se elimina definitivamente {d} días después. Puedes volver antes de la fecha límite.',
    de: 'Du kannst dein GRYD-Konto direkt in der App löschen. Dein Konto wird sofort unsichtbar und {d} Tage später endgültig gelöscht. Bis dahin kannst du zurückkommen.',
    pt: 'Você pode excluir sua conta GRYD direto pelo app. Sua conta fica invisível na hora e é excluída definitivamente {d} dias depois. Você pode voltar antes do prazo.',
  },
  deleteConfirmSubtitle: {
    fr: 'Ce qui se passe tout de suite, et ce qui est définitif.',
    en: 'What happens right away, and what is permanent.',
    es: 'Qué pasa de inmediato y qué es definitivo.',
    de: 'Was sofort passiert und was endgültig ist.',
    pt: 'O que acontece agora e o que é definitivo.',
  },
  deleteConfirmTitle: {
    fr: 'Invisible tout de suite. Supprimé dans {d} jours.',
    en: 'Invisible right away. Deleted in {d} days.',
    es: 'Invisible de inmediato. Eliminada en {d} días.',
    de: 'Sofort unsichtbar. In {d} Tagen gelöscht.',
    pt: 'Invisível na hora. Excluída em {d} dias.',
  },
  deleteConfirmBody: {
    fr: "Dès maintenant : ton profil, ton pseudo et tes scores disparaissent des classements et du roster de ton crew. Personne ne te voit plus.\n\nDans {d} jours : ton compte, tes sorties et ton territoire sont supprimés pour de bon. Les zones que tu tiens redeviennent libres. Là, c'est irréversible.\n\nAvant l'échéance : reconnecte-toi et tout revient comme avant.",
    en: 'Right now: your profile, your name and your scores disappear from leaderboards and from your crew roster. Nobody can see you anymore.\n\nIn {d} days: your account, your activities and your territory are deleted for good. The zones you hold become free again. That step is irreversible.\n\nBefore the deadline: sign back in and everything comes back.',
    es: 'Ahora mismo: tu perfil, tu nombre y tus puntos desaparecen de las clasificaciones y del roster de tu crew. Nadie te ve.\n\nEn {d} días: tu cuenta, tus actividades y tu territorio se eliminan para siempre. Las zonas que dominas quedan libres. Ese paso es irreversible.\n\nAntes del plazo: vuelve a iniciar sesión y todo se recupera.',
    de: 'Ab sofort: Dein Profil, dein Name und deine Punkte verschwinden aus Ranglisten und aus dem Roster deines Crews. Niemand sieht dich mehr.\n\nIn {d} Tagen: Konto, Aktivitäten und Gebiet werden endgültig gelöscht. Deine Zonen werden wieder frei. Dieser Schritt ist endgültig.\n\nVorher: Melde dich wieder an, dann ist alles zurück.',
    pt: 'Agora: seu perfil, seu nome e sua pontuação somem dos rankings e do roster do seu crew. Ninguém mais te vê.\n\nEm {d} dias: sua conta, suas atividades e seu território são excluídos de vez. As zonas que você domina ficam livres. Esse passo é irreversível.\n\nAntes do prazo: entre de novo e tudo volta.',
  },
  // ── État « suppression programmée » (0046) ──
  deletionPendingTitle: {
    fr: 'Suppression programmée',
    en: 'Deletion scheduled',
    es: 'Eliminación programada',
    de: 'Löschung geplant',
    pt: 'Exclusão agendada',
  },
  deletionPendingBody: {
    fr: "Ton compte est déjà invisible pour les autres. Il sera définitivement supprimé le {date}. Tu peux encore l'annuler.",
    en: 'Your account is already invisible to others. It will be permanently deleted on {date}. You can still cancel.',
    es: 'Tu cuenta ya es invisible para los demás. Se eliminará definitivamente el {date}. Todavía puedes cancelar.',
    de: 'Dein Konto ist für andere bereits unsichtbar. Es wird am {date} endgültig gelöscht. Du kannst noch abbrechen.',
    pt: 'Sua conta já está invisível para os outros. Ela será excluída definitivamente em {date}. Você ainda pode cancelar.',
  },
  deletionCancelCta: {
    fr: 'Annuler la suppression',
    en: 'Cancel deletion',
    es: 'Cancelar eliminación',
    de: 'Löschung abbrechen',
    pt: 'Cancelar exclusão',
  },
  deletionRestoredTitle: {
    fr: 'Compte restauré',
    en: 'Account restored',
    es: 'Cuenta restaurada',
    de: 'Konto wiederhergestellt',
    pt: 'Conta restaurada',
  },
  deletionRestoredBody: {
    fr: 'La suppression est annulée. Ton profil, tes sorties et ton territoire sont de nouveau visibles.',
    en: 'The deletion is cancelled. Your profile, your activities and your territory are visible again.',
    es: 'La eliminación se ha cancelado. Tu perfil, tus actividades y tu territorio vuelven a ser visibles.',
    de: 'Die Löschung ist abgebrochen. Profil, Aktivitäten und Gebiet sind wieder sichtbar.',
    pt: 'A exclusão foi cancelada. Seu perfil, suas atividades e seu território estão visíveis de novo.',
  },
  deletionScheduledTitle: {
    fr: 'Suppression enregistrée',
    en: 'Deletion recorded',
    es: 'Eliminación registrada',
    de: 'Löschung vorgemerkt',
    pt: 'Exclusão registrada',
  },
  deletionScheduledBody: {
    fr: "Tu es maintenant invisible pour les autres. Ton compte sera supprimé le {date}. Reconnecte-toi avant cette date pour l'annuler.",
    en: 'You are now invisible to others. Your account will be deleted on {date}. Sign back in before then to cancel.',
    es: 'Ahora eres invisible para los demás. Tu cuenta se eliminará el {date}. Vuelve a iniciar sesión antes de esa fecha para cancelar.',
    de: 'Du bist jetzt für andere unsichtbar. Dein Konto wird am {date} gelöscht. Melde dich vorher wieder an, um abzubrechen.',
    pt: 'Você está invisível para os outros. Sua conta será excluída em {date}. Entre de novo antes dessa data para cancelar.',
  },
  annulerGarder: {
    fr: 'Annuler, garder mon compte',
    en: 'Cancel, keep my account',
    es: 'Cancelar, conservar mi cuenta',
    de: 'Abbrechen, Konto behalten',
    pt: 'Cancelar, manter minha conta',
  },
  deleteDefinitifA11y: {
    fr: 'Demander la suppression de mon compte',
    en: 'Request deletion of my account',
    es: 'Solicitar la eliminación de mi cuenta',
    de: 'Löschung meines Kontos beantragen',
    pt: 'Solicitar a exclusão da minha conta',
  },
  suppressionEnCours: {
    fr: 'Suppression…',
    en: 'Deleting…',
    es: 'Eliminando…',
    de: 'Wird gelöscht…',
    pt: 'Excluindo…',
  },
  supprimerDefinitivement: {
    fr: 'Supprimer mon compte',
    en: 'Delete my account',
    es: 'Eliminar mi cuenta',
    de: 'Konto löschen',
    pt: 'Excluir minha conta',
  },

  // ── Confidentialité — Mode privé (card maître) ──

  // ── Support ──
  supportTitle: {
    fr: 'Support',
    en: 'Support',
    es: 'Soporte',
    de: 'Support',
    pt: 'Suporte',
  },
  supportKicker: {
    fr: 'AIDE',
    en: 'HELP',
    es: 'AYUDA',
    de: 'HILFE',
    pt: 'AJUDA',
  },
  /**
   * ─── L'ÉCRAN QU'OUVRE UN CYCLISTE DONT LA SORTIE VIENT D'ÊTRE REFUSÉE ──────
   * L'Aide n'a AUCUNE lentille : elle ne lit aucune discipline, elle explique
   * la validation, qui s'applique aux deux (`ingest_run` valide `run` ET `bike`
   * avec des bornes par discipline). Elle parlait pourtant, de bout en bout,
   * au seul coureur — sous-titre, sur-titre « MA COURSE », « Pourquoi ma course
   * n'a pas compté ? ». Quelqu'un venait y chercher pourquoi SA sortie vélo
   * avait été rejetée, et l'app lui répondait à côté. Neutralisation intégrale.
   */
  supportSubtitle: {
    fr: 'Comprendre pourquoi une sortie compte — ou pas — et faire valoir tes droits.',
    en: 'Understand why an activity counts — or not — and exercise your rights.',
    es: 'Entiende por qué una actividad cuenta — o no — y haz valer tus derechos.',
    de: 'Versteh, warum eine Aktivität zählt — oder nicht — und nutz deine Rechte.',
    pt: 'Entenda por que uma atividade conta — ou não — e faça valer seus direitos.',
  },
  secComprendreCalculs: {
    fr: 'COMPRENDRE LES CALCULS',
    en: 'UNDERSTAND THE SCORING',
    es: 'ENTENDER LOS CÁLCULOS',
    de: 'BERECHNUNG VERSTEHEN',
    pt: 'ENTENDER OS CÁLCULOS',
  },
  secMaSortie: {
    fr: 'MA SORTIE',
    en: 'MY ACTIVITY',
    es: 'MI ACTIVIDAD',
    de: 'MEINE AKTIVITÄT',
    pt: 'MINHA ATIVIDADE',
  },
  secSignaler: {
    fr: 'SIGNALER',
    en: 'REPORT',
    es: 'REPORTAR',
    de: 'MELDEN',
    pt: 'DENUNCIAR',
  },
  secMesDonnees: {
    fr: 'MES DONNÉES',
    en: 'MY DATA',
    es: 'MIS DATOS',
    de: 'MEINE DATEN',
    pt: 'MEUS DADOS',
  },
  whyNotCountedTitle: {
    fr: 'Pourquoi ma sortie n’a pas compté ?',
    en: 'Why didn’t my activity count?',
    es: '¿Por qué mi actividad no contó?',
    de: 'Warum zählte meine Aktivität nicht?',
    pt: 'Por que minha atividade não contou?',
  },
  whyNotCountedBody: {
    fr: 'Boucle non fermée, GPS trop faible, zone trop étroite ou interdite… GRYD calcule chaque zone selon des règles claires. Voir comment une sortie devient une zone — ou pas.',
    en: 'Unclosed loop, weak GPS, area too narrow or off-limits… GRYD scores every zone by clear rules. See how an activity becomes a zone — or not.',
    es: 'Bucle sin cerrar, GPS débil, zona demasiado estrecha o prohibida… GRYD calcula cada zona con reglas claras. Mira cómo una actividad se convierte en zona — o no.',
    de: 'Runde nicht geschlossen, GPS zu schwach, Zone zu schmal oder gesperrt… GRYD berechnet jede Zone nach klaren Regeln. Sieh, wie eine Aktivität zur Zone wird — oder nicht.',
    pt: 'Volta não fechada, GPS fraco, zona estreita demais ou proibida… O GRYD calcula cada zona com regras claras. Veja como uma atividade vira uma zona — ou não.',
  },
  faqRulesBody: {
    fr: 'La FAQ complète, détails au tap : zones, défense, crew, Verify, points et bonus.',
    en: 'The full FAQ, details on tap: zones, defense, crew, Verify, points and bonuses.',
    es: 'La FAQ completa, detalles al tocar: zonas, defensa, crew, Verify, puntos y bonus.',
    de: 'Die ganze FAQ, Details per Tipp: Zonen, Abwehr, Crew, Verify, Punkte und Boni.',
    pt: 'A FAQ completa, detalhes ao tocar: zonas, defesa, crew, Verify, pontos e bônus.',
  },
  /** Titre du bloc d'explication « statut d'une sortie » (ex-`notCountedTitle`,
   *  qui reprenait mot pour mot le titre de la ligne de navigation juste
   *  au-dessus — deux entrées identiques pour deux contenus différents).
   *  Le NOM de clé garde `run` : c'est `runs.status`, la colonne, qu'il
   *  désigne — et cette colonne porte bien les deux disciplines. */
  runStatusTitle: {
    fr: 'Le statut d’une sortie',
    en: 'An activity’s status',
    es: 'El estado de una actividad',
    de: 'Der Status einer Aktivität',
    pt: 'O status de uma atividade',
  },

  /**
   * Finissait par « tu peux le contester ». Il n'existe AUCUN recours : ni
   * formulaire, ni adresse, ni RPC de contestation. La phrase promettait un
   * droit que le code ne tient pas.
   */
  notCountedBody: {
    fr: 'Une sortie peut être vérifiée, partielle, stats only, doublon ou rejetée. Seules les sorties vérifiées capturent du territoire — les autres comptent quand même pour ta performance. GRYD affiche le statut de chaque sortie et la règle qui l’a produit.',
    en: 'An activity can be verified, partial, stats only, duplicate or rejected. Only verified activities capture territory — the others still count toward your performance. GRYD shows each activity’s status and the rule behind it.',
    es: 'Una actividad puede ser verificada, parcial, solo stats, duplicada o rechazada. Solo las actividades verificadas capturan territorio — las demás cuentan igualmente para tu rendimiento. GRYD muestra el estado de cada actividad y la regla que lo produjo.',
    de: 'Eine Aktivität kann verifiziert, partiell, nur Stats, Duplikat oder abgelehnt sein. Nur verifizierte Aktivitäten erobern Gebiet — die anderen zählen trotzdem für deine Leistung. GRYD zeigt den Status jeder Aktivität und die Regel dahinter.',
    pt: 'Uma atividade pode ser verificada, parcial, só stats, duplicada ou rejeitada. Só as atividades verificadas capturam território — as outras contam mesmo assim para seu desempenho. O GRYD mostra o status de cada atividade e a regra por trás dele.',
  },
  segmentExcludedTitle: {
    fr: 'Segment exclu',
    en: 'Excluded segment',
    es: 'Segmento excluido',
    de: 'Ausgeschlossenes Segment',
    pt: 'Trecho excluído',
  },
  segmentExcludedBody: {
    fr: "Les portions en zone privée, sans signal GPS fiable ou au déplacement invraisemblable sont retirées du calcul. Le reste de la sortie reste valide, rien d'autre n'est perdu.",
    en: 'Stretches in private areas, without reliable GPS or with implausible movement are removed from the calculation. The rest of the activity stays valid — nothing else is lost.',
    es: 'Los tramos en zona privada, sin señal GPS fiable o con desplazamiento inverosímil se retiran del cálculo. El resto de la actividad sigue siendo válido, no se pierde nada más.',
    de: 'Abschnitte in Privatzonen, ohne verlässliches GPS oder mit unplausibler Bewegung werden aus der Berechnung entfernt. Der Rest der Aktivität bleibt gültig — sonst geht nichts verloren.',
    pt: 'Trechos em área privada, sem sinal de GPS confiável ou com deslocamento implausível são retirados do cálculo. O resto da atividade continua válido, nada mais se perde.',
  },
  dataExportBody: {
    fr: 'Reçois une copie complète de tes sorties, zones, badges et réglages.',
    en: 'Get a full copy of your activities, zones, badges and settings.',
    es: 'Recibe una copia completa de tus actividades, zonas, insignias y ajustes.',
    de: 'Hol dir eine vollständige Kopie deiner Aktivitäten, Zonen, Badges und Einstellungen.',
    pt: 'Receba uma cópia completa das suas atividades, zonas, badges e ajustes.',
  },
  dataDeleteTitle: {
    fr: 'Supprimer mes données',
    en: 'Delete my data',
    es: 'Eliminar mis datos',
    de: 'Meine Daten löschen',
    pt: 'Excluir meus dados',
  },
  dataDeleteBody: {
    fr: "Demande la suppression définitive de ton compte et de toutes tes données. C'est irréversible, et c'est ton droit.",
    en: 'Request the permanent deletion of your account and all your data. It’s irreversible, and it’s your right.',
    es: 'Solicita la eliminación definitiva de tu cuenta y de todos tus datos. Es irreversible, y es tu derecho.',
    de: 'Beantrage die endgültige Löschung deines Kontos und aller deiner Daten. Das ist unumkehrbar — und dein gutes Recht.',
    pt: 'Peça a exclusão definitiva da sua conta e de todos os seus dados. É irreversível, e é seu direito.',
  },
  reportPlayerTitle: {
    fr: 'Signaler un joueur',
    en: 'Report a player',
    es: 'Reportar a un jugador',
    de: 'Spieler melden',
    pt: 'Denunciar um jogador',
  },
  reportPlayerBody: {
    fr: 'Captures impossibles, allure de véhicule, comportement déplacé : signale le pseudo depuis Confidentialité, avec un motif. Le signalement est confidentiel.',
    en: 'Impossible captures, vehicle-level pace, out-of-line behaviour: report the username from Privacy, with a reason. The report stays confidential.',
    es: 'Capturas imposibles, ritmo de vehículo, comportamiento fuera de lugar: reporta el usuario desde Privacidad, con un motivo. El reporte es confidencial.',
    de: 'Unmögliche Captures, Tempo wie ein Fahrzeug, daneben benehmen: Melde den Nutzernamen über Privatsphäre, mit Grund. Die Meldung bleibt vertraulich.',
    pt: 'Capturas impossíveis, ritmo de veículo, comportamento fora de linha: denuncie o usuário em Privacidade, com um motivo. A denúncia é confidencial.',
  },
  /**
   * L'ABSENCE, nommée. Quatre cards de signalement ouvraient toutes la même
   * `Alert` « cette remontée n'est pas encore transmise » : quatre boutons morts
   * sur l'écran de recours. Deux d'entre eux (triche) avaient pourtant une VRAIE
   * destination — le signalement de joueur, réel depuis Confidentialité. Le
   * quatrième (zone dangereuse) n'en a aucune : on le dit au lieu de le peindre.
   */
  supportNoChannelTitle: {
    fr: 'Ce que GRYD ne sait pas encore recevoir',
    en: 'What GRYD cannot receive yet',
    es: 'Lo que GRYD todavía no sabe recibir',
    de: 'Was GRYD noch nicht entgegennehmen kann',
    pt: 'O que o GRYD ainda não sabe receber',
  },
  supportNoChannelBody: {
    fr: 'Signaler une zone dangereuse, contester un statut de sortie ou écrire au support n’est pas possible depuis l’app : ces remontées n’ont pas de destination. Le seul contact publié est l’adresse du siège, dans les Mentions légales.',
    en: 'Reporting a dangerous area, contesting an activity status or writing to support is not possible from the app: those messages have no destination. The only published contact is the registered office address, in the Legal notice.',
    es: 'Reportar una zona peligrosa, impugnar el estado de una actividad o escribir al soporte no es posible desde la app: esos mensajes no tienen destino. El único contacto publicado es la dirección de la sede, en el Aviso legal.',
    de: 'Eine gefährliche Zone melden, den Status einer Aktivität anfechten oder den Support anschreiben geht aus der App nicht: Diese Meldungen haben kein Ziel. Der einzige veröffentlichte Kontakt ist die Anschrift des Sitzes im Impressum.',
    pt: 'Denunciar uma zona perigosa, contestar o status de uma atividade ou escrever ao suporte não é possível pelo app: essas mensagens não têm destino. O único contato publicado é o endereço da sede, no Aviso legal.',
  },
  supportLegalCta: {
    fr: 'Voir les Mentions légales',
    en: 'See the Legal notice',
    es: 'Ver el Aviso legal',
    de: 'Impressum ansehen',
    pt: 'Ver o Aviso legal',
  },

  /**
   * Affirmait « jamais automatiques sans recours ». Le recours n'existe pas :
   * `/support` n'a ni adresse e-mail, ni formulaire, ni `mailto:`. La note dit
   * maintenant ce qui EST vrai — les décisions sont explicables, ligne à ligne —
   * et nomme le seul canal qui existe vraiment.
   */
  supportFootnote: {
    fr: 'Chaque décision de vérification est explicable : la règle appliquée est affichée avec la sortie. GRYD n’a pas encore de canal de contestation dans l’app — le seul point de contact publié est l’adresse postale du siège, dans les Mentions légales.',
    en: 'Every verification decision is explainable: the rule applied is shown with the activity. GRYD has no in-app appeal channel yet — the only published point of contact is the registered office address, in the Legal notice.',
    es: 'Cada decisión de verificación es explicable: la regla aplicada se muestra junto a la actividad. GRYD todavía no tiene canal de reclamación en la app — el único punto de contacto publicado es la dirección postal de la sede, en el Aviso legal.',
    de: 'Jede Verifizierungsentscheidung ist erklärbar: Die angewandte Regel steht bei der Aktivität. GRYD hat noch keinen Einspruchskanal in der App — der einzige veröffentlichte Kontakt ist die Postanschrift des Sitzes im Impressum.',
    pt: 'Toda decisão de verificação é explicável: a regra aplicada aparece junto da atividade. O GRYD ainda não tem canal de contestação no app — o único ponto de contato publicado é o endereço postal da sede, no Aviso legal.',
  },

  // ── Code de conduite ──
  conduiteTitle: {
    fr: 'Code de conduite',
    en: 'Code of conduct',
    es: 'Código de conducta',
    de: 'Verhaltenskodex',
    pt: 'Código de conduta',
  },
  conduiteKicker: {
    fr: 'COMMUNAUTÉ',
    en: 'COMMUNITY',
    es: 'COMUNIDAD',
    de: 'COMMUNITY',
    pt: 'COMUNIDADE',
  },
  /**
   * ─── LES RÈGLES DE CONDUITE VALENT POUR TOUT LE MONDE, DONC POUR LES DEUX ──
   * Ce sous-titre, `respectTitle`/`respectBody` et `securiteBody` ne parlaient
   * qu'à des coureurs : « pousse à courir », « Respecte les autres coureurs »,
   * « Cours en respectant le code de la route ». Sur un texte de conduite, la
   * discipline nommée devient un périmètre : un cycliste pouvait lire qu'il
   * n'était pas concerné — y compris par la consigne de SÉCURITÉ. C'est le
   * pire endroit pour un mot trop étroit. Aucune règle n'est affaiblie ; leur
   * portée est simplement dite entière.
   */
  conduiteSubtitle: {
    fr: 'GRYD est un jeu qui pousse à se dépasser, pas à se rabaisser. Ces règles s’appliquent à tout le monde, tout le temps.',
    en: 'GRYD is a game that pushes you to go further, not to put anyone down. These rules apply to everyone, all the time.',
    es: 'GRYD es un juego que te empuja a superarte, no a menospreciar a nadie. Estas reglas se aplican a todo el mundo, todo el tiempo.',
    de: 'GRYD ist ein Spiel, das zum Übertreffen pusht, nicht zum Runtermachen. Diese Regeln gelten für alle, jederzeit.',
    pt: 'GRYD é um jogo que empurra você a se superar, não a diminuir ninguém. Estas regras valem para todo mundo, o tempo todo.',
  },
  secLesRegles: {
    fr: 'LES RÈGLES',
    en: 'THE RULES',
    es: 'LAS REGLAS',
    de: 'DIE REGELN',
    pt: 'AS REGRAS',
  },
  secModeration: {
    fr: 'MODÉRATION',
    en: 'MODERATION',
    es: 'MODERACIÓN',
    de: 'MODERATION',
    pt: 'MODERAÇÃO',
  },
  respectTitle: {
    fr: 'Respecte les autres joueurs',
    en: 'Respect other players',
    es: 'Respeta a los demás jugadores',
    de: 'Respektiere andere Spieler',
    pt: 'Respeite os outros jogadores',
  },
  respectBody: {
    fr: 'On se pousse à se dépasser, jamais à se rabaisser. Encouragements et fair-play, dans le crew comme face aux rivaux. Pas de moquerie, pas d’acharnement.',
    en: 'We push each other to go further, never to put each other down. Encouragement and fair play, in the crew and against rivals. No mocking, no pile-ons.',
    es: 'Nos empujamos a superarnos, nunca a menospreciarnos. Ánimo y juego limpio, en el crew y frente a los rivales. Sin burlas, sin ensañamiento.',
    de: 'Wir pushen uns zum Übertreffen, nie zum Runtermachen. Anfeuern und Fairplay, in der Crew wie gegen Rivalen. Kein Spott, kein Nachtreten.',
    pt: 'A gente se empurra para se superar, nunca para diminuir alguém. Incentivo e fair play, no crew e diante dos rivais. Sem zombaria, sem perseguição.',
  },
  zeroHaineTitle: {
    fr: 'Tolérance zéro : harcèlement et haine',
    en: 'Zero tolerance: harassment and hate',
    es: 'Tolerancia cero: acoso y odio',
    de: 'Null Toleranz: Belästigung und Hass',
    pt: 'Tolerância zero: assédio e ódio',
  },
  zeroHaineBody: {
    fr: 'Aucun racisme, sexisme, homophobie, menace, insulte ni harcèlement. Un seul message de ce type suffit à faire retirer le contenu et suspendre le compte.',
    en: 'No racism, sexism, homophobia, threats, insults or harassment. A single message of that kind is enough to remove the content and suspend the account.',
    es: 'Nada de racismo, sexismo, homofobia, amenazas, insultos ni acoso. Un solo mensaje de ese tipo basta para retirar el contenido y suspender la cuenta.',
    de: 'Kein Rassismus, Sexismus, keine Homophobie, Drohungen, Beleidigungen oder Belästigung. Eine einzige solche Nachricht genügt, um den Inhalt zu entfernen und das Konto zu sperren.',
    pt: 'Nada de racismo, sexismo, homofobia, ameaça, insulto ou assédio. Uma única mensagem desse tipo basta para remover o conteúdo e suspender a conta.',
  },
  pseudoCorrectTitle: {
    fr: 'Un pseudo et un crew corrects',
    en: 'A decent username and crew name',
    es: 'Un usuario y un crew correctos',
    de: 'Anständiger Name und Crew-Name',
    pt: 'Um usuário e um crew corretos',
  },
  pseudoCorrectBody: {
    fr: 'Le nom de ton crew et ton pseudo sont publics. Rien de haineux, sexuel ou trompeur : ils peuvent être modifiés ou masqués par la modération.',
    en: 'Your crew name and username are public. Nothing hateful, sexual or misleading: moderation can change or hide them.',
    es: 'El nombre de tu crew y tu usuario son públicos. Nada de odio, contenido sexual o engañoso: la moderación puede modificarlos u ocultarlos.',
    de: 'Dein Crew-Name und dein Nutzername sind öffentlich. Nichts Hasserfülltes, Sexuelles oder Irreführendes: Die Moderation kann sie ändern oder verbergen.',
    pt: 'O nome do seu crew e seu usuário são públicos. Nada de ódio, conteúdo sexual ou enganoso: a moderação pode alterá-los ou ocultá-los.',
  },
  noSpamTitle: {
    fr: 'Pas de spam ni d’arnaque',
    en: 'No spam or scams',
    es: 'Sin spam ni estafas',
    de: 'Kein Spam, kein Betrug',
    pt: 'Sem spam nem golpe',
  },
  /**
   * Ouvrait sur « Le chat crew sert à jouer et se coordonner ». Il n'y a ni
   * route, ni onglet, ni écran de chat dans GRYD (le chat libre est refusé,
   * A-43 §9). La règle vise ce qui existe : le pseudo et le nom de crew, les
   * seuls contenus que l'on écrit et que d'autres lisent.
   */
  noSpamBody: {
    fr: 'Ton pseudo et le nom de ton crew sont les seuls textes que d’autres joueurs lisent. Pas de publicité, pas de lien, pas de sollicitation d’argent.',
    en: 'Your username and your crew name are the only texts other players read. No ads, no links, no asking for money.',
    es: 'Tu usuario y el nombre de tu crew son los únicos textos que leen otros jugadores. Sin publicidad, sin enlaces, sin pedir dinero.',
    de: 'Dein Nutzername und dein Crew-Name sind die einzigen Texte, die andere lesen. Keine Werbung, keine Links, keine Geldforderungen.',
    pt: 'Seu usuário e o nome do seu crew são os únicos textos que outros jogadores leem. Sem publicidade, sem links, sem pedir dinheiro.',
  },
  securiteTitle: {
    fr: 'La sécurité passe avant le jeu',
    en: 'Safety comes before the game',
    es: 'La seguridad va antes que el juego',
    de: 'Sicherheit geht vor Spiel',
    pt: 'A segurança vem antes do jogo',
  },
  /** Consigne de SÉCURITÉ : elle doit atteindre le cycliste, qui partage la
   *  chaussée avec les voitures — la nommer « Cours » l'en excluait. */
  securiteBody: {
    fr: 'Respecte le code de la route et les lieux privés, à pied comme à vélo. Aucune zone ne vaut de se mettre, ni de mettre quelqu’un, en danger.',
    en: 'Respect traffic rules and private property, on foot as on a bike. No zone is worth putting yourself — or anyone — in danger.',
    es: 'Respeta las normas de tráfico y los lugares privados, a pie o en bici. Ninguna zona vale ponerte en peligro, ni poner a nadie.',
    de: 'Halte dich an Verkehrsregeln und Privatgelände, zu Fuß wie auf dem Rad. Keine Zone ist es wert, dich oder andere in Gefahr zu bringen.',
    pt: 'Respeite as leis de trânsito e os lugares privados, a pé ou de bike. Nenhuma zona vale se colocar, ou colocar alguém, em perigo.',
  },
  reportEnfTitle: {
    fr: 'Signale ce qui te choque',
    en: 'Report what crosses the line',
    es: 'Reporta lo que te parezca grave',
    de: 'Melde, was dich stört',
    pt: 'Denuncie o que te chocar',
  },
  /**
   * Décrivait « appui long ou menu "Signaler" » SUR UN MESSAGE — un geste
   * impossible dans une app sans messagerie. Le signalement réel existe, mais
   * il porte sur un joueur, depuis Confidentialité, et il exige un compte
   * (`crew/moderation.ts` n'écrit dans `content_reports` que sous session).
   */
  /**
   * Décrivait le SEUL chemin qui existait alors : retaper à la main, dans
   * Confidentialité, un pseudo qui est un identifiant machine. Le geste au
   * contact du joueur existe désormais (« … » sur sa ligne), et c'est lui qu'on
   * nomme en premier — la copie suit le code, jamais l'inverse.
   */
  reportEnfBody: {
    fr: 'Sur la ligne d’un joueur — dans ton crew ou au classement — touche « … », puis Signaler et choisis un motif. Il faut un compte pour que le signalement parte. Une personne examine chaque signalement enregistré.',
    en: 'On a player’s row — in your crew or the leaderboard — tap “…”, then Report and pick a reason. An account is required for the report to be sent. A person reviews every recorded report.',
    es: 'En la fila de un jugador — en tu crew o en la clasificación — toca «…», luego Denunciar y elige un motivo. Hace falta una cuenta para que el reporte se envíe. Una persona revisa cada reporte registrado.',
    de: 'Tippe in der Zeile eines Spielers — im Crew oder in der Rangliste — auf „…“, dann Melden und wähl einen Grund. Für den Versand ist ein Konto nötig. Ein Mensch prüft jede gespeicherte Meldung.',
    pt: 'Na linha de um jogador — no seu crew ou no ranking — toque em “…”, depois Denunciar e escolha um motivo. É preciso ter conta para a denúncia sair. Uma pessoa analisa cada denúncia registrada.',
  },
  blockEnfTitle: {
    fr: 'Bloque qui tu ne veux plus voir',
    en: 'Block whoever you don’t want to see',
    es: 'Bloquea a quien no quieras ver',
    de: 'Blockiere, wen du nicht sehen willst',
    pt: 'Bloqueie quem você não quer ver',
  },
  /**
   * Promettait de « masquer tous ses messages » — il n'y a pas de messages —
   * puis « partout où GRYD l'afficherait », ce qui restait plus large que le
   * geste réel. Ce que `blockMember` fait, depuis que le prédicat est consommé
   * par les deux surfaces : le pseudo devient « Joueur bloqué » sur le roster
   * de crew et au classement, sans compte requis (le filtrage est local).
   */
  blockEnfBody: {
    fr: 'Bloquer remplace son pseudo par « Joueur bloqué » dans ton crew et au classement, tout de suite et sans le prévenir. Ça marche même sans compte, et tu peux débloquer quand tu veux.',
    en: 'Blocking replaces their name with “Blocked player” in your crew and the leaderboard, right away and without notifying them. It works even without an account, and you can unblock anytime.',
    es: 'Bloquear sustituye su usuario por «Jugador bloqueado» en tu crew y en la clasificación, al instante y sin avisarle. Funciona incluso sin cuenta, y puedes desbloquear cuando quieras.',
    de: 'Blockieren ersetzt seinen Namen in deinem Crew und der Rangliste sofort durch „Blockierter Spieler“, ohne Benachrichtigung. Es geht auch ohne Konto, und du kannst jederzeit entsperren.',
    pt: 'Bloquear troca o nome dele por “Jogador bloqueado” no seu crew e no ranking, na hora e sem avisá-lo. Funciona até sem conta, e você pode desbloquear quando quiser.',
  },
  sanctionsTitle: {
    fr: 'Ce qu’on fait des abus',
    en: 'What we do about abuse',
    es: 'Qué hacemos con los abusos',
    de: 'Was mit Verstößen passiert',
    pt: 'O que fazemos com abusos',
  },
  sanctionsBody: {
    fr: 'Contenu retiré, avertissement, puis suspension du compte en cas de récidive ou de gravité. Les décisions sont prises par une personne, jamais automatiquement.',
    en: 'Content removed, a warning, then account suspension for repeat or serious offenses. Decisions are made by a person, never automatically.',
    es: 'Contenido retirado, advertencia y luego suspensión de la cuenta si hay reincidencia o gravedad. Las decisiones las toma una persona, nunca automáticamente.',
    de: 'Inhalt entfernt, Verwarnung, dann Kontosperre bei Wiederholung oder Schwere. Entscheidungen trifft ein Mensch, nie ein Automat.',
    pt: 'Conteúdo removido, advertência e depois suspensão da conta em caso de reincidência ou gravidade. As decisões são tomadas por uma pessoa, nunca automaticamente.',
  },
  conduiteActionCta: {
    fr: 'Signaler ou bloquer un joueur',
    en: 'Report or block a player',
    es: 'Reportar o bloquear a un jugador',
    de: 'Spieler melden oder blockieren',
    pt: 'Denunciar ou bloquear um jogador',
  },
  /** Le chemin le plus court d'abord : « … » sur la ligne du joueur. */
  conduiteActionDetail: {
    fr: '« … » sur sa ligne, ou depuis Confidentialité',
    en: '“…” on their row, or from Privacy',
    es: '«…» en su fila, o desde Privacidad',
    de: '„…“ in seiner Zeile, oder über Privatsphäre',
    pt: '“…” na linha dele, ou em Privacidade',
  },

  conduiteFootnote: {
    fr: 'En jouant à GRYD, tu acceptes ce code de conduite. Le contenu haineux ou de harcèlement n’a pas sa place ici — une personne examine chaque signalement enregistré.',
    en: 'By playing GRYD, you accept this code of conduct. Hateful or harassing content has no place here — a person reviews every recorded report.',
    es: 'Al jugar a GRYD aceptas este código de conducta. El contenido de odio o acoso no tiene cabida aquí — una persona revisa cada reporte registrado.',
    de: 'Wenn du GRYD spielst, akzeptierst du diesen Verhaltenskodex. Hass oder Belästigung haben hier keinen Platz — ein Mensch prüft jede gespeicherte Meldung.',
    pt: 'Ao jogar GRYD, você aceita este código de conduta. Conteúdo de ódio ou assédio não tem lugar aqui — uma pessoa analisa cada denúncia registrada.',
  },

  // ══════════════════ ÉTATS VIDES HONNÊTES (21/07/2026) ══════════════════
  //
  // Le mode vitrine est ABANDONNÉ (EXPO_PUBLIC_SHOWCASE supprimé), donc le
  // natif ET localhost affichent le VRAI produit. Les Paramètres montraient
  // jusqu'ici l'identité et le crew du persona démo (« KORO », « LES FOULÉES
  // 9³ ») à un utilisateur qui n'a ni compte ni crew. Ces textes remplacent
  // ces affirmations par la vérité — et, quand il y a une action, UNE seule.
  //
  // Trois situations DISTINCTES, trois copies : pas connecté ≠ connecté sans
  // rien à montrer ≠ lecture ratée. Les confondre, c'est mentir à deux tiers
  // des joueurs.

  /** Valeur d'une ligne d'identité quand aucune session réelle n'existe. */
  identityNone: {
    fr: 'Non connecté',
    en: 'Not signed in',
    es: 'Sin conectar',
    de: 'Nicht angemeldet',
    pt: 'Não conectado',
  },
  identitySignInLabel: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Conectarse',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  identitySignInDetail: {
    fr: 'Ton profil et ton crew te suivront partout',
    en: 'Your profile and crew follow you everywhere',
    es: 'Tu perfil y tu crew te siguen a todas partes',
    de: 'Profil und Crew begleiten dich überall',
    pt: 'Seu perfil e seu crew acompanham você',
  },
  /** Build sans backend configuré : se connecter est IMPOSSIBLE, on le dit. */
  identityNoBackend: {
    fr: 'Ce build tourne sans compte : rien n’est envoyé ni enregistré ailleurs que sur ce téléphone.',
    en: 'This build runs without an account: nothing is sent or stored anywhere but on this phone.',
    es: 'Esta versión funciona sin cuenta: nada se envía ni se guarda fuera de este teléfono.',
    de: 'Dieser Build läuft ohne Konto: Nichts verlässt dieses Telefon.',
    pt: 'Esta versão funciona sem conta: nada é enviado nem guardado fora deste telefone.',
  },

  // ── Sous-page Crew : les 4 états réels (chargement / hors ligne / sans crew / échec) ──
  crewLoading: {
    fr: 'Lecture de ton crew…',
    en: 'Loading your crew…',
    es: 'Cargando tu crew…',
    de: 'Crew wird geladen…',
    pt: 'Carregando seu crew…',
  },
  crewSignedOutBody: {
    fr: 'Connecte-toi pour retrouver ton crew et ses réglages.',
    en: 'Sign in to find your crew and its settings.',
    es: 'Conéctate para recuperar tu crew y sus ajustes.',
    de: 'Melde dich an, um Crew und Einstellungen zu sehen.',
    pt: 'Entre para ver seu crew e suas configurações.',
  },
  crewNoneTitle: {
    fr: 'Tu n’es dans aucun crew',
    en: 'You’re not in a crew yet',
    es: 'Aún no estás en ningún crew',
    de: 'Du bist noch in keiner Crew',
    pt: 'Você ainda não está em um crew',
  },
  crewNoneBody: {
    fr: 'Fonde le tien ou rejoins-en un avec un code. Les réglages ci-dessous s’activeront à ce moment-là.',
    en: 'Start yours or join one with a code. The settings below unlock then.',
    es: 'Funda el tuyo o únete con un código. Los ajustes de abajo se activan entonces.',
    de: 'Gründe eine oder tritt mit einem Code bei. Danach greifen die Einstellungen unten.',
    pt: 'Crie o seu ou entre com um código. As configurações abaixo abrem então.',
  },
  crewNoneCta: {
    fr: 'Trouver un crew',
    en: 'Find a crew',
    es: 'Buscar un crew',
    de: 'Crew finden',
    pt: 'Encontrar um crew',
  },
  crewLoadFailedTitle: {
    fr: 'Impossible de lire ton crew',
    en: 'Couldn’t load your crew',
    es: 'No se pudo cargar tu crew',
    de: 'Crew konnte nicht geladen werden',
    pt: 'Não deu para carregar seu crew',
  },
  crewLoadFailedBody: {
    fr: 'On ne sait pas si tu en as un — on préfère le dire plutôt que d’inventer.',
    en: 'We don’t know whether you have one — better to say so than to guess.',
    es: 'No sabemos si tienes uno — preferimos decirlo a inventarlo.',
    de: 'Wir wissen nicht, ob du eine hast — lieber ehrlich als geraten.',
    pt: 'Não sabemos se você tem um — melhor dizer do que inventar.',
  },
  crewRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  /** Le vrai flux « quitter » vit dans l'écran Crew (RPC leave_crew, déjà câblée). */
  leaveCrewDetailReal: {
    fr: 'Depuis l’écran Crew',
    en: 'From the Crew screen',
    es: 'Desde la pantalla Crew',
    de: 'Über den Crew-Screen',
    pt: 'Pela tela Crew',
  },

  // ── Sous-page Avancé : valeurs génériques (les nombres viennent de game-rules) ──
  valueHours: {
    fr: '{n} h',
    en: '{n} h',
    es: '{n} h',
    de: '{n} Std.',
    pt: '{n} h',
  },
  valueMeters: {
    fr: '{n} m',
    en: '{n} m',
    es: '{n} m',
    de: '{n} m',
    pt: '{n} m',
  },
  contributionMinBoth: {
    fr: '{m} m ou {pct} %',
    en: '{m} m or {pct}%',
    es: '{m} m o {pct} %',
    de: '{m} m oder {pct} %',
    pt: '{m} m ou {pct} %',
  },
});
