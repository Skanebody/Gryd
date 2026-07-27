/**
 * GRYD — i18n : catalogue de l'écran E25 « Sécurité »
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1219-1232).
 *
 * Panneau ouvert PENDANT l'activité depuis une icône discrète. Quatre fonctions
 * et pas une de plus : prévenir un proche, appeler les secours selon pays,
 * arrêter l'activité, afficher les consignes. « Aucune fonction sociale
 * compétitive dans ce panneau » (spec l.1232) — donc AUCUN texte de ce fichier
 * ne parle de territoire, de points, de crew, de classement ou de rival. Un
 * écran de sécurité qui vend du jeu est un écran de jeu.
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * Tutoiement fr, « tú » es, « du » de, « você » pt-BR (jamais teu/tua).
 * Ton FACTUEL : pas de dramatisation, pas de rassurance creuse. Quelqu'un qui
 * ouvre ce panneau n'a pas le temps de lire une phrase de marque.
 *
 * ─── CONSTITUTION §2 — AUCUN BOUTON MORT, ET ICI ÇA NE SE NÉGOCIE PAS ───────
 * Chaque fonction a son état INDISPONIBLE explicite, parce qu'aucune des quatre
 * n'existe partout :
 *   · `emergency*`  — composer un numéro suppose un appareil qui téléphone.
 *     L'aperçu navigateur n'en est pas un ⇒ `emergencyUnavailable`. Et le NUMÉRO
 *     ne se devine pas : `EMERGENCY_NUMBER_EUROPE` (112) n'est proposé que là où
 *     l'app SAIT être en Europe ; ailleurs, `emergencyNoNumber` renvoie au
 *     composeur sans rien pré-remplir. On n'invente pas un numéro de secours ;
 *   · `notify*`     — prévenir un proche passe par la feuille de partage du
 *     système. Absente ⇒ `notifyUnavailable` ;
 *   · `stop*`       — toujours disponible : arrêter est la seule action que
 *     l'app tient sans aucune dépendance ;
 *   · `guidelines*` — texte statique, toujours disponible.
 *
 * ─── CE QUI EST ENVOYÉ À UN PROCHE, DIT SANS DÉTOUR ────────────────────────
 * `notifyBody` est un MESSAGE que l'utilisateur envoie LUI-MÊME, avec les
 * mots qu'il voit. Il ne contient AUCUNE position et n'ouvre AUCUN suivi en
 * direct : le suivi live d'un tiers n'existe pas dans GRYD (constitution :
 * « aucune position exacte en direct visible par les autres »), et
 * `notifyNoTracking` le DIT plutôt que de laisser croire le contraire. Le jour
 * où un partage de sécurité opt-in existera côté serveur, il aura ses propres
 * clés et sa propre explication — pas un silence réinterprété.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Entrée + entête ───────────────────────────────────────────────────────
  /** a11y de l'icône discrète qui ouvre le panneau pendant l'activité. */
  openA11y: {
    fr: 'Ouvrir le panneau sécurité',
    en: 'Open the safety panel',
    es: 'Abrir el panel de seguridad',
    de: 'Sicherheitsbereich öffnen',
    pt: 'Abrir o painel de segurança',
  },
  title: {
    fr: 'Sécurité',
    en: 'Safety',
    es: 'Seguridad',
    de: 'Sicherheit',
    pt: 'Segurança',
  },
  closeA11y: {
    fr: 'Fermer et revenir à la sortie',
    en: 'Close and go back to the outing',
    es: 'Cerrar y volver a la salida',
    de: 'Schließen und zurück zur Aktivität',
    pt: 'Fechar e voltar à atividade',
  },

  // ── 1. Prévenir un proche ─────────────────────────────────────────────────
  notifyTitle: {
    fr: 'Prévenir un proche',
    en: 'Tell someone close',
    es: 'Avisar a alguien cercano',
    de: 'Jemanden informieren',
    pt: 'Avisar alguém próximo',
  },
  /** Le message pré-écrit, modifiable, que l'utilisateur envoie lui-même. */
  notifyBody: {
    fr: 'Je suis en sortie sportive. Je te préviens quand je rentre.',
    en: 'I’m out training. I’ll message you when I’m back.',
    es: 'Estoy entrenando fuera. Te aviso cuando vuelva.',
    de: 'Ich bin gerade unterwegs beim Sport. Ich melde mich, wenn ich zurück bin.',
    pt: 'Estou treinando na rua. Aviso quando voltar.',
  },
  /** Dit ce qui NE PART PAS — la seule phrase qui empêche un malentendu grave. */
  notifyNoTracking: {
    fr: 'Ce message ne partage pas ta position et n’ouvre aucun suivi en direct.',
    en: 'This message doesn’t share your location and opens no live tracking.',
    es: 'Este mensaje no comparte tu ubicación ni abre ningún seguimiento en vivo.',
    de: 'Diese Nachricht teilt deinen Standort nicht und startet kein Live-Tracking.',
    pt: 'Esta mensagem não compartilha sua localização nem abre rastreamento ao vivo.',
  },
  /** Aucune feuille de partage sur cette plateforme : aucun bouton n'est peint. */
  notifyUnavailable: {
    fr: 'Envoi indisponible ici : ton appareil n’ouvre pas de partage.',
    en: 'Sending unavailable here: your device offers no share sheet.',
    es: 'Envío no disponible aquí: tu dispositivo no abre compartir.',
    de: 'Senden hier nicht möglich: Dein Gerät bietet kein Teilen an.',
    pt: 'Envio indisponível aqui: seu aparelho não abre compartilhamento.',
  },

  // ── 2. Appeler les secours ────────────────────────────────────────────────
  emergencyTitle: {
    fr: 'Appeler les secours',
    en: 'Call emergency services',
    es: 'Llamar a emergencias',
    de: 'Notruf wählen',
    pt: 'Ligar para a emergência',
  },
  /** Numéro connu (112 en Europe) : le composeur s'ouvre pré-rempli. */
  emergencyDial: {
    fr: 'Composer le {number}',
    en: 'Dial {number}',
    es: 'Marcar el {number}',
    de: '{number} wählen',
    pt: 'Discar {number}',
  },
  /** Le numéro européen, expliqué en une ligne (aucune promesse au-delà). */
  emergencyNote: {
    fr: 'Le 112 fonctionne dans toute l’Europe, même sans forfait.',
    en: '112 works across Europe, even without a plan.',
    es: 'El 112 funciona en toda Europa, incluso sin plan.',
    de: 'Die 112 funktioniert in ganz Europa, auch ohne Vertrag.',
    pt: 'O 112 funciona em toda a Europa, mesmo sem plano.',
  },
  /**
   * Pays inconnu ou hors du périmètre où le numéro est certain : on ouvre le
   * composeur SANS numéro plutôt que d'en deviner un.
   */
  emergencyNoNumber: {
    fr: 'Numéro local inconnu ici — on ouvre le composeur, compose le numéro de ton pays.',
    en: 'Local number unknown here — we open the dialler, enter your country’s number.',
    es: 'Número local desconocido aquí — abrimos el marcador, marca el de tu país.',
    de: 'Lokale Nummer hier unbekannt — wir öffnen die Tastatur, wähle die Nummer deines Landes.',
    pt: 'Número local desconhecido aqui — abrimos o teclado, disque o do seu país.',
  },
  /** L'appareil ne téléphone pas (aperçu navigateur) : aucun bouton peint. */
  emergencyUnavailable: {
    fr: 'Cet appareil ne passe pas d’appel. Utilise un téléphone.',
    en: 'This device can’t make calls. Use a phone.',
    es: 'Este dispositivo no hace llamadas. Usa un teléfono.',
    de: 'Dieses Gerät kann nicht telefonieren. Nimm ein Telefon.',
    pt: 'Este aparelho não faz chamadas. Use um telefone.',
  },

  // ── 3. Arrêter l'activité ─────────────────────────────────────────────────
  stopTitle: {
    fr: 'Arrêter l’activité',
    en: 'Stop the activity',
    es: 'Detener la actividad',
    de: 'Aktivität beenden',
    pt: 'Parar a atividade',
  },
  /** Ce qu'arrêter fait vraiment : rien n'est perdu, et on le dit avant. */
  stopNote: {
    fr: 'Ta sortie est enregistrée et analysée ensuite. Rien n’est perdu.',
    en: 'Your outing is saved and analysed afterwards. Nothing is lost.',
    es: 'Tu salida se guarda y se analiza después. No se pierde nada.',
    de: 'Deine Aktivität wird gespeichert und danach ausgewertet. Nichts geht verloren.',
    pt: 'Sua atividade é salva e analisada depois. Nada se perde.',
  },

  // ── 4. Consignes ──────────────────────────────────────────────────────────
  guidelinesTitle: {
    fr: 'Consignes',
    en: 'Guidelines',
    es: 'Consejos',
    de: 'Hinweise',
    pt: 'Orientações',
  },
  /**
   * Trois consignes, dans l'ordre de ce qu'on fait vraiment. Aucune n'invoque
   * le jeu — c'est la règle du panneau.
   */
  guidelineStay: {
    fr: 'Mets-toi en sécurité avant de regarder ton téléphone.',
    en: 'Get yourself safe before looking at your phone.',
    es: 'Ponte a salvo antes de mirar el teléfono.',
    de: 'Bring dich in Sicherheit, bevor du aufs Handy schaust.',
    pt: 'Fique em segurança antes de olhar o celular.',
  },
  guidelineCall: {
    fr: 'En cas de blessure ou de danger, appelle les secours d’abord.',
    en: 'If you’re hurt or in danger, call emergency services first.',
    es: 'Si te lesionas o corres peligro, llama primero a emergencias.',
    de: 'Bei Verletzung oder Gefahr zuerst den Notruf wählen.',
    pt: 'Em caso de lesão ou perigo, ligue primeiro para a emergência.',
  },
  guidelineBattery: {
    fr: 'Garde de la batterie : c’est elle qui te permet d’appeler.',
    en: 'Keep some battery: it’s what lets you call.',
    es: 'Guarda batería: es lo que te permite llamar.',
    de: 'Halte Akku frei: damit kannst du anrufen.',
    pt: 'Guarde bateria: é ela que permite ligar.',
  },
});
