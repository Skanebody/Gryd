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

  // ── Le scanner que la planche montre et que l'app n'a pas ─────────────────
  scannerTitle: {
    fr: 'Scanner un code',
    en: 'Scanning a code',
    es: 'Escanear un código',
    de: 'Code scannen',
    pt: 'Escanear um código',
  },
  scannerBody: {
    fr: 'GRYD ne sait pas encore lire un QR : l’appareil photo n’est pas branché à l’app. En attendant, montre ton code ou envoie ton lien.',
    en: 'GRYD can’t read a QR yet — the camera isn’t wired into the app. Meanwhile, show your code or send your link.',
    es: 'GRYD todavía no sabe leer un QR: la cámara no está conectada a la app. Mientras tanto, enseña tu código o envía tu enlace.',
    de: 'GRYD kann noch keinen QR lesen – die Kamera ist nicht angebunden. Zeig so lange deinen Code oder schick deinen Link.',
    pt: 'O GRYD ainda não sabe ler um QR: a câmera não está ligada ao app. Enquanto isso, mostre seu código ou envie seu link.',
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
  stateSignedOutBody: {
    fr: 'Le code ne transporte qu’une chose : ton @handle. Connecte-toi pour en avoir un.',
    en: 'The code carries one thing: your @handle. Sign in to get one.',
    es: 'El código lleva una sola cosa: tu @handle. Inicia sesión para tener uno.',
    de: 'Der Code trägt nur eins: deinen @Handle. Melde dich an, um einen zu bekommen.',
    pt: 'O código leva uma coisa só: seu @handle. Entre para ter um.',
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
