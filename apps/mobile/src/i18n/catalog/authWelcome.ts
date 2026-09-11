/**
 * GRYD — i18n : L'ACCUEIL, juste après que le lien a abouti (`/callback`).
 *
 * ─── POURQUOI UN CATALOGUE À PART ───────────────────────────────────────────
 * `catalog/auth.ts` sert la PORTE (les boutons), `catalog/authEmail.ts` sert le
 * FORMULAIRE et ses refus. Ici, c'est le seul moment du parcours où l'app a
 * quelque chose à célébrer — et le seul où elle a le droit de le faire. Un
 * texte servi aux trois endroits décrirait trois contextes à la fois et
 * finirait faux dans deux.
 *
 * ─── TROIS ÉTATS, TROIS PHRASES, ET AUCUNE N'EMPRUNTE CELLE DU VOISIN ───────
 * Le verdict vient de `features/account/welcome2026.ts`, qui le calcule sur des
 * FAITS (le `type` posé par GoTrue, `handle_chosen_2026`, la date de création
 * du compte) :
 *   · `fresh`     — le lien vient de CRÉER le compte. C'est la demande du
 *     fondateur du 12/09/2026, mot pour mot : « il faudrait qu'appuyer sur le
 *     lien dise félicitations, vous êtes inscrit » ;
 *   · `returning` — le compte existait. On ne félicite pas quelqu'un qui
 *     revient : ce serait un mensonge de plus, pas un mot gentil ;
 *   · `unknown`   — on ne sait pas lequel des deux. La phrase dit ce qui est
 *     vrai dans les deux cas, et rien de plus.
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * TUTOIEMENT en français, « tú » en espagnol, « du » en allemand, « você » en
 * portugais BRÉSILIEN. Aucun TIRET LONG en français (`i18n/noDashFr2026.test.ts`).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Compte NEUF ───────────────────────────────────────────────────────────
  /**
   * La phrase que le fondateur a demandée. Elle affirme UN fait, vérifié : la
   * session existe, donc le compte existe. Elle ne promet rien d'autre.
   */
  freshTitle: {
    fr: 'Félicitations, ton compte GRYD est créé.',
    en: 'Congratulations, your GRYD account is created.',
    es: 'Enhorabuena, tu cuenta GRYD está creada.',
    de: 'Glückwunsch, dein GRYD-Konto ist erstellt.',
    pt: 'Parabéns, sua conta GRYD foi criada.',
  },
  /**
   * Ce qui vient APRÈS, dit avant de taper. Sans cette ligne, le bouton
   * « Commencer » ouvre un formulaire que personne n'attendait : la surprise
   * est le début de l'abandon.
   */
  freshBody: {
    fr: 'Il reste une chose : choisir ton pseudo. C’est lui qui s’affichera sur les terrains que tu prends.',
    en: 'One thing left: choose your handle. It’s what shows on the ground you take.',
    es: 'Queda una cosa: elegir tu alias. Es lo que aparece en el terreno que conquistas.',
    de: 'Eine Sache fehlt noch: dein Kürzel. Es steht auf dem Gebiet, das du dir holst.',
    pt: 'Falta uma coisa: escolher seu apelido. É ele que aparece no terreno que você toma.',
  },
  freshCta: {
    fr: 'Commencer',
    en: 'Get started',
    es: 'Empezar',
    de: 'Loslegen',
    pt: 'Começar',
  },

  // ─── Compte EXISTANT ───────────────────────────────────────────────────────
  /** Avec le pseudo, quand il a été CHOISI (jamais l'étiquette `runner_…`). */
  returningTitleNamed: {
    fr: 'Bon retour, @{handle}.',
    en: 'Welcome back, @{handle}.',
    es: 'Bienvenido de nuevo, @{handle}.',
    de: 'Willkommen zurück, @{handle}.',
    pt: 'Bom te ver de novo, @{handle}.',
  },
  /** Sans pseudo : la lecture n'a pas abouti, ou le joueur ne s'est jamais nommé. */
  returningTitle: {
    fr: 'Bon retour.',
    en: 'Welcome back.',
    es: 'Bienvenido de nuevo.',
    de: 'Willkommen zurück.',
    pt: 'Bom te ver de novo.',
  },
  returningBody: {
    fr: 'Ta ville t’attend. Tes terrains sont là où tu les as laissés.',
    en: 'Your city is waiting. Your ground is where you left it.',
    es: 'Tu ciudad te espera. Tu terreno sigue donde lo dejaste.',
    de: 'Deine Stadt wartet. Dein Gebiet liegt da, wo du es gelassen hast.',
    pt: 'Sua cidade espera por você. Seu terreno está onde você deixou.',
  },
  returningCta: {
    fr: 'Continuer',
    en: 'Continue',
    es: 'Continuar',
    de: 'Weiter',
    pt: 'Continuar',
  },

  // ─── On ne sait pas lequel des deux ────────────────────────────────────────
  /**
   * Ni félicitations, ni « bon retour » : la seule phrase qui reste vraie
   * quand ni le serveur ni l'horloge n'ont pu dire lequel des deux gestes vient
   * d'avoir lieu. Elle n'a rien d'un repli : elle énonce le fait constaté.
   */
  unknownTitle: {
    fr: 'Te voilà connecté.',
    en: 'You’re signed in.',
    es: 'Ya estás dentro.',
    de: 'Du bist angemeldet.',
    pt: 'Você está conectado.',
  },
  unknownBody: {
    fr: 'Ton compte est actif sur cet appareil.',
    en: 'Your account is active on this device.',
    es: 'Tu cuenta está activa en este dispositivo.',
    de: 'Dein Konto ist auf diesem Gerät aktiv.',
    pt: 'Sua conta está ativa neste aparelho.',
  },
});
