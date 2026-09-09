/**
 * GRYD — groupe de routes de l'UI MVP (ADR-001, lot M2).
 *
 * ─── POURQUOI UN GROUPE À PART, ET PAS UN REMPLACEMENT EN PLACE ─────────────
 * Les écrans legacy sont en quarantaine LOGIQUE : on ne les lit pas, on ne les
 * importe pas. Mais l'app doit rester utilisable pendant toute la Phase 1 —
 * remplacer écran par écran casserait le parcours entre deux lots, et il n'y a
 * pas de branche de repli puisque `main` est la branche de travail.
 *
 * Les huit écrans du MVP se construisent donc ICI, à côté, et la bascule sera
 * UN changement de route d'entrée, une fois les huit passés sous `ux-gate`.
 * Tant que ce n'est pas fait, ce groupe n'est atteint que par une URL directe :
 * aucun joueur n'y tombe par accident, aucun écran à moitié fini n'est exposé.
 *
 * `headerShown: false` : la scène porte son propre titre (L12, un chiffre/titre
 * héros par écran) — un header système ajouterait une seconde hiérarchie.
 */
import { Stack } from 'expo-router';
import { colors } from '@klaim/shared';

/**
 * ⚠️ LES ÉCRANS DONT ON NE SORT PAS PAR UN GESTE.
 *
 * Le geste de retour iOS est ACTIF par défaut sur une pile native. Or la pile
 * réelle est `carte → push('/prete') → replace('/course')` : `course` est donc
 * empilé directement sur `carte`, et un effleurement du bord gauche — en
 * sortant le téléphone de sa poche, en pleine course — DÉMONTE l'écran. Le
 * suivi s'arrête (`stopBackgroundUpdates`), et le coureur n'a rien décidé.
 *
 * La trace n'est pas perdue (le buffer la propose en « course interrompue »),
 * mais c'est un accident silencieux sur l'écran le plus long du produit. Le HIG
 * demande de couper le geste quand la sortie est destructive : une activité en
 * cours se présente comme un moment à part, pas comme une page qu'on feuillette.
 *
 * `resultat` suit la même règle pour la raison inverse : revenir en arrière y
 * ramènerait sur une course déjà close et déjà envoyée.
 */
const SANS_GESTE_RETOUR = ['prete', 'course', 'resultat'] as const;

/**
 * LES TRANSITIONS, PAR RÔLE D'ÉCRAN.
 *
 * ⚠️ `animation: 'fade'` était posé sur TOUT le groupe. Le commentaire le
 * justifiait par « pas d'animation coûteuse entre deux écrans D'ONBOARDING » —
 * mais l'option vivait dans `screenOptions`, donc elle s'appliquait aussi à
 * `carte → prete → course → resultat` et à `carte → profil`. Conséquence : rien
 * ne disait plus au joueur s'il AVANÇAIT ou s'il REVENAIT. Aller sur « Toi » et
 * en repartir produisait exactement la même transition, et le modèle spatial
 * d'iOS — le nouvel écran vient de la droite, le retour y repart — était effacé.
 *
 * Trois rôles, trois traitements :
 *   · `fade` — écrans atteints par `replace`. Il n'y a AUCUN retour possible
 *     vers eux : un glissement promettrait une profondeur qui n'existe pas.
 *   · `slide_from_right` — écrans empilés par `push`, d'où l'on revient. C'est
 *     le seul cas où la direction porte une information.
 *   · `fade_from_bottom` — le préflight. Il n'est ni une page ni un retour :
 *     c'est un moment à part, et venir du bas le dit sans mot.
 */
const TRANSITIONS = {
  // ⚠️ `bienvenue` A DISPARU D'ICI le 02/09/2026, avec son écran : l'onboarding
  // a fusionné ses deux écrans en un seul (`position.tsx`). Une transition
  // laissée pour un écran inexistant n'est pas inoffensive — `couture.test.ts`
  // la refuse précisément parce qu'elle fait croire qu'une route existe encore.
  position: 'fade',
  connexion: 'fade',
  carte: 'fade',
  // ⚠️ RENOMMÉ LE 10/09/2026 — `profil.tsx` → `profil-mvp.tsx`. Les DEUX
  // groupes servaient `/profil` (`app/(tabs)/profil.tsx` et celui-ci) : une
  // collision de routes expo-router réelle, où le fichier gagnant dépendait de
  // l'ordre de résolution. Le groupe `(mvp)` étant la quarantaine (ADR-001,
  // remplacée par ADR-012), c'est LUI qui cède son chemin. Le nom du fichier
  // porte un tiret : la clé doit donc être CITÉE ici, et `couture.test.ts`
  // accepte désormais cette forme (sans quoi l'écran serait déclaré manquant).
  'profil-mvp': 'slide_from_right',
  prete: 'fade_from_bottom',
  course: 'fade',
  resultat: 'fade',
} as const;

export default function MvpLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.noir },
        // Le défaut sert les écrans empilés ; chaque écran nommé ci-dessous le
        // remplace par son rôle réel.
        animation: 'slide_from_right',
      }}
    >
      {Object.entries(TRANSITIONS).map(([nom, animation]) => (
        <Stack.Screen
          key={nom}
          name={nom}
          options={{
            animation,
            gestureEnabled: !(SANS_GESTE_RETOUR as readonly string[]).includes(nom),
          }}
        />
      ))}
    </Stack>
  );
}
