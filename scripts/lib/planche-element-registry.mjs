/**
 * GRYD — registre des éléments de planche à vérifier.
 *
 * Chaque entrée répond à DEUX questions :
 *   1. Utile ? (`usefulness`) — faut-il cet élément dans le produit ?
 *   2. Branché ? (`checks`) — le code le porte-t-il vraiment, avec la bonne source ?
 *
 * usefulness :
 *   · must_have     — requis P0 (échec = blocker)
 *   · useful        — planche / DA utile (échec = blocker)
 *   · maquette_only — placeholder de maquette : doit ÊTRE ABSENT du produit
 *   · deferred_o1   — utile mais bloqué par une source réelle manquante (OK si absent)
 *   · retire        — démo / ancien ; doit avoir disparu
 *
 * Usage : importé par `scripts/verify-planche-elements.mjs`.
 */

/** @typedef {'must_have'|'useful'|'maquette_only'|'deferred_o1'|'retire'} Usefulness */
/** @typedef {'includes'|'includes_any'|'absent'|'regex'} CheckKind */

/**
 * @typedef {object} Check
 * @property {CheckKind} kind
 * @property {string[]} files  chemins relatifs à la racine du dépôt
 * @property {string|string[]} [needle]  chaîne(s) à trouver / éviter
 * @property {string} [pattern]  regex source (kind=regex)
 * @property {string} [why]
 */

/**
 * @typedef {object} PlancheElement
 * @property {string} id
 * @property {string} screen  E01, E02…
 * @property {string} label
 * @property {Usefulness} usefulness
 * @property {string} [note]
 * @property {Check[]} checks
 */

/** @type {readonly PlancheElement[]} */
export const PLANCHE_ELEMENTS = Object.freeze([
  // ─── E02 Home Map · nouveau joueur ───────────────────────────────────────
  {
    id: 'E02.header.avatar',
    screen: 'E02',
    label: 'Header · avatar → Profil',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/app/(tabs)/index.tsx'],
        needle: ['function HomeHeader', "router.push('/(tabs)/profil')"],
      },
    ],
  },
  {
    id: 'E02.header.pill_lieu',
    screen: 'E02',
    label: 'Header · pill lieu (ville réelle, pas inventée)',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/app/(tabs)/index.tsx'],
        needle: ['cityLabel', 'onboarding.cityId'],
      },
      {
        kind: 'absent',
        files: ['apps/mobile/app/(tabs)/index.tsx'],
        needle: ['Dieppe', 'Saint-Rémy', 'Nina M.'],
        why: 'placeholders planche interdits en dur',
      },
    ],
  },
  {
    id: 'E02.header.quartier',
    screen: 'E02',
    label: 'Header · sous-label « · Centre / quartier »',
    usefulness: 'deferred_o1',
    note: 'Aucune source secteur réelle fiable pour le sous-label — absente volontairement.',
    checks: [
      {
        kind: 'absent',
        files: ['apps/mobile/app/(tabs)/index.tsx'],
        needle: ['· Centre', 'quartier ·'],
        why: 'ne pas peindre un quartier inventé',
      },
    ],
  },
  {
    id: 'E02.header.cloche',
    screen: 'E02',
    label: 'Header · cloche (événements territoriaux réels)',
    usefulness: 'useful',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/app/(tabs)/index.tsx'],
        needle: ['useActivityBell', 'bell'],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/notifications/useActivityBell.ts'],
        needle: ['useActivityBell'],
      },
    ],
  },
  {
    id: 'E02.fabs.capsule',
    screen: 'E02',
    label: 'Capsule FABs Recentrer + Calques',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/BattleMapOverlays.tsx'],
        needle: ['fabCapsule', 'onRecenter', 'layersOpen'],
      },
    ],
  },
  {
    id: 'E02.map.ego_pin',
    screen: 'E02',
    label: 'Pin joueur (uniquement si fix GPS réel)',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/MapScreen.tsx'],
        needle: ['EgoMarker', 'buildMarkers', 'if (!ego) return []'],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/MapScreen.web.tsx'],
        needle: ['EgoMarker', 'buildMarkers'],
      },
    ],
  },
  {
    id: 'E02.map.boucle_pointillee',
    screen: 'E02',
    label: 'Boucle mission pointillée chartreuse',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/firstMissionMapLayer.ts'],
        needle: ['firstMissionLoopLayer', 'TRACE_DASH', 'lineDash'],
      },
      {
        kind: 'includes',
        files: [
          'apps/mobile/src/features/map/MapScreen.tsx',
          'apps/mobile/src/features/map/MapScreen.web.tsx',
        ],
        needle: ['firstMissionLoopLayer', 'showFirstMissionLoop'],
      },
    ],
  },
  {
    id: 'E02.map.label_distance',
    screen: 'E02',
    label: 'Label carte distance (ex. « 900 M »)',
    usefulness: 'useful',
    checks: [
      {
        kind: 'includes',
        files: [
          'apps/mobile/src/features/map/MapScreen.tsx',
          'apps/mobile/src/features/map/MapScreen.web.tsx',
        ],
        needle: ['FirstMissionLoopLabel', 'referenceLoopLabelPoint'],
      },
    ],
  },
  {
    id: 'E02.sheet.first_mission',
    screen: 'E02',
    label: 'Sheet · PREMIÈRE MISSION (kicker + titre + ligne)',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/BattleMapOverlays.tsx'],
        needle: ['FirstMissionPeek', 'firstMissionKicker'],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/locationState.ts'],
        needle: ["narrative: 'first-capture'"],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/i18n/catalog/map.ts'],
        needle: [
          'firstMissionKicker',
          'PREMIÈRE MISSION',
          'Votre première zone vous attend',
          'Fermez une boucle autour de votre rue.',
        ],
      },
    ],
  },
  {
    id: 'E02.sheet.metriques_game_rules',
    screen: 'E02',
    label: 'Sheet · métriques 900 m / ≈ 6 min depuis game-rules',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['packages/shared/src/game-rules.ts'],
        needle: [
          'ACTIVITY_REFERENCE_LOOP_PERIMETER_M',
          'ACTIVITY_REFERENCE_LOOP_DURATION_MIN',
          'run: 900',
          'bike: 4_800',
          'run: 6',
          'bike: 15',
        ],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/BattleMapOverlays.tsx'],
        needle: ['referenceLoopPerimeterM', 'referenceLoopDurationMin'],
      },
      {
        kind: 'includes',
        files: ['supabase/functions/_shared/game-rules.ts'],
        needle: ['ACTIVITY_REFERENCE_LOOP_PERIMETER_M'],
        why: 'copie sync Edge Functions — drift interdit',
      },
    ],
  },
  {
    id: 'E02.cta.go_morph',
    screen: 'E02',
    label: 'CTA GO / RUN morph pill ↔ rond',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/app/(tabs)/index.tsx'],
        needle: ['MapGoButton', 'GO_PILL_WIDTH', 'GO_MORPH_MS', 'GO_SIZE'],
      },
    ],
  },
  {
    id: 'E02.sheet.pas_de_second_cta',
    screen: 'E02',
    label: 'Sheet première mission sans CTA chartreuse dupliqué',
    usefulness: 'must_have',
    note: '§A.4 — GO porte l’action ; FirstMissionPeek ne doit pas peindre un Button chartreuse.',
    checks: [
      {
        kind: 'regex',
        files: ['apps/mobile/src/features/map/BattleMapOverlays.tsx'],
        pattern: 'function FirstMissionPeek[\\s\\S]*?^function ',
        // post-check handled in runner: no <Button inside FirstMissionPeek
        why: 'FirstMissionPeek ne doit contenir aucun Button',
      },
    ],
  },
  {
    id: 'E02.etats.location_matrix',
    screen: 'E02',
    label: 'États critiques position (matrice mapPlan)',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/locationState.ts'],
        needle: [
          'grant-location',
          'denied-location',
          'retry-location',
          'first-capture',
          'skeleton',
        ],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/BattleMapOverlays.tsx'],
        needle: ['SkeletonPeek', 'LocationPeek', 'mapPlan'],
      },
    ],
  },
  {
    id: 'E02.nav.trois_onglets',
    screen: 'E02',
    label: 'Nav Carte · Crew · Profil',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/app/(tabs)/_layout.tsx'],
        needle: ['name="index"', 'name="crew"', 'name="profil"', 'Crew'],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/i18n/catalog/nav.ts'],
        needle: ['tabCarte', 'tabMoi'],
      },
    ],
  },
  {
    id: 'E02.maquette.placeholders',
    screen: 'E02',
    label: 'Placeholders maquette absents (Dieppe, Nina, 1,84 km²…)',
    usefulness: 'maquette_only',
    checks: [
      {
        kind: 'absent',
        files: [
          'apps/mobile/app/(tabs)/index.tsx',
          'apps/mobile/src/features/map/BattleMapOverlays.tsx',
          'apps/mobile/src/features/map/MapScreen.tsx',
        ],
        needle: ['Dieppe', 'Nina M.', '1,84 km²', 'NIGHT RUNNERS', 'Canal Crew 38'],
      },
    ],
  },
  {
    id: 'E02.map.cadrage_44pct',
    screen: 'E02',
    label: 'Caméra · position joueur à 44 % hauteur',
    usefulness: 'deferred_o1',
    note: 'Cadrage planche non encore calé (padding camera MapLibre).',
    checks: [
      {
        kind: 'absent',
        files: [
          'apps/mobile/src/features/map/MapScreen.tsx',
          'apps/mobile/src/features/map/MapScreen.web.tsx',
        ],
        needle: ['paddingBottom: 0.44', 'anchorY: 0.44'],
        why: 'pas encore branché — deferred OK',
      },
    ],
  },

  // ─── E14 commutateur ─────────────────────────────────────────────────────
  {
    id: 'E14.switch.run_bike',
    screen: 'E14',
    label: 'Commutateur Run/Bike (flag + lentille)',
    usefulness: 'useful',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/app/(tabs)/index.tsx'],
        needle: ['MapActivitySwitch', 'flags.bike'],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/ui/activityLens.ts'],
        needle: ['activitySwitchVisible', 'competitiveReadAllowed'],
      },
    ],
  },
  {
    id: 'E14.sheet.bike_copy',
    screen: 'E14',
    label: 'Première mission Bike · copie + métriques ×5',
    usefulness: 'useful',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/src/i18n/catalog/map.ts'],
        needle: ['firstMissionBikeKicker', 'PREMIÈRE MISSION BIKE'],
      },
      {
        kind: 'includes',
        files: ['apps/mobile/src/features/map/BattleMapOverlays.tsx'],
        needle: ['firstMissionBikeKicker', "activity === 'bike'"],
      },
    ],
  },

  // ─── E01 onboarding ──────────────────────────────────────────────────────
  {
    id: 'E01.promesse.titre',
    screen: 'E01',
    label: 'Onboarding · COURS. PRENDS TA VILLE.',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes_any',
        files: [
          'apps/mobile/src/i18n/catalog/onboarding.ts',
          'apps/mobile/src/features/onboarding/content.ts',
        ],
        needle: ['COURS', 'PRENDS TA VILLE', 'TAKE YOUR CITY'],
      },
    ],
  },

  // ─── E06 préflight ───────────────────────────────────────────────────────
  {
    id: 'E06.preflight.gate',
    screen: 'E06',
    label: 'Préflight avant live (gate course-live)',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/app/course-live.tsx'],
        needle: ["gate.kind === 'preflight'", 'RunPreflight'],
      },
      {
        kind: 'includes_any',
        files: [
          'apps/mobile/src/features/run/gps/RunPreflight.tsx',
          'apps/mobile/src/features/run/gps/preflightSignal.ts',
        ],
        needle: ['Preflight', 'preflight'],
      },
    ],
  },

  // ─── Routes : utiles mais non branchées / orphelines ─────────────────────
  {
    id: 'X.route.aujourdhui_orpheline',
    screen: 'X',
    label: 'Route /aujourdhui — utile ? non branchée (orpheline connue)',
    usefulness: 'deferred_o1',
    note:
      'Écran potentiellement utile (hub quotidien) mais sans porte stable — ' +
      'inscrit dans audit-routes KNOWN_ORPHANS. Ne pas peindre de lien mort.',
    checks: [
      {
        kind: 'includes',
        files: ['scripts/audit-routes.mjs'],
        needle: ["'/aujourdhui'"],
      },
    ],
  },
  {
    id: 'X.route.crew_edit',
    screen: 'X',
    label: 'Écran /crew-edit — utile et écriture serveur (porte nav à surveiller)',
    usefulness: 'useful',
    note:
      'L’écran écrit via RPC crew_edit (plus un stub). Toujours listé orphelin ' +
      'dans audit-routes si aucune surface ne le pousse — vérifier les portes Crew.',
    checks: [
      {
        kind: 'includes',
        files: ['apps/mobile/app/crew-edit.tsx'],
        needle: ['crew_edit', 'CREW_PERMISSIONS'],
      },
      {
        kind: 'absent',
        files: ['apps/mobile/app/crew-edit.tsx'],
        needle: ['<Redirect', "href=\"/crew\""],
        why: 'ne doit plus être un redirect stub',
      },
    ],
  },

  // ─── Cross-cutting : branchements morts ──────────────────────────────────
  {
    id: 'X.routes.audit',
    screen: 'X',
    label: 'Audit routes (orphelins / liens morts) disponible',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['scripts/audit-routes.mjs'],
        needle: ['KNOWN_ORPHANS'],
      },
      {
        kind: 'includes',
        files: ['package.json'],
        needle: ['audit:routes'],
      },
    ],
  },
  {
    id: 'X.demo.vitrine_retiree',
    screen: 'X',
    label: 'Mode vitrine / fakeHexes hors chemin Carte live',
    usefulness: 'retire',
    note: 'fakeHexes peut encore exister pour tests ; MapScreen ne doit plus peindre la démo.',
    checks: [
      {
        kind: 'absent',
        files: [
          'apps/mobile/src/features/map/MapScreen.tsx',
          'apps/mobile/src/features/map/MapScreen.web.tsx',
        ],
        needle: ['isShowcasePlatform', 'FRANCE_CITIES_DEMO', 'fakeHexesGeoJSON()'],
      },
    ],
  },
  {
    id: 'X.verify.planches_script',
    screen: 'X',
    label: 'Ce vérificateur est branché dans npm (verify:planches)',
    usefulness: 'must_have',
    checks: [
      {
        kind: 'includes',
        files: ['package.json'],
        needle: ['verify:planches', 'verify-planche-elements.mjs'],
      },
    ],
  },
]);
