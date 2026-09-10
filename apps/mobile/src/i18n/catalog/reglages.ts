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
  /*
   * `langueDetail` (« Français, English, Español… ») A ÉTÉ SUPPRIMÉE le
   * 10/09/2026, pour DEUX raisons qui se rejoignent. Elle promettait cinq
   * langues alors que le sélecteur n'en propose plus que deux (le domaine
   * « refonte » n'écrit pas ses textes dans un catalogue et ne connaît que
   * fr/en — `useRefonteCopy`). Et surtout plus rien ne la peignait : son
   * dernier lecteur était le catalogue `SETTINGS_GROUPS`, retiré le même jour ;
   * `app/parametres.tsx` écrit sa ligne « Langue » sans sous-titre. Corriger un
   * texte que personne n'affiche aurait fait une vraie phrase pour un écran
   * imaginaire. Si une ligne de réglages redevient bavarde, elle repartira du
   * fait vrai : deux langues, et `langueOnlyTwo` dit pourquoi.
   */
  langueSelected: {
    fr: 'Langue actuelle',
    en: 'Current language',
    es: 'Idioma actual',
    de: 'Aktuelle Sprache',
    pt: 'Idioma atual',
  },
  /**
   * L'ABSENCE, DITE. Sans cette phrase, une liste à deux lignes se lit
   * « GRYD ne parle que deux langues » — alors que le vrai fait est
   * « GRYD ne parle complètement que deux langues, pour l'instant ».
   */
  langueOnlyTwo: {
    fr: 'GRYD ne propose que les langues qu’il parle jusqu’au bout. L’espagnol, l’allemand et le portugais sont écrits dans une partie de l’app seulement : les proposer te ferait lire du français sans prévenir. Ils reviendront ici quand tout l’écran sera traduit.',
    en: 'GRYD only offers the languages it speaks all the way through. Spanish, German and Portuguese are written in part of the app only: offering them would have you reading French without warning. They will come back here once every screen is translated.',
    es: 'GRYD solo ofrece los idiomas que habla de principio a fin. El español, el alemán y el portugués están escritos solo en parte de la app: ofrecerlos te haría leer francés sin avisar. Volverán aquí cuando todas las pantallas estén traducidas.',
    de: 'GRYD bietet nur Sprachen an, die es durchgängig spricht. Spanisch, Deutsch und Portugiesisch sind nur in einem Teil der App geschrieben: sie anzubieten hieße, dich ohne Vorwarnung Französisch lesen zu lassen. Sie kehren zurück, sobald jeder Bildschirm übersetzt ist.',
    pt: 'O GRYD só oferece os idiomas que fala até o fim. Espanhol, alemão e português estão escritos apenas em parte do app: oferecê-los faria você ler francês sem aviso. Eles voltam aqui quando todas as telas estiverem traduzidas.',
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
  // ══════════════════════════════════════════════════════════════════════════
  // E78 — APPAREILS (spec produit l.2373). Ce bloc DIT une absence et OFFRE une
  // action, dans cet ordre, parce que c'est l'ordre du vrai :
  //  · le client Supabase Auth ne sait pas énumérer les sessions d'un compte —
  //    aucune liste d'appareils ne peut être affichée sans être inventée ;
  //  · il sait en revanche les RÉVOQUER (`signOut({ scope: 'others' })`,
  //    cf. `lib/auth.ts`) — c'est un appel serveur, pas un réglage local.
  // Les libellés ne nomment donc jamais un appareil, jamais un lieu, jamais une
  // date de connexion : rien de tout cela n'est lisible.
  // ══════════════════════════════════════════════════════════════════════════
  secAppareils: {
    fr: 'APPAREILS',
    en: 'DEVICES',
    es: 'DISPOSITIVOS',
    de: 'GERÄTE',
    pt: 'DISPOSITIVOS',
  },
  otherDevicesLabel: {
    fr: 'Déconnecter les autres appareils',
    en: 'Sign out other devices',
    es: 'Cerrar sesión en los otros dispositivos',
    de: 'Andere Geräte abmelden',
    pt: 'Desconectar os outros dispositivos',
  },
  otherDevicesDetail: {
    fr: 'Coupe l’accès à ton compte sur tous les autres téléphones et navigateurs. Celui-ci reste connecté.',
    en: 'Cuts off account access on every other phone and browser. This one stays signed in.',
    es: 'Corta el acceso a tu cuenta en los demás teléfonos y navegadores. Este sigue conectado.',
    de: 'Sperrt den Kontozugriff auf allen anderen Telefonen und Browsern. Dieses bleibt angemeldet.',
    pt: 'Corta o acesso à sua conta em todos os outros telefones e navegadores. Este continua conectado.',
  },
  otherDevicesBusy: {
    fr: 'Déconnexion des autres appareils…',
    en: 'Signing out other devices…',
    es: 'Cerrando sesión en los otros dispositivos…',
    de: 'Andere Geräte werden abgemeldet…',
    pt: 'Desconectando os outros dispositivos…',
  },
  otherDevicesDone: {
    fr: 'C’est fait : toutes les autres sessions ont été coupées. Tu peux recommencer si besoin.',
    en: 'Done: every other session has been cut off. You can do it again if needed.',
    es: 'Hecho: todas las demás sesiones se han cerrado. Puedes repetirlo si hace falta.',
    de: 'Erledigt: Alle anderen Sitzungen wurden beendet. Du kannst es bei Bedarf wiederholen.',
    pt: 'Pronto: todas as outras sessões foram encerradas. Você pode repetir se precisar.',
  },
  otherDevicesFailed: {
    fr: 'La déconnexion n’a pas abouti : rien n’a été coupé. Vérifie ta connexion et réessaie.',
    en: 'Sign-out didn’t go through — nothing was cut off. Check your connection and try again.',
    es: 'El cierre de sesión no se completó: no se cortó nada. Revisa tu conexión e inténtalo otra vez.',
    de: 'Die Abmeldung ist fehlgeschlagen — nichts wurde beendet. Prüfe deine Verbindung und versuch es erneut.',
    pt: 'A desconexão não foi concluída — nada foi encerrado. Verifique sua conexão e tente de novo.',
  },
  otherDevicesSignedOut: {
    fr: 'Aucun compte n’est ouvert sur ce téléphone : il n’y a aucune autre session à couper.',
    en: 'No account is open on this phone: there’s no other session to cut off.',
    es: 'No hay ninguna cuenta abierta en este teléfono: no hay otra sesión que cerrar.',
    de: 'Auf diesem Telefon ist kein Konto geöffnet: Es gibt keine andere Sitzung zu beenden.',
    pt: 'Nenhuma conta está aberta neste telefone: não há outra sessão para encerrar.',
  },
  otherDevicesNoBackend: {
    fr: 'Ce build tourne sans compte : il n’existe aucune session à révoquer.',
    en: 'This build runs without an account: there’s no session to revoke.',
    es: 'Esta versión funciona sin cuenta: no hay ninguna sesión que revocar.',
    de: 'Dieser Build läuft ohne Konto: Es gibt keine Sitzung zu widerrufen.',
    pt: 'Esta versão funciona sem conta: não existe nenhuma sessão para revogar.',
  },
  /**
   * L'ABSENCE, NOMMÉE. Sans cette phrase, un joueur pourrait croire que GRYD
   * garde une liste d'appareils et refuse de la montrer. C'est l'inverse : elle
   * n'est pas lisible par l'app.
   */
  otherDevicesNoListNote: {
    fr: 'GRYD ne peut pas te montrer la liste de tes appareils : le service qui gère les connexions ne communique à l’app que la session de CE téléphone, ni les autres, ni leur modèle, ni leur dernière activité. Plutôt qu’une liste inventée, il n’y a qu’une action, et elle est réelle.',
    en: 'GRYD can’t show you a list of your devices: the sign-in service only tells the app about THIS phone’s session — not the others, not their model, not their last activity. Rather than an invented list, there’s just one action, and it’s real.',
    es: 'GRYD no puede mostrarte la lista de tus dispositivos: el servicio de acceso solo le comunica a la app la sesión de ESTE teléfono, no las demás, ni su modelo, ni su última actividad. En vez de una lista inventada, hay una sola acción, y es real.',
    de: 'GRYD kann dir keine Geräteliste zeigen: Der Login-Dienst meldet der App nur die Sitzung DIESES Telefons — nicht die anderen, nicht deren Modell, nicht deren letzte Aktivität. Statt einer erfundenen Liste gibt es nur eine Aktion, und die ist echt.',
    pt: 'O GRYD não pode mostrar a lista dos seus dispositivos: o serviço de login informa ao app apenas a sessão DESTE telefone — não as outras, nem o modelo, nem a última atividade. Em vez de uma lista inventada, existe só uma ação, e ela é real.',
  },
  /** Renvoi vers le Hub des sources : l'autre moitié de E78 (les CONNEXIONS). */
  otherDevicesSourcesHint: {
    fr: 'Les applications et montres reliées à ton compte se règlent dans Sources connectées.',
    en: 'Apps and watches linked to your account are managed in Connected sources.',
    es: 'Las apps y relojes vinculados a tu cuenta se gestionan en Fuentes conectadas.',
    de: 'Mit deinem Konto verbundene Apps und Uhren verwaltest du unter Verbundene Quellen.',
    pt: 'Os apps e relógios ligados à sua conta são gerenciados em Fontes conectadas.',
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
    fr: 'Ces choix appartiennent à ton compte',
    en: 'These choices belong to your account',
    es: 'Estas opciones pertenecen a tu cuenta',
    de: 'Diese Auswahl gehört zu deinem Konto',
    // « escolhas » (nom pluriel) déclenche le détecteur de subjonctif 2ᵉ pers.
    // du registre PT (registre.test.ts). Le nom « ajustes » dit la même chose
    // sans faux positif — corriger le texte vaut mieux qu'inscrire une exception.
    pt: 'Estes ajustes pertencem à sua conta',
  },
  notifSignedOutBody: {
    fr: 'Voici ce que GRYD peut t’envoyer, et les valeurs par défaut. Tes réglages sont gardés avec ton compte, pas sur ce téléphone : ils te suivent d’un appareil à l’autre.',
    en: 'Here is what GRYD can send you, and the default values. Your settings are kept with your account, not on this phone: they follow you from one device to another.',
    es: 'Esto es lo que GRYD puede enviarte, y los valores por defecto. Tus ajustes se guardan con tu cuenta, no en este teléfono: te acompañan de un dispositivo a otro.',
    de: 'Das kann GRYD dir senden, mit den Standardwerten. Deine Einstellungen liegen bei deinem Konto, nicht auf diesem Handy: Sie folgen dir von Gerät zu Gerät.',
    pt: 'Isto é o que o GRYD pode te enviar, e os valores padrão. Seus ajustes ficam com a sua conta, não neste telefone: eles te acompanham de um aparelho a outro.',
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
    fr: "Depuis l'app · irréversible, c'est ton droit",
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
    fr: 'Adhésions, mentions, annonces',
    en: 'Memberships, mentions, announcements',
    es: 'Altas, menciones, anuncios',
    de: 'Beitritte, Erwähnungen, Ankündigungen',
    pt: 'Entradas, menções, anúncios',
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
    fr: 'Pas encore activées sur ce téléphone',
    en: 'Not on yet on this phone',
    es: 'Aún no activadas en este teléfono',
    de: 'Auf diesem Handy noch nicht aktiv',
    pt: 'Ainda não ativadas neste telefone',
  },
  pushRegistered: {
    fr: 'Activées sur cet appareil. Touche pour les couper',
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
    fr: 'Refusées pour GRYD dans les réglages du téléphone. Tu peux les réautoriser là-bas',
    en: 'Denied for GRYD in your phone settings — you can allow them again there',
    es: 'Denegadas para GRYD en los ajustes del teléfono — puedes permitirlas de nuevo allí',
    de: 'In den Handy-Einstellungen für GRYD abgelehnt — du kannst sie dort wieder erlauben',
    pt: 'Negadas para o GRYD nos ajustes do telefone — você pode permitir de novo lá',
  },
  pushUnsupported: {
    fr: 'Indisponible dans le navigateur : depuis l’app installée uniquement',
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
    fr: 'Cette version ne peut pas recevoir de message envoyé à distance. Rien à faire de ton côté',
    en: 'This version can’t receive messages sent remotely — nothing for you to do',
    es: 'Esta versión no puede recibir mensajes enviados a distancia — no tienes que hacer nada',
    de: 'Diese Version kann keine aus der Ferne gesendeten Nachrichten empfangen — du musst nichts tun',
    pt: 'Esta versão não pode receber mensagens enviadas à distância — nada a fazer da sua parte',
  },
  pushNotConfigured: {
    fr: 'Connecte-toi pour recevoir les alertes de tes zones',
    en: 'Sign in to get alerts about your zones',
    es: 'Inicia sesión para recibir avisos de tus zonas',
    de: 'Melde dich an, um Hinweise zu deinen Zonen zu bekommen',
    pt: 'Entre na conta para receber avisos das suas zonas',
  },
  pushError: {
    fr: 'Impossible d’enregistrer cet appareil pour l’instant. Réessaie plus tard',
    en: 'Couldn’t register this device right now — try again later',
    es: 'No se pudo registrar este dispositivo ahora — inténtalo más tarde',
    de: 'Gerät konnte gerade nicht registriert werden — versuch es später',
    pt: 'Não deu para registrar este aparelho agora — tente mais tarde',
  },
  // ── §14.1 : LA MATRICE DE RÉGLAGES DU CAHIER ────────────────────────────
  //
  // CE QUI A ÉTÉ RETIRÉ LE 10/09/2026, ET POURQUOI. Deux interrupteurs vivaient
  // ici — « Défense · ton territoire qui va s'effacer bientôt » et « Rivalité ·
  // zones prises par un rival ». Le cahier a aboli les deux mécaniques : §5.3
  // (« ni bouclier, ni contestation de 18 heures, ni défense achetable ») et
  // §14.2 (« une reprise de terrain par un rival alimente le journal du jeu et
  // le résumé choisi, PAS une alarme immédiate »). Un réglage qui décrit un jeu
  // disparu est pire qu'un réglage mort : il enseigne de fausses règles.
  //
  // Les six catégories ci-dessous sont celles de §14.1, dans son ordre. Les
  // nombres (plage calme, budget) ne sont JAMAIS écrits dans une chaîne : ils
  // sont interpolés depuis `NOTIFICATION_RULES_2026`.
  notifSportTitle: {
    fr: 'Sport',
    en: 'Sport',
    es: 'Deporte',
    de: 'Sport',
    pt: 'Esporte',
  },
  notifSportSubtitle: {
    fr: 'Ce que tu as demandé autour de tes sorties. Jamais un ordre de sortir.',
    en: 'What you asked for around your activities. Never an order to go out.',
    es: 'Lo que pediste en torno a tus actividades. Nunca una orden de salir.',
    de: 'Was du rund um deine Aktivitäten angefragt hast. Nie eine Aufforderung.',
    pt: 'O que você pediu sobre suas atividades. Nunca uma ordem de sair.',
  },
  notifCrewTitle: {
    fr: 'Crew',
    en: 'Crew',
    es: 'Crew',
    de: 'Crew',
    pt: 'Crew',
  },
  notifCrewSubtitle: {
    fr: 'Adhésion acceptée, mention qui t’attend, annonce de ton crew.',
    en: 'Membership accepted, a mention waiting for you, your crew’s announcements.',
    es: 'Alta aceptada, una mención que te espera, anuncios de tu crew.',
    de: 'Beitritt angenommen, eine Erwähnung wartet, Ankündigungen deiner Crew.',
    pt: 'Entrada aceita, uma menção esperando, anúncios do seu crew.',
  },
  notifEventsTitle: {
    fr: 'Événements suivis',
    en: 'Events you follow',
    es: 'Eventos que sigues',
    de: 'Verfolgte Termine',
    pt: 'Eventos que você segue',
  },
  notifEventsSubtitle: {
    fr: 'Le rappel que tu as choisi, et les changements ou annulations de ce à quoi tu es inscrit.',
    en: 'The reminder you chose, plus changes or cancellations for what you signed up to.',
    es: 'El recordatorio que elegiste, y los cambios o cancelaciones de lo que te apuntaste.',
    de: 'Die Erinnerung, die du gewählt hast, sowie Änderungen oder Absagen deiner Anmeldungen.',
    pt: 'O lembrete que você escolheu, e mudanças ou cancelamentos do que você marcou.',
  },
  notifResultsTitle: {
    fr: 'Résultats',
    en: 'Results',
    es: 'Resultados',
    de: 'Ergebnisse',
    pt: 'Resultados',
  },
  notifResultsSubtitle: {
    fr: 'Quand l’analyse d’une sortie est prête, et le résultat d’un défi terminé.',
    en: 'When an activity’s analysis is ready, and the result of a finished challenge.',
    es: 'Cuando el análisis de una actividad está listo, y el resultado de un reto terminado.',
    de: 'Wenn die Auswertung einer Aktivität fertig ist, und das Ergebnis eines beendeten Duells.',
    pt: 'Quando a análise de uma atividade fica pronta, e o resultado de um desafio encerrado.',
  },
  notifWeeklyTitle: {
    fr: 'Résumé hebdomadaire',
    en: 'Weekly recap',
    es: 'Resumen semanal',
    de: 'Wochenrückblick',
    pt: 'Resumo semanal',
  },
  notifWeeklySubtitle: {
    fr: 'Ta semaine, une fois. Rien du tout s’il n’y a rien à raconter.',
    en: 'Your week, once. Nothing at all if there is nothing to tell.',
    es: 'Tu semana, una vez. Nada si no hay nada que contar.',
    de: 'Deine Woche, einmal. Gar nichts, wenn es nichts zu erzählen gibt.',
    pt: 'Sua semana, uma vez. Nada se não houver nada para contar.',
  },
  notifOffersTitle: {
    fr: 'Nouveautés et offres',
    en: 'News and offers',
    es: 'Novedades y ofertas',
    de: 'Neuheiten und Angebote',
    pt: 'Novidades e ofertas',
  },
  // « Désactivé par défaut » vivait ICI et se répétait dans la colonne de valeur
  // de la vue invité — deux fois la même phrase sur une seule ligne. Le défaut
  // est porté par l'interrupteur (ou par la valeur en lecture) ; le sous-libellé
  // dit ce que le défaut ne dit pas : le plafond, et l'absence de pression.
  notifOffersSubtitle: {
    fr: 'Deux par mois au maximum, jamais d’urgence inventée.',
    en: 'Two a month at most, never a made-up urgency.',
    es: 'Dos al mes como máximo, nunca una urgencia inventada.',
    de: 'Höchstens zwei pro Monat, nie eine erfundene Dringlichkeit.',
    pt: 'No máximo duas por mês, nunca uma urgência inventada.',
  },
  secQuandTuLeRecois: {
    fr: 'QUAND',
    en: 'WHEN',
    es: 'CUÁNDO',
    de: 'WANN',
    pt: 'QUANDO',
  },
  notifGamePauseTitle: {
    fr: 'Pause du jeu',
    en: 'Pause the game',
    es: 'Pausa del juego',
    de: 'Spielpause',
    pt: 'Pausar o jogo',
  },
  notifGamePauseSubtitle: {
    fr: 'Coupe les relances. Ton crew, tes événements suivis et tes résultats continuent d’arriver.',
    en: 'Stops the nudges. Your crew, the events you follow and your results keep coming.',
    es: 'Corta los recordatorios. Tu crew, los eventos que sigues y tus resultados siguen llegando.',
    de: 'Schaltet die Anstöße ab. Deine Crew, verfolgte Termine und Ergebnisse kommen weiter.',
    pt: 'Corta os lembretes. Seu crew, os eventos que você segue e seus resultados continuam.',
  },
  // Plage calme et budget INTERPOLÉS depuis `NOTIFICATION_RULES_2026` : aucun
  // nombre de politique ne vit dans une chaîne.
  notifBudgetNote: {
    fr: 'Rien entre {start} h et {end} h. Au plus {week} messages non essentiels par semaine, et {day} par jour. Ce qui touche à ton compte ou à un événement annulé passe quand même, sans vente ajoutée.',
    en: 'Nothing between {start}:00 and {end}:00. At most {week} non-essential messages a week, and {day} a day. Anything about your account or a cancelled event still goes through — with nothing to sell.',
    es: 'Nada entre las {start} h y las {end} h. Como máximo {week} mensajes no esenciales por semana, y {day} al día. Lo que afecta a tu cuenta o a un evento cancelado pasa igual — sin venta añadida.',
    de: 'Nichts zwischen {start} und {end} Uhr. Höchstens {week} nicht wesentliche Nachrichten pro Woche und {day} pro Tag. Was dein Konto oder einen abgesagten Termin betrifft, kommt trotzdem — ohne Verkauf.',
    pt: 'Nada entre {start} h e {end} h. No máximo {week} mensagens não essenciais por semana, e {day} por dia. O que envolve sua conta ou um evento cancelado passa mesmo assim — sem venda junto.',
  },
  /**
   * L'ÉTAT VRAI DE CE BUILD, VÉRIFIÉ LIGNE À LIGNE — pas une prudence de
   * rédaction. Deux faits, tous deux constatés dans le dépôt le 10/09/2026 :
   *  · le push DISTANT est impossible — `plugins/withoutPushEntitlement.js`
   *    retire `aps-environment` de chaque build iOS, aucun `google-services.json`
   *    n'existe pour Android, et aucune clé APNs n'a été déposée ;
   *  · les notifications LOCALES, elles, MARCHENT (`localReminder.ts`,
   *    `resultReadyNotice.ts`).
   *
   * ⚠ MISE À JOUR DU 10/09/2026 — CETTE NOTE DISAIT « AUCUNE NOTIFICATION ».
   * C'était vrai tant que `notifyResultReady` n'avait pas d'appelant. Le chemin
   * du résultat en a désormais un et un seul (`features/run/resultNotice2026.ts`,
   * appelé par `uploadOrQueue` quand `ingest_run` a répondu) : la première ligne
   * de la matrice §14.2 PART RÉELLEMENT depuis ce téléphone. Laisser « aucune
   * notification » aurait fait mentir l'écran dans l'autre sens — un joueur qui
   * vient d'en recevoir une lirait qu'il n'en reçoit pas.
   *
   * Le reste de la matrice, lui, n'a toujours aucun déclencheur (`RendezvousOptIn`
   * n'est monté nulle part), et le push DISTANT reste impossible. La note dit donc
   * les trois faits séparément, sans en promettre un quatrième.
   */
  notifLocalOnlyNote: {
    fr: 'Depuis ce téléphone, GRYD te prévient quand ton résultat est prêt. C’est le seul message branché pour l’instant : l’envoi à distance demande une configuration que nous n’avons pas, et les autres messages n’ont encore aucun déclencheur. Tes choix sont enregistrés avec ton compte et sont respectés dès le premier message.',
    en: 'From this phone, GRYD lets you know when your result is ready. That’s the only message wired so far: remote delivery needs a setup we don’t have, and the other messages have no trigger yet. Your choices are saved with your account and are respected from the very first message.',
    es: 'Desde este teléfono, GRYD te avisa cuando tu resultado está listo. Es el único mensaje conectado por ahora: el envío a distancia necesita una configuración que no tenemos, y los demás mensajes aún no tienen nada que los active. Tus elecciones se guardan con tu cuenta y se respetan desde el primer mensaje.',
    de: 'Von diesem Handy aus meldet GRYD dir, wenn dein Ergebnis da ist. Das ist bisher die einzige angeschlossene Mitteilung: Der Fernversand braucht eine Einrichtung, die wir nicht haben, und die übrigen Mitteilungen haben noch keinen Auslöser. Deine Auswahl wird bei deinem Konto gespeichert und ab der allerersten Nachricht beachtet.',
    pt: 'Deste telefone, o GRYD te avisa quando seu resultado está pronto. É a única mensagem ligada por enquanto: o envio a distância precisa de uma configuração que não temos, e as outras mensagens ainda não têm nada que as acione. Suas opções ficam guardadas na sua conta e são respeitadas desde a primeira mensagem.',
  },
  notifSaving: {
    fr: 'Enregistrement de ton choix…',
    en: 'Saving your choice…',
    es: 'Guardando tu elección…',
    de: 'Deine Auswahl wird gespeichert…',
    pt: 'Salvando sua escolha…',
  },
  notifSaveFailed: {
    fr: 'Ton choix n’a pas pu être enregistré : il a été remis comme avant. Réessaie.',
    en: 'Your choice couldn’t be saved — it was put back as it was. Try again.',
    es: 'No se pudo guardar tu elección — se dejó como estaba. Inténtalo otra vez.',
    de: 'Deine Auswahl konnte nicht gespeichert werden — sie steht wieder wie zuvor. Versuch es erneut.',
    pt: 'Não deu para salvar sua escolha — ela voltou como estava. Tente de novo.',
  },
  notifReadFailedTitle: {
    fr: 'Réglages illisibles',
    en: 'Settings unreadable',
    es: 'Ajustes ilegibles',
    de: 'Einstellungen nicht lesbar',
    pt: 'Ajustes ilegíveis',
  },
  notifReadFailedBody: {
    fr: 'Nous n’avons pas pu lire tes réglages. Ils existent peut-être : afficher des valeurs par défaut te montrerait un choix que tu n’as pas fait.',
    en: 'We couldn’t read your settings. They may well exist: showing defaults would show you a choice you never made.',
    es: 'No pudimos leer tus ajustes. Puede que existan: mostrar valores por defecto sería enseñarte una elección que no hiciste.',
    de: 'Wir konnten deine Einstellungen nicht lesen. Vielleicht gibt es sie: Standardwerte zu zeigen hieße, dir eine Auswahl zu zeigen, die du nie getroffen hast.',
    pt: 'Não conseguimos ler seus ajustes. Eles podem existir: mostrar valores padrão seria te mostrar uma escolha que você não fez.',
  },
  notifReadFailedCta: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  notifReading: {
    fr: 'Lecture de tes réglages…',
    en: 'Reading your settings…',
    es: 'Leyendo tus ajustes…',
    de: 'Deine Einstellungen werden gelesen…',
    pt: 'Lendo seus ajustes…',
  },
  // COURT VOLONTAIREMENT (§A, « textes jamais coupés » à 390 pt) : « Activé par
  // défaut » mangeait 40 % de la largeur et écrasait le sous-libellé sur trois
  // lignes. Le mot « défaut » est déjà porté, une seule fois, par l'état vide
  // juste au-dessus (« Voici ce que GRYD peut t'envoyer, et les valeurs par
  // défaut ») — le répéter six fois ne rendait pas la ligne plus vraie.
  notifDefaultOn: {
    fr: 'Activé',
    en: 'On',
    es: 'Activado',
    de: 'An',
    pt: 'Ativado',
  },
  notifDefaultOff: {
    fr: 'Désactivé',
    en: 'Off',
    es: 'Desactivado',
    de: 'Aus',
    pt: 'Desativado',
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
   * QUATRIÈME version, et la première qui ne mente plus (10/09/2026).
   * La v3 affirmait « GRYD n’expose ton profil ni tes sorties à aucun autre
   * joueur … ni profil public, ni fil d’activité ». C’était FAUX depuis le
   * backend 2026 : 0126 inscrit le nom et le crew du propriétaire sur les
   * territoires de la carte, 0124 ouvre le profil, le fil et les commentaires
   * du crew, 0127 la conversation du crew, et 0160-0164 classent la commune.
   * Ce sous-titre nomme donc les QUATRE expositions réelles, et dit lesquelles
   * les réglages ci-dessous gouvernent.
   * ⚠️ LA QUATRIÈME EST ARRIVÉE LE SOIR MÊME : la v4 en annonçait trois, écrite
   * quelques heures avant que le lot L ne publie « Ta commune, cette semaine »
   * (0160-0164). Un classement est une exposition de plein droit — un nom, un
   * rang, une surface, lus par les autres habitants de la commune — et la taire
   * en aurait fait une surprise.
   */
  privSubtitle: {
    fr: 'Quatre choses peuvent te rendre visible : ton nom et ton crew inscrits sur les territoires que tu tiens, ton profil ouvert à d’autres joueurs, ton rang dans le classement de ta commune, et ce que tu publies toi-même dans le fil et la conversation de ton crew. Les réglages ci-dessous gouvernent les trois premières. La quatrième ne part que si tu publies.',
    en: 'Four things can make you visible: your name and crew shown on the territories you hold, your profile opened to other players, your rank in your commune’s leaderboard, and whatever you publish yourself in your crew feed and conversation. The settings below govern the first three — the fourth only leaves if you publish.',
    es: 'Cuatro cosas pueden hacerte visible: tu nombre y tu crew inscritos en los territorios que mantienes, tu perfil abierto a otros jugadores, tu puesto en la clasificación de tu municipio, y lo que publicas tú mismo en el muro y la conversación de tu crew. Los ajustes de abajo gobiernan los tres primeros — el cuarto solo sale si publicas.',
    de: 'Vier Dinge können dich sichtbar machen: dein Name und deine Crew auf den Gebieten, die du hältst, dein für andere Spieler geöffnetes Profil, dein Rang in der Rangliste deiner Gemeinde, und was du selbst im Feed und in der Unterhaltung deiner Crew veröffentlichst. Die Einstellungen unten steuern die ersten drei — das Vierte geht nur weg, wenn du es veröffentlichst.',
    pt: 'Quatro coisas podem te tornar visível: seu nome e seu crew inscritos nos territórios que você mantém, seu perfil aberto a outros jogadores, sua posição na classificação do seu município, e o que você mesmo publica no feed e na conversa do seu crew. Os ajustes abaixo governam os três primeiros — o quarto só sai se você publicar.',
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
   * L'étendue RÉELLE du réglage de visibilité (réécrite le 10/09/2026).
   * L'ancienne phrase disait « ce choix … ne cache rien à personne aujourd'hui »
   * et « il ne suivra pas sur un autre appareil » : DEUX affirmations fausses
   * depuis 0126, qui lit `user_profiles.profile_visibility` pour décider si le
   * nom du propriétaire s'affiche sur un territoire, et depuis 0135, qui écrit
   * ce choix sur le COMPTE et non sur le téléphone.
   */
  visScopeNote: {
    fr: 'Ce choix part sur ton compte : le serveur l’applique et il te suit sur tous tes appareils. Il décide qui peut ouvrir ton profil, qui voit ton nom sur les territoires que tu tiens, et qui voit ton nom dans le classement de ta commune. C’est le même arbitre pour les trois.',
    en: 'This choice goes to your account: the server enforces it and it follows you on every device. It decides who can open your profile, who sees your name on the territories you hold, and who sees your name in your commune’s leaderboard — one and the same rule for all three.',
    es: 'Esta elección va a tu cuenta: el servidor la aplica y te acompaña en todos tus dispositivos. Decide quién puede abrir tu perfil, quién ve tu nombre en los territorios que mantienes y quién ve tu nombre en la clasificación de tu municipio: es la misma regla para los tres.',
    de: 'Diese Wahl geht an dein Konto: Der Server setzt sie durch und sie gilt auf allen deinen Geräten. Sie entscheidet, wer dein Profil öffnen kann, wer deinen Namen auf den Gebieten sieht, die du hältst, und wer deinen Namen in der Rangliste deiner Gemeinde sieht — dieselbe Regel für alle drei.',
    pt: 'Esta escolha vai para a sua conta: o servidor a aplica e ela segue você em todos os aparelhos. Ela decide quem pode abrir o seu perfil, quem vê o seu nome nos territórios que você mantém e quem vê o seu nome na classificação do seu município — é a mesma regra para os três.',
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
  /**
   * LE SIGNALEMENT N'EST PAS PARTI (28/07/2026). Avant, `reportContent` écrivait
   * en fire-and-forget et l'écran affichait `reportSentTitle` quoi qu'il arrive :
   * il affirmait un enregistrement serveur qu'il n'avait jamais vérifié. Ces deux
   * entrées existent pour que l'échec ait SA phrase, distincte du succès.
   * Elles ne promettent aucune revue : rien n'a été reçu, donc rien ne sera lu.
   */
  reportFailedTitle: {
    fr: 'Signalement non envoyé',
    en: 'Report not sent',
    es: 'Reporte no enviado',
    de: 'Meldung nicht gesendet',
    pt: 'Denúncia não enviada',
  },
  reportFailedBody: {
    fr: 'Rien n’a été enregistré : personne ne le verra. Vérifie ta connexion et réessaie.',
    en: 'Nothing was recorded — no one will see it. Check your connection and try again.',
    es: 'No se registró nada: nadie lo verá. Revisa tu conexión e inténtalo de nuevo.',
    de: 'Es wurde nichts gespeichert — niemand wird sie sehen. Prüfe deine Verbindung und versuch es erneut.',
    pt: 'Nada foi registrado: ninguém vai ver. Confira sua conexão e tente de novo.',
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
  /**
   * DEUX SURFACES, DEUX RENDUS — et la copie ne peut pas n'en citer qu'un
   * (corrigé le 10/09/2026 au soir). « Joueur bloqué » est le libellé du ROSTER
   * de crew (`CrewRosterGroups`, `RealCrewScreen`). Au classement de commune,
   * `read_leaderboard_2026` (0164) rend `label = null` et l'écran affiche
   * « Joueur · ABC123 » : la ligne perd son nom, elle ne prend pas ce libellé.
   * Citer un libellé entre guillemets pour une surface qui en affiche un autre,
   * c'est faux à l'endroit exact où l'on promet de la précision.
   */
  blockNote: {
    fr: 'Bloquer masque son nom, sans jamais le prévenir : dans ton crew, sa ligne devient « Joueur bloqué » ; au classement de ta commune, elle perd son nom mais garde sa place, pour que les rangs restent justes. Tu peux débloquer ici quand tu veux.',
    en: 'Blocking hides their name, and they are never told: in your crew their row becomes “Blocked player”; in your commune’s leaderboard the row loses its name but keeps its place, so ranks stay true. You can unblock here whenever you want.',
    es: 'Bloquear oculta su nombre, sin avisarle nunca: en tu crew su línea pasa a ser «Jugador bloqueado»; en la clasificación de tu municipio la línea pierde el nombre pero conserva su puesto, para que los rangos sigan siendo correctos. Puedes desbloquear aquí cuando quieras.',
    de: 'Blockieren verbirgt seinen Namen, ohne ihn je zu benachrichtigen: In deiner Crew wird seine Zeile zu „Blockierter Spieler“; in der Rangliste deiner Gemeinde verliert die Zeile ihren Namen, behält aber ihren Platz, damit die Ränge stimmen. Du kannst hier jederzeit entsperren.',
    pt: 'Bloquear esconde o nome dele, sem nunca avisá-lo: no seu crew a linha vira “Jogador bloqueado”; na classificação do seu município a linha perde o nome mas mantém o lugar, para os rankings seguirem certos. Você pode desbloquear aqui quando quiser.',
  },
  /**
   * LE CHEMIN COURT, dit AVANT le formulaire. Le pseudo GRYD par défaut est un
   * identifiant machine (`runner_` + 12 hexadécimaux) affiché tronqué : le
   * retaper à la main était la seule voie, et c'est ce qui faisait échouer la
   * Guideline 1.2. Le formulaire reste — pour signaler quelqu'un qu'on ne
   * croise plus nulle part — mais il n'est plus la porte principale.
   */
  /**
   * ⚠️ « au classement » A ÉTÉ RETIRÉ (10/09/2026, soir). Le raccourci « … »
   * existe dans les surfaces de CREW (`CrewRosterGroups`, `RealCrewScreen`,
   * `CrewHomeScreen`, `CrewActivityScreen` montent `PlayerModerationSheet`) et
   * sur le profil d'un joueur (`app/member.tsx`, depuis 0137). Le classement de
   * commune (`CommuneLeaderboard2026`) n'a AUCUNE action par ligne : envoyer
   * quelqu'un y chercher un « … » qui n'existe pas, c'est un chemin mort dans
   * l'écran de sécurité — l'endroit où l'on peut le moins se le permettre.
   */
  blockShortcutNote: {
    fr: 'Plus simple : touche « … » sur la ligne du joueur dans ton crew, ou ouvre son profil, le pseudo y est déjà rempli. Le classement de ta commune, lui, ne propose pas ce raccourci : reviens ici avec son pseudo.',
    en: 'Simpler: tap “…” on the player’s row in your crew, or open their profile — the name is already filled in. Your commune’s leaderboard doesn’t offer that shortcut: come back here with their username.',
    es: 'Más simple: toca «…» en la fila del jugador en tu crew, o abre su perfil — el usuario ya viene puesto. La clasificación de tu municipio no ofrece ese atajo: vuelve aquí con su usuario.',
    de: 'Einfacher: Tippe auf „…“ in der Zeile des Spielers in deiner Crew, oder öffne sein Profil — der Name ist schon eingetragen. Die Rangliste deiner Gemeinde bietet diese Abkürzung nicht: Komm mit dem Nutzernamen hierher zurück.',
    pt: 'Mais simples: toque em “…” na linha do jogador no seu crew, ou abra o perfil dele — o nome já vem preenchido. A classificação do seu município não oferece esse atalho: volte aqui com o usuário.',
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
  /**
   * ⚠️ « GRYD n'a pas de messagerie » ÉTAIT VRAI, ET NE L'EST PLUS. 0127 a
   * ouvert la conversation de crew (`crew_messages_2026`) et son signalement
   * (`crew_message_report_2026`, câblé dans `CrewConversationScreen2026`) ;
   * 0124 a ouvert le fil et ses commentaires (`social_report_2026`, câblé dans
   * `app/crew-feed.tsx`). Dire à quelqu'un qu'il n'y a « aucun message à
   * signaler » alors qu'il vient d'en recevoir un est le pire refus possible :
   * l'app le renvoie chez lui au lieu de lui montrer la porte qui existe.
   */
  signalerMessageNote: {
    fr: 'Ce formulaire signale un JOUEUR, par son pseudo. Un message ou une publication se signale là où il s’affiche : « … » sur le message dans la conversation de ton crew, « Signaler la publication » en ouvrant une publication du fil. C’est le seul endroit d’où l’on peut désigner un contenu précis.',
    en: 'This form reports a PLAYER, by username. A message or a post is reported where it appears: “…” on the message in your crew conversation, “Report post” once you open a post in the feed. That is the only place a specific piece of content can be pointed at.',
    es: 'Este formulario reporta a un JUGADOR, por su usuario. Un mensaje o una publicación se reporta donde aparece: «…» en el mensaje de la conversación de tu crew, «Reportar la publicación» al abrir una publicación del muro. Es el único lugar desde donde se puede señalar un contenido concreto.',
    de: 'Dieses Formular meldet eine PERSON, per Nutzername. Eine Nachricht oder ein Beitrag wird dort gemeldet, wo er steht: „…“ an der Nachricht in der Unterhaltung deiner Crew, „Beitrag melden“, wenn du einen Beitrag im Feed öffnest. Nur dort lässt sich ein bestimmter Inhalt benennen.',
    pt: 'Este formulário denuncia um JOGADOR, pelo usuário. Uma mensagem ou publicação se denuncia onde ela aparece: “…” na mensagem da conversa do seu crew, “Denunciar a publicação” ao abrir uma publicação do feed. É o único lugar de onde dá para apontar um conteúdo específico.',
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
    fr: 'Âge minimum : 16 ans, confirmé à ton inscription.',
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
    fr: "Récupère une copie de toutes tes données (sorties, zones, profil) au format JSON, via le partage. Ça n'efface rien.",
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
    fr: 'Comprendre pourquoi une sortie compte, ou pas, et faire valoir tes droits.',
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
    fr: 'Boucle non fermée, GPS trop faible, zone trop étroite ou interdite… GRYD calcule chaque zone selon des règles claires. Voir comment une sortie devient une zone, ou pas.',
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
    fr: 'Une sortie peut être vérifiée, partielle, stats only, doublon ou rejetée. Seules les sorties vérifiées capturent du territoire. Les autres comptent quand même pour ta performance. GRYD affiche le statut de chaque sortie et la règle qui l’a produit.',
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
  // ⚠️ 09/08/2026 — CETTE CARTE DISAIT UNE ABSENCE QUI N'EN EST PLUS UNE.
  // Tant qu'aucune boîte n'existait, nommer le vide était la seule honnêteté
  // possible. `hey@gryd.run` a été ouverte et VÉRIFIÉE (MX présent), donc le
  // texte devait suivre : une app qui continue d'annoncer « aucune destination »
  // pendant que ses mentions légales publient une adresse ment deux fois.
  // Ce qui n'existe TOUJOURS pas (signaler une zone, contester un statut) reste
  // dit — la carte change de nouvelle, pas de franchise.
  supportNoChannelTitle: {
    fr: 'Nous écrire',
    en: 'Write to us',
    es: 'Escríbenos',
    de: 'Schreib uns',
    pt: 'Fale com a gente',
  },
  supportNoChannelBody: {
    fr: 'Signaler une zone dangereuse ou contester le statut d’une sortie ne se fait pas encore depuis l’app : ces boutons n’existent pas, plutôt que d’envoyer dans le vide. Pour tout le reste, écris-nous à hey@gryd.run.',
    en: 'Reporting a dangerous area or contesting an activity status is not possible from the app yet: those buttons do not exist, rather than leading nowhere. For anything else, write to us at hey@gryd.run.',
    es: 'Reportar una zona peligrosa o impugnar el estado de una actividad todavía no se hace desde la app: esos botones no existen, en vez de no llevar a ninguna parte. Para todo lo demás, escríbenos a hey@gryd.run.',
    de: 'Eine gefährliche Zone melden oder den Status einer Aktivität anfechten geht aus der App noch nicht: Diese Schaltflächen gibt es nicht, statt ins Leere zu führen. Für alles andere schreib uns an hey@gryd.run.',
    pt: 'Denunciar uma zona perigosa ou contestar o status de uma atividade ainda não dá para fazer pelo app: esses botões não existem, em vez de não levarem a lugar nenhum. Para todo o resto, escreva para hey@gryd.run.',
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
    fr: 'Chaque décision de vérification est explicable : la règle appliquée est affichée avec la sortie. GRYD n’a pas encore de canal de contestation dans l’app. Le seul point de contact publié est l’adresse postale du siège, dans les Mentions légales.',
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
    fr: 'Sur la ligne d’un joueur (dans ton crew ou au classement), touche « … », puis Signaler et choisis un motif. Il faut un compte pour que le signalement parte. Une personne examine chaque signalement enregistré.',
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
    fr: 'En jouant à GRYD, tu acceptes ce code de conduite. Le contenu haineux ou de harcèlement n’a pas sa place ici : une personne examine chaque signalement enregistré.',
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
    fr: 'On ne sait pas si tu en as un. On préfère le dire plutôt que d’inventer.',
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

  // ═══════════════════════════════════════════════════════════════════════════
  // E25 — CONFIDENTIALITÉ & SÉCURITÉ : recalage planche (26/07/2026).
  // La planche pose un contrat de confiance en langage humain, en trois sections
  // (Visibilité · Zones protégées · Sécurité) + un bandeau qui rassure d'abord
  // sur la position en direct. Chaque réglage DIT sa conséquence de jeu ; aucun
  // juridique, aucun dark pattern, AUCUNE option payante (interdit E17).
  //
  // HONNÊTETÉ : plusieurs réglages de la planche supposent une visibilité
  // CROISÉE entre joueurs qui n'existe pas encore (miroir serveur O1) — nom sur
  // les territoires, présence au classement, délai de publication des captures,
  // zones nommées autour d'une adresse. On en dessine la COQUE fidèle mais on la
  // marque « Bientôt » et NON interactive : jamais un interrupteur qui prétend
  // gouverner une exposition qui n'a lieu nulle part (c'était « le pire mensonge
  // de l'app »). Les deux réglages RÉELLEMENT branchés (visibilité de profil,
  // masquage départ/arrivée du partage) restent, eux, pleinement actifs.
  // ═══════════════════════════════════════════════════════════════════════════

  /** Bandeau de confiance en tête (protected-blue). Ne dit que le VRAI garanti :
   *  la position en direct n'est jamais partagée — invariant du jeu, aujourd'hui
   *  et toujours. On n'affirme PAS que d'autres voient déjà tes territoires (faux
   *  tant que O1 n'est pas levé) : la seule promesse est celle qui tient. */
  // Neutre par discipline (l'écran de confidentialité n'a pas de lentille
  // Run/Bike) : « pendant tes sorties », jamais « pendant que tu cours » — un
  // cycliste lirait faux, et le garde-fou reglages.test.ts l'interdit.
  privTrustBanner: {
    fr: 'Ta position en direct n’est jamais partagée : personne ne peut te suivre pendant tes sorties. GRYD ne calcule tes captures qu’à la fin de ta sortie.',
    en: 'Your live position is never shared: no one can follow you during your outings. GRYD only works out your captures once your activity is over.',
    es: 'Tu posición en directo nunca se comparte: nadie puede seguirte durante tus salidas. GRYD solo calcula tus capturas al terminar tu actividad.',
    de: 'Deine Live-Position wird nie geteilt: Niemand kann dir während deiner Aktivität folgen. GRYD berechnet deine Eroberungen erst nach dem Ende deiner Aktivität.',
    pt: 'Sua posição ao vivo nunca é compartilhada: ninguém pode te seguir durante suas atividades. O GRYD só calcula suas capturas ao fim da sua atividade.',
  },

  // ── Titres de section (planche) ────────────────────────────────────────────
  secVisibilite: {
    fr: 'VISIBILITÉ',
    en: 'VISIBILITY',
    es: 'VISIBILIDAD',
    de: 'SICHTBARKEIT',
    pt: 'VISIBILIDADE',
  },
  secZonesProtegees: {
    fr: 'ZONES PROTÉGÉES',
    en: 'PROTECTED ZONES',
    es: 'ZONAS PROTEGIDAS',
    de: 'GESCHÜTZTE ZONEN',
    pt: 'ZONAS PROTEGIDAS',
  },
  secSecurite: {
    fr: 'SÉCURITÉ',
    en: 'SAFETY',
    es: 'SEGURIDAD',
    de: 'SICHERHEIT',
    pt: 'SEGURANÇA',
  },

  // ── VISIBILITÉ : réglages RÉELS depuis 0135 (10/09/2026) ───────────────────
  //
  // « Mes territoires portent mon nom » n'est plus une coque « Bientôt » : il
  // écrit `user_profiles.discreet_mode` (inversé), la colonne que 0126 lit pour
  // décider si le nom et le crew du propriétaire s'affichent sur la carte.
  //
  // « Apparaître dans les classements » a été retiré en tant qu'INTERRUPTEUR, et
  // ne reviendra pas sous cette forme : il n'y a rien à régler de plus.
  // ⚠️ SON MOTIF, LUI, A EXPIRÉ LE JOUR MÊME. Il disait « aucun classement
  // n'existe dans le produit 2026 » ; les migrations 0160-0164 en ont ouvert un
  // le 10/09 au soir (« Ta commune, cette semaine »), et il lit EXACTEMENT les
  // deux colonnes de cette section : `map_sharing <> 'none'` et
  // `not coalesce(discreet_mode, true)` (0161), puis nomme ses lignes avec
  // `territory_owner_identity_2026` (0126, via `profile_visibility`).
  // La présence au classement est donc affichée comme un FAIT DÉRIVÉ
  // (`communeBoardPresence`, features/privacy/audience.ts), jamais comme un
  // onzième réglage : une décision déjà prise ne se redemande pas.
  territoryNameTitle: {
    fr: 'Mes territoires portent mon nom',
    en: 'My territories carry my name',
    es: 'Mis territorios llevan mi nombre',
    de: 'Meine Gebiete tragen meinen Namen',
    pt: 'Meus territórios levam meu nome',
  },
  /** Conséquence AVEC crew (le vrai nom du crew est injecté). « membre »,
   *  neutre par discipline (l'écran n'a pas de lentille) — pas « coureur ». */
  territoryNameConseqCrew: {
    fr: 'Sinon, ils s’afficheraient comme « Un membre de {crew} ».',
    en: 'Otherwise they’d show as “A member of {crew}”.',
    es: 'Si no, aparecerían como «Un miembro de {crew}».',
    de: 'Sonst würden sie als „Ein Mitglied von {crew}“ erscheinen.',
    pt: 'Caso contrário, apareceriam como “Um membro de {crew}”.',
  },
  /** Conséquence SANS crew — on ne fabrique pas un nom de crew. */
  territoryNameConseqSolo: {
    fr: 'Sinon, ils s’afficheraient sans ton nom.',
    en: 'Otherwise they’d show without your name.',
    es: 'Si no, aparecerían sin tu nombre.',
    de: 'Sonst würden sie ohne deinen Namen erscheinen.',
    pt: 'Caso contrário, apareceriam sem o seu nome.',
  },

  /** Ce que l'interrupteur du nom gouverne EXACTEMENT (colonne `discreet_mode`,
   *  lue par `territory_owner_identity_2026`). */
  territoryNameGovernNote: {
    fr: 'Quand il est fermé, la carte affiche les territoires que tu tiens sans ton nom ni ton crew, pour tout le monde, et tu sors entièrement du classement de ta commune : pas seulement ton nom, ta ligne.',
    en: 'When it is off, the map shows the territories you hold without your name or your crew, for everyone — and you leave your commune’s leaderboard entirely: not just your name, your whole row.',
    es: 'Cuando está cerrado, el mapa muestra los territorios que mantienes sin tu nombre ni tu crew, para todo el mundo, y sales por completo de la clasificación de tu municipio: no solo tu nombre, tu línea entera.',
    de: 'Wenn er aus ist, zeigt die Karte die Gebiete, die du hältst, ohne deinen Namen und ohne deine Crew — für alle. Und du verschwindest ganz aus der Rangliste deiner Gemeinde: nicht nur dein Name, deine ganze Zeile.',
    pt: 'Quando está desligado, o mapa mostra os territórios que você mantém sem seu nome nem seu crew, para todo mundo — e você sai inteiramente da classificação do seu município: não só o seu nome, a sua linha.',
  },

  // ── VISIBILITÉ : LE CLASSEMENT DE COMMUNE, AFFICHÉ COMME UN FAIT ──────────
  //
  // Une LIGNE D'INFORMATION, pas un interrupteur : sa valeur est dérivée des
  // deux réglages ci-dessus (`communeBoardPresence`). Chaque motif d'absence a
  // sa phrase — « je n'y figure pas » sans dire POURQUOI serait un état muet, et
  // le motif `map_sharing` ne se lève pas depuis cet écran : le taire ferait
  // croire qu'un tap sur l'interrupteur du nom suffit à revenir.
  boardPresenceTitle: {
    fr: 'Classement de ma commune',
    en: 'My commune’s leaderboard',
    es: 'Clasificación de mi municipio',
    de: 'Rangliste meiner Gemeinde',
    pt: 'Classificação do meu município',
  },
  boardPresenceInValue: {
    fr: 'Je peux y figurer',
    en: 'I can appear',
    es: 'Puedo aparecer',
    de: 'Ich kann erscheinen',
    pt: 'Posso aparecer',
  },
  boardPresenceOutValue: {
    fr: 'Je n’y figure pas',
    en: 'I don’t appear',
    es: 'No aparezco',
    de: 'Ich erscheine nicht',
    pt: 'Não apareço',
  },
  boardPresenceListedDetail: {
    fr: 'Le terrain que tu prends dans la semaine peut y être classé, une fois publié. Ton nom n’y apparaît que pour ceux que « Profil visible par » autorise.',
    en: 'The ground you take during the week can be ranked there, once published. Your name only shows to those “Profile visible to” allows.',
    es: 'El terreno que tomas en la semana puede clasificarse ahí, una vez publicado. Tu nombre solo aparece para quienes «Perfil visible para» autoriza.',
    de: 'Der Boden, den du in der Woche nimmst, kann dort gewertet werden, sobald er veröffentlicht ist. Dein Name erscheint nur für die, die „Profil sichtbar für“ zulässt.',
    pt: 'O terreno que você toma na semana pode ser classificado ali, depois de publicado. Seu nome só aparece para quem «Perfil visível para» autoriza.',
  },
  boardPresenceDiscretionDetail: {
    fr: 'Parce que tes territoires ne portent pas ton nom : le classement retire la ligne entière, pas seulement le nom. Rouvre l’interrupteur ci-dessus pour y revenir.',
    en: 'Because your territories don’t carry your name: the leaderboard drops the whole row, not just the name. Turn the switch above back on to return.',
    es: 'Porque tus territorios no llevan tu nombre: la clasificación quita la línea entera, no solo el nombre. Vuelve a activar el interruptor de arriba para volver.',
    de: 'Weil deine Gebiete deinen Namen nicht tragen: Die Rangliste entfernt die ganze Zeile, nicht nur den Namen. Schalte oben wieder ein, um zurückzukehren.',
    pt: 'Porque seus territórios não levam seu nome: a classificação tira a linha inteira, não só o nome. Ligue de novo o interruptor acima para voltar.',
  },
  boardPresenceMapDetail: {
    fr: 'Parce que ton compte ne publie aucun territoire sur la carte. Ce réglage-là ne se change pas ici : il vient de ton profil.',
    en: 'Because your account publishes no territory on the map. That setting isn’t changed here: it comes from your profile.',
    es: 'Porque tu cuenta no publica ningún territorio en el mapa. Ese ajuste no se cambia aquí: viene de tu perfil.',
    de: 'Weil dein Konto kein Gebiet auf der Karte veröffentlicht. Diese Einstellung wird nicht hier geändert: Sie kommt aus deinem Profil.',
    pt: 'Porque sua conta não publica nenhum território no mapa. Esse ajuste não se muda aqui: ele vem do seu perfil.',
  },
  boardPresenceNoProfileDetail: {
    fr: 'Sans profil enregistré, le serveur n’a rien à lire : aucune ligne ne peut être classée.',
    en: 'With no saved profile, the server has nothing to read: no row can be ranked.',
    es: 'Sin perfil guardado, el servidor no tiene nada que leer: ninguna línea puede clasificarse.',
    de: 'Ohne gespeichertes Profil hat der Server nichts zu lesen: Keine Zeile kann gewertet werden.',
    pt: 'Sem perfil salvo, o servidor não tem o que ler: nenhuma linha pode ser classificada.',
  },

  // ── VISIBILITÉ : les QUATRE états de la lecture serveur (0135) ─────────────
  //    Ces réglages viennent du COMPTE : « je lis », « pas de compte »,
  //    « je n'ai pas pu lire » et « lu » sont quatre phrases différentes, et
  //    aucune ne se déguise en « tout est fermé ».
  audienceReading: {
    fr: 'Lecture de tes réglages…',
    en: 'Reading your settings…',
    es: 'Leyendo tus ajustes…',
    de: 'Deine Einstellungen werden gelesen…',
    pt: 'Lendo seus ajustes…',
  },
  audienceFailedTitle: {
    fr: 'Réglages non lus',
    en: 'Settings not loaded',
    es: 'Ajustes no leídos',
    de: 'Einstellungen nicht geladen',
    pt: 'Ajustes não lidos',
  },
  audienceFailedBody: {
    fr: 'On n’a pas pu lire tes réglages de visibilité. Rien n’a changé sur ton compte : c’est une lecture qui a échoué, pas un réglage qui s’est fermé.',
    en: 'We could not read your visibility settings. Nothing changed on your account — a read failed, no setting closed itself.',
    es: 'No pudimos leer tus ajustes de visibilidad. Nada cambió en tu cuenta: falló una lectura, no se cerró ningún ajuste.',
    de: 'Deine Sichtbarkeits-Einstellungen konnten nicht gelesen werden. Auf deinem Konto hat sich nichts geändert — ein Lesevorgang ist fehlgeschlagen, keine Einstellung hat sich geschlossen.',
    pt: 'Não foi possível ler seus ajustes de visibilidade. Nada mudou na sua conta — uma leitura falhou, nenhum ajuste se fechou.',
  },
  audienceRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  audienceSignedOutTitle: {
    fr: 'Sans compte',
    en: 'No account',
    es: 'Sin cuenta',
    de: 'Ohne Konto',
    pt: 'Sem conta',
  },
  audienceSignedOutBody: {
    fr: 'Ces réglages vivent sur ton compte. Sans compte, GRYD ne publie rien de toi : ni profil, ni territoire, ni publication.',
    en: 'These settings live on your account. Without one, GRYD publishes nothing of yours: no profile, no territory, no post.',
    es: 'Estos ajustes viven en tu cuenta. Sin cuenta, GRYD no publica nada tuyo: ni perfil, ni territorio, ni publicación.',
    de: 'Diese Einstellungen liegen auf deinem Konto. Ohne Konto veröffentlicht GRYD nichts von dir: kein Profil, kein Gebiet, keinen Beitrag.',
    pt: 'Estes ajustes ficam na sua conta. Sem conta, o GRYD não publica nada seu: nem perfil, nem território, nem publicação.',
  },
  audienceNoProfileTitle: {
    fr: 'Aucun profil enregistré',
    en: 'No profile saved',
    es: 'Sin perfil guardado',
    de: 'Kein Profil gespeichert',
    pt: 'Nenhum perfil salvo',
  },
  audienceNoProfileBody: {
    fr: 'Tant que tu n’as pas de profil, rien n’est exposé : la carte n’inscrit ni ton nom ni ton crew sur tes territoires, et personne ne peut ouvrir ton profil. Ces réglages s’ouvrent avec lui.',
    en: 'Until you have a profile, nothing is exposed: the map writes neither your name nor your crew on your territories, and no one can open your profile. These settings open with it.',
    es: 'Mientras no tengas perfil, nada queda expuesto: el mapa no inscribe ni tu nombre ni tu crew en tus territorios, y nadie puede abrir tu perfil. Estos ajustes se abren con él.',
    de: 'Solange du kein Profil hast, wird nichts gezeigt: Die Karte schreibt weder deinen Namen noch deine Crew auf deine Gebiete, und niemand kann dein Profil öffnen. Diese Einstellungen öffnen sich mit ihm.',
    pt: 'Enquanto você não tiver um perfil, nada fica exposto: o mapa não inscreve seu nome nem seu crew nos seus territórios, e ninguém pode abrir seu perfil. Estes ajustes abrem junto com ele.',
  },
  audienceCreateProfile: {
    fr: 'Créer mon profil',
    en: 'Create my profile',
    es: 'Crear mi perfil',
    de: 'Profil anlegen',
    pt: 'Criar meu perfil',
  },
  audienceSaveFailed: {
    fr: 'Rien n’a été enregistré : ton réglage n’a pas changé sur ton compte. Vérifie ta connexion et réessaie.',
    en: 'Nothing was saved: your setting did not change on your account. Check your connection and try again.',
    es: 'No se guardó nada: tu ajuste no cambió en tu cuenta. Revisa tu conexión e inténtalo otra vez.',
    de: 'Nichts wurde gespeichert: Deine Einstellung hat sich auf deinem Konto nicht geändert. Prüfe deine Verbindung und versuch es erneut.',
    pt: 'Nada foi salvo: seu ajuste não mudou na sua conta. Verifique sua conexão e tente de novo.',
  },

  // ── ZONES PROTÉGÉES : zones nommées (domicile/travail) — pas encore d'écran
  //    pour déclarer une adresse, donc « Bientôt ». Le masquage départ/arrivée,
  //    lui, est RÉEL et vit juste au-dessus (card `departArrivee`). ────────────
  namedZonesTitle: {
    fr: 'Zone floutée : domicile, travail…',
    en: 'Blurred zone: home, work…',
    es: 'Zona difuminada: casa, trabajo…',
    de: 'Unschärfezone: Zuhause, Arbeit…',
    pt: 'Zona borrada: casa, trabalho…',
  },
  // ── E77 · ZONES PROTÉGÉES RÉELLES (28/07/2026) ────────────────────────────
  // La table `privacy_zones` existait depuis 0002 ; il manquait l'écran. Depuis
  // que `ingest_run` persiste une trace masquée, une zone déclarée est retirée
  // de ce qui est ÉCRIT EN BASE, plus seulement d'une image de partage.
  zonesAddTitle: {
    fr: 'Protéger un endroit',
    en: 'Protect a place',
    es: 'Proteger un lugar',
    de: 'Einen Ort schützen',
    pt: 'Proteger um lugar',
  },
  // « AUTOUR DE », jamais « exactement ici » : le centre est stocké en cellule
  // H3 res 8 (~0,7 km²), l'écart au point tapé peut atteindre quelques centaines
  // de mètres. C'est aussi pourquoi le rayon minimal est 200 m.
  zonesAddSub: {
    fr: 'Tes tracés seront coupés autour de ta position actuelle. L’endroit exact n’est jamais enregistré.',
    en: 'Your trails will be cut around your current position. The exact spot is never stored.',
    es: 'Tus trazados se cortarán alrededor de tu posición actual. El lugar exacto nunca se guarda.',
    de: 'Deine Spuren werden rund um deinen aktuellen Standort gekappt. Der genaue Ort wird nie gespeichert.',
    pt: 'Seus traçados serão cortados ao redor da sua posição atual. O lugar exato nunca é guardado.',
  },
  zonesCount: {
    fr: '{n} sur {max} protégés',
    en: '{n} of {max} protected',
    es: '{n} de {max} protegidos',
    de: '{n} von {max} geschützt',
    pt: '{n} de {max} protegidos',
  },
  zonesItem: {
    fr: 'Endroit protégé · {m} m autour',
    en: 'Protected place · {m} m around',
    es: 'Lugar protegido · {m} m alrededor',
    de: 'Geschützter Ort · {m} m im Umkreis',
    pt: 'Lugar protegido · {m} m ao redor',
  },
  zonesRemove: {
    fr: 'Retirer',
    en: 'Remove',
    es: 'Quitar',
    de: 'Entfernen',
    pt: 'Remover',
  },
  // Retirer une zone est une PERTE DE PROTECTION, pas un ménage : on le dit.
  zonesRemoveConfirm: {
    fr: 'Retirer cette protection ? Tes prochaines sorties cesseront de masquer cet endroit.',
    en: 'Remove this protection? Your next outings will stop hiding this place.',
    es: '¿Quitar esta protección? Tus próximas salidas dejarán de ocultar este lugar.',
    de: 'Diesen Schutz entfernen? Deine nächsten Aktivitäten verbergen diesen Ort nicht mehr.',
    pt: 'Remover esta proteção? Suas próximas atividades deixarão de ocultar este lugar.',
  },
  zonesEmpty: {
    fr: 'Aucun endroit protégé pour l’instant.',
    en: 'No protected place yet.',
    es: 'Ningún lugar protegido por ahora.',
    de: 'Noch kein geschützter Ort.',
    pt: 'Nenhum lugar protegido por enquanto.',
  },
  zonesLoading: {
    fr: 'Lecture de tes endroits protégés…',
    en: 'Reading your protected places…',
    es: 'Leyendo tus lugares protegidos…',
    de: 'Deine geschützten Orte werden gelesen…',
    pt: 'Lendo seus lugares protegidos…',
  },
  // ÉCHEC ≠ VIDE : on ne dit jamais « aucun » quand on n'a pas pu lire.
  zonesFailed: {
    fr: 'Tes endroits protégés n’ont pas pu être lus. Rien n’est affirmé ici : réessaie.',
    en: 'Your protected places could not be read. Nothing is claimed here: try again.',
    es: 'No se han podido leer tus lugares protegidos. No se afirma nada aquí: inténtalo de nuevo.',
    de: 'Deine geschützten Orte konnten nicht gelesen werden. Hier wird nichts behauptet: versuche es erneut.',
    pt: 'Não foi possível ler seus lugares protegidos. Nada é afirmado aqui: tente de novo.',
  },
  zonesFull: {
    fr: 'Trois endroits protégés au maximum. Retires-en un pour en ajouter un autre.',
    en: 'Three protected places maximum. Remove one to add another.',
    es: 'Tres lugares protegidos como máximo. Quita uno para añadir otro.',
    de: 'Höchstens drei geschützte Orte. Entferne einen, um einen weiteren hinzuzufügen.',
    pt: 'No máximo três lugares protegidos. Remova um para adicionar outro.',
  },
  zonesNoPosition: {
    fr: 'Position indisponible : impossible de protéger un endroit qu’on ne sait pas situer.',
    en: 'Position unavailable: we can’t protect a place we can’t locate.',
    es: 'Posición no disponible: no se puede proteger un lugar que no se sabe ubicar.',
    de: 'Position nicht verfügbar: Ein Ort, den wir nicht orten können, lässt sich nicht schützen.',
    pt: 'Posição indisponível: não dá para proteger um lugar que não se sabe localizar.',
  },
  zonesSaveFailed: {
    fr: 'Rien n’a été enregistré : cet endroit n’est pas protégé.',
    en: 'Nothing was saved: this place is not protected.',
    es: 'No se ha guardado nada: este lugar no está protegido.',
    de: 'Nichts wurde gespeichert: dieser Ort ist nicht geschützt.',
    pt: 'Nada foi guardado: este lugar não está protegido.',
  },
  zonesSaved: {
    fr: 'Endroit protégé. Tes prochaines sorties le masqueront.',
    en: 'Place protected. Your next outings will hide it.',
    es: 'Lugar protegido. Tus próximas salidas lo ocultarán.',
    de: 'Ort geschützt. Deine nächsten Aktivitäten verbergen ihn.',
    pt: 'Lugar protegido. Suas próximas atividades vão ocultá-lo.',
  },
  namedZonesSoonNote: {
    fr: 'Bientôt : masquer tes tracés autour d’une adresse que tu déclares. En attendant, le départ et l’arrivée de tout partage sont déjà coupés (ci-dessus).',
    en: 'Soon: blur your trails around an address you set. Meanwhile, the start and end of every share are already trimmed (above).',
    es: 'Pronto: difuminar tus trazados alrededor de una dirección que tú indiques. Mientras tanto, el inicio y el final de cada compartido ya se recortan (arriba).',
    de: 'Bald: deine Spuren rund um eine von dir angegebene Adresse verbergen. Bis dahin werden Anfang und Ende jeder geteilten Spur bereits gekürzt (oben).',
    pt: 'Em breve: borrar seus traçados ao redor de um endereço que você indicar. Enquanto isso, o início e o fim de cada compartilhamento já são cortados (acima).',
  },

  // ── SÉCURITÉ ───────────────────────────────────────────────────────────────
  signalerAbusTitle: {
    fr: 'Signaler un joueur ou un abus',
    en: 'Report a player or abuse',
    es: 'Denunciar a un jugador o un abuso',
    de: 'Spieler oder Missbrauch melden',
    pt: 'Denunciar um jogador ou abuso',
  },
  publishDelayTitle: {
    fr: 'Délai de publication des captures',
    en: 'Capture publishing delay',
    es: 'Retardo de publicación de capturas',
    de: 'Veröffentlichungsverzögerung der Eroberungen',
    pt: 'Atraso na publicação das capturas',
  },
  /**
   * LE DÉLAI EXISTE VRAIMENT (10/09/2026). Il était peint « 1 h · Bientôt » :
   * deux erreurs. `capture_events_2026.publish_after` est écrit à chaque
   * capture par `ingest_run` (refonte2026.ts) à partir de
   * `TERRITORY_RULES_2026.publicationDelayMinutes`, et `get_ownership_2026`
   * n'expose que les captures `published`. La valeur est donc interpolée depuis
   * la constante — jamais recopiée ici, sinon elle dériverait au premier
   * arbitrage.
   */
  publishDelayValue: {
    fr: '{min} min',
    en: '{min} min',
    es: '{min} min',
    de: '{min} Min.',
    pt: '{min} min',
  },
  publishDelayConseq: {
    fr: 'Tes captures ne deviennent visibles par les autres joueurs que {min} minutes après la fin de ta sortie. Ce délai s’applique à tout le monde ; il ne se règle pas.',
    en: 'Your captures only become visible to other players {min} minutes after your activity ends. This delay applies to everyone; it is not adjustable.',
    es: 'Tus capturas solo son visibles para los demás jugadores {min} minutos después de terminar tu actividad. Este retardo se aplica a todos; no se ajusta.',
    de: 'Deine Eroberungen werden für andere Spieler erst {min} Minuten nach dem Ende deiner Aktivität sichtbar. Diese Verzögerung gilt für alle; sie lässt sich nicht einstellen.',
    pt: 'Suas capturas só ficam visíveis para os outros jogadores {min} minutos após o fim da sua atividade. Esse atraso vale para todo mundo; não é ajustável.',
  },
  notifByCategoryTitle: {
    fr: 'Notifications par catégorie',
    en: 'Notifications by category',
    es: 'Notificaciones por categoría',
    de: 'Benachrichtigungen nach Kategorie',
    pt: 'Notificações por categoria',
  },

  // ── Pied : conditions (l'export/suppression garde ses propres libellés) ─────
  conditionsRow: {
    fr: 'Conditions',
    en: 'Terms',
    es: 'Condiciones',
    de: 'Bedingungen',
    pt: 'Condições',
  },
});
