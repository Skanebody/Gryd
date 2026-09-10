/**
 * GRYD — `/comment-ca-marche` : le guide interactif (G29 · aide).
 *
 * Route de composition PURE : l'écran vit dans `src/features/help/HelpGuide2026`
 * (convention du cahier de septembre — `app/(tabs)/index.tsx` fait de même).
 *
 * CONTRAT DE LIEN PROFOND : `?chapitre=<id>` ouvre directement un chapitre, avec
 * les identifiants FRANÇAIS de `helpChapters2026.HELP_CHAPTER_IDS` — bouger ·
 * boucle · terrain · points · crew · saison · fair-play · faq. Un identifiant
 * inconnu ouvre le premier chapitre : un lien périmé ne rend jamais un écran vide.
 */
export { default } from '../src/features/help/HelpGuide2026';
