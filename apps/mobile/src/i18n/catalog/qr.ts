/**
 * GRYD — i18n : catalogue du domaine « mon code » (écran /qr, planche E16).
 *
 * NE COUVRE QUE LA VARIANTE « MON CODE » (le QR de profil). La variante
 * « INVITER AU CREW » de la même planche vit déjà dans `catalog/crew.ts`
 * (clés `qr*`) et alimente `features/crew/CrewInviteQRScreen` — on ne duplique
 * NI ses textes NI son générateur de QR : deux générateurs de code crew
 * divergeraient au premier changement.
 *
 * INVARIANTS (jamais traduits, donc absents d'ici) : GRYD, QR, @handle en tant
 * que jeton technique, le lien lui-même.
 *
 * §A CONTRAIGNANT : les libellés d'action restent COURTS dans les 5 langues
 * (allemand concis : « Link teilen », « Bild teilen ») — jamais un composé qui
 * tronquerait à 375 px.
 *
 * HONNÊTETÉ : plusieurs textes ci-dessous disent explicitement ce qui N'EXISTE
 * PAS encore (domaine hors ligne, scanner non branché). C'est délibéré : la
 * planche promet « scannez pour suivre ou défier » alors qu'il n'existe ni
 * système de suivi, ni défi joueur-contre-joueur, ni caméra. On écrit ce qui est
 * vrai le 25/07/2026, daté par le code, pas ce que la maquette met en scène.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Barre + actions ────────────────────────────────────────────────────────
  title: {
    fr: 'Mon code',
    en: 'My code',
    es: 'Mi código',
    de: 'Mein Code',
    pt: 'Meu código',
  },
  a11yCopy: {
    fr: 'Copier le lien',
    en: 'Copy link',
    es: 'Copiar enlace',
    de: 'Link kopieren',
    pt: 'Copiar link',
  },
  ctaShare: {
    fr: 'Partager le lien',
    en: 'Share link',
    es: 'Compartir enlace',
    de: 'Link teilen',
    pt: 'Compartilhar link',
  },
  ctaShareImage: {
    fr: 'Partager l’image',
    en: 'Share image',
    es: 'Compartir imagen',
    de: 'Bild teilen',
    pt: 'Compartilhar imagem',
  },

  // ── La carte ───────────────────────────────────────────────────────────────
  /** Étiquette a11y de la plaque blanche (elle n'a aucun texte alternatif sinon). */
  cardA11y: {
    fr: 'QR code du profil @{handle}',
    en: 'QR code for profile @{handle}',
    es: 'Código QR del perfil @{handle}',
    de: 'QR-Code des Profils @{handle}',
    pt: 'Código QR do perfil @{handle}',
  },
  /** « @handle · ville » — le séparateur n'existe QUE si la ville est renseignée. */
  handleCity: {
    fr: '@{handle} · {city}',
    en: '@{handle} · {city}',
    es: '@{handle} · {city}',
    de: '@{handle} · {city}',
    pt: '@{handle} · {city}',
  },
  handleOnly: {
    fr: '@{handle}',
    en: '@{handle}',
    es: '@{handle}',
    de: '@{handle}',
    pt: '@{handle}',
  },

  // ── Sous la carte : ce que le code fait, et ce qu'il n'expose pas ──────────
  /**
   * La planche dit « Scannez pour suivre ou défier ». Il n'existe NI système de
   * suivi (aucun annuaire, aucune table d'amitiés) NI défi joueur-contre-joueur.
   * On décrit donc uniquement ce que le code contient réellement.
   */
  tagline: {
    fr: 'Ce QR contient le lien public de mon profil.',
    en: 'This QR holds the public link to my profile.',
    es: 'Este QR contiene el enlace público de mi perfil.',
    de: 'Dieser QR enthält den öffentlichen Link zu meinem Profil.',
    pt: 'Este QR contém o link público do meu perfil.',
  },
  privacyNote: {
    fr: 'Il ne transporte que ton @handle : ni ta position, ni tes zones privées.',
    en: 'It only carries your @handle — never your location or your private zones.',
    es: 'Solo lleva tu @handle: nunca tu ubicación ni tus zonas privadas.',
    de: 'Er trägt nur deinen @Handle – nie deinen Standort oder deine privaten Zonen.',
    pt: 'Ele leva só o seu @handle: nunca a sua localização nem as suas zonas privadas.',
  },
  /** Le domaine n'est pas arbitré (O10) et aucune page n'y répond : on le dit. */
  linkPending: {
    fr: 'Le domaine GRYD n’est pas encore en ligne : ce lien ne s’ouvrira que le jour où il le sera.',
    en: 'The GRYD domain isn’t live yet: this link will only open once it is.',
    es: 'El dominio GRYD aún no está en línea: este enlace solo abrirá cuando lo esté.',
    de: 'Die GRYD-Domain ist noch nicht online: Der Link öffnet erst dann.',
    pt: 'O domínio GRYD ainda não está no ar: este link só vai abrir quando estiver.',
  },

  // ── Retours d'action (jamais un « copié » qui n'a rien copié) ─────────────
  toastCopied: {
    fr: 'Lien copié',
    en: 'Link copied',
    es: 'Enlace copiado',
    de: 'Link kopiert',
    pt: 'Link copiado',
  },
  toastShared: {
    fr: 'Lien partagé',
    en: 'Link shared',
    es: 'Enlace compartido',
    de: 'Link geteilt',
    pt: 'Link compartilhado',
  },
  toastShareUnavailable: {
    fr: 'Partage indisponible ici',
    en: 'Sharing unavailable here',
    es: 'No se puede compartir aquí',
    de: 'Teilen hier nicht möglich',
    pt: 'Compartilhamento indisponível aqui',
  },
  shareMessage: {
    fr: 'Mon profil GRYD : {link}',
    en: 'My GRYD profile: {link}',
    es: 'Mi perfil GRYD: {link}',
    de: 'Mein GRYD-Profil: {link}',
    pt: 'Meu perfil GRYD: {link}',
  },

  // ══ LE SCANNER (LOT Q4, 11/09/2026) ═══════════════════════════════════════
  // `expo-camera` est entré au build : l'onglet EXISTE désormais, quand le
  // binaire sait l'ouvrir. Les textes ci-dessous ne promettent jamais plus que
  // ce que `scanCapability2026` a mesuré.
  scannerTitle: {
    fr: 'Scanner un code',
    en: 'Scanning a code',
    es: 'Escanear un código',
    de: 'Code scannen',
    pt: 'Escanear um código',
  },
  /**
   * Ce texte ne sert plus QU'AU WEB, où aucun onglet Scanner n'est peint : la
   * preview sert à relire des écrans, pas à viser un carton avec la webcam d'un
   * poste de travail. Sur téléphone, l'onglet dit lui-même son état.
   */
  scannerBody: {
    fr: 'Le scanner vit dans l’app installée sur ton téléphone. Ici, montre ton code ou envoie ton lien.',
    en: 'The scanner lives in the app installed on your phone. Here, show your code or send your link.',
    es: 'El escáner vive en la app instalada en tu teléfono. Aquí, enseña tu código o envía tu enlace.',
    de: 'Der Scanner lebt in der App auf deinem Telefon. Zeig hier deinen Code oder schick deinen Link.',
    pt: 'O scanner vive no app instalado no seu telefone. Aqui, mostre seu código ou envie seu link.',
  },

  // ── Les deux onglets. Libellés COURTS dans les 5 langues (§A). ────────────
  tabMyCode: {
    fr: 'Mon code',
    en: 'My code',
    es: 'Mi código',
    de: 'Mein Code',
    pt: 'Meu código',
  },
  tabScanner: {
    fr: 'Scanner',
    en: 'Scan',
    es: 'Escanear',
    de: 'Scannen',
    pt: 'Escanear',
  },

  // ── Ce binaire ne sait pas scanner : un FAIT sur l'app, pas sur le joueur ──
  scanNeedsBuildTitle: {
    fr: 'Pas encore dans cette version',
    en: 'Not in this version yet',
    es: 'Todavía no en esta versión',
    de: 'In dieser Version noch nicht',
    pt: 'Ainda não nesta versão',
  },
  scanNeedsBuildBody: {
    fr: 'L’appareil photo n’est pas embarqué dans cette version de GRYD. La prochaine l’aura. En attendant, le code se saisit à la main dans l’onglet Crew.',
    en: 'The camera isn’t bundled in this version of GRYD. The next one will have it. Meanwhile, the code can be typed by hand in the Crew tab.',
    es: 'La cámara no viene en esta versión de GRYD. La próxima la tendrá. Mientras tanto, el código se escribe a mano en la pestaña Crew.',
    de: 'Die Kamera steckt nicht in dieser GRYD-Version. Die nächste hat sie. Bis dahin lässt sich der Code im Crew-Tab von Hand eingeben.',
    pt: 'A câmera não vem nesta versão do GRYD. A próxima terá. Enquanto isso, o código se digita à mão na aba Crew.',
  },

  // ── La permission, demandée AU MOMENT DU GESTE (jamais au montage) ────────
  scanAskTitle: {
    fr: 'Viser un code',
    en: 'Point at a code',
    es: 'Apuntar a un código',
    de: 'Auf einen Code zielen',
    pt: 'Mirar um código',
  },
  scanAskBody: {
    fr: 'GRYD ouvre l’appareil photo pour lire le QR d’un crew. Rien n’est enregistré, rien n’est envoyé : l’image sert à décoder, puis elle disparaît.',
    en: 'GRYD opens the camera to read a crew QR. Nothing is saved, nothing is sent: the image decodes, then it is gone.',
    es: 'GRYD abre la cámara para leer el QR de un crew. Nada se guarda, nada se envía: la imagen decodifica y desaparece.',
    de: 'GRYD öffnet die Kamera, um den QR einer Crew zu lesen. Nichts wird gespeichert, nichts gesendet: Das Bild dekodiert und ist weg.',
    pt: 'O GRYD abre a câmera para ler o QR de um crew. Nada é guardado, nada é enviado: a imagem decodifica e some.',
  },
  scanAskCta: {
    fr: 'Ouvrir l’appareil photo',
    en: 'Open the camera',
    es: 'Abrir la cámara',
    de: 'Kamera öffnen',
    pt: 'Abrir a câmera',
  },

  /** Refus définitif : le seul chemin restant passe par les réglages système. */
  scanDeniedTitle: {
    fr: 'Appareil photo refusé',
    en: 'Camera access denied',
    es: 'Cámara denegada',
    de: 'Kamerazugriff abgelehnt',
    pt: 'Câmera recusada',
  },
  scanDeniedBody: {
    fr: 'GRYD n’a pas accès à l’appareil photo. Tu peux le rouvrir dans les réglages de ton téléphone, ou saisir le code du crew à la main.',
    en: 'GRYD has no camera access. You can turn it back on in your phone settings, or type the crew code by hand.',
    es: 'GRYD no tiene acceso a la cámara. Puedes reactivarlo en los ajustes de tu teléfono, o escribir el código del crew a mano.',
    de: 'GRYD hat keinen Kamerazugriff. Du kannst ihn in den Einstellungen deines Telefons wieder freigeben oder den Crew-Code von Hand eingeben.',
    pt: 'O GRYD não tem acesso à câmera. Você pode reativar nos ajustes do telefone, ou digitar o código do crew à mão.',
  },
  /**
   * Le libellé ne nomme PAS un système d'exploitation : `Linking.openSettings()`
   * ouvre la page de GRYD dans les réglages, sur iOS comme sur Android. Écrire
   * « Réglages iOS » serait faux sur l'autre moitié des appareils.
   */
  scanDeniedCta: {
    fr: 'Ouvrir les réglages de GRYD',
    en: 'Open GRYD settings',
    es: 'Abrir los ajustes de GRYD',
    de: 'GRYD-Einstellungen öffnen',
    pt: 'Abrir os ajustes do GRYD',
  },

  // ── Le viseur, et ce qu'il trouve ─────────────────────────────────────────
  scanViewfinderA11y: {
    fr: 'Viseur de l’appareil photo',
    en: 'Camera viewfinder',
    es: 'Visor de la cámara',
    de: 'Kamerasucher',
    pt: 'Visor da câmera',
  },
  scanHint: {
    fr: 'Vise le QR affiché sur l’écran de quelqu’un, ou celui d’une affiche.',
    en: 'Point at the QR on someone’s screen, or on a poster.',
    es: 'Apunta al QR en la pantalla de alguien, o en un cartel.',
    de: 'Ziel auf den QR auf dem Bildschirm von jemandem oder auf einem Plakat.',
    pt: 'Mire o QR na tela de alguém, ou em um cartaz.',
  },
  scanStop: {
    fr: 'Fermer l’appareil photo',
    en: 'Close the camera',
    es: 'Cerrar la cámara',
    de: 'Kamera schließen',
    pt: 'Fechar a câmera',
  },
  /** Retour immédiat : on a reconnu, on emmène. */
  scanFoundCrew: {
    fr: 'Invitation de crew reconnue',
    en: 'Crew invitation recognised',
    es: 'Invitación de crew reconocida',
    de: 'Crew-Einladung erkannt',
    pt: 'Convite de crew reconhecido',
  },
  scanFoundProfile: {
    fr: 'Profil reconnu',
    en: 'Profile recognised',
    es: 'Perfil reconocido',
    de: 'Profil erkannt',
    pt: 'Perfil reconhecido',
  },
  /** Ni un code GRYD, ni un mensonge : on dit ce qu'on a vu, et rien de plus. */
  scanUnknown: {
    fr: 'Ce code n’est pas un code GRYD.',
    en: 'This code is not a GRYD code.',
    es: 'Este código no es un código GRYD.',
    de: 'Dieser Code ist kein GRYD-Code.',
    pt: 'Este código não é um código GRYD.',
  },
  /**
   * Un lien GRYD que CETTE version ne sait pas ouvrir. Le dire « pas un code
   * GRYD » serait faux : le jeton d'invitation existe en base (0090), c'est
   * l'app qui ne le consomme pas encore.
   */
  scanTokenUnsupported: {
    fr: 'Ce lien d’invitation demande une version plus récente de GRYD.',
    en: 'This invitation link needs a newer version of GRYD.',
    es: 'Este enlace de invitación necesita una versión más reciente de GRYD.',
    de: 'Dieser Einladungslink braucht eine neuere GRYD-Version.',
    pt: 'Este link de convite precisa de uma versão mais nova do GRYD.',
  },

  // ── Les états qui ne sont PAS la carte ────────────────────────────────────
  /** Hydratation : on n'affirme rien, surtout pas un squelette de QR. */
  stateLoading: {
    fr: 'Lecture de ton profil…',
    en: 'Reading your profile…',
    es: 'Leyendo tu perfil…',
    de: 'Dein Profil wird gelesen…',
    pt: 'Lendo seu perfil…',
  },
  stateSignedOutTitle: {
    fr: 'Ton code a besoin d’un compte',
    en: 'Your code needs an account',
    es: 'Tu código necesita una cuenta',
    de: 'Dein Code braucht ein Konto',
    pt: 'Seu código precisa de uma conta',
  },
  /**
   * RAISON de la porte de compte (lot 11, 10/09/2026), plus un ordre.
   * ÉTAPE 0 : « … Connecte-toi pour en avoir un. » — la phrase s'adressait à
   * quelqu'un qui a déjà un compte, sous un bouton qui en CRÉE un. Le titre
   * vient désormais de `AccountDoor2026` ; il ne reste ici que le fait.
   */
  stateSignedOutBody: {
    fr: 'Le code ne transporte qu’une chose : ton @handle. Il arrive avec ton compte.',
    en: 'The code carries one thing: your @handle. It comes with your account.',
    es: 'El código lleva una sola cosa: tu @handle. Llega con tu cuenta.',
    de: 'Der Code trägt nur eins: deinen @Handle. Er kommt mit deinem Konto.',
    pt: 'O código leva uma coisa só: seu @handle. Ele vem com a sua conta.',
  },
  signIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  stateNoHandleTitle: {
    fr: 'Choisis ton @handle',
    en: 'Pick your @handle',
    es: 'Elige tu @handle',
    de: '@Handle wählen',
    pt: 'Escolha seu @handle',
  },
  stateNoHandleBody: {
    fr: 'C’est lui que le code transporte. Sans lui, il n’y a rien à scanner.',
    en: 'That’s what the code carries. Without it, there’s nothing to scan.',
    es: 'Es lo que lleva el código. Sin él, no hay nada que escanear.',
    de: 'Genau ihn trägt der Code. Ohne ihn gibt es nichts zu scannen.',
    pt: 'É ele que o código leva. Sem ele, não há nada para escanear.',
  },
  stateNoHandleCta: {
    fr: 'Choisir mon @handle',
    en: 'Pick my @handle',
    es: 'Elegir mi @handle',
    de: '@Handle wählen',
    pt: 'Escolher meu @handle',
  },
});
