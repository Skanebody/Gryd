/**
 * GRYD — E27 : LE BRANCHEMENT DES FAITS DE SYNCHRONISATION, VERROUILLÉ.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ═════════════════════════════════════════════
 * `analysisMachine.ts` était une machine parfaitement testée dont QUATRE faits
 * — `upload_started`, `retry_started`, `server_ack`, `local_save_failed` —
 * n'étaient émis par personne : ils n'apparaissaient que dans la déclaration du
 * type et dans les branches du réducteur. Les phases `uploading` et `analysing`
 * étaient donc structurellement INATTEIGNABLES, et `analysisMachine.test.ts`
 * verdissait quand même : il testait des transitions, pas leur existence.
 *
 * Un test de comportement ne peut pas attraper ça. Celui-ci RELIT LES SOURCES
 * des deux chemins d'envoi réels et casse si l'appel disparaît — même patron que
 * la section « BRANCHEMENT RÉEL » de `bootSequence.test.ts` (née exactement du
 * même défaut : une fonction pure irréprochable que le runtime n'appelait pas)
 * et que le garde de pureté de `shareTargets.test.ts`. On RELIT plutôt qu'on
 * n'importe : ces fichiers tirent React, `expo-router` et `supabase-js`, qui
 * n'existent pas sous Deno.
 *
 * ⚠ CE FICHIER NE PROUVE PAS QUE L'ENVOI MARCHE. Il prouve que le fait naît là
 * où l'envoi a lieu, et pas ailleurs. Le comportement de la machine reste dans
 * `analysisMachine.test.ts`, celui du transport dans `syncFactBus.test.ts`.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const CORE_SRC = Deno.readTextFileSync(new URL('../gps/useRealRunCore.ts', import.meta.url));
const PENDING_SRC = Deno.readTextFileSync(new URL('../../../lib/pendingUpload.ts', import.meta.url));
const SCREEN_SRC = Deno.readTextFileSync(new URL('../../../../app/course/analyse.tsx', import.meta.url));
const MACHINE_SRC = Deno.readTextFileSync(new URL('./analysisMachine.ts', import.meta.url));
const BUS_SRC = Deno.readTextFileSync(new URL('./syncFactBus.ts', import.meta.url));

/** Position du premier `supabase.functions.invoke('ingest_run'…)` d'une source. */
function invokeIndex(src: string): number {
  const i = src.indexOf("supabase.functions.invoke('ingest_run'");
  assert(i >= 0, "plus aucun invoke ingest_run dans cette source — le chemin d'envoi a bougé");
  return i;
}

/**
 * Position d'une publication de fait donnée. Le fait DOIT être suivi d'une
 * virgule : depuis le 27/07/2026, `publishSyncFact` exige le `clientRunId` de la
 * sortie concernée en second argument. Un appel sans identité ne compile plus —
 * ce test vérifie en plus qu'on ne l'a pas contourné par une variante.
 */
/**
 * La source PRIVÉE DE SES COMMENTAIRES. Ce dépôt explique ses défauts dans les
 * docblocks, en les CITANT : chercher un appel interdit dans le texte brut
 * reviendrait à interdire d'écrire la règle. On ne cherche donc que dans le code.
 */
function codeOf(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function publishIndex(src: string, kind: string): number {
  const i = src.indexOf(`publishSyncFact({ kind: '${kind}' },`);
  assert(i >= 0, `\`${kind}\` n'est plus publié AVEC son \`clientRunId\` dans cette source`);
  return i;
}

// ═══ 1. CHEMIN DIRECT — useRealRunCore.uploadOrQueue ════════════════════════

Deno.test('BRANCHEMENT — le chemin direct publie `upload_started` AVANT son invoke', () => {
  const publish = publishIndex(CORE_SRC, 'upload_started');
  const invoke = invokeIndex(CORE_SRC);
  assert(
    publish < invoke,
    "`upload_started` doit être publié AVANT l'appel réseau : après, il annoncerait " +
      'un envoi déjà joué ; ailleurs, il annoncerait un envoi qui ne part pas.',
  );
});

Deno.test(
  'BRANCHEMENT — `upload_started` est publié APRÈS les gardes (aucun envoi annoncé à vide)',
  () => {
    // Sans backend (`supabase === null`) et sans session, `uploadOrQueue` sort
    // AVANT toute requête : rien ne part, donc rien ne doit être annoncé.
    const noBackend = CORE_SRC.indexOf("if (supabase === null) return 'none'");
    const noSession = CORE_SRC.indexOf('if (sessionRef.current === null)');
    const publish = publishIndex(CORE_SRC, 'upload_started');
    assert(noBackend >= 0 && noSession >= 0, 'les gardes de `uploadOrQueue` ont changé de forme');
    assert(
      publish > noBackend && publish > noSession,
      '`upload_started` est passé AVANT une garde : il annoncerait un envoi qui ne part jamais',
    );
  },
);

Deno.test('BRANCHEMENT — le verdict serveur du chemin direct est publié, statut EXACT', () => {
  assert(
    CORE_SRC.includes("publishSyncFact({ kind: 'server_accepted' }, payload.clientRunId)"),
    'une réponse reçue SANS erreur ne se publie plus (ou plus sous le `clientRunId` de SA sortie) : ' +
      'E27 retomberait sur « issue illisible » quand `data` est creux, ou adopterait le verdict ' +
      'de la course ÉCARTÉE que `discardStored` envoie pendant une autre course',
  );
  assert(
    /publishSyncFact\(\s*\{\s*kind: 'server_replied_error',\s*httpStatus: status \?\? HTTP_STATUS_NONE,?\s*\},\s*payload\.clientRunId,?\s*\)/.test(
      CORE_SRC,
    ),
    'le refus définitif ne publie plus le statut HTTP RÉEL avec le `clientRunId` de sa sortie',
  );
});

Deno.test('BRANCHEMENT — le journal est OUVERT AU NOM de la course qui démarre', () => {
  // ⚠ CE TEST A REMPLACÉ « les faits sont PURGÉS au départ de chaque course »
  // (27/07/2026). Une purge au départ ne protégeait QUE de la course
  // précédente : tout ce qui se publiait ENSUITE — le drain de la file à chaque
  // retour au premier plan, la clôture d'une course écartée d'un tap — entrait
  // au journal de la course en cours. Purger ne suffit pas ; il faut NOMMER.
  const construct = CORE_SRC.indexOf('trackerRef.current = tracker;');
  const open = CORE_SRC.indexOf('beginSyncFactRun(tracker.runId);');
  assert(construct >= 0, 'confirmStart ne construit plus le tracker de cette façon');
  assert(
    open > construct && open - construct < 800,
    'le journal n’est plus ouvert au nom de la course, là où son `runId` naît (confirmStart) : ' +
      'il redeviendrait anonyme, et adopterait les faits de n’importe quelle autre sortie',
  );
  // La REPRISE d'une course interrompue change le `runId` de la sortie (elle
  // garde celui de la course reprise, pour l'idempotence serveur) : sans
  // rebranchement, le journal appartiendrait à un identifiant que plus aucun
  // envoi ne cite, et E27 ne verrait plus rien.
  assert(
    CORE_SRC.includes('beginSyncFactRun(trackerRef.current.runId);'),
    'resumeStored ne rebranche plus le journal sur le `runId` de la course reprise',
  );
  assert(
    !CORE_SRC.includes('clearSyncFacts('),
    'la purge anonyme est revenue : elle laisse le journal sans propriétaire',
  );
});

// ═══ 2. DRAIN DE LA FILE — pendingUpload ════════════════════════════════════

Deno.test('BRANCHEMENT — le drain publie `retry_started` AVANT chaque invoke', () => {
  const publish = publishIndex(PENDING_SRC, 'retry_started');
  const invoke = invokeIndex(PENDING_SRC);
  assert(
    publish < invoke,
    '`retry_started` doit partir juste avant l’appel réseau de CHAQUE entrée drainée',
  );
  // Dans `send`, donc par entrée — pas une fois pour tout le drain.
  const sendStart = PENDING_SRC.indexOf('const send = async (payload: IngestRunRequest)');
  assert(sendStart >= 0, 'la fonction `send` du drain a changé de forme');
  assert(
    publish > sendStart,
    '`retry_started` est sorti de `send` : il ne compterait plus les tentatives réellement parties',
  );
});

Deno.test('BRANCHEMENT — l’issue du drain est publiée SORTIE PAR SORTIE, via la table PURE', () => {
  // ⚠ L'ASSERTION INVERSE ÉTAIT ICI, ET ELLE VERROUILLAIT LE DÉFAUT
  // (27/07/2026). Elle exigeait que « seul le rapport AGRÉGÉ » soit publié, au
  // motif que « E27 ne sait pas quelle entrée est SA sortie ». C'était vrai, et
  // c'était exactement le problème : un drain d'arrière-plan qui vidait une
  // course d'hier faisait afficher « analyse terminée » à un E27 ouvert sur une
  // course encore en file. La réponse n'est pas d'agréger — c'est de NOMMER, et
  // de laisser le transport écarter ce qui n'est pas la sortie regardée.
  assert(
    PENDING_SRC.includes('publishRunSyncFacts(factsFromDrain(report))'),
    'le drain ne publie plus son issue sortie par sortie : un E27 ouvert resterait bloqué sur ' +
      '« envoi en cours » après un drain d’arrière-plan, ou adopterait le verdict d’une autre course',
  );
  assert(
    !/publishSyncFacts\(/.test(PENDING_SRC),
    'un lot de faits ANONYMES est publié : il entrerait au journal de n’importe quelle sortie',
  );
});

Deno.test('BRANCHEMENT — un échec d’écriture RÉEL publie `local_save_failed`', () => {
  assert(
    PENDING_SRC.includes(
      "if (!written) publishSyncFact({ kind: 'local_save_failed' }, payload.clientRunId)",
    ),
    '`local_save_failed` n’est plus émis sur l’échec d’écriture de la file — son SEUL émetteur légitime',
  );
  // Le SUCCÈS d'écriture ne publie rien : la preuve de persistance que E27
  // accepte est la RELECTURE de la file (correctif du 27/07 sur factsFromSnapshot).
  assert(
    !/publishSyncFact\(\{\s*kind: 'local_saved'/.test(PENDING_SRC),
    'le stockage publie `local_saved` : il affirmerait une persistance qu’il n’a pas relue',
  );
});

Deno.test('BRANCHEMENT — un refus de file publie sa cause RÉELLE, sans la deviner', () => {
  // ⚠ MIS À JOUR LE 27/07/2026 (2). Ce test exigeait le littéral
  // `{ kind: 'not_stored', reason: 'queue_full' }`, écrit quand le plafond était
  // le SEUL refus possible. Il en existe un second depuis que le stockage refuse
  // d'écrire une file qu'il n'a pas pu relire (`planEnqueue` rend 'unreadable') —
  // et les confondre serait précisément deviner : une file ILLISIBLE n'est pas
  // une file PLEINE. La règle que ce test protège est inchangée : chaque refus
  // part avec SA cause.
  assert(
    /reason: plan\.outcome === 'unreadable' \? 'storage' : 'queue_full'/.test(PENDING_SRC),
    'les deux refus de file (plafond / stockage illisible) ne publient plus des causes DISTINCTES : ' +
      'E27 afficherait « file pleine » sur une panne de stockage, ou l’inverse',
  );
  assert(
    PENDING_SRC.includes("{ kind: 'local_save_failed' }"),
    'un payload inenvoyable ne publie plus `local_save_failed` : il hériterait d’une cause de file',
  );
});

Deno.test('BRANCHEMENT — le stockage ne peut plus ÉCRASER une file qu’il n’a pas pu relire', () => {
  // ⚠ LE DÉFAUT QUE CE TEST FERME (27/07/2026). `readQueue` rend `readable:false`
  // + `queue: []` quand AsyncStorage jette. Ce `[]` était traité comme une file
  // vide par le chemin d'ÉCRITURE : la sortie du jour y était ajoutée et la clé
  // réécrite avec UNE entrée — jusqu'à 12 sorties utilisateur détruites en
  // silence. Le docblock de `readQueue` GARANTISSAIT pourtant l'inverse
  // (« rien n'est détruit »). La règle est maintenant PURE et testée
  // (`planEnqueue` / `planRemoval`, pendingUpload.test.ts) ; ici on vérifie que
  // le module qui touche le disque y passe VRAIMENT — c'est exactement ce qui
  // manquait, puisque le drapeau existait déjà et n'était pas lu.
  const code = codeOf(PENDING_SRC);
  assert(
    /planEnqueue\(read, payload, Date\.now\(\)\)/.test(code) &&
      /planRemoval\(await readQueue\(\), entry\.payload\.clientRunId\)/.test(code),
    'le stockage n’écrit plus via un plan de lisibilité : une lecture disque ratée pourrait de ' +
      'nouveau écraser la file entière (mise en file) ou la vider (retrait après verdict)',
  );
  assert(
    !/enqueuePending\(/.test(code) && !/removePending\(/.test(code),
    'le stockage appelle de nouveau la file NUE, sans la règle de lisibilité : le trou est rouvert',
  );
});

// ═══ 3. L'ÉCRAN CONSOMME ════════════════════════════════════════════════════

Deno.test('BRANCHEMENT — E27 s’abonne au bus et rejoue son journal', () => {
  assert(
    SCREEN_SRC.includes("from '../../src/features/run/analysis/syncFactBus'"),
    'E27 n’importe plus le bus : les faits publiés ne l’atteindraient plus, et les phases ' +
      '`uploading` / `analysing` redeviendraient inatteignables',
  );
  assert(
    SCREEN_SRC.includes('subscribeSyncFacts('),
    'E27 ne s’abonne plus : une reprise en vol ne serait plus visible',
  );
  assert(
    SCREEN_SRC.includes('reduceAnalysisAll(INITIAL_ANALYSIS_STATE, sub.recorded)'),
    'E27 ne rejoue plus le journal depuis l’état initial — le rejeu cesserait d’être idempotent, ' +
      'et sur le chemin nominal (envoi déjà fini au montage) l’écran ne verrait plus rien',
  );
  assert(
    SCREEN_SRC.includes('return sub?.unsubscribe;'),
    'E27 ne se détache plus du bus au démontage (fuite d’abonnement + setState après démontage)',
  );
});

Deno.test('BRANCHEMENT — la REPRISE de E27 ne retient que les faits de SA sortie', () => {
  const OBSERVE_SRC = Deno.readTextFileSync(new URL('./observeSync.ts', import.meta.url));
  assert(
    OBSERVE_SRC.includes('factsForRun(factsFromDrain(await retryPendingUpload()), syncFactRunId())'),
    'le bouton « Réessayer » adopte de nouveau le verdict AGRÉGÉ du drain : il annoncerait ' +
      '« analyse terminée » parce qu’une AUTRE course de la file est partie',
  );
});

// ═══ 3 bis. LA LECTURE DU MONDE PARLE DE LA BONNE SORTIE ════════════════════
//
// ⚠ CE BLOC VERROUILLE LE CORRECTIF DU 27/07/2026 (2). `observeSync` n'appelait
// que `pendingUploadCount()` — un COMPTE, qui ne regarde pas si l'une des
// entrées est la sortie regardée — et `factsFromSnapshot` en concluait
// « envoi différé ». Dans le cas EXACT où la file a REFUSÉ la sortie parce
// qu'elle était au plafond, elle reste forcément NON VIDE : E27 affichait donc
// « ta sortie repartira au premier réseau » et « n en attente » pour une course
// absente de la file. Un test de comportement sur la fonction pure ne peut pas
// attraper le retour du compte global côté LECTURE : celui-ci relit la source.

Deno.test('BRANCHEMENT — la file est interrogée SUR LA SORTIE REGARDÉE, pas comptée', () => {
  const OBSERVE_SRC = Deno.readTextFileSync(new URL('./observeSync.ts', import.meta.url));
  assert(
    OBSERVE_SRC.includes('await pendingUploadStatus(runId)') &&
      OBSERVE_SRC.includes('const runId = syncFactRunId();'),
    'la lecture du monde ne demande plus à la file si ELLE contient la sortie regardée : ' +
      'un compte global reviendrait, et « envoi différé » se rallumerait sur les courses des autres',
  );
  // Sur le CODE seul : les docblocks citent `pendingUploadCount()` pour raconter
  // le défaut, et un test qui confondrait les deux interdirait d'écrire la règle
  // qu'il protège (même précaution que le test « aucune horloge » plus bas).
  assert(
    !/pendingUploadCount\(/.test(codeOf(OBSERVE_SRC)),
    '`pendingUploadCount()` est revenu dans la lecture de E27 : il compte la file ENTIÈRE et ne ' +
      'peut pas répondre « ma sortie est-elle dedans ? »',
  );
  assert(
    OBSERVE_SRC.includes('runInQueue: membershipOf(status, runId)'),
    'le snapshot ne porte plus l’appartenance de la sortie à la file',
  );
});

Deno.test('BRANCHEMENT — la DÉCISION ne conclut plus sur la profondeur de file', () => {
  const FACTS_SRC = Deno.readTextFileSync(new URL('./syncFacts.ts', import.meta.url));
  // On isole le corps de la table de décision : les docblocks CITENT le défaut
  // (« `queueDepth > 0` ») pour l'expliquer, et un test qui confondrait le
  // commentaire et le code interdirait d'écrire la règle qu'il protège.
  const body = codeOf(FACTS_SRC);
  const decision = body.slice(body.indexOf('export function factsFromSnapshot'));
  const code = decision.slice(0, decision.indexOf('\n}'));
  assert(
    !/snap\.queueDepth\s*>\s*0/.test(code),
    'une branche décide de nouveau sur `queueDepth > 0` : la file entière ne prouve RIEN sur la ' +
      'sortie regardée (cas du refus au plafond, qui laisse une file non vide derrière lui)',
  );
  assert(
    /snap\.runInQueue === 'queued'/.test(code) && /snap\.runInQueue === 'absent'/.test(code),
    'la table de décision ne s’appuie plus sur l’appartenance nommée de la sortie à la file',
  );
  // `queueDepth` garde UN seul usage légitime : l'AFFICHAGE du total, une fois
  // établi que la sortie du joueur en fait partie.
  assert(
    /offline_queued', queueDepth: snap\.queueDepth/.test(code),
    'la profondeur affichée n’est plus la profondeur RÉELLE lue',
  );
});

Deno.test('BRANCHEMENT — la file distingue « vide » de « illisible » pour ses lecteurs', () => {
  assert(
    /readable: false/.test(PENDING_SRC) && /readable: true/.test(PENDING_SRC),
    'la lecture de la file ne dit plus si elle a RÉUSSI : un stockage en échec redeviendrait ' +
      'indiscernable d’une file vide, et E27 perdrait le 4ᵉ état de la constitution',
  );
  assert(
    PENDING_SRC.includes('hasRun: clientRunId !== null && hasPendingRun(queue, clientRunId)'),
    'l’appartenance n’est plus RELUE dans la file (ou elle est affirmée sans identité de sortie)',
  );
});

Deno.test('BRANCHEMENT — sans relais de E26, E27 N’ADOPTE PAS le journal du bus', () => {
  // Un lien profond nu n'a aucun contexte de sortie, et le bus peut porter le
  // drain d'arrière-plan du démarrage : rejouer ces faits ferait dire « analyse
  // terminée » à un écran ouvert sur rien.
  assert(
    /const sub = hints\.fromFinish\s*\?\s*subscribeSyncFacts\(/.test(SCREEN_SRC),
    'E27 s’abonne au bus SANS relais de E26 : il adopterait le journal d’un envoi qui n’est pas le sien',
  );
  assert(
    SCREEN_SRC.includes('sub === null ? INITIAL_ANALYSIS_STATE'),
    'sans abonnement, E27 doit rester à l’état initial et laisser `observeSync` décider seul',
  );
});

Deno.test('E27 n’a toujours AUCUNE horloge (le branchement n’en a pas introduit une)', () => {
  // On cherche des APPELS, pas des mots : l'en-tête de l'écran cite justement
  // `setTimeout` pour jurer qu'il n'y en a pas. Un test qui confondrait les deux
  // interdirait d'écrire la règle qu'il protège.
  for (const call of ['setTimeout(', 'setInterval(', 'requestAnimationFrame(', 'Animated.']) {
    assert(
      !SCREEN_SRC.includes(call),
      `E27 appelle « ${call} » : une progression ne peut venir que d’un FAIT`,
    );
  }
});

// ═══ 4. CE QUI RESTE SANS ÉMETTEUR, ET LE DIT ═══════════════════════════════

Deno.test('`server_ack` reste SANS ÉMETTEUR — et le code le déclare, il ne l’oublie pas', () => {
  // Avec un unique aller-retour HTTP, la réponse porte à la fois la réception et
  // le verdict : il n'existe aucun endroit où un accusé INTERMÉDIAIRE se produit.
  // Ce test échoue le jour où quelqu'un l'émet « pour faire joli » — et invite
  // alors à prouver qu'un vrai accusé existe (job asynchrone, websocket).
  for (const [name, src] of [
    ['useRealRunCore.ts', CORE_SRC],
    ['pendingUpload.ts', PENDING_SRC],
    ['analyse.tsx', SCREEN_SRC],
    ['syncFactBus.ts', BUS_SRC],
  ] as const) {
    assert(
      !src.includes("kind: 'server_ack'"),
      `${name} émet \`server_ack\` : aucun rail de ce dépôt ne reçoit d'accusé intermédiaire`,
    );
  }
  assert(
    MACHINE_SRC.includes('SANS ÉMETTEUR au'),
    'analysisMachine.ts ne déclare plus que `server_ack` est délibérément sans émetteur',
  );
});

Deno.test('LES TROIS AUTRES FAITS ORPHELINS ONT MAINTENANT UN ÉMETTEUR RÉEL', () => {
  // L'inverse du défaut d'origine : chacun est émis par du code de production,
  // et pas seulement déclaré dans un type.
  const emitters: Readonly<Record<string, readonly string[]>> = {
    upload_started: [CORE_SRC],
    retry_started: [PENDING_SRC],
    local_save_failed: [PENDING_SRC],
  };
  for (const [kind, sources] of Object.entries(emitters)) {
    assertEquals(
      sources.some((src) => src.includes(`kind: '${kind}'`)),
      true,
      `\`${kind}\` n'a plus aucun émetteur de production — il redevient une branche morte`,
    );
  }
});

Deno.test('`factFromFinishVerdict` est bien SUPPRIMÉ (pas juste inutilisé)', () => {
  assert(
    !/export function factFromFinishVerdict/.test(MACHINE_SRC),
    'la fonction morte est revenue : ses tests reverdiraient un chemin qu’aucune exécution n’emprunte',
  );
});

// ═══ 5. LE TRANSPORT NE TOUCHE PAS LE DISQUE ════════════════════════════════

Deno.test('PURETÉ — le bus n’a aucun stockage, aucun réseau, aucune horloge', () => {
  for (const forbidden of [
    'AsyncStorage',
    'react-native',
    'supabase.',
    'setTimeout(',
    'setInterval(',
    'Date.now(',
  ]) {
    assert(
      !BUS_SRC.includes(forbidden),
      `syncFactBus.ts touche « ${forbidden} » : un fait de synchro persisté (ou daté) relu au ` +
        'prochain démarrage ferait mentir un écran neuf',
    );
  }
  // Un seul import, et il est de TYPE : le bus ne peut rien exécuter d'autre.
  const imports = BUS_SRC.match(/^import .*$/gm) ?? [];
  assertEquals(imports.length, 1, 'le bus a gagné un import : il cesse d’être un simple transport');
  assert(imports[0]?.startsWith('import type '), 'l’unique import du bus doit rester un import de TYPE');
});
