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
 */
import { defineCatalog } from '../types';

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
});
