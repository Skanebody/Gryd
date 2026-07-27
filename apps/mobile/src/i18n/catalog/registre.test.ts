/**
 * GRYD — LES REGISTRES DE LANGUE, ET PLUS RIEN NE LES OUBLIE.
 *   · le FRANÇAIS tutoie          (bloc 1, 27/07/2026)
 *   · le PORTUGAIS est BRÉSILIEN  (bloc 2, 27/07/2026)
 *
 * ═══ POURQUOI CE FICHIER EXISTE (27/07/2026) ════════════════════════════════
 * CLAUDE.md déclare le tutoiement en français et ajoute « des tests le
 * verrouillent ». C'ÉTAIT FAUX : aucun test du dépôt ne regardait le registre.
 * Résultat mesuré — quinze entrées de `crew.ts` vouvoyaient, dont cinq RENDUES
 * à l'écran (« Trouvez votre crew », « Connectez-vous pour voir les crews de
 * votre ville », « C'est votre crew. »…), et un rendu-compte affirmait pourtant
 * avoir relu « les 36 clés une par une ». Le catalogue lui-même portait la
 * contradiction en commentaire (« ⚠ REGISTRE : le bloc LOT 7 VOUVOIE… ») sans
 * que rien ne la fasse échouer.
 *
 * Une règle énoncée qu'aucun test ne tient n'est pas une règle : c'est une
 * intention. Ce fichier la rend mécanique — sur les 48 catalogues, d'un coup, y
 * compris ceux qui n'existent pas encore.
 *
 * ═══ CE QU'IL NE FAIT PAS ═══════════════════════════════════════════════════
 * Il ne confond pas le VOUVOIEMENT (s'adresser au lecteur avec déférence) avec
 * le PLURIEL (s'adresser à plusieurs personnes, ou parler d'un groupe). « Plus
 * vous êtes nombreux à y être passés » est un pluriel juste : le tutoyer le
 * rendrait faux. Les seules exceptions tolérées sont donc nommées une par une
 * ci-dessous, avec leur raison — et le test échoue AUSSI si une exception
 * devient inutile, pour qu'aucune ne survive à sa justification.
 *
 * PUR : aucun import React Native (les 48 catalogues se chargent tels quels
 * sous Deno — vérifié).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../types.ts';

/** Une entrée i18n : les 5 langues obligatoires (contrat de `types.ts`). */
function isEntry(v: unknown): v is Record<string, string> {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return LOCALES.every((l) => typeof o[l] === 'string');
}

/**
 * Marqueurs de vouvoiement en français. `rendez-vous` est un NOM commun, pas un
 * pronom : il est retiré du texte avant l'examen, sinon chaque « point de
 * rendez-vous » du catalogue crew ferait rougir le test pour rien.
 */
const VOUS_RE = /(^|[^\p{L}])(vous|votre|vos|vôtre|vôtres)([^\p{L}]|$)/iu;

function frVouvoie(text: string): boolean {
  const clean = text
    .replace(/rendez-vous/gi, ' ')
    .replace(/\{[^}]*\}/g, ' '); // les jetons {n}, {city}… ne portent pas de registre
  return VOUS_RE.test(clean);
}

/**
 * LES SEULES EXCEPTIONS — un PLURIEL RÉEL, jamais une déférence. Clé → raison.
 * Chacune a été relue à sa surface : le tutoiement y serait FAUX, pas seulement
 * inhabituel.
 */
const PLURIEL_ASSUME: ReadonlyMap<string, string> = new Map([
  [
    'crew:editDescPh',
    'Le champ décrit le CREW à ses futurs membres : « Vos habitudes de crew, ' +
      'vos règles » s’adresse au groupe, pas au lecteur. « Tes habitudes » ' +
      'parlerait de l’auteur seul, ce que la description ne fait pas.',
  ],
  [
    'crew:oBlockPlaceEmpty',
    'Un rendez-vous se donne À PLUSIEURS : « où vous vous retrouvez » désigne le ' +
      'crew. Le verbe qui précède, lui, tutoie déjà l’auteur (« Indique »).',
  ],
  [
    'explain:secRelaisLine',
    'Décrit le cas où PLUSIEURS coureurs sont sur la même boucle. « Vous êtes ' +
      'plusieurs » est le sujet même de la règle expliquée.',
  ],
  [
    'explain:qGroupLockA',
    'La défense collective se renforce avec le NOMBRE : « plus vous êtes ' +
      'nombreux » est la mécanique, pas une politesse.',
  ],
  // `rivalProfile:whatRivalry` a été RETIRÉE le 27/07/2026 avec le bloc « ce que
  // cet écran montrera » : E56 lit désormais la source consentie, il n'a plus à
  // décrire au futur ce qu'il fait au présent. L'exception meurt avec sa clé —
  // c'est exactement ce que ce test garde.
  [
    'rivalProfile:sectionRivalite',
    'TITRE du bloc E56 : « Votre ' +
      'rivalité » nomme la relation du couple observateur+rival, pas le seul ' +
      'lecteur. « Ta rivalité » suggérerait une rivalité qui n’appartiendrait ' +
      'qu’à lui — or elle se joue à deux, et la spéc nomme le bloc ainsi.',
  ],
  // ─── E57 / E58 : LE SOCIAL EST INTRINSÈQUEMENT À DEUX (27/07/2026) ────────
  // Ces quatre phrases décrivent une RELATION, pas un lecteur. Les retutoyer
  // les rendrait fausses : « tu es ami » n'existe pas sans l'autre, et « entre
  // toi » n'a pas de sens. C'est le pluriel réel, pas de la politesse.
  [
    'social:okFriendAccepted',
    'L’amitié vient d’être ACCEPTÉE des deux côtés : « vous êtes amis » nomme ' +
      'le lien lui-même. Aucune formulation au singulier ne le dit sans mentir ' +
      'sur qui est concerné.',
  ],
  [
    'social:duelNoScoring',
    '« Prendre rendez-vous entre vous » désigne les DEUX parties d’un défi ' +
      'accepté — c’est exactement le point de la phrase : GRYD ne compte rien, ' +
      'l’accord n’existe qu’entre elles.',
  ],
  [
    'social:duelErrNoRelation',
    'Le motif `no_relation` porte sur la PAIRE : « vous n’avez pas encore de ' +
      'lien » énonce l’absence de relation, qui n’appartient à personne seul.',
  ],
  [
    'social:duelErrAlreadyPending',
    '« Un défi est déjà ouvert entre vous » : l’index d’unicité de 0088 porte ' +
      'sur la paire, quel que soit le sens. La phrase décrit ce fait.',
  ],
]);

/**
 * Charge les 48 catalogues COMME OBJETS (jamais un scan de lignes : `legal.ts`
 * fabrique ses entrées par fonction — `fr5(texte)` — et un grep les raterait) et
 * rend `{ id, fr, pt }` pour chaque entrée.
 */
async function toutesLesEntrees(): Promise<{ id: string; fr: string; pt: string }[]> {
  const dir = new URL('./', import.meta.url);
  const out: { id: string; fr: string; pt: string }[] = [];
  for (const file of Deno.readDirSync(dir)) {
    if (!file.isFile || !file.name.endsWith('.ts') || file.name.includes('.test.')) continue;
    const mod = (await import(new URL(file.name, dir).href)) as Record<string, unknown>;
    const catalogue = file.name.replace(/\.ts$/, '');
    for (const exported of Object.values(mod)) {
      if (typeof exported !== 'object' || exported === null) continue;
      for (const [cle, valeur] of Object.entries(exported as Record<string, unknown>)) {
        if (isEntry(valeur)) {
          out.push({ id: `${catalogue}:${cle}`, fr: valeur.fr, pt: valeur.pt });
        }
      }
    }
  }
  return out;
}

/** Vue FR du même balayage (bloc 1). */
const toutesLesEntreesFr = toutesLesEntrees;

Deno.test('REGISTRE — le français TUTOIE, sur les 48 catalogues', async () => {
  const entrees = await toutesLesEntreesFr();
  // Filet : si le balayage ne charge plus rien, c'est le TEST qui est cassé et
  // il doit le dire, pas passer au vert sur zéro entrée.
  assert(entrees.length > 1000, `balayage suspect : ${entrees.length} entrées lues`);

  const fautes = entrees
    .filter((e) => frVouvoie(e.fr) && !PLURIEL_ASSUME.has(e.id))
    .map((e) => `  ${e.id} → « ${e.fr} »`);

  assertEquals(
    fautes.length,
    0,
    'VOUVOIEMENT en français (CLAUDE.md : le produit tutoie).\n' +
      'Si le « vous » est un PLURIEL RÉEL, inscris la clé dans PLURIEL_ASSUME\n' +
      'avec sa raison ; sinon, retutoie la phrase.\n' +
      fautes.join('\n'),
  );
});

Deno.test('REGISTRE — aucune exception ne survit à sa justification', async () => {
  const entrees = await toutesLesEntreesFr();
  const parId = new Map(entrees.map((e) => [e.id, e.fr]));
  for (const [id, raison] of PLURIEL_ASSUME) {
    const fr = parId.get(id);
    assert(fr !== undefined, `PLURIEL_ASSUME cite une clé qui n’existe plus : ${id}`);
    assert(
      frVouvoie(fr),
      `${id} ne vouvoie plus — retire l’exception (raison devenue caduque : ${raison})`,
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOC 2 — LE PORTUGAIS EST BRÉSILIEN (27/07/2026)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * POURQUOI CE BLOC EXISTE. CLAUDE.md écrit noir sur blanc : « le portugais vise
 * le BRÉSILIEN : "você", JAMAIS "teu/tua/tens/podes" (portugais européen) ».
 * Aucun test ne le tenait — et la règle avait dérivé sur ~120 chaînes RENDUES :
 * `appel.ts` (« AS TUAS CORRIDAS », « O TEU RECURSO », « Podes pedir… »),
 * `premiumAnalytics.ts` (« O TEU TERRITÓRIO », « Há quanto tempo manténs cada
 * zona »), `arsenal.ts`, `arsenalAdvice.ts`, `crew.ts`, `result.ts`, `map.ts`…
 * Une règle qu'aucun test ne tient n'est pas une règle : c'est une intention.
 *
 * ═══ CE QUE CE BLOC REGARDE ════════════════════════════════════════════════
 * Les formes du portugais EUROPÉEN qui sont FAUSSES au Brésil, par famille :
 * possessifs et pronoms de « tu », conjugaisons de « tu » (présent, imparfait,
 * subjonctif, prétérit, futur, infinitif personnel), orthographe/lexique EP
 * (`ecrã`, `registado`, `aspeto`, `bónus`, `percentagem`, `controlo`…) et le
 * progressif EP « a + infinitif » (« A ler… » là où le Brésil dit « Lendo… »).
 *
 * ═══ CE QUE CE BLOC NE REGARDE PAS, ET POURQUOI ════════════════════════════
 * 1. L'IMPÉRATIF. « Escolhe » (EP) et « escolhe » (3ᵉ personne, juste au Brésil)
 *    s'écrivent PAREIL : aucune expression régulière ne les sépare sans lire le
 *    sens. « Protege sua sequência » (= l'objet protège) est correct, « Escolhe
 *    uma cidade » (= choisis) ne l'est pas. Les six impératifs fautifs trouvés
 *    le 27/07 ont été corrigés À LA MAIN, en comparant au français source ; ce
 *    test ne prétend pas les rattraper. Le dire vaut mieux que le promettre.
 * 2. LES HOMOGRAPHES BRÉSILIENS LÉGITIMES, volontairement ABSENTS du filtre —
 *    les inclure produirait une pluie d'exceptions que personne ne relirait :
 *      · participes courts : `ganhas` (« Defesas ganhas »), `pagas`, `aceitas`,
 *        `gastas`, `salvas`, `soltas`, `abertas`, `presas` ;
 *      · noms communs : `voltas` (les tours de boucle !), `marcas`, `vias`,
 *        `mudas`, `crias`, `tiras`, `guardas`, `sais`, `paras`, `saias`,
 *        `seres`, `olhares`, `dizeres`, `poderes`, `deveres`, `saberes` ;
 *      · adjectifs : `ativas` (« Semanas ativas »), `precisas`, `contínuas` ;
 *      · `deste` (= « de este »), qui masque le prétérit `deste` (« tu donnas »).
 *    `te` non plus n'est pas un marqueur : le proclitique est courant au Brésil
 *    (« quem te ataca »). Le marqueur EP, c'est `ti` / `contigo` / `teu`.
 * 3. Les entrées dont `fr === pt` : `legal.ts` porte VOLONTAIREMENT le texte
 *    juridique français dans les cinq langues (`fr5()`, docblock du catalogue).
 *    Ce n'est pas du portugais qui aurait dérivé, c'est du français assumé.
 */
const PT_EUROPEEN: ReadonlyArray<readonly [famille: string, motif: RegExp]> = [
  // ── Possessifs et pronoms de « tu » (BR : seu/sua/você) ──────────────────
  [
    'possessif/pronom « tu »',
    /(teu|teus|tua|tuas|ti|contigo|convosco|vós|vosso|vossos|vossa|vossas)/,
  ],
  // ── Présent de l'indicatif, 2ᵉ pers. sing. (BR : você + 3ᵉ pers.) ────────
  [
    'présent 2ᵉ pers. sing.',
    /(és|estás|tens|vens|vais|dás|vês|lês|pões|sabes|podes|queres|fazes|dizes|detens|deténs|manténs|obténs|conténs|sustentas|abres|aprendes|começas|clicas|conheces|continuas|convidas|corres|defines|deixas|deves|entras|envias|escolhes|escreves|esperas|fechas|ficas|levas|olhas|partilhas|passas|pedalas|perdes|personalizas|procuras|recebes|segues|terminas|tocas|tornas|treinas|usas)/,
  ],
  // ── Imparfait et conditionnel, 2ᵉ pers. sing. ────────────────────────────
  [
    'imparfait/conditionnel 2ᵉ pers. sing.',
    /(eras|estavas|tinhas|ias|podias|querias|sabias|fazias|dizias|farias|terias|poderias|serias|estarias|irias|darias|verias)/,
  ],
  // ── Subjonctif présent, 2ᵉ pers. sing. ───────────────────────────────────
  [
    'subjonctif 2ᵉ pers. sing.',
    /(sejas|estejas|tenhas|possas|queiras|faças|vejas|saibas|vás|dês|ponhas|venhas|digas|corras|ganhes|entres|escolhas)/,
  ],
  // ── Prétérit, 2ᵉ pers. sing. — liste EXPLICITE : le suffixe générique
  //    « -ste » attraperait `existe`, `resiste`, `teste`, `contraste`… ──────
  [
    'prétérit 2ᵉ pers. sing.',
    /(foste|fizeste|tiveste|estiveste|disseste|viste|soubeste|puseste|quiseste|pudeste|vieste|correste|ganhaste|perdeste|começaste|terminaste|escolheste|criaste|entraste|chegaste|passaste|usaste|ficaste|tocaste|conseguiste|recebeste|deixaste|enviaste|abriste|subiste|saíste|partiste|capturaste|defendeste|jogaste|treinaste|pedalaste|tentaste|guardaste|mudaste|marcaste|publicaste|ativaste|tornaste|aprendeste|compraste|vendeste|olhaste|esperaste|seguiste|encontraste|procuraste)/,
  ],
  // ── Futur, 2ᵉ pers. sing. : générique en « -rás ». `atrás` / `detrás` sont
  //    des adverbes (« Voltar atrás », « fique atrás do seu apelido ») et
  //    `trás` ne peut pas correspondre (il faut ≥ 2 lettres avant « rás »). ──
  ['futur 2ᵉ pers. sing.', /(?!atrás|detrás)(?:\p{L}{2,})rás/u],
  // ── Futur du subjonctif / infinitif personnel, 2ᵉ pers. sing. ────────────
  [
    'infinitif personnel 2ᵉ pers. sing.',
    /(quiseres|puderes|fizeres|tiveres|fores|vires|deres|estiveres|escolheres|assinares|correres|ganhares|capturares|começares|terminares|entrares|jogares|treinares|tentares|criares|usares|partilhares|pedalares|conseguires|receberes|abrires|chegares|passares|guardares|mudares|publicares|ativares|tornares|aprenderes|comprares|venderes|esperares|seguires|encontrares|procurares|veres|leres|fazeres|quereres|teres)/,
  ],
  // ── Imparfait du subjonctif, 2ᵉ pers. sing. — `desses` en est ABSENT : au
  //    Brésil c'est la contraction « de + esses » (« nenhum desses estados »),
  //    bien plus fréquente que le subjonctif de `dar`. ───────────────────────
  [
    'subjonctif imparfait 2ᵉ pers. sing.',
    /(fosses|tivesses|estivesses|pudesses|quisesses|fizesses|visses|corresses|ganhasses)/,
  ],
  // ── Lexique et orthographe du Portugal ───────────────────────────────────
  [
    'lexique/orthographe du Portugal',
    /(ecrã|ecrãs|telemóvel|telemóveis|utilizador|utilizadores|utilizadora|utilizadoras|ficheiro|ficheiros|autocarro|comboio|morada|moradas|sanita|percentagem|percentagens|bónus|ténis|registo|registos|registar|registado|registada|registados|registadas|aspeto|aspetos|controlo|facto|factos|contacto|contactos|contactar|connosco|actual|acção|óptimo|definições|pedómetro)/,
  ],
];

/**
 * Le progressif portugais d'Europe : « A ler… », « A carregar… » là où le
 * Brésil dit « Lendo… », « Carregando… ». ANCRÉ EN TÊTE de chaîne et limité à
 * six verbes d'attente : « A defender » / « A salvar » (= « à défendre », « à
 * sauver ») sont d'autres tournures, justes dans les deux normes — les inclure
 * casserait `activite:groupDefend`, `flagged:routeADefendre`, `map:sectorBadgeUrgent`.
 */
const PT_PROGRESSIF_EP = /^A (ler|carregar|enviar|verificar|sincronizar|atualizar)\b/u;

/** « até ao » est la contraction portugaise ; le Brésil écrit « até o ». */
const PT_CONTRACTION_EP = /\baté ao\b/u;

/** Rend les marqueurs de portugais européen d'une chaîne (vide = conforme). */
function ptEuropeen(text: string): string[] {
  const clean = text.replace(/\{[^}]*\}/g, ' '); // les jetons {n}, {city}… ne sont pas du portugais
  const trouves: string[] = [];
  for (const [famille, motif] of PT_EUROPEEN) {
    // Frontière de FIN en lookahead : sans ça, « um ecrã registado » ne
    // signalerait que `ecrã` — l'espace consommé masquerait le marqueur suivant.
    const global = new RegExp(`(^|[^\\p{L}])(?:${motif.source})(?=[^\\p{L}]|$)`, 'giu');
    const m = clean.match(global);
    if (m) trouves.push(`${famille} → ${m.map((s) => s.trim()).join(', ')}`);
  }
  if (PT_PROGRESSIF_EP.test(clean)) trouves.push('progressif « a + infinitif » (Brésil : gérondif)');
  if (PT_CONTRACTION_EP.test(clean)) trouves.push('contraction « até ao » (Brésil : « até o »)');
  return trouves;
}

/**
 * LES SEULES EXCEPTIONS — clé → raison. Chacune doit être un FAUX POSITIF réel
 * (nom propre, citation, homographe que le filtre ne sait pas trancher), jamais
 * « on verra plus tard ». Le second test échoue si une exception cesse d'être
 * nécessaire, pour qu'aucune ne survive à sa justification.
 *
 * AUCUNE À CE JOUR (27/07/2026) : le corpus est passé au brésilien en entier.
 * La carte existe pour que la première exception soit ÉCRITE, pas glissée dans
 * l'expression régulière — c'est-à-dire relisible.
 */
const PT_EXCEPTIONS: ReadonlyMap<string, string> = new Map([]);

Deno.test('REGISTRE — le portugais est BRÉSILIEN, sur les 48 catalogues', async () => {
  const entrees = await toutesLesEntrees();
  // Filet : si le balayage ne charge plus rien, c'est le TEST qui est cassé et
  // il doit le dire, pas passer au vert sur zéro entrée.
  assert(entrees.length > 1000, `balayage suspect : ${entrees.length} entrées lues`);

  const fautes = entrees
    .filter((e) => e.fr !== e.pt) // `legal.ts` : texte juridique français assumé dans les 5 langues
    .filter((e) => !PT_EXCEPTIONS.has(e.id))
    .map((e) => ({ e, marqueurs: ptEuropeen(e.pt) }))
    .filter(({ marqueurs }) => marqueurs.length > 0)
    .map(({ e, marqueurs }) => `  ${e.id} → « ${e.pt} »\n      ${marqueurs.join(' ; ')}`);

  assertEquals(
    fautes.length,
    0,
    'PORTUGAIS EUROPÉEN détecté (CLAUDE.md : le portugais vise le BRÉSILIEN,\n' +
      '« você », jamais « teu/tua/tens/podes »). La conjugaison suit le pronom :\n' +
      '« tens » → « você tem », « o teu crew » → « o seu crew », « podes » →\n' +
      '« você pode ». Si c\'est un FAUX POSITIF (nom propre, citation), inscris la\n' +
      'clé dans PT_EXCEPTIONS avec sa raison.\n' +
      fautes.join('\n'),
  );
});

Deno.test('REGISTRE — aucune exception portugaise ne survit à sa justification', async () => {
  const entrees = await toutesLesEntrees();
  const parId = new Map(entrees.map((e) => [e.id, e.pt]));
  for (const [id, raison] of PT_EXCEPTIONS) {
    const pt = parId.get(id);
    assert(pt !== undefined, `PT_EXCEPTIONS cite une clé qui n’existe plus : ${id}`);
    assert(
      ptEuropeen(pt).length > 0,
      `${id} ne déclenche plus le filtre — retire l’exception (raison caduque : ${raison})`,
    );
  }
});
