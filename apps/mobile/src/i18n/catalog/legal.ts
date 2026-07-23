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
 * Date de dernière mise à jour des documents légaux embarqués. UNE seule vérité :
 * les cinq écrans (CGU, confidentialité, CGV, licences, mentions) la partagent.
 * Format neutre jj/mm/aaaa — lisible dans les cinq langues, sans nom de mois à
 * traduire. À faire évoluer À LA MAIN à chaque changement de fond (comme la date
 * des pages web) : une date figée qui dérive silencieusement serait un mensonge.
 */
export const LEGAL_LAST_UPDATED = '23/07/2026';

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
  hostingBody: {
    fr: 'Les données de GRYD sont hébergées par Supabase, sur des serveurs situés dans l’Union européenne (région eu-west-1, Irlande).',
    en: 'GRYD data is hosted by Supabase, on servers located in the European Union (eu-west-1 region, Ireland).',
    es: 'Los datos de GRYD están alojados por Supabase, en servidores situados en la Unión Europea (región eu-west-1, Irlanda).',
    de: 'Die Daten von GRYD werden von Supabase auf Servern in der Europäischen Union gehostet (Region eu-west-1, Irland).',
    pt: 'Os dados da GRYD são hospedados pela Supabase, em servidores na União Europeia (região eu-west-1, Irlanda).',
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
   */
  dataBody: {
    fr: 'Tu peux récupérer une copie de tes données et supprimer ton compte à tout moment, depuis Réglages puis Confidentialité. La suppression rend ton profil invisible immédiatement, puis efface définitivement tes données à l’issue d’un délai — te reconnecter avant la fin de ce délai annule la suppression.',
    en: 'You can download a copy of your data and delete your account at any time, from Settings then Privacy. Deletion hides your profile immediately, then permanently erases your data after a delay — signing back in before the end of that delay cancels the deletion.',
    es: 'Puedes descargar una copia de tus datos y eliminar tu cuenta cuando quieras, desde Ajustes y luego Privacidad. La eliminación oculta tu perfil de inmediato y borra definitivamente tus datos tras un plazo — volver a iniciar sesión antes del final de ese plazo cancela la eliminación.',
    de: 'Du kannst jederzeit eine Kopie deiner Daten herunterladen und dein Konto löschen, unter Einstellungen und dann Datenschutz. Die Löschung blendet dein Profil sofort aus und entfernt deine Daten nach einer Frist endgültig — meldest du dich vorher wieder an, wird die Löschung abgebrochen.',
    pt: 'Você pode baixar uma cópia dos seus dados e excluir sua conta quando quiser, em Configurações e depois Privacidade. A exclusão oculta seu perfil imediatamente e apaga definitivamente seus dados após um prazo — entrar novamente antes do fim desse prazo cancela a exclusão.',
  },

  // ── Contact ──
  contactHeading: {
    fr: 'CONTACT',
    en: 'CONTACT',
    es: 'CONTACTO',
    de: 'KONTAKT',
    pt: 'CONTATO',
  },
  contactBody: {
    fr: 'Pour toute question, une réclamation ou l’exercice de tes droits : écris-nous depuis la page Support.',
    en: 'For any question, complaint or to exercise your rights: contact us from the Support page.',
    es: 'Para cualquier pregunta, reclamación o para ejercer tus derechos: escríbenos desde la página de Soporte.',
    de: 'Bei Fragen, Beschwerden oder zur Ausübung deiner Rechte: schreib uns über die Support-Seite.',
    pt: 'Para qualquer dúvida, reclamação ou para exercer seus direitos: fale conosco pela página de Suporte.',
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
  /** Bandeau (intro) de chaque document — la SEULE ligne réellement traduite. */
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
  cguObjetBody: fr5(
    'GRYD, édité par NEXUS 1993, est un jeu de conquête de territoire par la course à pied : chaque course réelle capture ou défend du territoire sur une carte. Les présentes conditions encadrent l’usage de l’application GRYD. En créant un compte ou en utilisant le service, tu les acceptes, de même que la Politique de confidentialité. Elles sont volontairement courtes et lisibles.',
  ),
  cguCompteHeading: fr5('TON COMPTE'),
  cguCompteBody: fr5(
    '· Tu dois avoir au moins {age} ans pour utiliser GRYD.\n· Tu es responsable de la confidentialité de ton accès et des activités menées depuis ton compte.\n· Tu fournis des informations exactes (pseudo, e-mail) et t’engages à ne pas usurper l’identité d’un tiers.\n· Tu peux supprimer ton compte à tout moment depuis l’application (Réglages, puis Confidentialité).',
  ),
  cguJeuHeading: fr5('RÈGLES DU JEU'),
  cguJeuBody: fr5(
    'Le territoire se capture uniquement par des courses à pied réelles, validées par nos serveurs. Captures, points, classements et badges sont attribués côté serveur : l’application ne décide jamais seule qu’une zone t’appartient. Les règles de jeu (distances, allures valides, décroissance des zones non défendues) peuvent évoluer pour préserver l’équilibre ; les changements importants sont annoncés dans l’app.',
  ),
  cguTricheHeading: fr5('ANTI-TRICHE & JEU LOYAL'),
  cguTricheBody1: fr5(
    'GRYD repose sur des courses honnêtes. Le système « GRYD Verify » recoupe GPS, vitesse, cadence et cohérence de mouvement pour écarter les parcours impossibles à pied. Sont interdits :',
  ),
  cguTricheBody2: fr5(
    '· Simuler une course (voiture, vélo, GPS falsifié, spoofing de position).\n· Utiliser des outils automatisés, bots ou modifications de l’application.\n· Exploiter une faille pour capturer du territoire sans courir réellement.',
  ),
  cguTricheBody3: fr5(
    'Une course douteuse peut être rejetée ; un compte qui triche de façon répétée peut être suspendu ou fermé.',
  ),
  cguContenuHeading: fr5('CONTENU & MODÉRATION'),
  cguContenuBody1: fr5(
    'Tu restes propriétaire du contenu que tu publies (messages de crew, pseudo, nom de crew) et tu nous accordes une licence non exclusive et gratuite de l’afficher aux autres joueurs pour faire fonctionner le jeu. Tu t’engages à ne rien publier d’illégal, haineux, harcelant, sexuellement explicite ou trompeur.',
  ),
  cguContenuBody2: fr5(
    'Nous appliquons une tolérance zéro pour les contenus abusifs. Dans l’application, tu peux signaler un message, un membre ou un contenu inapproprié, et bloquer un utilisateur pour ne plus voir ses messages ni interagir avec lui.',
  ),
  cguContenuBody3: fr5(
    'Les signalements sont traités sous 24 heures. Nous pouvons retirer un contenu et suspendre les comptes qui enfreignent ces règles.',
  ),
  cguAboHeading: fr5('ABONNEMENT & ACHATS — STATUT UNIQUEMENT'),
  cguAboBody1: fr5(
    'Le jeu est gratuit et complet. Le territoire ne s’achète jamais : tout ce qui compte au classement — zones, points, victoire — se gagne en courant. Aucun paiement ne donne le moindre avantage de jeu.',
  ),
  cguAboBody2: fr5(
    'GRYD ne propose qu’un seul abonnement, GRYD Club (bonus permanents de confort, d’information en lecture seule, de cosmétique et de statut), aux côtés d’achats ponctuels purement cosmétiques (Founder Pack, Starter Pack, cosmétiques). Aucune de ces offres n’apporte de territoire, de points, de victoire ni de protection : les objets qui touchent au jeu — bouclier, gel de série, information tactique — ne sont vendus dans aucune monnaie et ne sont inclus dans aucun abonnement.',
  ),
  cguAboBody3: fr5(
    'Les achats dans l’application sont traités par Apple (App Store) ou Google (Google Play) : facturation, renouvellement et remboursements suivent les règles de la plateforme. Les abonnements se renouvellent automatiquement jusqu’à leur annulation, que tu gères depuis les réglages de ton compte Apple ou Google. L’annulation prend effet à la fin de la période en cours ; tu conserves tes cosmétiques acquis, jamais tes zones (elles restent à toi tant que tu cours). Les Conditions Générales de Vente précisent prix, paiement et rétractation.',
  ),
  cguRespHeading: fr5('SÉCURITÉ & RESPONSABILITÉ'),
  cguRespBody1: fr5(
    'GRYD se joue en courant dans le monde réel. Ta sécurité passe avant le jeu. Respecte le code de la route, ton environnement et tes limites physiques : ne cours pas dans des lieux dangereux, ne regarde pas ton écran en traversant. Demande l’avis d’un professionnel de santé avant de reprendre une activité sportive intense.',
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
  cguContactBody: fr5(
    'Une question sur ces conditions ? Écris-nous depuis la page Support de l’application.',
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
    '« GRYD » est le nom du produit ; l’entité juridique reste NEXUS 1993. Pour toute question sur tes données ou pour exercer tes droits, écris-nous depuis la page Support de l’application, ou par courrier à l’adresse du siège.',
  ),
  privacyDonneesHeading: fr5('LES DONNÉES QUE NOUS COLLECTONS'),
  privacyDonneesBody1: fr5(
    'Nous collectons uniquement ce qui fait fonctionner le jeu. Aucune donnée n’est captée « au cas où ».',
  ),
  privacyDonneesBody2: fr5(
    '· Compte : ton adresse e-mail et un identifiant (via Sign in with Apple ou un autre fournisseur), ton pseudo et, si tu le choisis, ton crew.\n· Localisation pendant une course : ta position GPS, enregistrée uniquement quand tu as lancé une course, pour tracer ton parcours et déterminer le territoire capturé ou défendu. Le suivi s’arrête dès la fin de la course.\n· Mouvement & podomètre : cadence, pas et cohérence de mouvement, lus pendant la course par « GRYD Verify » pour vérifier qu’il s’agit d’une vraie course à pied.\n· Santé importée (optionnelle) : si tu l’autorises explicitement, des données d’entraînement (fréquence cardiaque, distances) importées depuis Apple Santé / HealthKit. Autorisation facultative et révocable à tout moment.\n· Contenu que tu crées : messages de chat de crew, noms de crew, réactions.\n· Données techniques & de jeu : modèle d’appareil, version de l’app, journaux d’erreur, statistiques de jeu (zones tenues, points, badges).',
  ),
  privacyDonneesBody3: fr5(
    'Nous ne collectons ni tes contacts, ni tes photos, ni tes données de navigation publicitaire. GRYD ne diffuse aucune publicité.',
  ),
  privacyPositionHeading: fr5('TA POSITION N’EST JAMAIS PUBLIQUE'),
  privacyPositionBody1: fr5('C’est un principe non négociable de GRYD, pas une option :'),
  privacyPositionBody2: fr5(
    '· Ta position en temps réel n’est jamais montrée aux autres joueurs. La carte agrège le territoire par zones et par rôle, jamais par position individuelle exacte.\n· Nous ne suivons jamais ta localisation en arrière-plan hors course : aucun point GPS n’est enregistré tant que tu n’as pas lancé une course.\n· Les tracés de tes courses restent privés par défaut. Si tu choisis un jour de partager une course, tu décides quoi partager, à ce moment-là.\n· Les rivaux affichés sur la carte le sont de façon approximative et agrégée — jamais leur position réelle, jamais la tienne.',
  ),
  privacyFinalitesHeading: fr5('POURQUOI & BASE LÉGALE'),
  privacyFinalitesBody1: fr5('Chaque traitement a une finalité précise et une base légale RGPD :'),
  privacyFinalitesBody2: fr5(
    '· Compte & e-mail — créer et sécuriser ton compte, te contacter au sujet du service : exécution du contrat (art. 6.1.b).\n· Localisation en course — tracer ton parcours, décider du territoire capturé ou défendu : exécution du contrat (art. 6.1.b).\n· Mouvement & podomètre — vérifier qu’une course est réelle (anti-triche) : intérêt légitime à l’équité du jeu (art. 6.1.f).\n· Santé importée — enrichir ton résumé de course : consentement explicite (art. 6.1.a et 9.2.a).\n· Contenu de crew — chat et vie de communauté : exécution du contrat (art. 6.1.b).\n· Journaux & technique — faire fonctionner l’app, corriger les bugs, prévenir la fraude : intérêt légitime (art. 6.1.f).',
  ),
  privacyFinalitesBody3: fr5(
    'Quand un traitement repose sur le consentement (santé importée, notifications), tu peux le retirer à tout moment, sans que cela affecte le reste du jeu.',
  ),
  privacySanteHeading: fr5('GÉOLOCALISATION & SANTÉ — DONNÉES SENSIBLES'),
  privacySanteBody1: fr5(
    'Les données de santé, et dans certains cas la géolocalisation précise, sont des catégories particulières de données au sens de l’article 9 du RGPD. Nous ne les traitons que sur la base de ton consentement explicite (santé importée) ou pour l’exécution de la course que tu lances toi-même (géolocalisation pendant une course), et jamais à des fins de profilage publicitaire.',
  ),
  privacySanteBody2: fr5(
    'Si tu autorises GRYD à lire des données depuis Apple Santé (HealthKit) : elles servent uniquement à enrichir ton expérience de course (résumé, historique), jamais à de la publicité ni à du marketing, et ne sont jamais revendues ni partagées avec des tiers à des fins publicitaires ou de courtage de données. Tu peux couper cet accès à tout moment depuis Réglages, Confidentialité, Santé sur ton iPhone — GRYD continue de fonctionner sans. Les données de mouvement / podomètre restent sur l’appareil autant que possible et ne sont transmises que pour valider une course.',
  ),
  privacyPartageHeading: fr5('PARTAGE & SOUS-TRAITANTS'),
  privacyPartageBody1: fr5(
    'Nous ne vendons aucune donnée personnelle. Nous ne cédons ni ne louons tes données à des courtiers ou à des annonceurs. Nous faisons appel à un nombre restreint de sous-traitants techniques, encadrés par contrat, uniquement pour faire tourner le service :',
  ),
  privacyPartageBody2: fr5(
    '· Hébergement & base de données : Supabase, sur des serveurs situés dans l’Union européenne (région eu-west-1, Irlande).\n· Authentification : Apple (Sign in with Apple).\n· Mesure d’audience produit : PostHog, hébergé dans l’Union européenne — statistiques d’usage agrégées, sans revente ni publicité.\n· Paiement : Apple (In-App Purchase) ou Google (Google Play) pour l’abonnement et les achats ponctuels ; la plateforme gère la transaction, nous ne voyons pas ta carte bancaire.',
  ),
  privacyPartageBody3: fr5(
    'Nous pouvons divulguer des données si la loi l’exige (réquisition judiciaire), ou pour protéger nos droits et la sécurité des joueurs.',
  ),
  privacyTransfertHeading: fr5('TRANSFERTS HORS UNION EUROPÉENNE'),
  privacyTransfertBody: fr5(
    'Tes données sont hébergées et traitées dans l’Union européenne. Nous ne procédons à aucun transfert hors UE dans le cadre du fonctionnement normal du jeu. Si un sous-traitant venait à impliquer un tel transfert, il serait encadré par les garanties prévues par le RGPD (clauses contractuelles types de la Commission européenne) et signalé dans la présente politique.',
  ),
  privacyConservationHeading: fr5('DURÉES DE CONSERVATION'),
  privacyConservationBody: fr5(
    '· Compte & données de jeu : tant que ton compte est actif.\n· Après suppression du compte : tes données personnelles sont effacées ou anonymisées sous 30 jours, sauf obligation légale de conservation (facturation, litige).\n· Tracés de course : conservés avec ton compte, supprimés à la suppression du compte.\n· Journaux techniques : conservés au maximum 12 mois, puis effacés.',
  ),
  privacyDroitsHeading: fr5('TES DROITS'),
  privacyDroitsBody1: fr5('Conformément au RGPD, tu disposes des droits suivants sur tes données :'),
  privacyDroitsBody2: fr5(
    '· Accès & portabilité : obtenir une copie de tes données dans un format lisible (export).\n· Rectification : corriger une donnée inexacte (pseudo, e-mail).\n· Effacement : supprimer ton compte et tes données, directement depuis l’application (Réglages, puis Confidentialité), avec confirmation. La suppression rend ton profil invisible immédiatement, puis purge tes données serveur et locales.\n· Opposition & limitation : t’opposer à un traitement fondé sur l’intérêt légitime, ou en demander la limitation.\n· Retrait du consentement : couper à tout moment l’accès santé ou les notifications.',
  ),
  privacyDroitsBody3: fr5(
    'Pour exercer tes droits, utilise la suppression et l’export in-app, ou écris-nous depuis la page Support. Tu peux aussi introduire une réclamation auprès de la CNIL (Commission nationale de l’informatique et des libertés, cnil.fr).',
  ),
  privacySecuriteHeading: fr5('SÉCURITÉ'),
  privacySecuriteBody: fr5(
    'Les échanges sont chiffrés en transit (HTTPS). L’accès à la base de données est cloisonné par des règles de sécurité au niveau de chaque ligne (RLS) : un joueur ne peut jamais lire ou écrire les données d’un autre. L’écriture des courses et des captures de territoire passe exclusivement par nos serveurs, jamais directement par l’app cliente, ce qui empêche toute triche et protège l’intégrité de tes données.',
  ),
  privacyMineursHeading: fr5('MINEURS'),
  privacyMineursBody: fr5(
    'GRYD est réservé aux personnes âgées d’au moins {age} ans. Nous ne collectons pas sciemment de données concernant des personnes plus jeunes. Si tu penses qu’un mineur de moins de {age} ans nous a transmis des données, écris-nous depuis la page Support et nous les supprimerons.',
  ),
  privacyModifsHeading: fr5('MODIFICATIONS'),
  privacyModifsBody: fr5(
    'Nous pouvons faire évoluer cette politique. En cas de changement important, nous t’en informons dans l’application. La date de dernière mise à jour figure en haut de cette page.',
  ),
  privacyContactHeading: fr5('CONTACT'),
  privacyContactBody: fr5(
    'Une question sur tes données ? Écris-nous depuis la page Support de l’application, ou par courrier à l’adresse du siège indiquée dans les Mentions légales. Tu peux aussi saisir la CNIL (cnil.fr).',
  ),

  // ── CGV — Conditions Générales de Vente ─────────────────────────────────
  cgvTitle: {
    fr: 'Conditions Générales de Vente',
    en: 'Terms of Sale',
    es: 'Condiciones Generales de Venta',
    de: 'Allgemeine Verkaufsbedingungen',
    pt: 'Condições Gerais de Venda',
  },
  cgvObjetHeading: fr5('OBJET & CHAMP D’APPLICATION'),
  cgvObjetBody: fr5(
    'Les présentes CGV s’appliquent à toute souscription d’une offre payante GRYD par un consommateur (personne physique agissant à des fins non professionnelles). Toute souscription implique leur acceptation pleine et entière. Elles complètent les Conditions d’utilisation (usage du jeu) et la Politique de confidentialité, et priment sur tout autre document, sous réserve des règles impératives applicables aux plateformes de distribution (Apple, Google). Le jeu, le territoire et la progression restent entièrement gratuits : aucune offre payante ne procure d’avantage de jeu.',
  ),
  cgvVendeurHeading: fr5('VENDEUR'),
  cgvVendeurBody: fr5(
    'Vendeur : {name} ({form}) au capital de {capital}, siège social {address}, immatriculée au RCS de {rcs} sous le numéro {siren}, TVA intracommunautaire {vat}. Contact : depuis la page Support de l’application. Le détail complet de l’éditeur figure dans les Mentions légales.',
  ),
  cgvOffresHeading: fr5('OFFRES & PRIX'),
  cgvOffresBody1: fr5(
    'GRYD est jouable gratuitement dans son intégralité. Les offres payantes portent uniquement sur des éléments de confort et de statut : elles ne donnent ni territoire, ni points, ni victoire.',
  ),
  cgvOffresBody2: fr5(
    '· Abonnement (unique) — GRYD Club, mensuel ou annuel : bonus permanents de confort, d’information en lecture seule et de statut (stats avancées, historique complet, filtres de classement, templates de partage). Il ne comprend ni bouclier, ni gel de série, ni information tactique, ni protection de zone, ni avantage territorial d’aucune sorte.\n· Achats ponctuels — Founder Pack (à vie, édition limitée), Starter Pack et packs cosmétiques. Ils ne contiennent que du cosmétique, du statut et de la monnaie de style.\n· Ne sont vendus dans AUCUNE monnaie et ne sont inclus dans aucune offre : les objets qui touchent au jeu — bouclier de zone, gel de série, information tactique sur une zone, alerte d’attaque anticipée. Aucun paiement ne les procure, directement ou indirectement.',
  ),
  /**
   * MIROIR EXACT de la clause d'état ajoutée au /cgv du site. Les deux CGV sont
   * le MÊME document contractuel : les laisser diverger serait pire que la faute
   * d'origine — un lecteur pourrait opposer la version qui l'arrange.
   */
  cgvOffresBody2b: fr5(
    'À la date d’entrée en vigueur ci-dessus, AUCUNE de ces offres n’est commercialisée. Aucun paiement n’est encaissable, ni sur le site ni dans l’application. Les tarifs annoncés sur les pages d’offres sont indicatifs tant qu’aucune vente n’est ouverte : ils ne constituent ni une offre ferme, ni un engagement de mise en vente à une date donnée.',
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
  cgvMediationBody1: fr5(
    'Toute réclamation peut nous être adressée depuis la page Support de l’application ; nous nous efforçons de la traiter dans les meilleurs délais. La médiation de la consommation prévue par l’article L612-1 du Code de la consommation est ouverte à tout consommateur en cas de litige non résolu. À ce jour, NEXUS 1993 n’a pas encore désigné de médiateur ; ses coordonnées seront publiées dans les présentes conditions dès sa désignation. Tu conserves à tout moment la faculté de saisir les tribunaux compétents.',
  ),
  cgvMediationBody2: fr5(
    'Tu peux également utiliser la plateforme européenne de règlement en ligne des litiges : ec.europa.eu/consumers/odr.',
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
    'GRYD est bâti sur des logiciels libres et open source. Nous remercions leurs auteurs et leurs communautés. Chaque bibliothèque est distribuée sous sa propre licence ; le texte complet de chaque licence et les mentions de droits d’auteur sont disponibles auprès de chaque projet et, sur demande, depuis la page Support.',
  ),
  licencesMitHeading: fr5('LICENCE MIT'),
  licencesMitBody: fr5(
    'React, React DOM, React Native, React Native Web (Meta) ; Expo et ses modules — localisation, navigation, notifications, capteurs, GPS, partage, presse-papiers… (Expo) ; le SDK Supabase (@supabase/supabase-js) ; MapLibre React Native ; PostHog React Native ; react-native-svg ; react-native-safe-area-context ; react-native-screens ; react-native-qrcode-svg ; react-native-view-shot ; @react-native-async-storage/async-storage. Chacun est distribué sous licence MIT par ses auteurs respectifs.',
  ),
  licencesBsdHeading: fr5('LICENCE BSD 3-CLAUSES'),
  licencesBsdBody: fr5(
    'MapLibre GL (maplibre-gl) — moteur de rendu cartographique, distribué sous licence BSD à 3 clauses par les contributeurs du projet MapLibre.',
  ),
  licencesApacheHeading: fr5('LICENCE APACHE 2.0'),
  licencesApacheBody: fr5(
    'H3 (h3-js) — système d’indexation géospatiale hexagonale, distribué sous licence Apache 2.0 par Uber Technologies, Inc.',
  ),
  licencesFullHeading: fr5('TEXTES COMPLETS'),
  licencesFullBody: fr5(
    'Les licences MIT, BSD 3-Clauses et Apache 2.0 autorisent la réutilisation de ces bibliothèques, y compris dans un produit commercial, à condition d’en conserver les mentions de droits d’auteur et de licence. Ces mentions accompagnent le code distribué ; leur texte intégral peut t’être communiqué à tout moment depuis la page Support.',
  ),
});
