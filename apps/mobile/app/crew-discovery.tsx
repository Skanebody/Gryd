/**
 * GRYD — /crew-discovery : ROUTE ARCHIVÉE (fin du mode vitrine, 21/07/2026).
 *
 * Cette page listait des crews INVENTÉS (`features/crew/publicDemo`) avec des
 * filtres « War Active / Defense Active / Pionniers » calculés sur ces mêmes
 * données fabriquées, et un CTA « Demander à rejoindre » qui n'écrivait nulle
 * part. Elle n'était atteignable que sous `isShowcasePlatform` ; sinon elle
 * redirigeait déjà vers l'écran Crew réel. La vitrine étant abandonnée, il ne
 * reste que la redirection.
 *
 * Pourquoi GARDER le fichier : la route est déclarée dans `_layout.tsx`, donc
 * atteignable par deep link, et l'onboarding comme la carte ont pu y pousser.
 * Une redirection vaut mieux qu'un « unmatched route ».
 *
 * Rejoindre un crew se fait aujourd'hui par CODE, dans l'écran Crew réel — c'est
 * le seul chemin qui touche vraiment `crew_members`. Un annuaire de crews est un
 * chantier serveur à part entière (recherche, recrutement, modération).
 *
 * ── 25/07/2026 — PLUS AUCUN APPELANT DANS L'APP ─────────────────────────────
 * Le dernier lien interne (« Trouver un crew », `ProfileHero` du Profil) pointait
 * ici et promettait une découverte que l'écran d'arrivée n'offre pas. Il a été
 * renommé « Rejoindre avec un code » et route désormais DIRECTEMENT sur `/crew`.
 * Ce fichier ne sert donc plus qu'aux deep links déjà partagés — raison pour
 * laquelle il n'est toujours pas supprimé. Le manque, lui, est inscrit là où il
 * fait foi : `AMENDEMENT-47-FIN-DU-MODE-DEMO.md` § « Ce qui reste EN SUSPENS ».
 */
import { Redirect } from 'expo-router';

export default function CrewDiscoveryRoute() {
  return <Redirect href="/crew" />;
}
