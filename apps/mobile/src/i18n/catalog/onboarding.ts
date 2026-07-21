/**
 * GRYD — i18n : catalogue du domaine ONBOARDING.
 *
 * Source de vérité des 5 langues pour le stepper d'onboarding. La STRUCTURE
 * par étape (HOOK, AGE, …) reste dans features/onboarding/content.ts — qui
 * référence ces Entries ; les écrans résolvent via t() (i18n/store).
 *
 * Règles : tutoiement fr / « du » de / « tú » es / « você » pt informel ;
 * invariants jamais traduits (GRYD, Crew, km, « Chartreuse » = nom de la
 * couleur signature) ; CTA courts dans TOUTES les langues (§A : jamais tronqué
 * à 375 px) ; kickers en MAJUSCULES ; mêmes {placeholders} partout.
 *
 * ─── NETTOYAGE DU 21/07/2026 (refonte « trop de cliques ») ──────────────────
 * Ce fichier portait encore la copy de SEPT étapes, dont quatre supprimées avec
 * le mode vitrine (`choose` / `sync` / `run` / `capture`) et trois supprimées ou
 * fusionnées par la refonte (`city` fondue dans `learn`, `permission` déplacée
 * au premier GO, `crew` rendue à son onglet). Une Entry que plus aucun écran ne
 * lit est une promesse de texte sans écran derrière : elles sont RETIRÉES, pas
 * commentées. `content.ts` est le seul importeur du catalogue, donc le typage
 * signale immédiatement toute lecture oubliée.
 *
 * Le catalogue LOCAL `L` de content.ts (créé pour éviter les collisions entre
 * agents parallèles) est également REPLIÉ ICI : les copies d'onboarding vivent
 * de nouveau à un seul endroit.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Navigation du stepper ─────────────────────────────────────────────────
  /** Flèche retour discrète (accessibilityLabel — jamais visible à l'écran). */
  navBack: {
    fr: 'Revenir à l’étape précédente',
    en: 'Go back to the previous step',
    es: 'Volver al paso anterior',
    de: 'Zurück zum vorherigen Schritt',
    pt: 'Voltar à etapa anterior',
  },
  /** Sortie douce partagée (« Plus tard ») — compte sans backend, notifications. */
  later: {
    fr: 'Plus tard',
    en: 'Later',
    es: 'Más tarde',
    de: 'Später',
    pt: 'Mais tarde',
  },
  /**
   * Chip d'honnêteté posée SUR les visuels : ce plateau enseigne, il n'est pas
   * la carte du joueur. (Anciennement `syncDemoTag`, du temps où l'import de
   * course était mis en scène — le mot n'a pas changé, son seul lecteur si.)
   */
  exampleTag: {
    fr: 'Exemple',
    en: 'Sample',
    es: 'Ejemplo',
    de: 'Beispiel',
    pt: 'Exemplo',
  },

  // ─── 1 HOOK ────────────────────────────────────────────────────────────────
  hookTitle: {
    fr: 'Prends ta ville.',
    en: 'Take your city.',
    es: 'Toma tu ciudad.',
    de: 'Hol dir deine Stadt.',
    pt: 'Tome sua cidade.',
  },
  hookTagline: {
    fr: 'Cours pour ton crew. Conquiers ta ville.',
    en: 'Run for your crew. Conquer your city.',
    es: 'Corre por tu crew. Conquista tu ciudad.',
    de: 'Lauf für deine Crew. Erobere deine Stadt.',
    pt: 'Corra pelo seu crew. Conquiste sua cidade.',
  },
  hookCta: {
    fr: 'Découvrir ma ville',
    en: 'Explore my city',
    es: 'Descubrir mi ciudad',
    de: 'Meine Stadt entdecken',
    pt: 'Descobrir minha cidade',
  },
  /**
   * LA PORTE DE CONNEXION (retour fondateur 21/07/2026). Dite à la 1re personne
   * et au PASSÉ — « j'ai déjà » — parce que c'est ainsi que la cherche celui qui
   * réinstalle ou change de téléphone. Volontairement DISCRÈTE (lien gris, pas
   * un 2e CTA : §A4) mais présente sur le tout premier écran.
   */
  hookSignIn: {
    fr: 'J’ai déjà un compte',
    en: 'I already have an account',
    es: 'Ya tengo una cuenta',
    de: 'Ich habe schon ein Konto',
    pt: 'Já tenho uma conta',
  },

  // ─── 1b AGE-GATE 16+ ───────────────────────────────────────────────────────
  ageKicker: {
    fr: 'AVANT DE COMMENCER',
    en: 'BEFORE YOU START',
    es: 'ANTES DE EMPEZAR',
    de: 'BEVOR DU LOSLEGST',
    pt: 'ANTES DE COMEÇAR',
  },
  /**
   * Variante quand le joueur vient de « J'ai déjà un compte » : il n'est pas en
   * train de découvrir le produit, il va se connecter. Le kicker le DIT, pour
   * qu'il comprenne que cet écran est une vérification légale sur SON chemin —
   * pas l'onboarding qui recommence.
   */
  ageKickerSignIn: {
    fr: 'AVANT DE TE CONNECTER',
    en: 'BEFORE YOU SIGN IN',
    es: 'ANTES DE INICIAR SESIÓN',
    de: 'BEVOR DU DICH ANMELDEST',
    pt: 'ANTES DE ENTRAR',
  },
  ageTitle: {
    fr: 'Tu as 16 ans ou plus ?',
    en: 'Are you 16 or older?',
    es: '¿Tienes 16 años o más?',
    de: 'Bist du 16 oder älter?',
    pt: 'Você tem 16 anos ou mais?',
  },
  ageTagline: {
    fr: 'GRYD utilise ta position et se joue en communauté. L’âge minimum est 16 ans.',
    en: 'GRYD uses your location and is played with others. The minimum age is 16.',
    es: 'GRYD usa tu ubicación y se juega en comunidad. La edad mínima es 16 años.',
    de: 'GRYD nutzt deinen Standort und wird gemeinsam gespielt. Mindestalter: 16 Jahre.',
    pt: 'O GRYD usa sua localização e é jogado em comunidade. A idade mínima é 16 anos.',
  },
  ageConfirm: {
    fr: 'Oui, j’ai 16 ans ou plus',
    en: 'Yes, I’m 16 or older',
    es: 'Sí, tengo 16 años o más',
    de: 'Ja, ich bin 16 oder älter',
    pt: 'Sim, tenho 16 anos ou mais',
  },
  /** a11y du CTA de confirmation (formulation directe, sans le « Oui »). */
  ageConfirmA11y: {
    fr: 'J’ai 16 ans ou plus',
    en: 'I am 16 or older',
    es: 'Tengo 16 años o más',
    de: 'Ich bin 16 oder älter',
    pt: 'Tenho 16 anos ou mais',
  },
  ageUnder: {
    fr: 'J’ai moins de 16 ans',
    en: 'I’m under 16',
    es: 'Tengo menos de 16 años',
    de: 'Ich bin unter 16',
    pt: 'Tenho menos de 16 anos',
  },
  ageBlockedTitle: {
    fr: 'Reviens à 16 ans.',
    en: 'Come back at 16.',
    es: 'Vuelve a los 16.',
    de: 'Komm mit 16 wieder.',
    pt: 'Volte aos 16.',
  },
  ageBlockedTagline: {
    fr: 'GRYD n’est pas accessible avant 16 ans. On garde ta ville au chaud pour toi.',
    en: 'GRYD isn’t available under 16. We’ll keep your city warm for you.',
    es: 'GRYD no está disponible antes de los 16. Te guardamos tu ciudad para cuando vuelvas.',
    de: 'GRYD ist erst ab 16 verfügbar. Wir halten dir deine Stadt warm.',
    pt: 'O GRYD não está disponível antes dos 16. Guardamos sua cidade para você.',
  },

  // ─── 2 LE TERRAIN + LA RÈGLE (un seul écran) ───────────────────────────────
  // Le plateau EST l'explication : montrer le terrain occupé par d'autres crews
  // et montrer comment on prend une zone était DEUX écrans qui enseignaient la
  // même chose. Un seul visuel fait les deux, donc une seule copy.
  learnKicker: {
    fr: 'COMMENT ON PREND UNE ZONE',
    en: 'HOW A ZONE IS TAKEN',
    es: 'CÓMO SE TOMA UNA ZONA',
    de: 'SO NIMMST DU EINE ZONE',
    pt: 'COMO SE TOMA UMA ZONA',
  },
  /**
   * ⚠️ COPY RACCOURCIE LE 21/07/2026 — l'écran DÉBORDAIT. La fusion `city` +
   * `learn` avait additionné les deux copies au lieu de les fondre : sur un
   * 375×667, kicker + titre 3 lignes + plateau 307 px + légende 3 lignes + note
   * 3 lignes + CTA dépassaient la hauteur utile d'environ 70 px, et le texte
   * passait SOUS le CTA (il n'y a pas de ScrollView — §A : un écran
   * d'onboarding qui se scrolle est un écran de trop). Chaque entrée ci-dessous
   * tient désormais en 2 lignes dans les 5 langues. Toute rallonge future se
   * paie en débordement : mesurer avant d'ajouter un mot.
   */
  learnTitle: {
    fr: 'Ferme la boucle, la zone bascule.',
    en: 'Close the loop, the zone flips.',
    es: 'Cierra el bucle, la zona cambia.',
    de: 'Runde schließen, Zone kippt.',
    pt: 'Feche o circuito, a zona vira.',
  },
  /**
   * La légende des 3 RÔLES de zone (§C) — l'information n'est jamais portée par
   * la seule couleur, elle est nommée. La 2e règle (« tout droit, tu prends les
   * rues ») a été RETIRÉE avec la coupe : le titre énonce déjà LA règle, et un
   * écran qui enseigne deux mécaniques n'en fait comprendre aucune en < 3 s.
   * Elle reste enseignée là où elle se joue (carte + course).
   */
  learnTagline: {
    fr: 'Chartreuse = à toi. Violet = contestée. Orange = un crew rival.',
    en: 'Chartreuse = yours. Purple = contested. Orange = a rival crew.',
    es: 'Chartreuse = tuya. Violeta = disputada. Naranja = un crew rival.',
    de: 'Chartreuse = deine. Violett = umkämpft. Orange = Rivalen-Crew.',
    pt: 'Chartreuse = sua. Violeta = disputada. Laranja = um crew rival.',
  },
  /**
   * Sous le visuel, deux vérités en une ligne : ce tracé n'est PAS le sien, et
   * le GPS ne s'allume qu'au départ d'une course. Cette 2e phrase remplace tout
   * un écran de permission qui ne demandait rien (la vraie demande système vit
   * au premier GO, dans le flow de course) : elle est courte, pas absente.
   */
  learnNote: {
    fr: 'Exemple. Tes zones arrivent à ta première course — GPS allumé au départ.',
    en: 'A sample. Your zones come with your first run — GPS on at the start.',
    es: 'Ejemplo. Tus zonas llegan en tu primera carrera: GPS activo al salir.',
    de: 'Beispiel. Deine Zonen kommen mit dem ersten Lauf — GPS an beim Start.',
    pt: 'Exemplo. Suas zonas chegam na primeira corrida — GPS ligado na largada.',
  },
  learnCta: {
    fr: 'Prendre ma première zone',
    en: 'Take my first zone',
    es: 'Tomar mi primera zona',
    de: 'Meine erste Zone holen',
    pt: 'Tomar minha primeira zona',
  },

  // ─── 3 COMPTE ──────────────────────────────────────────────────────────────
  accountKicker: {
    fr: 'AVANT DE COURIR',
    en: 'BEFORE YOU RUN',
    es: 'ANTES DE CORRER',
    de: 'BEVOR DU LOSLÄUFST',
    pt: 'ANTES DE CORRER',
  },
  /**
   * Le titre dit LES DEUX PORTES (retour fondateur 21/07/2026). « Crée ton
   * compte. » seul faisait de cet écran une impasse apparente pour qui en a
   * déjà un : il rebroussait chemin au lieu de taper sur une des voies, qui
   * toutes savent pourtant le connecter.
   */
  accountTitle: {
    fr: 'Crée ton compte, ou connecte-toi.',
    en: 'Create your account, or sign in.',
    es: 'Crea tu cuenta, o inicia sesión.',
    de: 'Erstell dein Konto — oder melde dich an.',
    pt: 'Crie sua conta, ou entre.',
  },
  /** Rien n'a encore été conquis : la copy parle au FUTUR, jamais au passé. */
  accountTagline: {
    fr: 'Un compte, un tap. Les zones que tu prendras te suivront sur tous tes appareils.',
    en: 'One account, one tap. The zones you take will follow you on every device.',
    es: 'Una cuenta, un toque. Las zonas que tomes te seguirán en todos tus dispositivos.',
    de: 'Ein Konto, ein Tap. Die Zonen, die du holst, folgen dir auf allen Geräten.',
    pt: 'Uma conta, um toque. As zonas que você tomar seguem você em todos os aparelhos.',
  },
  /**
   * Variante quand un backend est configuré : la carte EXIGE une session. Le
   * dire ici, c'est éviter que le joueur tape « Plus tard » et se cogne à une
   * porte fermée deux écrans plus loin (le cul-de-sac corrigé le 21/07/2026).
   */
  accountTaglineRequired: {
    fr: 'Un compte, un tap. Il est nécessaire pour entrer sur la carte et garder tes zones.',
    en: 'One account, one tap. It’s required to enter the map and keep your zones.',
    es: 'Una cuenta, un toque. Es necesaria para entrar al mapa y conservar tus zonas.',
    de: 'Ein Konto, ein Tap. Nötig, um auf die Karte zu kommen und deine Zonen zu behalten.',
    pt: 'Uma conta, um toque. Ela é necessária para entrar no mapa e manter suas zonas.',
  },
  accountApple: {
    fr: 'Se connecter avec Apple',
    en: 'Sign in with Apple',
    es: 'Iniciar sesión con Apple',
    de: 'Mit Apple anmelden',
    pt: 'Entrar com Apple',
  },
  accountGoogle: {
    fr: 'Se connecter avec Google',
    en: 'Sign in with Google',
    es: 'Iniciar sesión con Google',
    de: 'Mit Google anmelden',
    pt: 'Entrar com Google',
  },
  /**
   * Voie e-mail (code OTP). « Continuer avec un e-mail » ne disait pas si ça
   * CRÉAIT ou CONNECTAIT — le libellé reste neutre, et `accountEmailHint`
   * juste en dessous dit exactement ce que fait le code. On préfère l'écrire
   * que de laisser le joueur le deviner.
   */
  accountEmail: {
    fr: 'Continuer par e-mail',
    en: 'Continue with email',
    es: 'Continuar por correo',
    de: 'Mit E-Mail fortfahren',
    pt: 'Continuar por e-mail',
  },
  accountEmailHint: {
    fr: 'Un code à 6 chiffres : il te connecte si ton compte existe, il le crée sinon.',
    en: 'A 6-digit code: it signs you in if your account exists, and creates it if not.',
    es: 'Un código de 6 dígitos: te conecta si tu cuenta existe, y la crea si no.',
    de: 'Ein 6-stelliger Code: Er meldet dich an, wenn dein Konto existiert — sonst legt er es an.',
    pt: 'Um código de 6 dígitos: ele conecta você se a conta existir, e a cria se não.',
  },
  /** Échec honnête : on reste sur l'écran (jamais un faux succès). */
  accountError: {
    fr: 'Connexion impossible. Réessaie, ou passe par l’e-mail.',
    en: 'Sign-in failed. Try again, or use email instead.',
    es: 'No se pudo iniciar sesión. Reintenta o usa el correo.',
    de: 'Anmeldung fehlgeschlagen. Versuch es nochmal oder nimm die E-Mail.',
    pt: 'Não foi possível entrar. Tente de novo ou use o e-mail.',
  },

  // ─── NOTIFICATIONS (copy conservée — opt-in HORS onboarding) ───────────────
  notifKicker: {
    fr: 'RESTE DANS LA PARTIE',
    en: 'STAY IN THE GAME',
    es: 'SIGUE EN LA PARTIDA',
    de: 'BLEIB IM SPIEL',
    pt: 'FIQUE NO JOGO',
  },
  notifTitle: {
    fr: 'Sois prévenu quand on t’attaque.',
    en: 'Know when you’re under attack.',
    es: 'Entérate cuando te ataquen.',
    de: 'Erfahr es, wenn du angegriffen wirst.',
    pt: 'Saiba quando você for atacado.',
  },
  notifTagline: {
    fr: 'Une alerte quand ton territoire est menacé, quand ton crew a besoin de toi. Rien d’autre.',
    en: 'One alert when your territory is threatened, when your crew needs you. Nothing else.',
    es: 'Una alerta cuando tu territorio esté amenazado, cuando tu crew te necesite. Nada más.',
    de: 'Ein Alarm, wenn dein Territorium bedroht ist, wenn deine Crew dich braucht. Sonst nichts.',
    pt: 'Um alerta quando seu território estiver ameaçado, quando seu crew precisar de você. Nada mais.',
  },
  notifCta: {
    fr: 'Activer les alertes',
    en: 'Turn on alerts',
    es: 'Activar alertas',
    de: 'Alerts aktivieren',
    pt: 'Ativar alertas',
  },
});
