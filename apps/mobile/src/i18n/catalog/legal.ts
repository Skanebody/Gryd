/**
 * GRYD — i18n : mentions légales et identité de l'éditeur, EMBARQUÉES DANS L'APP.
 *
 * POURQUOI DANS L'APP ET PAS UN LIEN : l'écran Réglages renvoyait vers
 * « gryd.run/mentions-legales » — un domaine qui N'EXISTE PAS (l'arbitrage
 * gryd.app vs gryd.run est toujours ouvert, point O10). Les mentions légales
 * étaient donc un cul-de-sac, alors que la LCEN impose qu'elles soient
 * accessibles. Embarquées ici, elles ne dépendent d'aucun domaine, d'aucun
 * hébergement et d'aucune connexion : elles s'affichent toujours.
 *
 * IDENTITÉ : valeurs RÉELLES du RCS, confirmées par le fondateur le 21/07/2026
 * (export du portail data Nexus 1993). Aucun champ inventé, aucun « à
 * compléter » affiché à un utilisateur. Le SIREN, la forme sociale, le capital
 * et le siège sont des mentions OBLIGATOIRES — ne pas les retirer.
 *
 * DONNÉE PERSONNELLE DU FONDATEUR : le siège est une adresse de DOMICILIATION
 * (66 avenue des Champs-Élysées), pas le domicile — c'est déjà la meilleure
 * protection possible, puisque l'adresse du siège est publique par nature au
 * RCS. Ne JAMAIS remplacer par une adresse personnelle.
 *
 * Les noms propres (Nexus 1993, Benjamin Bel, Supabase…), le numéro RCS et
 * l'adresse ne se traduisent pas : ils sont identiques dans les 5 langues.
 *
 * ─── 23/07/2026 : LES CGV/CGU NE VENDENT PLUS CE QUI EST INTERDIT ────────────
 * Elles listaient les « boucliers de quartier » parmi les achats ponctuels, et
 * le « gel de série » + le « radar des zones contestées » parmi les bonus du
 * GRYD Club. Ce sont des objets FONCTIONNELS (protection d'une zone, protection
 * de la série — donc du multiplicateur ×1,5 sur les POINTS de territoire —,
 * information tactique) : AMENDEMENT-40 §2 et AMENDEMENT-45 §2 les ont rendus
 * invendables, `FUNCTIONAL_ITEM_ACQUISITION` leur interdit tout prix et la
 * contrainte SQL `items_functional_never_priced_check` ferme la porte serveur.
 * Un document CONTRACTUEL est l'endroit où « une doc ne promet jamais au-delà
 * du code » est le plus strict : ces produits en sont retirés, et la liste dit
 * désormais explicitement qu'ils ne sont vendus dans aucune monnaie.
 *
 * ─── 25/07/2026 : LA POLITIQUE NE DÉCLARE PLUS CE QUI N'EXISTE PAS ──────────
 * Cinq déclarations juridiques étaient FAUSSES dans ce fichier. Un document RGPD
 * qui déclare une collecte qui n'a pas lieu est un faux au même titre qu'une
 * donnée fabriquée à l'écran — en pire, puisqu'il engage l'éditeur :
 *  1. « messages de CHAT de crew » : il n'y a pas de chat dans GRYD, il est
 *     REFUSÉ (A-43 §9). Le crew échange par SIGNAUX à vocabulaire fermé
 *     (`features/crew/pings.ts`, migration 0051) ; `chatStore.ts` a été supprimé
 *     et l'écran crew n'a jamais eu de 4ᵉ onglet.
 *  2. « Santé importée depuis Apple Santé / HealthKit » : HealthKit n'est PAS
 *     branché — l'adaptateur est un stub honnête (`sources/adapters/appleHealth.ts`,
 *     statut `needs_dev_build`), aucun module natif santé n'est en dépendance.
 *     La politique classait donc en donnée sensible (art. 9) une collecte
 *     inexistante. Ce qui existe VRAIMENT et n'était nulle part : l'import de
 *     courses par fichier GPX et par service tiers connecté.
 *  3. « réactions » collectées : les réactions (dons, conquêtes) sont persistées
 *     en AsyncStorage et ne quittent jamais l'appareil.
 *  4. « Paiement : Apple / Google » présenté comme un traitement EN COURS, alors
 *     que la CGV du même build dit qu'aucune offre n'est commercialisée. Deux
 *     textes contractuels embarqués qui se contredisaient.
 *  5. « Écris-nous depuis la page Support » (×6) : `/support` n'a NI adresse, NI
 *     formulaire, NI `mailto:`. Une politique RGPD dont le canal d'exercice des
 *     droits n'existe pas est un défaut juridique, pas un défaut d'UI. Le canal
 *     nommé est désormais le COURRIER au siège — réel, vérifiable, et qui reste
 *     vrai le jour où un e-mail de contact s'ouvrira.
 * La région d'hébergement, elle, n'était pas fausse : elle était NON SOURCÉE.
 * Elle l'est maintenant (cf. `LEGAL_HOSTING`).
 *
 * ─── 26/07/2026 : LES CGU NE QUALIFIENT PLUS DE FRAUDE CE QUE L'APP LIVRE ────
 * Le vélo est devenu une discipline RÉELLE (décision fondateur du 26/07/2026 :
 * territoires, courses, classements et statistiques SÉPARÉS ; XP et niveau
 * GLOBAUX). Trois clauses le déclaraient encore tricheur, et c'était le défaut
 * le plus grave possible dans ce fichier — un défaut CONTRACTUEL :
 *  1. « Le territoire se capture UNIQUEMENT par des courses à pied réelles »
 *     (`cguJeuBody`) : faux depuis que `hex_claims` a une clé primaire
 *     `(h3index, activity)` et que `runs.activity` existe (migration 0070, EN
 *     PRODUCTION). Un cycliste capture, et sa zone n'est pas celle du coureur.
 *  2. « Simuler une course (voiture, VÉLO, GPS falsifié…) » (`cguTricheBody2`) :
 *     la liste des pratiques INTERDITES nommait la fonctionnalité livrée.
 *  3. « écarter les parcours impossibles à pied » (`cguTricheBody1`) : GRYD
 *     Verify juge désormais un effort contre les bornes de SA discipline
 *     (`ACTIVITY_RULES`, game-rules.ts), pas contre celles du piéton.
 * Deux clauses voisines portaient la même faute et sont corrigées avec elles :
 * l'OBJET du contrat (« un jeu de conquête par la course à pied ») et la clause
 * de SÉCURITÉ (« GRYD se joue en courant »), qui doit couvrir la discipline
 * réellement enregistrée — le code de la route ne se lit pas pareil à vélo.
 *
 * CE QUI N'EST PAS AFFAIBLI, ET C'EST LE CŒUR DE LA RÉÉCRITURE : l'interdit ne
 * disparaît pas, il se déplace là où il est VRAI. Ce qui reste sanctionné, c'est
 * de faire passer un effort pour ce qu'il n'est pas — rouler en déclarant une
 * course à pied ou l'inverse —, tout engin motorisé, et le GPS falsifié.
 *
 * ⚠️ HONNÊTETÉ SUR CE QUE GRYD VERIFY SAIT FAIRE : `game-rules.ts` écrit noir sur
 * blanc (commentaire de `BIKE_POINT_MAX_SPEED_KMH`, et « CE QUI RESTE EN
 * SUSPENS » §1) qu'aucune borne de vitesse ne distingue un cycliste rapide d'une
 * voiture EN VILLE, et que les signaux qui le pourraient (accélérations, arrêts,
 * altitude, trajectoire) n'existent nulle part dans le code. La clause anti-triche
 * le DIT désormais, au lieu de laisser croire à une détection totale : une CGU
 * qui promet une capacité que le moteur n'a pas est un mensonge de plus, pas une
 * protection de plus.
 *
 * ⚠️ AUCUN CHIFFRE DE JEU N'EST RECOPIÉ ICI. Les bornes par discipline vivent
 * dans `packages/shared/src/game-rules.ts` (`ACTIVITY_RULES`) : les écrire dans
 * un contrat en ferait des nombres magiques figés le jour de leur prochaine
 * évolution. La clause dit qu'elles EXISTENT et diffèrent, jamais lesquelles.
 */
import { defineCatalog, type Entry } from '../types';

/** Identité légale — source unique, jamais dupliquée en dur dans un écran. */
export const LEGAL_ENTITY = {
  name: 'NEXUS 1993',
  form: 'SASU',
  capital: '500 €',
  address: '66 avenue des Champs-Élysées, 75008 Paris',
  rcsCity: 'Paris',
  siren: '982 786 154',
  vat: 'FR18982786154',
  president: 'Benjamin Bel',
} as const;

/**
 * HÉBERGEMENT — source unique, et SOURCÉE.
 *
 * La région était écrite en dur dans trois textes (mentions légales, politique
 * §sous-traitants, §transferts) sans s'adosser à rien. Or c'est elle qui fonde
 * la clause « aucun transfert hors UE » : une phrase qui porte une garantie RGPD
 * ne peut pas être une supposition recopiée trois fois.
 *
 * PROVENANCE (vérifiée le 25/07/2026) : le projet Supabase LIÉ de ce dépôt est
 * `gryd` (ref `sydwxwwirinjoheeodcg`) et son pooler répond sur
 * `aws-0-eu-west-1.pooler.supabase.com` — AWS eu-west-1, Irlande, Union
 * européenne. À RE-VÉRIFIER au tableau de bord Supabase si le projet est migré :
 * la clause de non-transfert tombe avec lui.
 *
 * ⚠️ CE QUI MANQUE ENCORE, ET QUI N'EST PAS INVENTÉ ICI : la LCEN art. 6-III
 * impose de publier la dénomination, l'ADRESSE et le TÉLÉPHONE de l'hébergeur.
 * Ces trois éléments ne figurent nulle part dans le dépôt (ils sont dans le
 * contrat Supabase du fondateur). On ne les fabrique pas : les mentions légales
 * nomment l'hébergeur et sa région, et le manque est inscrit en suspens.
 */
export const LEGAL_HOSTING = {
  provider: 'Supabase',
  region: 'eu-west-1',
} as const;

/**
 * Date de dernière mise à jour des documents légaux embarqués. UNE seule vérité :
 * les cinq écrans (CGU, confidentialité, CGV, licences, mentions) la partagent.
 * Format neutre jj/mm/aaaa — lisible dans les cinq langues, sans nom de mois à
 * traduire. À faire évoluer À LA MAIN à chaque changement de fond (comme la date
 * des pages web) : une date figée qui dérive silencieusement serait un mensonge.
 */
export const LEGAL_LAST_UPDATED = '27/07/2026';

/**
 * TEXTE DE RÉFÉRENCE FRANÇAISE, identique dans les cinq langues.
 *
 * POURQUOI PAS UNE VRAIE TRADUCTION PAR LANGUE : le corps des documents légaux
 * FAIT FOI en français (SASU française, droit français, Saison 0 France).
 * Traduire un texte de loi sans révision par un juriste de chaque juridiction
 * produirait un faux — exactement ce que CLAUDE.md interdit (« l'app ne ment
 * jamais »). La parité de typage (`Entry` = 5 langues obligatoires) est donc
 * honorée en portant le MÊME texte français partout ; le bandeau `legalReference`
 * (lui, réellement traduit) prévient le lecteur non francophone que seul le
 * français fait foi. Le jour où un cabinet livre une traduction certifiée, on
 * remplace `fr5(x)` par cinq versions distinctes — le typage l'imposera déjà.
 */
function fr5(text: string): Entry {
  return { fr: text, en: text, es: text, de: text, pt: text };
}

export const C = defineCatalog({
  // ── En-tête ──
  aboutTitle: {
    fr: 'À propos',
    en: 'About',
    es: 'Acerca de',
    de: 'Über',
    pt: 'Sobre',
  },
  aboutKicker: {
    fr: 'ÉDITEUR · MENTIONS LÉGALES',
    en: 'PUBLISHER · LEGAL NOTICE',
    es: 'EDITOR · AVISO LEGAL',
    de: 'ANBIETER · IMPRESSUM',
    pt: 'EDITOR · AVISO LEGAL',
  },

  // ── Éditeur ──
  publisherHeading: {
    fr: 'ÉDITEUR',
    en: 'PUBLISHER',
    es: 'EDITOR',
    de: 'ANBIETER',
    pt: 'EDITOR',
  },
  /** {name} {form} au capital de {capital}. Mentions obligatoires LCEN. */
  publisherBody: {
    fr: 'GRYD est édité par {name}, {form} au capital de {capital}, dont le siège social est situé {address}, immatriculée au Registre du Commerce et des Sociétés de {rcs} sous le numéro {siren}.',
    en: 'GRYD is published by {name}, a French simplified joint-stock company ({form}) with share capital of {capital}, registered office at {address}, registered with the {rcs} Trade and Companies Register under number {siren}.',
    es: 'GRYD está editada por {name}, sociedad por acciones simplificada ({form}) con un capital de {capital}, con domicilio social en {address}, inscrita en el Registro Mercantil de {rcs} con el número {siren}.',
    de: 'GRYD wird herausgegeben von {name}, vereinfachte Aktiengesellschaft ({form}) mit einem Kapital von {capital}, Sitz {address}, eingetragen im Handelsregister {rcs} unter der Nummer {siren}.',
    pt: 'GRYD é editada por {name}, sociedade por ações simplificada ({form}) com capital de {capital}, com sede em {address}, registrada no Registro do Comércio de {rcs} sob o número {siren}.',
  },
  publisherDirector: {
    fr: 'Directeur de la publication : {president}, président.',
    en: 'Publication director: {president}, president.',
    es: 'Director de la publicación: {president}, presidente.',
    de: 'Verantwortlich für den Inhalt: {president}, Präsident.',
    pt: 'Diretor de publicação: {president}, presidente.',
  },
  publisherVat: {
    fr: 'TVA intracommunautaire : {vat}',
    en: 'EU VAT number: {vat}',
    es: 'IVA intracomunitario: {vat}',
    de: 'USt-IdNr.: {vat}',
    pt: 'IVA intracomunitário: {vat}',
  },

  // ── Hébergement ──
  hostingHeading: {
    fr: 'HÉBERGEMENT',
    en: 'HOSTING',
    es: 'ALOJAMIENTO',
    de: 'HOSTING',
    pt: 'HOSPEDAGEM',
  },
  /** {provider} / {region} viennent de LEGAL_HOSTING — jamais retapés. */
  hostingBody: {
    fr: 'Les données de GRYD sont hébergées par {provider}, sur des serveurs situés dans l’Union européenne (région {region}, Irlande).',
    en: 'GRYD data is hosted by {provider}, on servers located in the European Union ({region} region, Ireland).',
    es: 'Los datos de GRYD están alojados por {provider}, en servidores situados en la Unión Europea (región {region}, Irlanda).',
    de: 'Die Daten von GRYD werden von {provider} auf Servern in der Europäischen Union gehostet (Region {region}, Irland).',
    pt: 'Os dados da GRYD são hospedados pela {provider}, em servidores na União Europeia (região {region}, Irlanda).',
  },

  // ── Tes données (renvoi vers les droits RÉELLEMENT exerçables dans l'app) ──
  dataHeading: {
    fr: 'TES DONNÉES',
    en: 'YOUR DATA',
    es: 'TUS DATOS',
    de: 'DEINE DATEN',
    pt: 'SEUS DADOS',
  },
  /**
   * Ne promet QUE ce que l'app fait vraiment : l'export et la suppression sont
   * exerçables depuis Confidentialité. Si un jour ces boutons disparaissent,
   * ce texte doit disparaître avec eux.
   *
   * ⚠️ LA CONDITION MANQUAIT (même correction que `cguCompteBody`) : les deux
   * actions ne sont armées que si une session existe — sans compte, l'écran
   * Confidentialité refuse et le dit (`confidentialite.tsx:238` et `:298`).
   */
  dataBody: {
    fr: 'Si tu as un compte, tu peux récupérer une copie de tes données et le supprimer à tout moment, depuis Réglages puis Confidentialité. La suppression rend ton profil invisible immédiatement, puis efface définitivement tes données à l’issue d’un délai — te reconnecter avant la fin de ce délai annule la suppression.',
    en: 'If you have an account, you can download a copy of your data and delete it at any time, from Settings then Privacy. Deletion hides your profile immediately, then permanently erases your data after a delay — signing back in before the end of that delay cancels the deletion.',
    es: 'Si tienes una cuenta, puedes descargar una copia de tus datos y eliminarla cuando quieras, desde Ajustes y luego Privacidad. La eliminación oculta tu perfil de inmediato y borra definitivamente tus datos tras un plazo — volver a iniciar sesión antes del final de ese plazo cancela la eliminación.',
    de: 'Wenn du ein Konto hast, kannst du jederzeit eine Kopie deiner Daten herunterladen und es löschen, unter Einstellungen und dann Datenschutz. Die Löschung blendet dein Profil sofort aus und entfernt deine Daten nach einer Frist endgültig — meldest du dich vorher wieder an, wird die Löschung abgebrochen.',
    pt: 'Se você tem uma conta, pode baixar uma cópia dos seus dados e excluí-la quando quiser, em Configurações e depois Privacidade. A exclusão oculta seu perfil imediatamente e apaga definitivamente seus dados após um prazo — entrar novamente antes do fim desse prazo cancela a exclusão.',
  },

  // ── Contact ──
  contactHeading: {
    fr: 'CONTACT',
    en: 'CONTACT',
    es: 'CONTACTO',
    de: 'KONTAKT',
    pt: 'CONTATO',
  },
  /**
   * ⚠️ NE PAS REMETTRE « depuis la page Support ». `/support` n'a ni adresse
   * e-mail, ni formulaire, ni `mailto:` — ses cartes ouvrent une alerte qui dit
   * elle-même que la remontée n'est pas transmise. Le canal nommé ici doit être
   * un canal qui EXISTE : l'adresse du siège, déjà publiée au-dessus.
   * {address} vient de LEGAL_ENTITY.
   */
  contactBody: {
    fr: 'Pour toute question, une réclamation ou l’exercice de tes droits, écris-nous par courrier : {name}, {address}.',
    en: 'For any question, complaint or to exercise your rights, write to us by post: {name}, {address}.',
    es: 'Para cualquier pregunta, reclamación o para ejercer tus derechos, escríbenos por correo postal: {name}, {address}.',
    de: 'Bei Fragen, Beschwerden oder zur Ausübung deiner Rechte schreib uns per Post: {name}, {address}.',
    pt: 'Para qualquer dúvida, reclamação ou para exercer seus direitos, escreva-nos por carta: {name}, {address}.',
  },

  // ════════════════════════════════════════════════════════════════════════
  // DOCUMENTS LÉGAUX EMBARQUÉS (CGU · Confidentialité · CGV · Licences)
  //
  // Rendus par `LegalDoc`. Les TITRES (barre) et le bandeau de référence sont
  // RÉELLEMENT traduits (ce sont des repères de navigation, pas du fond légal).
  // Les CORPS et INTITULÉS de section utilisent `fr5(...)` : texte français de
  // référence, identique dans les cinq langues (cf. commentaire de `fr5`).
  // ════════════════════════════════════════════════════════════════════════

  /** Ligne de date en tête de chaque document. {date} = LEGAL_LAST_UPDATED. */
  legalUpdated: {
    fr: 'Mis à jour le {date}',
    en: 'Last updated {date}',
    es: 'Actualizado el {date}',
    de: 'Aktualisiert am {date}',
    pt: 'Atualizado em {date}',
  },
  /**
   * SUR-TITRES DE DOCUMENT (loi n°2 : aucun écran ne commence sans kicker).
   * Ils sont RÉELLEMENT traduits : ce sont des repères de navigation, pas du
   * fond légal. `privacyKicker` fait un second travail — lever l'ambiguïté entre
   * le DOCUMENT (/legal/confidentialite) et l'écran de RÉGLAGES homonyme
   * (/confidentialite), qui portent le même titre dans la même app.
   */
  cguKicker: {
    fr: 'CONDITIONS · UTILISATION',
    en: 'TERMS · USE',
    es: 'CONDICIONES · USO',
    de: 'BEDINGUNGEN · NUTZUNG',
    pt: 'CONDIÇÕES · UTILIZAÇÃO',
  },
  privacyKicker: {
    fr: 'POLITIQUE · RGPD',
    en: 'POLICY · GDPR',
    es: 'POLÍTICA · RGPD',
    de: 'RICHTLINIE · DSGVO',
    pt: 'POLÍTICA · RGPD',
  },
  cgvKicker: {
    fr: 'CONDITIONS · VENTE',
    en: 'TERMS · SALE',
    es: 'CONDICIONES · VENTA',
    de: 'BEDINGUNGEN · VERKAUF',
    pt: 'CONDIÇÕES · VENDA',
  },
  licencesKicker: {
    fr: 'OPEN SOURCE · LICENCES',
    en: 'OPEN SOURCE · LICENSES',
    es: 'OPEN SOURCE · LICENCIAS',
    de: 'OPEN SOURCE · LIZENZEN',
    pt: 'OPEN SOURCE · LICENÇAS',
  },

  /** Bandeau (note d'état) de chaque document — la SEULE ligne réellement traduite. */
  legalReference: {
    fr: 'Version française de référence — seul le texte français fait foi.',
    en: 'French reference version — only the French text is legally binding.',
    es: 'Versión de referencia en francés — solo el texto francés da fe.',
    de: 'Französische Referenzfassung — nur der französische Text ist verbindlich.',
    pt: 'Versão de referência em francês — apenas o texto francês faz fé.',
  },

  // ── CGU — Conditions Générales d'Utilisation ────────────────────────────
  cguTitle: {
    fr: 'Conditions d’utilisation',
    en: 'Terms of Use',
    es: 'Condiciones de uso',
    de: 'Nutzungsbedingungen',
    pt: 'Termos de utilização',
  },
  cguObjetHeading: fr5('OBJET & ACCEPTATION'),
  /**
   * ⚠️ L'OBJET DU CONTRAT NE DÉCRIVAIT QU'UNE MOITIÉ DU JEU. Il disait « un jeu
   * de conquête de territoire par la course à pied » — la définition même du
   * service, donc l'endroit où l'omission coûte le plus cher, alors que le vélo
   * capture réellement depuis le 26/07/2026 (`ACTIVITIES = ['run', 'bike']`,
   * `runs.activity`, migration 0070 en production).
   */
  cguObjetBody: fr5(
    'GRYD, édité par NEXUS 1993, est un jeu de conquête de territoire par l’effort réel, dans deux disciplines : la course à pied et le vélo. Chaque sortie réellement enregistrée, dans la discipline que tu déclares, capture ou défend du territoire sur une carte. Les présentes conditions encadrent l’usage de l’application GRYD. En créant un compte ou en utilisant le service, tu les acceptes, de même que la Politique de confidentialité. Elles sont volontairement courtes et lisibles.',
  ),
  cguCompteHeading: fr5('TON COMPTE'),
  /**
   * ⚠️ LA DERNIÈRE PUCE POSAIT UNE CONDITION QU'ELLE NE DISAIT PAS. La
   * suppression n'est armée QUE si une session existe (`confidentialite.tsx:238`
   * : sans `configured && session`, l'écran refuse et le dit). L'affirmer sans
   * réserve promettait au-delà du code ; la phrase porte désormais sa condition.
   */
  cguCompteBody: fr5(
    '· Tu dois avoir au moins {age} ans pour utiliser GRYD.\n· Tu es responsable de la confidentialité de ton accès et des activités menées depuis ton compte.\n· Tu fournis des informations exactes (pseudo, e-mail) et t’engages à ne pas usurper l’identité d’un tiers.\n· Si tu as créé un compte, tu peux le supprimer à tout moment depuis l’application (Réglages, puis Confidentialité).',
  ),
  cguJeuHeading: fr5('RÈGLES DU JEU'),
  /**
   * ⚠️ CLAUSE LA PLUS FAUSSE DU DOCUMENT AVANT LE 26/07/2026 : « uniquement par
   * des courses à pied réelles ». Ce qu'elle dit maintenant est VÉRIFIABLE, et
   * chaque affirmation est adossée à un fait de code — aucune n'est une intention :
   *  · deux disciplines           → `ACTIVITIES = ['run', 'bike']` (game-rules) ;
   *  · déclarée avant de partir   → `runs.activity`, argument `p_activity` de
   *                                 `claim_hexes` (migration 0070, EN PRODUCTION) ;
   *  · un hexagone, deux tenants  → clé primaire COMPOSITE `(h3index, activity)`
   *                                 de `hex_claims` — un claim vélo ne peut pas
   *                                 écraser la zone d'un coureur ;
   *  · points jamais additionnés  → `season_scores` clé `(season_id, user_id,
   *                                 activity)` + `ACTIVITY_SCOPE.seasonPoints` ;
   *  · niveau et XP communs       → `ACTIVITY_SCOPE.xp/level = 'global'`
   *                                 (OVERRIDE FONDATEUR explicite de la planche E12).
   * CE QUI N'EST PAS ÉCRIT, VOLONTAIREMENT : « statistiques séparées ». Le
   * game-rules le dit lui-même en suspens (§4) — `user_stats` et la vue
   * `specialty_leaderboard` sont encore mono-pot. Promettre ici une séparation
   * que le serveur ne tient pas serait exactement la faute qu'on corrige.
   */
  cguJeuBody: fr5(
    'GRYD se joue dans deux disciplines : la course à pied et le vélo. Le territoire se capture uniquement par des sorties réelles, effectuées dans la discipline que tu déclares avant de partir, et validées par nos serveurs. Les deux disciplines forment deux mondes distincts : un même endroit de la carte peut être tenu par un coureur et par un cycliste sans que l’un prenne la zone de l’autre, et les points de saison d’une discipline ne s’ajoutent jamais à ceux de l’autre. Ta progression personnelle — ton niveau et ton expérience — reste commune aux deux : un kilomètre à vélo fait progresser le même joueur qu’un kilomètre à pied. Captures, points, classements et badges sont attribués côté serveur : l’application ne décide jamais seule qu’une zone t’appartient. Chaque discipline a ses propres bornes de distance, de durée et d’allure — celles du vélo ne sont pas celles de la course. Ces règles (bornes de validité, décroissance des zones non défendues) peuvent évoluer pour préserver l’équilibre ; les changements importants sont annoncés dans l’app.',
  ),
  cguTricheHeading: fr5('ANTI-TRICHE & JEU LOYAL'),
  /**
   * ⚠️ CETTE CLAUSE DÉCRIVAIT UN DÉTECTEUR DE PIÉTON (« écarter les parcours
   * impossibles à pied ») ET PROMETTAIT PLUS QUE LE MOTEUR NE TIENT.
   * 1. Ce que GRYD Verify fait VRAIMENT depuis le 26/07 : il compare l'effort aux
   *    bornes de la discipline DÉCLARÉE (`activityRules(activity)` — allures
   *    moyennes et par segment, vitesse instantanée, sauts GPS, précision).
   * 2. Ce qu'il NE fait PAS, et qui est désormais DIT : séparer un cycliste
   *    rapide d'une voiture en ville. `game-rules.ts` l'écrit deux fois
   *    (commentaire de `BIKE_POINT_MAX_SPEED_KMH` : « on ne prétend donc pas que
   *    le vélo est protégé de la voiture : il est protégé du véhicule rapide » ;
   *    « CE QUI RESTE EN SUSPENS » §1 : les signaux d'accélération, d'arrêts et
   *    d'altitude n'existent nulle part). Taire cette limite dans un contrat
   *    aurait été promettre au-delà du code — la faute que ce fichier corrige
   *    depuis le 25/07. La dire ne desserre RIEN : ce que la mesure n'attrape
   *    pas, l'interdit ci-dessous le couvre, et la sanction suit.
   * 3. « cadence » n'est plus listée comme signal : c'est un signal de PODOMÈTRE,
   *    qui ne dit rien d'une sortie à vélo. La politique de confidentialité, elle,
   *    continue de déclarer sa collecte — un contrat n'a pas à énumérer chaque
   *    capteur, une politique RGPD si.
   */
  cguTricheBody1: fr5(
    'GRYD repose sur des efforts réels et sur une discipline déclarée sincèrement. Le système « GRYD Verify » recoupe le GPS, la vitesse et la cohérence du mouvement avec les bornes de la discipline que tu as déclarée : il écarte ce qui n’est pas humainement réalisable dans cette discipline — une allure impossible à pied, une vitesse impossible à vélo — ainsi que les tracés fabriqués. Il ne prétend pas faire davantage : aucune mesure de vitesse ne distingue à elle seule un cycliste rapide d’un véhicule qui roule en ville. C’est pourquoi les pratiques suivantes sont interdites, et sanctionnées :',
  ),
  /**
   * ⚠️ LA LISTE DES FRAUDES NOMMAIT LA FONCTIONNALITÉ LIVRÉE (« vélo »). La
   * réécriture ne retire pas un interdit, elle le remet à sa place : ce qui est
   * fautif n'a jamais été de rouler, c'est de faire passer un effort pour ce
   * qu'il n'est pas. Le cas concret que l'ancienne rédaction visait — pédaler
   * pour gagner des zones de coureur — reste couvert MOT POUR MOT par la
   * première puce, et il l'est mieux : il est nommé, au lieu d'être déduit.
   * NOTE JURIDIQUE : « véhicule à moteur » est employé au sens du code de la
   * route (art. R311-1), qui en EXCLUT le cycle à pédalage assisté. On ne
   * tranche donc pas ici le statut du VAE dans le jeu — ce serait une décision
   * de règles, pas de rédaction, et elle appartient au fondateur.
   */
  cguTricheBody2: fr5(
    '· Déclarer une discipline pour une autre : rouler en déclarant une course à pied, ou courir en déclarant une sortie à vélo. Le vélo est une discipline à part entière de GRYD, avec ses propres zones, ses propres points et ses propres bornes — rouler n’est pas tricher, le faire passer pour une course, si.\n· Faire enregistrer par GRYD un effort produit par un engin motorisé : voiture, deux-roues à moteur, trottinette, gyropode ou tout autre véhicule à moteur.\n· Falsifier sa position (GPS simulé, spoofing), envoyer un tracé fabriqué, ou importer une sortie qui n’est pas la tienne.\n· Utiliser des outils automatisés, bots ou modifications de l’application.\n· Exploiter une faille pour capturer du territoire sans fournir l’effort correspondant.',
  ),
  /** « course » ⇒ « sortie » : la sanction vaut dans les deux disciplines. */
  cguTricheBody3: fr5(
    'Une sortie douteuse peut être rejetée ; un compte qui triche de façon répétée peut être suspendu ou fermé.',
  ),
  cguContenuHeading: fr5('CONTENU & MODÉRATION'),
  /**
   * ⚠️ « MESSAGES DE CREW » DÉCRIVAIT UNE MESSAGERIE QUI N'EXISTE PAS. GRYD n'a
   * pas de chat : le crew échange par SIGNAUX à vocabulaire FERMÉ (catalogue
   * `engine/crewSignals.ts`, pings serveur 0051). Le contenu réellement publié
   * par un joueur, c'est son pseudo, le nom de son crew et ces signaux.
   */
  cguContenuBody1: fr5(
    'Tu restes propriétaire du contenu que tu publies — ton pseudo, le nom de ton crew, les signaux que tu envoies à ton crew — et tu nous accordes une licence non exclusive et gratuite de l’afficher aux autres joueurs pour faire fonctionner le jeu. GRYD ne comporte pas de messagerie libre : les signaux de crew sont choisis dans un vocabulaire fermé. Tu t’engages à ne rien publier d’illégal, haineux, harcelant, sexuellement explicite ou trompeur.',
  ),
  cguContenuBody2: fr5(
    'Nous appliquons une tolérance zéro pour les contenus abusifs. Depuis Réglages, puis Confidentialité, tu peux signaler un joueur ou un contenu inapproprié et bloquer un joueur pour ne plus interagir avec lui.',
  ),
  /** {h} = REPORT_REVIEW_HOURS (features/crew/moderation.ts) — jamais un « 24 » en dur. */
  cguContenuBody3: fr5(
    'Nous nous engageons à examiner tout signalement sous {h} heures. Nous pouvons retirer un contenu et suspendre les comptes qui enfreignent ces règles.',
  ),
  cguAboHeading: fr5('ABONNEMENT & ACHATS — STATUT UNIQUEMENT'),
  /** « se gagne en courant » excluait la moitié des joueurs de la garantie anti-p2w. */
  cguAboBody1: fr5(
    'Le jeu est gratuit et complet. Le territoire ne s’achète jamais : tout ce qui compte au classement — zones, points, victoire — se gagne en courant ou en roulant. Aucun paiement ne donne le moindre avantage de jeu.',
  ),
  cguAboBody2: fr5(
    'GRYD ne propose qu’un seul abonnement, GRYD Club (bonus permanents de confort, d’information en lecture seule, de cosmétique et de statut), aux côtés d’achats ponctuels purement cosmétiques (Founder Pack, Starter Pack, cosmétiques). Aucune de ces offres n’apporte de territoire, de points, de victoire ni de protection : les objets qui touchent au jeu — bouclier, gel de série, information tactique — ne sont vendus dans aucune monnaie et ne sont inclus dans aucun abonnement.',
  ),
  cguAboBody3: fr5(
    'Les achats dans l’application sont traités par Apple (App Store) ou Google (Google Play) : facturation, renouvellement et remboursements suivent les règles de la plateforme. Les abonnements se renouvellent automatiquement jusqu’à leur annulation, que tu gères depuis les réglages de ton compte Apple ou Google. L’annulation prend effet à la fin de la période en cours ; tu conserves tes cosmétiques acquis, jamais tes zones (elles restent à toi tant que tu cours). Les Conditions Générales de Vente précisent prix, paiement et rétractation.',
  ),
  cguRespHeading: fr5('SÉCURITÉ & RESPONSABILITÉ'),
  /**
   * ⚠️ UNE CLAUSE DE SÉCURITÉ QUI NE CONNAÎT QU'UNE DISCIPLINE PROTÈGE MAL LA
   * SECONDE. Elle disait « GRYD se joue en courant » et « ne cours pas dans des
   * lieux dangereux » — or l'app enregistre des sorties à vélo depuis le
   * 26/07/2026, où le risque, l'équipement et le code de la route ne se lisent
   * pas de la même façon. Aucune obligation n'est INVENTÉE ici (pas de casque
   * décrété obligatoire : la loi française ne l'impose qu'aux moins de 12 ans) —
   * la clause renvoie à la règle applicable, elle ne la réécrit pas.
   */
  cguRespBody1: fr5(
    'GRYD se joue dehors, en courant ou à vélo, dans le monde réel. Ta sécurité passe avant le jeu. Respecte le code de la route, ton environnement et tes limites physiques : ne cours pas et ne roule pas dans des lieux dangereux, ne regarde pas ton écran en traversant ni en roulant. À vélo, l’état de ta machine, ton équipement et le respect des règles de circulation restent sous ta seule responsabilité. Demande l’avis d’un professionnel de santé avant de reprendre une activité sportive intense.',
  ),
  cguRespBody2: fr5(
    'Le service est fourni « en l’état » et « selon disponibilité ». Dans toute la mesure permise par la loi, notre responsabilité est limitée aux dommages directs et prévisibles ; nous ne saurions être tenus responsables des dommages liés à ta pratique de la course, à l’usage des données de géolocalisation, ou à une interruption du service. Ces limitations ne s’appliquent ni en cas de faute lourde ou dolosive, ni en cas de dommage corporel, et ne restreignent aucun des droits impératifs que la loi française t’accorde en tant que consommateur.',
  ),
  cguResiliationHeading: fr5('RÉSILIATION'),
  cguResiliationBody: fr5(
    'Tu peux cesser d’utiliser GRYD et supprimer ton compte à tout moment depuis l’application. Nous pouvons suspendre ou fermer un compte qui enfreint ces conditions (triche, contenu abusif, fraude), le cas échéant sans préavis en cas de manquement grave. À la suppression du compte, tes données sont traitées comme décrit dans la Politique de confidentialité.',
  ),
  cguPropHeading: fr5('PROPRIÉTÉ INTELLECTUELLE'),
  cguPropBody: fr5(
    'La marque GRYD, le nom, le logo, la charte graphique, les textes, visuels, interfaces et le code de l’application sont la propriété exclusive de NEXUS 1993, sauf mentions contraires. Toute reproduction ou exploitation, totale ou partielle, sans autorisation écrite préalable, est interdite. « GRYD » est un nom d’usage produit dont la disponibilité à titre de marque reste à vérifier (recherche d’antériorité INPI) avant tout usage public.',
  ),
  cguDroitHeading: fr5('DROIT APPLICABLE & MÉDIATION'),
  cguDroitBody: fr5(
    'Ces conditions sont régies par le droit français. En cas de litige, tu peux recourir gratuitement à une médiation de la consommation avant toute action judiciaire (voir les Conditions Générales de Vente). À défaut d’accord amiable, les tribunaux français sont compétents, dans le respect des règles protectrices du consommateur.',
  ),
  cguContactHeading: fr5('CONTACT'),
  /** {name} / {address} = LEGAL_ENTITY. Voir le commentaire de `contactBody`. */
  cguContactBody: fr5(
    'Une question sur ces conditions ? Écris-nous par courrier : {name}, {address}.',
  ),

  // ── Politique de confidentialité (RGPD) — DISTINCTE des réglages ─────────
  privacyTitle: {
    fr: 'Politique de confidentialité',
    en: 'Privacy Policy',
    es: 'Política de privacidad',
    de: 'Datenschutzerklärung',
    pt: 'Política de privacidade',
  },
  privacyResponsableHeading: fr5('QUI EST RESPONSABLE'),
  privacyResponsableBody1: fr5(
    'Le responsable de traitement est NEXUS 1993 (SASU), éditrice de l’application GRYD, dont le siège est situé {address}. Nous traitons tes données conformément au Règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés.',
  ),
  privacyResponsableBody2: fr5(
    '« GRYD » est le nom du produit ; l’entité juridique reste NEXUS 1993. Pour toute question sur tes données ou pour exercer tes droits, écris-nous par courrier à l’adresse du siège ci-dessus. L’export et la suppression de tes données, eux, s’exercent directement dans l’application (Réglages, puis Confidentialité).',
  ),
  privacyDonneesHeading: fr5('LES DONNÉES QUE NOUS COLLECTONS'),
  privacyDonneesBody1: fr5(
    'Nous collectons uniquement ce qui fait fonctionner le jeu. Aucune donnée n’est captée « au cas où ».',
  ),
  /**
   * ⚠️ TROIS COLLECTES DÉCLARÉES ICI N'AVAIENT PAS LIEU, ET UNE VRAIE MANQUAIT.
   * Retirées : le CHAT de crew (aucune messagerie dans l'app), la SANTÉ importée
   * d'Apple Santé (HealthKit non branché — stub `needs_dev_build`), les
   * RÉACTIONS (persistées en AsyncStorage, elles ne quittent pas l'appareil).
   * Ajoutée : l'IMPORT DE COURSES (fichier GPX, service tiers connecté), qui
   * est un vrai envoi de tracé à nos serveurs et n'était déclaré nulle part.
   *
   * ⚠️ 26/07/2026 — LA FINALITÉ DÉCLARÉE ÉTAIT DEVENUE TROP ÉTROITE. Le
   * podomètre était déclaré lu « pour vérifier qu'il s'agit d'une vraie course à
   * pied » : depuis que le vélo s'enregistre, la donnée est lue sur une sortie
   * qui n'est pas forcément une course, et une finalité RGPD qui ne couvre pas
   * le traitement réel est un défaut juridique. La finalité est réécrite pour
   * dire ce qui est vérifié (la sincérité de l'effort dans la discipline
   * DÉCLARÉE), sans prétendre que chaque capteur sert dans chaque discipline.
   */
  privacyDonneesBody2: fr5(
    '· Compte : ton adresse e-mail et un identifiant (via Sign in with Apple ou un autre fournisseur), ton pseudo et, si tu le choisis, ton crew.\n· Localisation pendant une sortie : ta position GPS, enregistrée uniquement quand tu as lancé une sortie (course à pied ou vélo), pour tracer ton parcours et déterminer le territoire capturé ou défendu. Le suivi s’arrête dès la fin de la sortie.\n· Mouvement & podomètre : cadence, pas et cohérence de mouvement, lus pendant la sortie par « GRYD Verify » pour vérifier que l’effort enregistré est réel et correspond à la discipline que tu as déclarée.\n· Sorties importées, à ton initiative : si tu importes un fichier d’activité (GPX) ou connectes un service de suivi tiers, le tracé et les mesures de l’activité importée sont envoyés à nos serveurs pour être validés comme une sortie GRYD.\n· Contenu que tu crées : ton pseudo, le nom de ton crew si tu en crées un, les signaux que tu envoies à ton crew (vocabulaire fermé, il n’y a pas de messagerie libre) et les signalements que tu nous adresses.\n· Données techniques & de jeu : modèle d’appareil, version de l’app, journaux d’erreur, statistiques de jeu (zones tenues, points, badges).',
  ),
  privacyDonneesBody3: fr5(
    'Nous ne collectons ni tes contacts, ni tes photos, ni tes données de navigation publicitaire, et GRYD ne lit aucune donnée d’Apple Santé ni de Google Health Connect : cette connexion n’existe pas dans l’application. GRYD ne diffuse aucune publicité.',
  ),
  privacyPositionHeading: fr5('TA POSITION N’EST JAMAIS PUBLIQUE'),
  privacyPositionBody1: fr5('C’est un principe non négociable de GRYD, pas une option :'),
  privacyPositionBody2: fr5(
    '· Ta position en temps réel n’est jamais montrée aux autres joueurs. La carte agrège le territoire par zones et par rôle, jamais par position individuelle exacte.\n· Nous ne suivons jamais ta localisation en arrière-plan hors course : aucun point GPS n’est enregistré tant que tu n’as pas lancé une course.\n· Les tracés de tes courses restent privés par défaut. Si tu choisis un jour de partager une course, tu décides quoi partager, à ce moment-là.\n· Les rivaux affichés sur la carte le sont de façon approximative et agrégée — jamais leur position réelle, jamais la tienne.',
  ),
  privacyFinalitesHeading: fr5('POURQUOI & BASE LÉGALE'),
  privacyFinalitesBody1: fr5('Chaque traitement a une finalité précise et une base légale RGPD :'),
  privacyFinalitesBody2: fr5(
    '· Compte & e-mail — créer et sécuriser ton compte, te contacter au sujet du service : exécution du contrat (art. 6.1.b).\n· Localisation pendant une sortie — tracer ton parcours, décider du territoire capturé ou défendu : exécution du contrat (art. 6.1.b).\n· Mouvement & podomètre — vérifier qu’une sortie est réelle et conforme à sa discipline déclarée (anti-triche) : intérêt légitime à l’équité du jeu (art. 6.1.f).\n· Sorties importées — faire compter une sortie enregistrée ailleurs : exécution du contrat (art. 6.1.b), sur ton initiative.\n· Signaux de crew — coordonner une zone avec ton crew : exécution du contrat (art. 6.1.b).\n· Signalements — protéger les joueurs des contenus et comportements abusifs : intérêt légitime à la sécurité des joueurs (art. 6.1.f).\n· Journaux & technique — faire fonctionner l’app, corriger les bugs, prévenir la fraude : intérêt légitime (art. 6.1.f).',
  ),
  privacyFinalitesBody3: fr5(
    'Quand un traitement repose sur le consentement (notifications), tu peux le retirer à tout moment, sans que cela affecte le reste du jeu.',
  ),
  /**
   * ⚠️ CETTE SECTION DÉCRIVAIT UN TRAITEMENT DE DONNÉES DE SANTÉ QUI N'A PAS
   * LIEU. GRYD ne lit ni Apple Santé ni Health Connect (adaptateurs `stub`,
   * aucun module natif en dépendance). La seule donnée de l'article 9 réellement
   * en jeu est la géolocalisation précise — la section le dit maintenant, et
   * énonce l'absence de collecte santé plutôt que de la passer sous silence :
   * l'iPhone affiche une demande d'autorisation Santé (clé Info.plist déclarée),
   * un lecteur pourrait légitimement croire que GRYD s'en sert.
   */
  privacySanteHeading: fr5('GÉOLOCALISATION — DONNÉE SENSIBLE'),
  privacySanteBody1: fr5(
    'La géolocalisation précise est, dans certains cas, une catégorie particulière de données au sens de l’article 9 du RGPD. Nous ne la traitons que pour l’exécution de la course que tu lances toi-même, jamais en arrière-plan hors course, et jamais à des fins de profilage publicitaire.',
  ),
  privacySanteBody2: fr5(
    'GRYD n’importe AUCUNE donnée de santé : l’application n’est connectée ni à Apple Santé (HealthKit) ni à Google Health Connect, et ne lit donc ni ta fréquence cardiaque, ni ton poids, ni ton historique d’entraînement. Les données de mouvement et de podomètre restent sur l’appareil autant que possible et ne sont transmises que pour valider une course. Si un import santé devait ouvrir un jour, il serait facultatif, soumis à ton consentement explicite, et cette politique serait mise à jour AVANT.',
  ),
  privacyPartageHeading: fr5('PARTAGE & SOUS-TRAITANTS'),
  privacyPartageBody1: fr5(
    'Nous ne vendons aucune donnée personnelle. Nous ne cédons ni ne louons tes données à des courtiers ou à des annonceurs. Nous faisons appel à un nombre restreint de sous-traitants techniques, encadrés par contrat, uniquement pour faire tourner le service :',
  ),
  /**
   * ⚠️ LE PAIEMENT ÉTAIT DÉCLARÉ COMME UN TRAITEMENT EN COURS, alors que la CGV
   * du même build affirme qu'aucune offre n'est commercialisée. Deux textes
   * contractuels embarqués qui se contredisaient : la ligne dit désormais l'état
   * RÉEL et ce qui se passera le jour où une offre ouvrira.
   * {provider} / {region} = LEGAL_HOSTING (sourcé, cf. son commentaire).
   */
  /**
   * ⚠ 27/07/2026 — LE SOUS-TRAITANT QUI MANQUAIT À LA LISTE. L'app interroge
   * OpenStreetMap/Nominatim pour NOMMER un lieu : la ville de départ d'un
   * itinéraire (`features/route/geocode.ts`), le nom d'un secteur
   * (`features/map/sectorNaming.ts`) et — depuis le panneau de sécurité E25 — le
   * PAYS où se trouve le coureur, dont dépend le numéro de secours proposé
   * (`features/run/safety/country.ts`). Ces requêtes envoient une position à un
   * tiers ; la liste ci-dessous les passait sous silence, alors qu'elle se
   * présente comme limitative. Un document RGPD qui omet un destinataire est un
   * faux au même titre qu'une donnée fabriquée à l'écran.
   *
   * La ligne dit aussi ce qui LIMITE cette sortie, parce que c'est vrai et
   * vérifiable dans le code : la position du panneau de sécurité est arrondie au
   * dixième de degré (~11 km) avant l'envoi (`COUNTRY_LOOKUP_DECIMALS`), et
   * aucune de ces requêtes ne porte d'identifiant de compte.
   */
  privacyPartageBody2: fr5(
    '· Hébergement & base de données : {provider}, sur des serveurs situés dans l’Union européenne (région {region}, Irlande).\n· Authentification : Apple (Sign in with Apple) et, si tu l’utilises, Google (Sign in with Google).\n· Mesure d’audience produit : PostHog, hébergé dans l’Union européenne — statistiques d’usage agrégées, sans revente ni publicité.\n· Noms de lieux : OpenStreetMap / Nominatim (fondation OSMF), pour nommer une ville, un secteur, ou identifier le pays où tu te trouves quand tu ouvres le panneau de sécurité pendant une sortie. Une position est alors envoyée à ce service, sans aucun identifiant de compte ; pour le panneau de sécurité elle est d’abord arrondie au dixième de degré, soit environ 11 km. Rien n’est envoyé si tu n’ouvres pas ces écrans.\n· Paiement : aucun. Aucune offre payante n’est commercialisée à ce jour, aucun paiement n’est encaissé. Le jour où des achats intégrés ouvriront, ils seront traités par Apple (App Store) ou Google (Google Play) : la plateforme gérerait la transaction, et nous ne verrions jamais ta carte bancaire.',
  ),
  privacyPartageBody3: fr5(
    'Nous pouvons divulguer des données si la loi l’exige (réquisition judiciaire), ou pour protéger nos droits et la sécurité des joueurs.',
  ),
  privacyTransfertHeading: fr5('TRANSFERTS HORS UNION EUROPÉENNE'),
  /**
   * ⚠ 27/07/2026 — CETTE SECTION AFFIRMAIT « aucun transfert hors UE dans le
   * cadre du fonctionnement normal du jeu », alors que le même binaire appelle
   * OpenStreetMap/Nominatim, dont l'infrastructure (fondation OSMF, Royaume-Uni,
   * plus des miroirs) n'est pas garantie européenne. La phrase est corrigée
   * plutôt que le code : le service est nécessaire (sans lui, aucun numéro de
   * secours n'est proposé) et l'exception est nommée, bornée et datée. C'est
   * exactement ce que la dernière phrase de la version précédente promettait de
   * faire — elle n'avait simplement jamais été appliquée.
   */
  privacyTransfertBody: fr5(
    'Tes données de compte et de jeu sont hébergées et traitées dans l’Union européenne. UNE seule exception, et la voici : les requêtes de noms de lieux adressées à OpenStreetMap / Nominatim (voir « Partage des données ») peuvent être servies par une infrastructure située hors de l’Union. Elles ne contiennent aucun identifiant de compte, et la position transmise depuis le panneau de sécurité est arrondie à environ 11 km. Aucun autre transfert hors UE n’a lieu dans le fonctionnement normal du jeu. Si un sous-traitant venait à en impliquer un, il serait encadré par les garanties prévues par le RGPD (clauses contractuelles types de la Commission européenne) et signalé dans la présente politique.',
  ),
  privacyConservationHeading: fr5('DURÉES DE CONSERVATION'),
  privacyConservationBody: fr5(
    '· Compte & données de jeu : tant que ton compte est actif.\n· Après suppression du compte : tes données personnelles sont effacées ou anonymisées sous 30 jours, sauf obligation légale de conservation (facturation, litige).\n· Tracés de tes sorties (course à pied comme vélo) : conservés avec ton compte, supprimés à la suppression du compte.\n· Journaux techniques : conservés au maximum 12 mois, puis effacés.',
  ),
  privacyDroitsHeading: fr5('TES DROITS'),
  privacyDroitsBody1: fr5('Conformément au RGPD, tu disposes des droits suivants sur tes données :'),
  privacyDroitsBody2: fr5(
    '· Accès & portabilité : obtenir une copie de tes données dans un format lisible (export).\n· Rectification : corriger une donnée inexacte (pseudo, e-mail).\n· Effacement : supprimer ton compte et tes données, directement depuis l’application (Réglages, puis Confidentialité), avec confirmation. La suppression rend ton profil invisible immédiatement, puis purge tes données serveur et locales.\n· Opposition & limitation : t’opposer à un traitement fondé sur l’intérêt légitime, ou en demander la limitation.\n· Retrait du consentement : couper à tout moment l’accès santé ou les notifications.',
  ),
  privacyDroitsBody3: fr5(
    'Pour exercer tes droits, utilise l’export et la suppression dans l’application (Réglages, puis Confidentialité), ou écris-nous par courrier à l’adresse du siège. Tu peux aussi introduire une réclamation auprès de la CNIL (Commission nationale de l’informatique et des libertés, cnil.fr).',
  ),
  privacySecuriteHeading: fr5('SÉCURITÉ'),
  privacySecuriteBody: fr5(
    'Les échanges sont chiffrés en transit (HTTPS). L’accès à la base de données est cloisonné par des règles de sécurité au niveau de chaque ligne (RLS) : un joueur ne peut jamais lire ou écrire les données d’un autre. L’écriture des sorties et des captures de territoire passe exclusivement par nos serveurs, jamais directement par l’app cliente, ce qui empêche toute triche et protège l’intégrité de tes données.',
  ),
  privacyMineursHeading: fr5('MINEURS'),
  privacyMineursBody: fr5(
    'GRYD est réservé aux personnes âgées d’au moins {age} ans. Nous ne collectons pas sciemment de données concernant des personnes plus jeunes. Si tu penses qu’un mineur de moins de {age} ans nous a transmis des données, écris-nous par courrier à l’adresse du siège et nous les supprimerons.',
  ),
  privacyModifsHeading: fr5('MODIFICATIONS'),
  privacyModifsBody: fr5(
    'Nous pouvons faire évoluer cette politique. En cas de changement important, nous t’en informons dans l’application. La date de dernière mise à jour figure en haut de cette page.',
  ),
  privacyContactHeading: fr5('CONTACT'),
  /** {name} / {address} = LEGAL_ENTITY : le canal est nommé ICI, pas renvoyé ailleurs. */
  privacyContactBody: fr5(
    'Une question sur tes données ? Écris-nous par courrier : {name}, {address}. Tu peux aussi saisir la CNIL (cnil.fr).',
  ),
  /**
   * Ligne-lien de PIED de la politique (patron `ListRow` de navigation) : le
   * document DÉCRIT des droits, l'écran de réglages les EXÉCUTE. Le texte
   * renvoyait vers « Réglages, puis Confidentialité » sans y mener, alors que la
   * route existe. Jamais un CTA chartreuse : un document ne porte pas la
   * décision de l'écran, il y conduit.
   */
  privacyExerciseRow: {
    fr: 'Exercer mes droits',
    en: 'Exercise my rights',
    es: 'Ejercer mis derechos',
    de: 'Meine Rechte ausüben',
    pt: 'Exercer meus direitos',
  },
  privacyExerciseHint: {
    fr: 'Export et suppression, dans les réglages',
    en: 'Export and deletion, in settings',
    es: 'Exportación y eliminación, en los ajustes',
    de: 'Export und Löschung, in den Einstellungen',
    pt: 'Exportação e exclusão, nas configurações',
  },

  // ── CGV — Conditions Générales de Vente ─────────────────────────────────
  /**
   * TITRE DE BARRE COURT, dans les cinq langues. « Allgemeine
   * Verkaufsbedingungen » (261 px) débordait de la barre (241 px disponibles) et
   * finissait en « … » — §A.9, aucun texte n'est coupé par une ellipse. Le
   * titre de barre est un REPÈRE de navigation : la dénomination complète du
   * document reste dans le kicker (« CONDITIONS · VENTE ») et dans le corps, qui
   * dit « les présentes CGV ». Même arbitrage que les CGU, déjà titrées
   * « Conditions d'utilisation ».
   */
  cgvTitle: {
    fr: 'Conditions de vente',
    en: 'Terms of Sale',
    es: 'Condiciones de venta',
    de: 'Verkaufsbedingungen',
    pt: 'Condições de venda',
  },
  cgvObjetHeading: fr5('OBJET & CHAMP D’APPLICATION'),
  cgvObjetBody: fr5(
    'Les présentes CGV s’appliquent à toute souscription d’une offre payante GRYD par un consommateur (personne physique agissant à des fins non professionnelles). Toute souscription implique leur acceptation pleine et entière. Elles complètent les Conditions d’utilisation (usage du jeu) et la Politique de confidentialité, et priment sur tout autre document, sous réserve des règles impératives applicables aux plateformes de distribution (Apple, Google). Le jeu, le territoire et la progression restent entièrement gratuits : aucune offre payante ne procure d’avantage de jeu.',
  ),
  cgvVendeurHeading: fr5('VENDEUR'),
  cgvVendeurBody: fr5(
    'Vendeur : {name} ({form}) au capital de {capital}, siège social {address}, immatriculée au RCS de {rcs} sous le numéro {siren}, TVA intracommunautaire {vat}. Contact : par courrier à l’adresse du siège ci-dessus. Le détail complet de l’éditeur figure dans les Mentions légales.',
  ),
  cgvOffresHeading: fr5('OFFRES & PRIX'),
  cgvOffresBody1: fr5(
    'GRYD est jouable gratuitement dans son intégralité. Les offres payantes portent uniquement sur des éléments de confort et de statut : elles ne donnent ni territoire, ni points, ni victoire.',
  ),
  /**
   * TROIS PUCES, TROIS PARAGRAPHES. Elles étaient empilées dans une seule
   * chaîne : une liste écrite comme un bloc n'est pas une liste, et la troisième
   * — celle qui dit ce qui n'est JAMAIS vendu, donc la garantie anti-pay-to-win —
   * était la moins visible des trois.
   */
  cgvOffresAbonnement: fr5(
    '· Abonnement (unique) — GRYD Club, mensuel ou annuel : bonus permanents de confort, d’information en lecture seule et de statut (stats avancées, historique complet, filtres de classement, templates de partage). Il ne comprend ni bouclier, ni gel de série, ni information tactique, ni protection de zone, ni avantage territorial d’aucune sorte.',
  ),
  cgvOffresPonctuels: fr5(
    '· Achats ponctuels — Founder Pack (à vie, édition limitée), Starter Pack et packs cosmétiques. Ils ne contiennent que du cosmétique, du statut et de la monnaie de style.',
  ),
  cgvOffresJamaisVendus: fr5(
    '· Ne sont vendus dans AUCUNE monnaie et ne sont inclus dans aucune offre : les objets qui touchent au jeu — bouclier de zone, gel de série, information tactique sur une zone, alerte d’attaque anticipée. Aucun paiement ne les procure, directement ou indirectement.',
  ),
  /**
   * LE FAIT QUI PRIME — rendu en CHAPEAU du document, pas en 3ᵉ position d'une
   * section « Offres & prix ». C'est la vérité la plus importante des CGV : rien
   * n'est en vente. Un lecteur qui ne lit que la première ligne doit la connaître.
   *
   * MIROIR EXACT de la clause d'état du /cgv du site. Les deux CGV sont le MÊME
   * document contractuel : les laisser diverger serait pire que la faute
   * d'origine — un lecteur pourrait opposer la version qui l'arrange.
   */
  cgvStatusIntro: fr5(
    'À la date d’entrée en vigueur indiquée ci-dessus, AUCUNE offre payante n’est commercialisée. Aucun paiement n’est encaissable, ni sur le site ni dans l’application. Les tarifs annoncés sur les pages d’offres sont indicatifs tant qu’aucune vente n’est ouverte : ils ne constituent ni une offre ferme, ni un engagement de mise en vente à une date donnée.',
  ),
  cgvOffresBody3: fr5(
    'Les tarifs sont indiqués en euros, toutes taxes comprises (TTC), sur les pages d’offres et rappelés avant la validation de la commande : le prix applicable est celui affiché à ce moment-là. Sur l’App Store et Google Play, les prix suivent les paliers tarifaires de la plateforme. Le vendeur se réserve le droit de modifier ses prix, sans effet sur les commandes déjà validées.',
  ),
  cgvCommandeHeading: fr5('COMMANDE & PAIEMENT'),
  cgvCommandeBody1: fr5(
    'La souscription s’effectue via les achats intégrés Apple (App Store) ou Google (Google Play). Le paiement, la facturation, le renouvellement et les remboursements sont alors gérés par la plateforme et soumis à ses propres conditions ; les demandes de remboursement se font directement auprès d’Apple ou de Google.',
  ),
  cgvCommandeBody2: fr5(
    'L’accès aux avantages est activé immédiatement après le paiement. Une confirmation est fournie par la plateforme.',
  ),
  cgvRetractationHeading: fr5('DROIT DE RÉTRACTATION'),
  cgvRetractationBody1: fr5(
    'Conformément aux articles L221-18 et suivants du Code de la consommation, tu disposes d’un délai de 14 jours pour te rétracter, sans motif.',
  ),
  cgvRetractationBody2: fr5(
    'Toutefois, l’abonnement et les achats donnent accès à un contenu numérique fourni immédiatement. En validant ta souscription via l’App Store ou Google Play, tu demandes que l’exécution du service commence sans attendre la fin du délai de 14 jours et tu acceptes que ton droit de rétractation ne puisse plus s’exercer une fois le service pleinement exécuté (art. L221-28, 13° du Code de la consommation).',
  ),
  cgvRetractationBody3: fr5(
    'Pour les achats réalisés via l’App Store ou Google Play, les conditions et remboursements de la plateforme s’appliquent en complément.',
  ),
  cgvDureeHeading: fr5('DURÉE, RECONDUCTION & RÉSILIATION'),
  cgvDureeBody1: fr5(
    'L’abonnement GRYD Club est souscrit pour la période choisie (mensuelle ou annuelle) et se renouvelle par tacite reconduction pour des périodes identiques, sauf résiliation.',
  ),
  cgvDureeBody2: fr5(
    'Pour un abonnement souscrit via l’App Store ou Google Play, la gestion et la résiliation s’effectuent depuis les réglages de ton compte Apple ou Google ; la résiliation prend effet à la fin de la période en cours. Le Founder Pack est un achat unique, non reconductible. Aucune période entamée n’est remboursée, sauf disposition légale contraire.',
  ),
  cgvGarantiesHeading: fr5('GARANTIES LÉGALES'),
  cgvGarantiesBody: fr5(
    'Tu bénéficies de la garantie légale de conformité (art. L217-1 et suivants du Code de la consommation) et de la garantie contre les vices cachés (art. 1641 et suivants du Code civil), indépendamment de toute garantie commerciale. Pour un service numérique non conforme, tu peux en exiger la mise en conformité ou, à défaut, une réduction du prix ou la résolution du contrat.',
  ),
  cgvMediationHeading: fr5('RÉCLAMATIONS & MÉDIATION'),
  /**
   * ⚠️ DEUX DÉFAUTS CORRIGÉS DANS LA MÊME CLAUSE.
   * 1. La réclamation PRÉALABLE (art. L612-1 : la médiation n'est ouverte
   *    qu'après une réclamation écrite au professionnel) désignait un chemin qui
   *    ne mène nulle part — `/support` n'a ni adresse, ni formulaire, ni
   *    `mailto:`. Une voie de recours qui n'existe pas est pire qu'une voie
   *    absente : elle fait perdre le délai. Le canal est maintenant le courrier.
   * 2. Le renvoi vers la plateforme européenne RLL (`ec.europa.eu/consumers/odr`)
   *    a été RETIRÉ, pas seulement rendu cliquable : cette plateforme a cessé son
   *    activité. Peindre un recours fermé, en texte mort de surcroît, cumulait
   *    les deux fautes — une promesse au-delà du réel, et un lien inatteignable.
   */
  cgvMediationBody1: fr5(
    'Toute réclamation peut nous être adressée par courrier, à l’adresse du siège indiquée à l’article Vendeur ; nous nous efforçons de la traiter dans les meilleurs délais.',
  ),
  cgvMediationBody2: fr5(
    'La médiation de la consommation prévue par l’article L612-1 du Code de la consommation est ouverte à tout consommateur en cas de litige non résolu, après une réclamation écrite adressée au vendeur. À ce jour, NEXUS 1993 n’a pas encore désigné de médiateur ; ses coordonnées seront publiées dans les présentes conditions dès sa désignation. Tu conserves à tout moment la faculté de saisir les tribunaux compétents.',
  ),
  cgvDonneesHeading: fr5('DONNÉES PERSONNELLES'),
  cgvDonneesBody: fr5(
    'Les données collectées lors d’une commande sont traitées conformément à notre Politique de confidentialité (RGPD).',
  ),
  cgvDroitHeading: fr5('DROIT APPLICABLE & LITIGES'),
  cgvDroitBody: fr5(
    'Les présentes CGV sont soumises au droit français. En cas de litige, une solution amiable est recherchée en priorité ; à défaut, les tribunaux français sont compétents, dans le respect des règles protectrices du consommateur.',
  ),

  // ── Licences open source ────────────────────────────────────────────────
  licencesTitle: {
    fr: 'Licences open source',
    en: 'Open source licenses',
    es: 'Licencias de código abierto',
    de: 'Open-Source-Lizenzen',
    pt: 'Licenças de código aberto',
  },
  licencesIntroHeading: fr5('GRYD & L’OPEN SOURCE'),
  licencesIntroBody: fr5(
    'GRYD est bâti sur des logiciels libres et open source. Nous remercions leurs auteurs et leurs communautés. Chaque bibliothèque est distribuée sous sa propre licence ; le texte complet de chaque licence et les mentions de droits d’auteur sont disponibles auprès de chaque projet et, sur demande écrite adressée au siège, auprès de nous.',
  ),
  licencesMitHeading: fr5('LICENCE MIT'),
  /**
   * QUATORZE BIBLIOTHÈQUES SÉPARÉES PAR DES « ; » DANS UN SEUL PARAGRAPHE : ce
   * n'était pas une mention, c'était un mur. Une liste se rend comme une liste
   * (`LegalDoc` accepte un tableau de paragraphes).
   */
  licencesMitReact: fr5('· React, React DOM, React Native, React Native Web — Meta et les contributeurs du projet.'),
  licencesMitExpo: fr5(
    '· Expo et ses modules — routeur, localisation, notifications, capteurs, GPS, partage, presse-papiers, fichiers, navigateur intégré, chiffrement — Expo (650 Industries, Inc.).',
  ),
  licencesMitSupabase: fr5('· Le SDK Supabase (@supabase/supabase-js) — Supabase et les contributeurs du projet.'),
  licencesMitMap: fr5('· MapLibre React Native — les contributeurs du projet MapLibre.'),
  licencesMitRn: fr5(
    '· react-native-svg, react-native-safe-area-context, react-native-screens, react-native-qrcode-svg, react-native-view-shot, @react-native-async-storage/async-storage — leurs auteurs respectifs.',
  ),
  licencesBsdHeading: fr5('LICENCE BSD 3-CLAUSES'),
  licencesBsdBody: fr5(
    'MapLibre GL (maplibre-gl) — moteur de rendu cartographique, distribué sous licence BSD à 3 clauses par les contributeurs du projet MapLibre.',
  ),
  licencesApacheHeading: fr5('LICENCE APACHE 2.0'),
  licencesApacheBody: fr5(
    'H3 (h3-js) — système d’indexation géospatiale hexagonale, distribué sous licence Apache 2.0 par Uber Technologies, Inc.',
  ),
  /**
   * ⚠️ SECTION MANQUANTE, ET C'ÉTAIT UNE OBLIGATION NON TENUE. Les trois familles
   * de caractères de Night Print sont chargées au démarrage (`src/lib/fonts.ts`)
   * et publiées sous `MIT AND OFL-1.1` : la SIL Open Font License 1.1 EXIGE que
   * la mention de copyright et de licence accompagne la distribution. L'écran ne
   * connaissait que MIT / BSD / Apache — la condition d'usage des fontes n'était
   * pas remplie. Les lignes de copyright sont RECOPIÉES des fichiers
   * `LICENSE_FONT` des paquets installés, pas reconstituées de mémoire.
   */
  licencesOflHeading: fr5('SIL OPEN FONT LICENSE 1.1'),
  licencesOflBody1: fr5(
    'Les trois familles de caractères embarquées dans GRYD sont distribuées sous SIL Open Font License, Version 1.1, qui autorise leur usage — y compris commercial — à condition de conserver leurs mentions de droits d’auteur et de licence. Les voici :',
  ),
  licencesOflBody2: fr5(
    '· Inter — Copyright 2020 The Inter Project Authors (github.com/rsms/inter).\n· Inter Tight — Copyright 2022 The Inter Project Authors (github.com/rsms/inter-tight).\n· JetBrains Mono — Copyright 2020 The JetBrains Mono Project Authors (github.com/JetBrains/JetBrainsMono).',
  ),
  licencesOflBody3: fr5(
    'Elles sont installées via les paquets @expo-google-fonts (code sous licence MIT, fontes sous SIL OFL 1.1). Le texte intégral de la licence est publié sur scripts.sil.org/OFL.',
  ),
  /**
   * Un paquet dont le `package.json` publié ne déclare AUCUNE licence. Le dire
   * vaut mieux que de lui en attribuer une de mémoire : une mention de licence
   * fausse est une faute au même titre qu'une mention absente.
   */
  licencesUndeclaredHeading: fr5('LICENCE NON DÉCLARÉE PAR LE PAQUET'),
  licencesUndeclaredBody: fr5(
    'posthog-react-native (PostHog) — le paquet publié ne déclare pas de licence dans ses métadonnées et n’en embarque pas le texte. Sa licence est celle publiée par le projet dont il provient (posthog-js-lite) ; nous ne lui en attribuons pas une autre ici.',
  ),
  licencesFullHeading: fr5('TEXTES COMPLETS'),
  licencesFullBody: fr5(
    'Les licences MIT, BSD 3-Clauses, Apache 2.0 et SIL OFL 1.1 autorisent la réutilisation de ces bibliothèques et de ces fontes, y compris dans un produit commercial, à condition d’en conserver les mentions de droits d’auteur et de licence. Ces mentions accompagnent le code distribué ; leur texte intégral peut t’être communiqué sur demande écrite adressée au siège.',
  ),
  /**
   * Ce que cette page NE couvre PAS, dit à sa place (en dernier, comme le
   * scanner absent de `qr.tsx`) : les dépendances TRANSITIVES. Prétendre le
   * contraire serait une exhaustivité inventée.
   */
  licencesScopeHeading: fr5('PÉRIMÈTRE DE CETTE PAGE'),
  licencesScopeBody: fr5(
    'Cette page liste les bibliothèques et fontes que GRYD embarque directement. Les composants dont elles dépendent à leur tour portent leurs propres licences, publiées par leurs projets respectifs.',
  ),
});
