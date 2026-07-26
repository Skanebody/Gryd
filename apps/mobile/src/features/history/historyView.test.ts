/**
 * GRYD — tests des décisions d'affichage de l'Historique (planche E24).
 *
 * Ce qu'on verrouille n'est pas « la liste s'affiche » mais les règles
 * d'honnêteté du journal de conquête :
 *   · une REPRISE (zone arrachée) ne se confond jamais avec une capture neuve ;
 *   · un impact INCONNU (`null`) ne se rend jamais comme un impact NUL (`0`) ;
 *   · une course tombe TOUJOURS dans sa semaine civile, jamais dans une autre ;
 *   · le bandeau ne compte QUE des faits serveur.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  groupRunsByWeek,
  runColorRole,
  runStory,
  startOfWeekMs,
  summarizeHistory,
} from './historyView.ts';

// ─── runStory : le TYPE d'une ligne, dérivé de l'impact serveur ──────────────

Deno.test("runStory : une REPRISE (stolen>0) prime sur la capture", () => {
  // captured INCLUT stolen : sans la précédence, une reprise pure serait
  // étiquetée « Capture » (chartreuse) au lieu de « Reprise » (orange).
  assertEquals(runStory({ captured: 3, retaken: 3, defended: 0 }), { type: 'reprise', zones: 3 });
  // Reprise partielle : 5 pris dont 2 arrachés → on RACONTE les 2 arrachés.
  assertEquals(runStory({ captured: 5, retaken: 2, defended: 1 }), { type: 'reprise', zones: 2 });
});

Deno.test("runStory : une capture neuve (aucun vol) est chartreuse", () => {
  assertEquals(runStory({ captured: 4, retaken: 0, defended: 0 }), { type: 'capture', zones: 4 });
});

Deno.test("runStory : sans prise mais avec défense -> Défense", () => {
  assertEquals(runStory({ captured: 0, retaken: 0, defended: 2 }), { type: 'defense', zones: 2 });
});

Deno.test("runStory : le serveur a dit 0 pris -> « Sans capture » (un FAIT)", () => {
  assertEquals(runStory({ captured: 0, retaken: 0, defended: 0 }), { type: 'free' });
});

Deno.test("runStory : pas de payload (tout null) -> inconnu, jamais « libre »", () => {
  // La distinction cardinale : « libre » AFFIRME que rien n'a été pris ;
  // « unknown » n'affirme rien. Confondre les deux, c'est mentir sur la course.
  assertEquals(runStory({ captured: null, retaken: null, defended: null }), { type: 'unknown' });
  // Reprise lisible même si le total `captured` est inconnu (composante manquante).
  assertEquals(runStory({ captured: null, retaken: 2, defended: null }), { type: 'reprise', zones: 2 });
});

Deno.test("runColorRole : couleurs PAR RÔLE (constitution §C)", () => {
  assertEquals(runColorRole('capture'), 'me');
  assertEquals(runColorRole('reprise'), 'rival');
  assertEquals(runColorRole('defense'), 'defense');
  assertEquals(runColorRole('free'), 'neutral');
  assertEquals(runColorRole('unknown'), 'neutral');
});

// ─── startOfWeekMs : l'invariant du lundi ────────────────────────────────────

Deno.test("startOfWeekMs : renvoie un lundi 00:00, <= l'instant, a moins de 7 j", () => {
  for (const iso of ['2026-07-26T09:30:00', '2026-07-20T00:00:00', '2026-01-01T23:59:00']) {
    const ms = new Date(iso).getTime();
    const start = startOfWeekMs(ms);
    const d = new Date(start);
    assertEquals(d.getDay(), 1, 'le début de semaine est un lundi'); // 1 = lundi
    assertEquals(d.getHours(), 0);
    assertEquals(d.getMinutes(), 0);
    assert(start <= ms, 'le début de semaine ne dépasse pas l instant');
    assert(ms - start < 7 * 24 * 3600 * 1000, 'moins de sept jours d ecart');
  }
});

Deno.test("startOfWeekMs : deux instants de la MEME semaine ont le meme lundi", () => {
  const monday = startOfWeekMs(new Date('2026-07-22T12:00:00').getTime());
  const sunday = startOfWeekMs(monday + 6 * 24 * 3600 * 1000 + 3600 * 1000); // dimanche
  assertEquals(sunday, monday);
});

// ─── groupRunsByWeek : découpage par semaine, ordre, seau ────────────────────

interface E {
  id: string;
  startedAtMs: number;
}

Deno.test("groupRunsByWeek : range chaque sortie dans SA semaine, recentes d abord", () => {
  const now = new Date('2026-07-26T10:00:00').getTime(); // un dimanche
  const thisWeek = startOfWeekMs(now);
  const entries: E[] = [
    { id: 'a', startedAtMs: now }, // cette semaine
    { id: 'b', startedAtMs: thisWeek }, // lundi de cette semaine — même groupe
    { id: 'c', startedAtMs: thisWeek - 1 }, // 1 ms avant → semaine dernière
    { id: 'd', startedAtMs: thisWeek - 8 * 24 * 3600 * 1000 }, // deux semaines avant → older
  ];
  const groups = groupRunsByWeek(entries, now);
  assertEquals(groups.length, 3);
  // Ordre des groupes : du plus récent au plus ancien.
  assertEquals(
    groups.map((g) => g.bucket),
    ['this', 'last', 'older'],
  );
  // « Cette semaine » contient a ET b, triés du plus récent au plus ancien.
  assertEquals(groups[0]?.entries.map((e) => e.id), ['a', 'b']);
  assertEquals(groups[1]?.entries.map((e) => e.id), ['c']);
  assertEquals(groups[2]?.entries.map((e) => e.id), ['d']);
});

Deno.test("groupRunsByWeek : une date illisible ne cree pas de semaine fantome", () => {
  const now = new Date('2026-07-26T10:00:00').getTime();
  const groups = groupRunsByWeek([{ id: 'x', startedAtMs: Number.NaN }], now);
  assertEquals(groups.length, 0);
});

// ─── summarizeHistory : le bandeau ne compte que des faits ───────────────────

Deno.test("summarizeHistory : captures/defenses/distance = faits serveur", () => {
  const s = summarizeHistory([
    { km: 4.3, captured: 3, retaken: 0, defended: 0 }, // capture
    { km: 3.1, captured: 0, retaken: 0, defended: 2 }, // défense
    { km: 3.8, captured: 1, retaken: 1, defended: 0 }, // reprise (compte comme capture)
    { km: 5.8, captured: 0, retaken: 0, defended: 0 }, // libre
  ]);
  assertEquals(s.runs, 4);
  assertEquals(s.captures, 2); // les deux courses dont captured>0 (la reprise incluse)
  assertEquals(s.defenses, 1);
  assert(Math.abs(s.km - 17.0) < 1e-9, 'distance = somme réelle');
});

Deno.test("summarizeHistory : un impact null ne compte NI capture NI defense", () => {
  const s = summarizeHistory([
    { km: 4.0, captured: null, retaken: null, defended: null }, // inconnu
    { km: Number.NaN, captured: 2, retaken: 0, defended: 0 }, // distance illisible ignorée
  ]);
  assertEquals(s.runs, 2);
  assertEquals(s.captures, 1); // seule la seconde a captured>0
  assertEquals(s.defenses, 0);
  assertEquals(s.km, 4.0); // le NaN n'a pas pollué le total
});
