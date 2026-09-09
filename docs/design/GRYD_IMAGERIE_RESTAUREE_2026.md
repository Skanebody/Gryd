# GRYD — visuels de marque retrouvés

9 septembre 2026. À la demande du fondateur, les photographies de marque reviennent aux visuels déjà fournis : personnages en mouvement, décor urbain, vêtements noirs et touches chartreuse. Les couleurs naturelles de peau sont préservées. Aucune photographie concurrente n'est intégrée.

- Mouvement Course/Vélo : `apps/mobile/assets/onboarding/e01-crew.jpg`, 1024 × 1536. Groupe en course et cycliste dans une rue, détails chartreuse sur les équipements.
- Communauté : `apps/mobile/assets/auth/sign-in-crew.jpg`, 941 × 1672. Groupe après une sortie, vêtements noirs et accessoires chartreuse.
- Référentiel partagé : `apps/mobile/src/ui/gryd/brandImagery.ts`.

L'entrée de l'application emploie le visuel Mouvement ; l'accueil du crew reprend cette famille à la place de la photographie entièrement monochrome créée lors de la passe précédente. Les images de connexion restent dans la même famille. Les visuels de marque ne sont jamais présentés comme une photo réelle du crew d'un membre ou comme une sortie déjà effectuée. Les photos personnelles choisies par les utilisateurs gardent leur apparence : la direction artistique de marque ne leur impose pas un filtre.

L'ancien fichier `urban-running-2026.png` est conservé sur disque pour préserver l'historique ; il ne sert plus de visuel de marque dans les parcours actifs.
