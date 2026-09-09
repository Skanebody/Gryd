/**
 * GRYD — LE RATTACHEMENT DES SORTIES INVITÉ NE SE MÉRITE PLUS AU SCROLL.
 *
 * Une personne qui a couru sans compte, puis se connecte, possède des sorties
 * qui ne sont rattachées à rien. La seule porte pour les rattacher vivait au
 * BAS de l'écran Profil, sous le journal et la collection : il fallait savoir
 * qu'elle existait pour la trouver. C'est un fait vrai, urgent (la valeur est
 * déjà là, elle attend un geste) et invisible.
 *
 * Le bandeau est ACQUITTABLE : « Plus tard » écrit un reçu durable pour CE
 * compte, et le bandeau ne revient pas au prochain lancement. La ligne du bas
 * reste, elle, pour ceux qui l'ont acquitté puis changent d'avis — acquitter
 * n'efface pas la possibilité, seulement le rappel.
 *
 * Module PUR (une `Storage` structurelle injectée) : testable sous Deno sans
 * AsyncStorage, comme `progressMomentLedger2026`.
 */
export interface AdoptionNoticeStorage2026 {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}
export const adoptionNoticeKey2026 = (ownerId: string) => `gryd.adoption-notice.v1:${ownerId}`;

export function createAdoptionNoticeStore2026(storage: AdoptionNoticeStorage2026) {
  const acknowledged = new Map<string, boolean>();
  return {
    /** `null` = on ne sait pas encore ; on ne peint donc rien plutôt que de
     * supposer un acquittement (ou de rappeler ce qui l'a déjà été). */
    async read(ownerId: string): Promise<boolean | null> {
      if (!ownerId) return null;
      const cached = acknowledged.get(ownerId);
      if (cached !== undefined) return cached;
      try {
        const value = await storage.getItem(adoptionNoticeKey2026(ownerId));
        const done = value === '1';
        acknowledged.set(ownerId, done);
        return done;
      } catch { return null; }
    },
    /** Un acquittement qui n'a pas pu être écrit n'est pas un acquittement :
     * on rend `false` et le rappel reviendra, plutôt que de le perdre. */
    async acknowledge(ownerId: string): Promise<boolean> {
      if (!ownerId) return false;
      try {
        await storage.setItem(adoptionNoticeKey2026(ownerId), '1');
        acknowledged.set(ownerId, true);
        return true;
      } catch { return false; }
    },
    /** Un changement de compte ne doit jamais hériter du reçu d'un autre. */
    forget(ownerId: string) { acknowledged.delete(ownerId); },
  };
}
