/**
 * GRYD — métadonnées de la page d'arrivée du lien de connexion.
 *
 * POURQUOI UN LAYOUT PLUTÔT QUE `export const metadata` DANS LA PAGE : la page
 * est un composant CLIENT (elle lit le fragment `#…`, que le serveur ne reçoit
 * jamais), et Next interdit d'exporter `metadata` depuis un composant client.
 * Ce layout serveur porte donc le titre et le `noindex`, la page porte la
 * lecture du lien.
 *
 * `noindex, nofollow` n'est pas une précaution de style : l'adresse ouverte par
 * le joueur contient ses JETONS DE SESSION dans le fragment. Un moteur qui
 * indexerait cette page publierait une page dont l'URL, en cache ou en
 * référent, peut porter une session. Elle n'a rien à faire dans un index.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'GRYD : ton compte',
  description: 'Retour du lien de connexion GRYD.',
  robots: { index: false, follow: false },
};

export default function CallbackLayout({ children }: { children: ReactNode }) {
  return children;
}
