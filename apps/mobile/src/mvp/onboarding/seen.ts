/**
 * GRYD — LE DRAPEAU « ONBOARDING VU ». La seule I/O de ce dossier (lot M11).
 *
 * ─── POURQUOI UN DRAPEAU MVP PLUTÔT QUE CELUI DU LEGACY ─────────────────────
 * La garde d'entrée lit un drapeau pour savoir s'il faut montrer l'onboarding.
 * Celui du legacy vit dans un hook d'UI (`features/onboarding/store.ts`), et
 * ADR-001 interdit à la nouvelle UI d'importer un hook legacy — c'est
 * exactement la porte par laquelle les habitudes qu'on reconstruit reviennent.
 *
 * D'où une clé À PART. Conséquence assumée : quelqu'un qui avait vu l'ancien
 * onboarding reverra les DEUX écrans MVP une fois. Deux écrans, une seule fois,
 * contre une dépendance permanente vers le legacy — le choix n'est pas serré.
 *
 * ─── POURQUOI CE FICHIER N'EST IMPORTÉ PAR AUCUN TEST ───────────────────────
 * ⚠️ Il importe `@react-native-async-storage/async-storage`, dont les types ne
 * se résolvent PAS sous le runtime Deno de `test:mobile`. Un seul import depuis
 * un module TESTÉ ferait échouer le gate pour la TOTALITÉ de `apps/mobile/src`
 * — pas seulement pour ce fichier. (`crashRecovery.ts` et `persist.ts`
 * documentent le même piège, payé avant moi.)
 *
 * La DÉCISION vit donc dans `signIn.entryDoor` (pure, testée) ; ici il ne reste
 * que la lecture et l'écriture.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingSeen } from './signIn';

/**
 * Clé PROPRE au MVP. `.v1` parce qu'un jour où sa sémantique changerait, un
 * drapeau relu avec l'ancienne signification enverrait tout le monde au mauvais
 * endroit — mieux vaut alors une clé neuve et un onboarding revu une fois.
 */
const CLE = 'gryd.mvp.onboardingSeen.v1';

/**
 * L'onboarding a-t-il été vu ?
 *
 * ⚠️ Un stockage ILLISIBLE renvoie `unseen`, et c'est le SEUL repli de ce
 * fichier — assumé, pas subi. Il n'affirme pas « cette personne n'a jamais vu
 * les écrans » : il envoie vers la porte la moins coûteuse en cas de doute.
 * Se tromper vers l'onboarding coûte deux écrans à quelqu'un qui les avait vus,
 * et il en ressort par la connexion de toute façon ; l'inverse sauterait la
 * seule explication du jeu. `entryDoor` documente ce même sens du doute côté
 * décision — les deux disent la même chose, pour la même raison.
 */
export async function readOnboardingSeen(): Promise<OnboardingSeen> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut === '1' ? 'seen' : 'unseen';
  } catch {
    return 'unseen';
  }
}

/**
 * Marque l'onboarding comme vu. Ne jette JAMAIS.
 *
 * Un échec d'écriture ne doit pas retenir quelqu'un qui vient de finir
 * l'onboarding : au pire il le reverra une fois, ce qui coûte deux taps —
 * infiniment moins qu'un écran bloqué sur une erreur de stockage.
 */
export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE, '1');
  } catch {
    // Stockage plein/indisponible — jamais bloquant (voir ci-dessus).
  }
}
