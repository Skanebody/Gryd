# Film 2D GRYD — contrat d’export

`generateRunFilm2026(input)` produit un fichier MP4 H.264 local de huit secondes, sans audio. La trace apparaît entre 0,5 et 5 secondes, puis le résultat complet reste visible pendant trois secondes. Story : 1080 × 1920 ; portrait : 1080 × 1350 ; carré : 1080 × 1080. Les chiffres proviennent des faits déjà calculés par `buildShareFacts2026` ; le générateur ne calcule aucun gain. Une activité sans trace partageable reçoit une composition avec ses mesures et un texte, sans parcours inventé.

Le pipeline applique `protectedShareSegments2026` à l’entrée, puis projette les fragments conservés dans une scène de pixels. Seule cette scène est transmise au module natif. Les pauses restent distinctes. Aucune latitude, longitude, zone privée, URL de tuile, photo source ou métadonnée d’activité n’est transmise à l’encodeur. Le MP4 n’ajoute ni piste audio, ni métadonnée GPS. Les dessins ne dépendent pas d’un fournisseur cartographique.

`RunFilmPreview2026({ input, width })` dessine la scène de la dernière frame avec le même modèle, les mêmes textes et les mêmes coordonnées. C’est un aperçu statique ; le Studio le nomme explicitement. Les métriques des polices système peuvent varier légèrement entre plateformes. L’aperçu ne simule pas un export vidéo réussi.

API :

- `getRunFilmCompatibility2026(format?)` vérifie la présence du module et la prise en charge du format par l’encodeur. Le web renvoie `web_not_supported`, un ancien binaire ou Expo Go `native_build_required`.
- `generateRunFilm2026({ facts, segments, privacy, format, theme, locale, signal? })` renvoie `{ ok:true, uri, mimeType:'video/mp4', durationMs:8000, width, height }` après finalisation du fichier, ou `{ ok:false, reason }`. `facts.rate` est facultatif et doit déjà contenir la bonne unité.
- L’export est exclusif (`busy`), borné en temps et annulable avec `AbortSignal`. Les encodeurs suppriment les fichiers partiels. Une sortie tardive après expiration est supprimée.
- `releaseRunFilm2026(uri)` supprime uniquement un film du cache dédié. À appeler après le retour de la feuille système, ou lorsqu’un résultat terminé est abandonné. Le module élimine aussi les films de plus de 24 heures au prochain export.

## Intégration native

Le module local se trouve dans `apps/mobile/modules/gryd-run-film`. L’autolinking d’Expo SDK 52 le trouve automatiquement pour iOS et Android. Il utilise AVAssetWriter/CoreGraphics/CoreText sur iOS, MediaCodec/MediaMuxer/Canvas et une surface EGL sur Android. Aucun FFmpeg, serveur de rendu, SDK payant ou dépendance tierce n’a été ajouté.

**Un nouveau binaire natif est indispensable.** Une mise à jour JavaScript ou un redémarrage de Metro ne peut pas ajouter le module à un binaire existant. Depuis `apps/mobile`, construire avec `npx expo run:ios` ou `npx expo run:android`, ou utiliser les profils EAS existants. Les outils natifs, la signature et les SDK requis doivent être installés sur la machine de build.

## Preuves et limites de validation

Le 9 septembre 2026 :

- Les sept tests du modèle passent : confidentialité indisponible, trace entièrement masquée, absence GPS, pauses, fixes invalides, formats, animation, faits réels transmis et entrées trop volumineuses.
- L’encodeur Swift de production a été compilé et exécuté sur macOS avec des fixtures explicitement synthétiques. Les trois MP4 ont été décodés : H.264, 8,000 secondes, 240 frames, dimensions exactes, aucune piste audio ni métadonnée d’asset. Les frames 0, 3 et 7 secondes ont été extraites ; le rendu a été inspecté.
- L’annulation pendant chaque encodage a été vérifiée : aucun fichier partiel conservé.
- L’autolinking a été résolu pour les deux plateformes et identifie bien le pod, le projet Android et leurs classes de module.
- **Le wrapper Expo iOS et le code Android n’ont pas été compilés sur ce poste**, qui n’a ni Xcode complet ni SDK Android. Cette validation macOS ne constitue pas une recette iPhone/Android. La compilation des dev builds, les exports sur appareil, la mémoire, l’interruption de l’application et la remise aux destinations système restent à vérifier avant de déclarer ces plateformes recettées.

Reproduction de la preuve macOS depuis la racine du dépôt :

```sh
mkdir -p /tmp/gryd-film-proof
~/.deno/bin/deno run --allow-read --allow-write --allow-env scripts/native/runFilmFixtures2026.ts /tmp/gryd-film-proof
swiftc -O -module-cache-path /tmp/gryd-swift-cache -o /tmp/gryd-film-proof/encode apps/mobile/modules/gryd-run-film/ios/RunFilmEncoder.swift scripts/native/RunFilmSmoke.swift
/tmp/gryd-film-proof/encode /tmp/gryd-film-proof/film-story.json /tmp/gryd-film-proof/film-story.mp4
/tmp/gryd-film-proof/encode /tmp/gryd-film-proof/film-portrait.json /tmp/gryd-film-proof/film-portrait.mp4
/tmp/gryd-film-proof/encode /tmp/gryd-film-proof/film-square.json /tmp/gryd-film-proof/film-square.mp4
```

L’accès au service d’encodage vidéo macOS doit être autorisé ; un environnement isolé qui le bloque peut retourner `Cannot Encode` sans indiquer un défaut du fichier ou du dessin.

Références techniques : [Expo Modules](https://docs.expo.dev/modules/module-api/), [autolinking](https://docs.expo.dev/modules/autolinking/), [AVAssetWriterInputPixelBufferAdaptor](https://developer.apple.com/documentation/avfoundation/avassetwriterinputpixelbufferadaptor), [MediaCodec](https://developer.android.com/reference/android/media/MediaCodec). L’API locale d’Expo 52 a également été inspectée pour valider les appels de module utilisés.
