/**
 * GRYD — LA COPIE DE « TÉLÉCHARGER » (lot W3).
 *
 * MOT POUR MOT `docs/product/GRYD_SITE_CONTENU_2026_09.md` §3.8.
 *
 * ─── AUCUN BADGE APPLE, AUCUN LIEN `apps.apple.com` ─────────────────────────
 * Il n'existe AUCUNE adresse de fiche App Store dans le dépôt : un bouton
 * serait mort, et la constitution l'interdit. La page dit l'état réel, et
 * propose la seule action qui fonctionne vraiment : laisser son adresse.
 *
 * ─── LE FORMULAIRE EST RÉEL ─────────────────────────────────────────────────
 * `WaitlistForm` appelle la RPC `waitlist_join(email, postal_code)` (migration
 * 0034, `SECURITY DEFINER`, accordée à `anon`) via `lib/waitlistJoin.ts`. Rien
 * n'est annoncé avant le retour du serveur : un « c'est noté » sans insert réel
 * serait le mensonge exact que la constitution interdit.
 *
 * ⚠️ CE QUI A DISPARU : le seuil « ton quartier ouvre à 500 inscrits »
 * (`WAITLIST_UNLOCK_THRESHOLD`). Les communes s'ouvrent par PRÉSENCE RÉELLE, dès
 * la première boucle fermée. La constante reste dans le code ; elle ne décrit
 * plus rien de vivant, et elle n'apparaît plus à l'écran.
 */
import { SITE_COUNTS } from './facts2026';

export const DOWNLOAD_COPY = {
  seo: {
    title: 'Télécharger Gryd : où en est la sortie',
    description:
      'Gryd n’est pas encore sur l’App Store. Laisse ton e-mail pour être prévenu le jour de l’ouverture. Réservé aux 16 ans et plus.',
  },

  hero: {
    title: 'Gryd n’est pas encore sur l’App Store',
    lead: 'C’est l’état réel, au 12 septembre 2026. L’application tourne, elle est testée tous les jours sur iPhone, et elle n’a pas encore de fiche publique. Laisse ton e-mail : tu seras prévenu le jour où elle en aura une.',
  },

  /**
   * L'encart d'état, posé EN TÊTE DU FORMULAIRE. Il n'a pas de corps : le
   * cahier n'en écrit pas, et une page honnête n'invente pas une phrase pour
   * remplir un encart. Il dit le fait, au moment où il compte : juste avant
   * qu'on laisse son adresse.
   */
  notice: {
    title: 'Gryd n’est pas encore sur l’App Store.',
  },

  waitlist: {
    kicker: 'Liste d’attente',
    title: 'Être prévenu',
    emailLabel: 'Ton adresse e-mail',
    postalLabel: 'Ton code postal',
    postalHelp: 'Il nous dit où le produit est attendu. Il ne débloque rien et il n’ouvre aucune commune.',
    submit: 'Me prévenir',
    success: 'C’est noté. On t’écrit quand Gryd ouvre.',
  },

  before: {
    kicker: 'Avant de commencer',
    title: 'Ce qu’il faut savoir avant',
    body: `Gryd est réservé aux ${SITE_COUNTS.minimumAge} ans et plus. Il fonctionne sur iPhone. Il te demande ta position pendant tes sorties, et te dit pourquoi avant de la demander. Tout le jeu est gratuit.`,
  },

  cta: { label: 'Comment ça marche', href: '/comment-ca-marche/' },
} as const;
