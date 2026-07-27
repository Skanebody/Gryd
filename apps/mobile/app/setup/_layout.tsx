/**
 * GRYD — PREMIER USAGE RÉEL : le conteneur du parcours `/setup/*`.
 *
 * Trois écrans de la spec produit y vivent, dans cet ordre :
 *   · E08 `/setup/profile`     — création du profil minimal  (`profile.tsx`)
 *   · E09 `/setup/activity`    — choix d'activité initial    (`activity.tsx`)
 *   · E10 `/setup/permissions` — permissions utiles
 *
 * ⚠️ CE LAYOUT N'ORCHESTRE PAS LE PARCOURS, ET C'EST DÉLIBÉRÉ. Il ne connaît ni
 * l'ordre des étapes, ni l'étape courante, ni le nombre d'écrans. Chaque écran
 * nomme son suivant (`NEXT_STEP`, en toutes lettres, chez lui) — pour trois
 * écrans, une table de flow ici serait plus de code que de sens, et surtout elle
 * DÉCIDERAIT à distance de choses que seul l'écran sait (E09 se saute lui-même
 * quand le vélo est fermé, par exemple).
 *
 * ─── CE QU'IL NE PEINT PAS, ET POURQUOI ─────────────────────────────────────
 * PAS DE FRISE « 1 / 3 ». Elle serait un CHIFFRE affirmé sur un parcours dont la
 * longueur varie réellement (E09 se retire tout seul selon `flags.bike`) : « 1/3 »
 * annoncerait alors une étape qui n'aura jamais lieu. Un compte faux est une
 * donnée fabriquée comme une autre — et l'onboarding, lui, dérive sa frise de la
 * liste des étapes précisément parce qu'il EN A une (`content.ts`). Ici il n'y en
 * a pas : on ne peint donc rien plutôt que d'inventer un dénominateur.
 *
 * PAS DE BARRE DE RETOUR NON PLUS — le layout n'en pose aucune, et chaque écran
 * garde la maîtrise de sa propre navigation. Ce qui EXISTE (27/07/2026), c'est
 * un retour peint par E10 lui-même, et seulement quand il mène vraiment quelque
 * part (`router.canGoBack()`, la capacité RÉELLE de la pile) :
 *   · E08 → E09 se fait par `replace`. Y revenir montrerait un formulaire vide
 *     alors que la ligne `user_profiles` est déjà écrite, et la vérification
 *     répondrait « @handle déjà pris » sur le handle du joueur lui-même : un
 *     cul-de-sac. Donc aucune flèche en E09 — `canGoBack()` y est faux ;
 *   · E09 → E10 se fait par `push`. Le retour existe réellement, et rechoisir sa
 *     discipline ne coûte rien : E10 peint donc sa flèche ;
 *   · quand `flags.bike` est fermé, E09 se remplace par un `<Redirect>` vers E10
 *     : il n'y a plus rien derrière, et aucune flèche n'est peinte.
 * L'affichage se dérive de la capacité, jamais de l'apparence (§2).
 *
 * Ce layout ne fait donc qu'UNE chose : poser le fond noir de la charte sous les
 * écrans et éteindre l'entête natif — sans lui, la pile racine peindrait une
 * barre blanche système par-dessus des écrans dark-first.
 */
import { Stack } from 'expo-router';
import { colors } from '@klaim/shared';

export default function SetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.noir },
        // Même transition sobre que la pile racine (addendum §G) : le parcours
        // ne doit pas se distinguer du reste de l'app par son animation.
        animation: 'fade',
      }}
    />
  );
}
