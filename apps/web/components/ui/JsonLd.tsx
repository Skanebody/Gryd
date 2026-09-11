/**
 * GRYD — UN BLOC DE DONNÉES STRUCTURÉES (lot W2).
 *
 * Trois blocs sur tout le site, pas un de plus (cahier §3.10). Ce composant ne
 * décide de rien : il rend ce que `lib/structuredData2026.ts` a construit, et
 * c'est LÀ que vit la règle de ce qui est déclaré et de ce qui ne l'est pas.
 *
 * `dangerouslySetInnerHTML` est la seule façon d'écrire un `<script>` non
 * exécutable en JSX ; `serializeJsonLd` échappe `<` pour qu'aucune valeur ne
 * puisse refermer la balise.
 */
import type { JsonLdValue } from '../../lib/structuredData2026';
import { serializeJsonLd } from '../../lib/structuredData2026';

export function JsonLd({ data }: { readonly data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
