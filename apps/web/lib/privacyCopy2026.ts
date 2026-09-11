/**
 * GRYD — LA COPIE DE « SÉCURITÉ ET VIE PRIVÉE » (lot W3).
 *
 * MOT POUR MOT `docs/product/GRYD_SITE_CONTENU_2026_09.md` §3.6.
 *
 * ─── CE QUI NE SE DIT PAS ICI, ET LE CAHIER L'INTERDIT UNE PAR UNE ──────────
 * « Gryd détecte toute triche », « tes données sont parfaitement en sécurité »,
 * ou tout absolu de ce genre. Le cahier §4.2 interdit la promesse de sécurité
 * absolue et d'anti-triche infaillible : une page qui promet l'infaillible ment
 * au premier contre-exemple, et il y en a toujours un.
 *
 * La coupe de partage vient de `SHARE_TRIM_M`, les durées de conservation de
 * `TRACE_RETENTION_DAYS_2026`, l'âge de `MIN_AGE_YEARS` : trois constantes
 * partagées avec l'application, jamais retapées.
 */
import { SITE_COUNTS, SITE_FACTS, type SiteStat, stat } from './facts2026';

export interface PrivacySection {
  readonly id: string;
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly facts?: readonly SiteStat[];
}

export const PRIVACY_COPY = {
  seo: {
    title: 'Gryd : sécurité et vie privée, ce qu’on cache',
    description:
      'Les extrémités de ta trace sont coupées sur 250 m avant tout partage. Tu choisis la durée de conservation. Le serveur décide chaque capture.',
  },

  /**
   * Le cahier ne donne pas de sous-titre à cette page : son accroche est la
   * description de référencement, écrite pour tenir en trois phrases. La reprise
   * telle quelle évite d'en inventer une quatrième, et le chiffre y est
   * interpolé comme partout ailleurs.
   */
  hero: {
    title: 'Ce que Gryd montre, et ce qu’il cache',
    lead: `Les extrémités de ta trace sont coupées sur ${SITE_FACTS.shareTrim.value} avant tout partage. Tu choisis la durée de conservation. Le serveur décide chaque capture.`,
  },

  sections: [
    {
      id: 'extremites',
      kicker: 'Partage',
      title: 'Tes extrémités sont coupées',
      body: `Avant tout partage public, Gryd retire les ${SITE_COUNTS.shareTrimMetres} premiers et les ${SITE_COUNTS.shareTrimMetres} derniers mètres de ta trace. Le point où tu pars et celui où tu rentres ne voyagent pas.`,
      facts: [stat(SITE_FACTS.shareTrim, 'coupés à chaque bout avant tout partage public')],
    },
    {
      id: 'conservation',
      kicker: 'Conservation',
      title: 'Tu choisis la durée de conservation',
      body: `Par défaut, Gryd garde tes tracés tant que tu n’as rien demandé : rien ne s’efface dans ton dos. Tu peux choisir ${SITE_COUNTS.retentionLongYears} an, ou ${SITE_COUNTS.retentionShortDays} jours, dans Confidentialité et données. Tu peux aussi supprimer le tracé d’une sortie précise, sans supprimer la sortie. Un tracé ne s’efface pas tant qu’une vérification ou un recours te concernant est ouvert. C’est la seule exception, et elle protège ton droit de contester.`,
      facts: [
        stat(SITE_FACTS.retentionLong, 'de conservation, si tu le choisis'),
        stat(SITE_FACTS.retentionShort, 'de conservation, si tu le choisis'),
      ],
    },
    {
      id: 'zones-protegees',
      kicker: 'Tes lieux',
      title: 'Tes zones protégées',
      body: 'Une boucle qui montrerait une zone que tu as protégée reste privée : elle ne change rien sur la carte publique, et ta sortie compte quand même pour toi.',
    },
    {
      id: 'serveur',
      kicker: 'Décision',
      title: 'Le serveur décide, pas ton téléphone',
      body: 'Aucune capture n’est décidée par l’application. Le serveur relit la trace, vérifie la fermeture, la longueur, la surface, la précision aux extrémités et l’heure. Il accorde, ou il refuse avec un motif nommé.',
      facts: [
        stat(SITE_FACTS.endpointAccuracy, 'de précision GPS attendue aux deux bouts'),
        stat(SITE_FACTS.clockTolerance, 'd’écart d’horloge toléré'),
      ],
    },
    {
      id: 'anti-triche',
      kicker: 'Anti-triche',
      title: 'Comment l’anti-triche fonctionne, en clair',
      body: 'Gryd cherche quatre choses : une vitesse de véhicule tenue trop longtemps, une cadence qui ne correspond pas au sport annoncé, une précision GPS trop régulière pour être vraie, et un signal de position simulée quand le téléphone le déclare. Une sortie suspecte est mise de côté : elle ne prend pas de terrain, ne donne pas de points, et une personne la relit. Elle n’est jamais effacée. Aucune vitesse seule ne condamne une sortie. Un cycliste rapide en descente reste un cycliste.',
    },
    {
      id: 'droits',
      kicker: 'Tes droits',
      title: 'Tes droits',
      body: `Tu peux exporter tout ce que Gryd sait de toi, et supprimer ton compte depuis l’application. Gryd est réservé aux ${SITE_COUNTS.minimumAge} ans et plus.`,
      facts: [stat(SITE_FACTS.minimumAge, 'et plus, pour ouvrir un compte')],
    },
  ] as readonly PrivacySection[],

  cta: { label: 'La politique de confidentialité', href: '/confidentialite/' },
} as const;
