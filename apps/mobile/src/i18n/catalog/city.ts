/**
 * GRYD — i18n : catalogue du SÉLECTEUR DE VILLE et de la page CRÉDITS DE DONNÉES.
 *
 * ─── CE QUE CETTE COPIE A LE DROIT DE DIRE ─────────────────────────────────
 * Le sélecteur propose 7 870 villes RÉELLES d'Europe, dont GRYD n'en a ouvert
 * que deux. La copie doit donc porter une distinction, et une seule :
 *
 *   · VILLE OUVERTE      — GRYD y a provisionné une aire de jeu. On peut y créer
 *                          un crew. C'est un fait lu dans `city_zones`.
 *   · VILLE PAS ENCORE   — lieu réel, aire de jeu pas encore ouverte. On ne peut
 *     OUVERTE              pas encore y créer de crew, et l'écran le DIT au lieu
 *                          de peindre un bouton qui échouerait (règle « aucun
 *                          bouton mort »).
 *
 * ⚠️ AUCUNE ENTRÉE ICI NE PARLE DE CLASSEMENT, DE TERRITOIRE, DE RIVAL NI DE
 * DENSITÉ. Une ville où personne ne court se dit VIDE (`emptyCity`) — et cette
 * phrase n'est affichée que quand un COMPTAGE RÉEL a été lu, jamais par défaut :
 * les quatre états (lecture en cours / pas connecté / lecture échouée / zéro
 * réellement compté) ont chacun leur texte, parce qu'ils ne disent pas la même
 * chose (AMENDEMENT-47).
 *
 * §A : ces libellés vivent dans des lignes de liste et des notes de 12-14 px sur
 * 375 px. Ils restent COURTS dans les 5 langues — aucun texte d'action ne doit
 * finir en « … ».
 *
 * INVARIANTS (jamais traduits) : GRYD, GeoNames, CC BY 4.0, geo.api.gouv.fr,
 * les noms de villes et les codes pays ISO.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ═════════════════════════════════════════════════════════════════════════
  // SÉLECTEUR — recherche
  // ═════════════════════════════════════════════════════════════════════════
  searchPlaceholder: {
    fr: 'Cherche ta ville',
    en: 'Search your city',
    es: 'Busca tu ciudad',
    de: 'Stadt suchen',
    pt: 'Busque sua cidade',
  },
  /**
   * Aide sous le champ, affichée en permanence : dit ce que couvre la liste.
   *
   * ⚠️ ELLE DISAIT « Toutes les villes d'Europe », ET C'ÉTAIT FAUX. Le
   * référentiel est le dump GeoNames `cities15000` : les localités de plus de
   * 15 000 habitants, plus les capitales (mesuré sur le fichier livré — les 8
   * villes sous le seuil sont Vatican City, Vaduz, Valletta, San Marino,
   * Tórshavn, Mariehamn, Longyearbyen…). Côté France, cela fait 692 communes
   * sur environ 35 000 : quelqu'un de Vitré ou de Saint-Amand aurait conclu que
   * sa ville n'existe pas. On dit donc le périmètre RÉEL, sans jargon et sans
   * nommer le dump — « cities15000 » n'apprend rien à personne.
   */
  /**
   * ⚠️ NE PAS RÉÉCRIRE EN SEUIL STRICT. La formulation précédente affirmait
   * « plus de 15 000 habitants, et les capitales » : c'est la RÈGLE de la source
   * (GeoNames cities15000), pas une propriété vérifiée du fichier. Le référentiel
   * livré contient par exemple `Liberpolis` (HR, 63 habitants), qui n'est ni au
   * -dessus du seuil ni une capitale. On décrit donc la COUVERTURE — grandes
   * villes et capitales — sans promettre une borne que la donnée dément.
   */
  searchHint: {
    fr: 'Les grandes villes d’Europe et les capitales. Les petites communes n’y sont pas toutes.',
    en: 'Europe’s larger cities and every capital. Smaller towns are not all listed.',
    es: 'Las grandes ciudades de Europa y las capitales. No están todos los municipios pequeños.',
    de: 'Europas größere Städte und alle Hauptstädte. Kleinere Orte fehlen teilweise.',
    pt: 'As grandes cidades da Europa e as capitais. Municípios pequenos não estão todos.',
  },
  /** Zéro résultat : une réponse, pas un écran vide. */
  noMatch: {
    fr: 'Aucune ville de ce nom dans cette liste.',
    en: 'No city with that name in this list.',
    es: 'Ninguna ciudad con ese nombre en esta lista.',
    de: 'Keine Stadt dieses Namens in dieser Liste.',
    pt: 'Nenhuma cidade com esse nome nesta lista.',
  },
  /**
   * … et POURQUOI. Une absence de la liste n'est pas une absence du monde :
   * c'est la phrase qui empêche « ma ville n'existe pas ». Elle nomme les deux
   * causes réelles — le seuil de population, et le nom local (le référentiel ne
   * porte qu'un seul nom par ville, GeoNames ; la table d'exonymes du sélecteur
   * couvre les capitales et les grandes villes, pas les 7 870).
   */
  noMatchExplain: {
    fr: 'Elle ne couvre pas les communes plus petites, et certaines villes s’y écrivent en langue locale (London, Wien, Napoli).',
    en: 'It leaves out smaller towns, and some cities appear under their local name (London, Wien, Napoli).',
    es: 'No incluye municipios más pequeños, y algunas ciudades aparecen con su nombre local (London, Wien, Napoli).',
    de: 'Kleinere Gemeinden fehlen, und manche Städte stehen unter ihrem lokalen Namen (London, Wien, Napoli).',
    pt: 'Não inclui municípios menores, e algumas cidades aparecem com o nome local (London, Wien, Napoli).',
  },
  /** La liste est bornée : elle le dit plutôt que de laisser croire qu'elle est complète. */
  moreResults: {
    fr: 'Affine ta recherche pour voir d’autres villes.',
    en: 'Refine your search to see more cities.',
    es: 'Afina la búsqueda para ver más ciudades.',
    de: 'Suche verfeinern für weitere Städte.',
    pt: 'Refine a busca para ver mais cidades.',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SÉLECTEUR — statut d'une ville
  // ═════════════════════════════════════════════════════════════════════════
  /** Puce d'une ville provisionnée côté serveur. */
  badgeOpen: {
    fr: 'Ouverte',
    en: 'Open',
    es: 'Abierta',
    de: 'Offen',
    pt: 'Aberta',
  },
  /** Puce d'une ville réelle dont l'aire de jeu n'existe pas encore. */
  badgeSoon: {
    fr: 'Pas encore ouverte',
    en: 'Not open yet',
    es: 'Aún no abierta',
    de: 'Noch nicht offen',
    pt: 'Ainda não aberta',
  },
  /** Explication sous une ville pas encore ouverte — un FAIT, plus un cul-de-sac. */
  notOpenExplain: {
    fr: 'GRYD n’a pas encore ouvert d’aire de jeu ici.',
    en: 'GRYD has not opened a play area here yet.',
    es: 'GRYD aún no ha abierto un área de juego aquí.',
    de: 'GRYD hat hier noch kein Spielgebiet geöffnet.',
    pt: 'A GRYD ainda não abriu uma área de jogo aqui.',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // OUVRIR UNE VILLE — le geste qui manquait (Edge Function open_city)
  //
  // 7 870 villes référencées, 2 ouvertes : sans ce geste, chercher « Zurich »
  // menait à une puce « Pas encore ouverte » et à rien d'autre. La copie ci-
  // dessous a UNE obligation : dire ce que l'ouverture crée VRAIMENT — un
  // disque approximatif autour du point du référentiel — et jamais laisser
  // croire à un contour officiel de la ville.
  // ═════════════════════════════════════════════════════════════════════════
  /**
   * Ce que l'ouverture fait, dit AVANT le tap. `{km}` vient de
   * `CITY_DISC_RADIUS_M` (game-rules) — jamais écrit en dur dans la phrase.
   */
  openExplain: {
    fr: 'L’ouvrir crée une aire de jeu approximative — un disque de {km} km autour du centre, pas les limites de la ville — et y démarre une saison.',
    en: 'Opening it creates an approximate play area — a {km} km disc around the centre, not the city limits — and starts a season there.',
    es: 'Abrirla crea un área de juego aproximada — un disco de {km} km alrededor del centro, no los límites de la ciudad — y arranca una temporada.',
    de: 'Öffnen erzeugt ein ungefähres Spielgebiet — eine Scheibe von {km} km um das Zentrum, nicht die Stadtgrenzen — und startet dort eine Saison.',
    pt: 'Abrir cria uma área de jogo aproximada — um disco de {km} km em torno do centro, não os limites da cidade — e inicia uma temporada.',
  },
  /** L'action. Courte : elle vit dans un bouton (§A — jamais coupée par « … »). */
  openCta: {
    fr: 'Ouvrir cette ville',
    en: 'Open this city',
    es: 'Abrir esta ciudad',
    de: 'Diese Stadt öffnen',
    pt: 'Abrir esta cidade',
  },
  /** Ouverture EN COURS — n'affirme rien sur le résultat. */
  openBusy: {
    fr: 'Ouverture en cours…',
    en: 'Opening…',
    es: 'Abriendo…',
    de: 'Wird geöffnet…',
    pt: 'Abrindo…',
  },
  /** Le serveur a créé l'aire de jeu. On répète ce qu'elle vaut : approximative. */
  openedCreated: {
    fr: 'Ville ouverte : aire de jeu approximative de {km} km autour du centre.',
    en: 'City open: approximate play area, {km} km around the centre.',
    es: 'Ciudad abierta: área de juego aproximada de {km} km alrededor del centro.',
    de: 'Stadt offen: ungefähres Spielgebiet, {km} km um das Zentrum.',
    pt: 'Cidade aberta: área de jogo aproximada de {km} km em torno do centro.',
  },
  /** Le serveur avait déjà cette ville — on ne maquille pas ça en création. */
  openedExisting: {
    fr: 'Cette ville était déjà ouverte.',
    en: 'This city was already open.',
    es: 'Esta ciudad ya estaba abierta.',
    de: 'Diese Stadt war bereits offen.',
    pt: 'Esta cidade já estava aberta.',
  },
  /** Échec générique : on ne fabrique pas un diagnostic, on propose de réessayer. */
  openFailed: {
    fr: 'L’ouverture n’a pas abouti. Réessaie.',
    en: 'Opening did not go through. Try again.',
    es: 'La apertura no se completó. Reintenta.',
    de: 'Das Öffnen hat nicht geklappt. Versuch es erneut.',
    pt: 'A abertura não foi concluída. Tente de novo.',
  },
  /** Échec parce qu'il faut un compte : le serveur refuse d'écrire sans JWT. */
  openFailedAuth: {
    fr: 'Connecte-toi pour ouvrir une ville.',
    en: 'Sign in to open a city.',
    es: 'Inicia sesión para abrir una ciudad.',
    de: 'Melde dich an, um eine Stadt zu öffnen.',
    pt: 'Entre para abrir uma cidade.',
  },
  /** Échec parce que le serveur ne connaît pas cette ville — inutile d'insister. */
  openFailedUnknown: {
    fr: 'Le serveur ne connaît pas cette ville. Impossible de l’ouvrir.',
    en: 'The server does not know this city. It cannot be opened.',
    es: 'El servidor no conoce esta ciudad. No se puede abrir.',
    de: 'Der Server kennt diese Stadt nicht. Sie kann nicht geöffnet werden.',
    pt: 'O servidor não conhece esta cidade. Não dá para abri-la.',
  },
  /**
   * PLAFOND ATTEINT — une cause CONNUE et NOMMÉE par le serveur
   * (`open_quota_reached`, HTTP 429, plafond CITY_OPEN_LIMIT_PER_USER).
   * Sans cette entrée, elle retombait sur le défaut « ça n'a pas abouti » :
   * une raison précise déguisée en panne inconnue, alors qu'il n'y a RIEN à
   * réessayer. On dit le fait, et le nombre vient de la constante — jamais
   * écrit en dur. {n} = plafond.
   */
  openFailedQuota: {
    fr: 'Tu as déjà ouvert {n} villes — c’est la limite. Réessaie depuis une ville déjà ouverte.',
    en: 'You have already opened {n} cities — that is the limit. Pick a city that is already open.',
    es: 'Ya has abierto {n} ciudades — es el límite. Elige una ciudad ya abierta.',
    de: 'Du hast bereits {n} Städte geöffnet — das ist das Limit. Wähle eine bereits geöffnete Stadt.',
    pt: 'Você já abriu {n} cidades — é o limite. Escolha uma cidade já aberta.',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // SÉLECTEUR — les quatre états de la lecture serveur, jamais confondus
  // ═════════════════════════════════════════════════════════════════════════
  /** Lecture EN COURS : n'affirme rien sur les villes ouvertes. */
  statusLoading: {
    fr: 'Lecture des villes ouvertes…',
    en: 'Reading open cities…',
    es: 'Leyendo las ciudades abiertas…',
    de: 'Offene Städte werden gelesen…',
    pt: 'Lendo as cidades abertas…',
  },
  /** Pas connecté : on ne PEUT pas savoir ce qui est ouvert. On le dit. */
  statusSignedOut: {
    fr: 'Connecte-toi pour voir quelles villes sont ouvertes.',
    en: 'Sign in to see which cities are open.',
    es: 'Inicia sesión para ver qué ciudades están abiertas.',
    de: 'Melde dich an, um offene Städte zu sehen.',
    pt: 'Entre para ver quais cidades estão abertas.',
  },
  /** Lecture ÉCHOUÉE : ce n'est pas « aucune ville ouverte ». */
  statusFailed: {
    fr: 'Villes ouvertes non chargées. Réessaie.',
    en: 'Open cities could not load. Try again.',
    es: 'No se pudieron cargar las ciudades abiertas. Reintenta.',
    de: 'Offene Städte nicht geladen. Erneut versuchen.',
    pt: 'Cidades abertas não carregadas. Tente de novo.',
  },
  /** Lecture RÉUSSIE mais zéro ville ouverte — un fait, pas une panne. */
  statusNoneOpen: {
    fr: 'Aucune ville n’est ouverte pour l’instant.',
    en: 'No city is open right now.',
    es: 'Ninguna ciudad está abierta ahora mismo.',
    de: 'Derzeit ist keine Stadt offen.',
    pt: 'Nenhuma cidade está aberta agora.',
  },
  retry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // VILLE VIDE — dit seulement ce qu'un COMPTAGE RÉEL a rendu
  // ═════════════════════════════════════════════════════════════════════════
  /**
   * Comptage lu, résultat zéro.
   *
   * ⚠️ ELLE DISAIT « Personne ne court encore ici ». C'ÉTAIT UNE INFERENCE, pas
   * une lecture : le seul chiffre lu est le nombre de CREWS (`useCityActivity`),
   * et la capture n'exige aucun crew — une ville peut très bien avoir des
   * coureurs solo et zéro crew. On énonce donc exactement ce qui a été compté.
   */
  emptyCity: {
    fr: 'Aucun crew ici pour l’instant — crée le premier.',
    en: 'No crew here yet — create the first one.',
    es: 'Ningún crew aquí todavía — crea el primero.',
    de: 'Noch kein Crew hier — gründe das erste.',
    pt: 'Nenhum crew aqui ainda — crie o primeiro.',
  },
  /** Comptage lu, résultat > 0. On dit le nombre de CREWS, la seule chose lue. */
  crewsHere: {
    fr: '{n} crew(s) déjà sur cette ville.',
    en: '{n} crew(s) already in this city.',
    es: '{n} crew(s) ya en esta ciudad.',
    de: '{n} Crew(s) bereits in dieser Stadt.',
    pt: '{n} crew(s) já nesta cidade.',
  },
  /** Comptage EN COURS — un chargement n'affirme rien. */
  countLoading: {
    fr: 'Comptage des crews…',
    en: 'Counting crews…',
    es: 'Contando crews…',
    de: 'Crews werden gezählt…',
    pt: 'Contando crews…',
  },
  /** Comptage ÉCHOUÉ — surtout pas « personne ne court ici ». */
  countFailed: {
    fr: 'Activité de cette ville non lue.',
    en: 'City activity could not be read.',
    es: 'No se pudo leer la actividad de esta ciudad.',
    de: 'Aktivität dieser Stadt nicht gelesen.',
    pt: 'Atividade desta cidade não lida.',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // CHAMP « VILLE » (profil, création de crew)
  // ═════════════════════════════════════════════════════════════════════════
  fieldLabel: {
    fr: 'Ville',
    en: 'City',
    es: 'Ciudad',
    de: 'Stadt',
    pt: 'Cidade',
  },
  /** Bouton d'ouverture du sélecteur quand rien n'est choisi. */
  choosePrompt: {
    fr: 'Choisir ma ville',
    en: 'Choose my city',
    es: 'Elegir mi ciudad',
    de: 'Stadt wählen',
    pt: 'Escolher minha cidade',
  },
  /** Bouton d'ouverture du sélecteur quand une ville est déjà choisie. */
  changeCity: {
    fr: 'Changer de ville',
    en: 'Change city',
    es: 'Cambiar de ciudad',
    de: 'Stadt ändern',
    pt: 'Trocar de cidade',
  },
  clearCity: {
    fr: 'Retirer ma ville',
    en: 'Remove my city',
    es: 'Quitar mi ciudad',
    de: 'Stadt entfernen',
    pt: 'Remover minha cidade',
  },
  /** Titre de l'écran plein du sélecteur (une décision, §A1). */
  pickerTitle: {
    fr: 'Ta ville',
    en: 'Your city',
    es: 'Tu ciudad',
    de: 'Deine Stadt',
    pt: 'Sua cidade',
  },
  close: {
    fr: 'Fermer',
    en: 'Close',
    es: 'Cerrar',
    de: 'Schließen',
    pt: 'Fechar',
  },
  /** Note du champ ville du PROFIL : ce champ ne décide d'aucune capture. */
  profileNote: {
    fr: 'Affichée sur ton profil. Elle ne décide d’aucune capture.',
    en: 'Shown on your profile. It decides no capture.',
    es: 'Se muestra en tu perfil. No decide ninguna captura.',
    de: 'Wird im Profil gezeigt. Entscheidet keine Eroberung.',
    pt: 'Exibida no seu perfil. Não decide nenhuma captura.',
  },
  /**
   * Ce qui manque pour créer un crew. Plus un cul-de-sac depuis que le
   * sélecteur sait ouvrir une ville : la phrase dit les DEUX chemins.
   */
  crewNeedsOpenCity: {
    fr: 'Choisis une ville ouverte — ou ouvre la tienne depuis la liste.',
    en: 'Pick an open city — or open yours from the list.',
    es: 'Elige una ciudad abierta — o abre la tuya desde la lista.',
    de: 'Wähle eine offene Stadt — oder öffne deine aus der Liste.',
    pt: 'Escolha uma cidade aberta — ou abra a sua na lista.',
  },

  // ═════════════════════════════════════════════════════════════════════════
  // CRÉDITS DE DONNÉES — obligation de licence, pas un détail
  // ═════════════════════════════════════════════════════════════════════════
  creditsTitle: {
    fr: 'Crédits de données',
    en: 'Data credits',
    es: 'Créditos de datos',
    de: 'Datenquellen',
    pt: 'Créditos de dados',
  },
  creditsIntro: {
    fr: 'GRYD s’appuie sur des données géographiques ouvertes. Leurs licences imposent de citer leurs auteurs : les voici.',
    en: 'GRYD relies on open geographic data. Their licences require crediting their authors — here they are.',
    es: 'GRYD usa datos geográficos abiertos. Sus licencias obligan a citar a sus autores: aquí están.',
    de: 'GRYD nutzt offene Geodaten. Ihre Lizenzen verlangen eine Nennung der Urheber — hier ist sie.',
    pt: 'A GRYD usa dados geográficos abertos. As licenças exigem citar os autores: aqui estão.',
  },
  creditsCitiesHeading: {
    fr: 'Villes d’Europe',
    en: 'Cities of Europe',
    es: 'Ciudades de Europa',
    de: 'Städte Europas',
    pt: 'Cidades da Europa',
  },
  /** {count} villes / {countries} pays — chiffres lus dans EU_CITIES_SOURCE, pas saisis. */
  creditsCitiesBody: {
    fr: 'Le sélecteur de ville propose {count} villes réelles de {countries} pays. Aucune n’est inventée.',
    en: 'The city picker offers {count} real cities across {countries} countries. None are invented.',
    es: 'El selector ofrece {count} ciudades reales de {countries} países. Ninguna es inventada.',
    de: 'Die Stadtauswahl bietet {count} echte Städte aus {countries} Ländern. Keine ist erfunden.',
    pt: 'O seletor traz {count} cidades reais de {countries} países. Nenhuma é inventada.',
  },
  creditsZonesHeading: {
    fr: 'Contours des villes ouvertes',
    en: 'Open city boundaries',
    es: 'Contornos de las ciudades abiertas',
    de: 'Grenzen der offenen Städte',
    pt: 'Contornos das cidades abertas',
  },
  creditsZonesBody: {
    fr: 'Les 34 969 communes de France — celle où tu cours ouvre ton terrain — et les contours qui décident si une course capture viennent du découpage administratif officiel français.',
    en: 'The 34,969 French communes — the one you run in opens your ground — and the boundaries deciding whether a run captures come from the official French administrative dataset.',
    es: 'Las 34 969 comunas de Francia —aquella en la que corres abre tu terreno— y los contornos que deciden si una carrera captura vienen del catastro administrativo oficial francés.',
    de: 'Die 34 969 französischen Gemeinden — die, in der du läufst, öffnet dein Gebiet — und die Grenzen, die über Eroberungen entscheiden, stammen aus dem offiziellen französischen Verwaltungsdatensatz.',
    pt: 'As 34 969 comunas da França — aquela onde você corre abre seu terreno — e os contornos que decidem se uma corrida captura vêm do recorte administrativo oficial francês.',
  },
  creditsZonesAttribution: {
    fr: 'Communes et contours administratifs : geo.api.gouv.fr (Etalab) — Licence Ouverte 2.0',
    en: 'Communes and administrative boundaries: geo.api.gouv.fr (Etalab) — Open Licence 2.0',
    es: 'Comunas y contornos administrativos: geo.api.gouv.fr (Etalab) — Licence Ouverte 2.0',
    de: 'Gemeinden und Verwaltungsgrenzen: geo.api.gouv.fr (Etalab) — Licence Ouverte 2.0',
    pt: 'Comunas e contornos administrativos: geo.api.gouv.fr (Etalab) — Licence Ouverte 2.0',
  },
  creditsMapHeading: {
    fr: 'Fonds de carte',
    en: 'Map backgrounds',
    es: 'Fondos de mapa',
    de: 'Kartenhintergründe',
    pt: 'Fundos de mapa',
  },
  creditsLicenseLabel: {
    fr: 'Licence',
    en: 'Licence',
    es: 'Licencia',
    de: 'Lizenz',
    pt: 'Licença',
  },
  creditsUpdatedLabel: {
    fr: 'Référentiel figé le',
    en: 'Dataset frozen on',
    es: 'Referencial fijado el',
    de: 'Datensatz eingefroren am',
    pt: 'Referencial congelado em',
  },
  /** Entrée de Réglages/À propos qui mène à l'écran. */
  creditsRowLabel: {
    fr: 'Crédits de données',
    en: 'Data credits',
    es: 'Créditos de datos',
    de: 'Datenquellen',
    pt: 'Créditos de dados',
  },
  creditsRowHint: {
    fr: 'Villes, contours et fonds de carte',
    en: 'Cities, boundaries and map backgrounds',
    es: 'Ciudades, contornos y fondos de mapa',
    de: 'Städte, Grenzen und Kartenhintergründe',
    pt: 'Cidades, contornos e fundos de mapa',
  },
});
