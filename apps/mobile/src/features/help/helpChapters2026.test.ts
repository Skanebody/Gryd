/**
 * GRYD — LE GUIDE A HUIT CHAPITRES, DANS CET ORDRE, DANS LES DEUX LANGUES.
 *
 * ─── ÉTAPE 0 — ce que ces règles auraient attrapé ───────────────────────────
 * Le défaut de forme qui menaçait ce guide n'est pas théorique : le dépôt en
 * porte déjà deux exemples.
 *  · `features/onboarding/content.ts` a longtemps servi une liste FR complète
 *    et une liste EN plus courte — un chapitre disparaissait pour qui lisait en
 *    anglais. Ici, `parité` refuse deux listes de longueurs différentes.
 *  · `app/faq.tsx` (avant ce chantier) empilait dix questions sans thème et
 *    sans limite de longueur ; deux de ses réponses faisaient quatre phrases.
 *    Ici, `deux à quatre phrases` refuse le paragraphe qui revient.
 *
 * La copie du guide doit rester lisible à quinze ans comme à soixante : pas de
 * tiret long, pas de chapitre bavard, pas de titre vide.
 */
import { assert, assertEquals } from 'jsr:@std/assert';
import { HELP_CHAPTER_IDS, helpChapterProgress, helpChapters2026, resolveHelpChapter } from './helpChapters2026.ts';

Deno.test('huit chapitres, dans l’ordre du parcours, identiques dans les deux langues', () => {
  assertEquals(HELP_CHAPTER_IDS.length, 8);
  assertEquals([...HELP_CHAPTER_IDS], ['bouger', 'boucle', 'terrain', 'points', 'crew', 'saison', 'fair-play', 'faq']);
  for (const fr of [true, false]) {
    const chapters = helpChapters2026(fr);
    assertEquals(chapters.map((chapter) => chapter.id), [...HELP_CHAPTER_IDS]);
    assertEquals(chapters.map((chapter) => chapter.step), ['01', '02', '03', '04', '05', '06', '07', '08']);
  }
});

Deno.test('chaque chapitre porte un titre, un schéma décrit, et deux à quatre phrases', () => {
  for (const fr of [true, false]) {
    for (const chapter of helpChapters2026(fr)) {
      assert(chapter.title.trim().length > 0, `${chapter.id} : titre vide`);
      assert(chapter.chip.trim().length > 0, `${chapter.id} : libellé de sélecteur vide`);
      assert(chapter.lines.length >= 2 && chapter.lines.length <= 4, `${chapter.id} : ${chapter.lines.length} phrase(s), le guide en veut 2 à 4`);
      for (const line of chapter.lines) assert(line.trim().length > 0, `${chapter.id} : phrase vide`);
      // L15 — un schéma qui ne se raconte pas n'existe pas pour VoiceOver.
      assert(chapter.artLabel.trim().length > 0, `${chapter.id} : schéma sans description`);
      if (chapter.secondaryArt) assert((chapter.secondaryArtLabel ?? '').trim().length > 0, `${chapter.id} : second schéma sans description`);
      for (const fact of chapter.facts) {
        assert(fact.label.trim().length > 0, `${chapter.id} : chiffre sans libellé`);
        assert(/\d/.test(fact.value), `${chapter.id} : « ${fact.label} » n’affiche aucune valeur`);
      }
    }
  }
});

Deno.test('la copie française tutoie, reste courte, et n’emploie aucun tiret long', () => {
  for (const chapter of helpChapters2026(true)) {
    for (const line of [...chapter.lines, chapter.note ?? '', chapter.title]) {
      assert(!line.includes('—') && !line.includes('–'), `${chapter.id} : tiret long dans « ${line} »`);
      // Une phrase de plus de 140 signes n'est plus une phrase de guide.
      for (const sentence of line.split('. ')) {
        assert(sentence.length <= 140, `${chapter.id} : phrase trop longue (${sentence.length}) « ${sentence} »`);
      }
    }
  }
});

Deno.test('un chapitre inconnu ouvre le premier, jamais un écran vide', () => {
  assertEquals(resolveHelpChapter(undefined), 'bouger');
  assertEquals(resolveHelpChapter(null), 'bouger');
  assertEquals(resolveHelpChapter('inconnu'), 'bouger');
  assertEquals(resolveHelpChapter(''), 'bouger');
  assertEquals(resolveHelpChapter('faq'), 'faq');
  assertEquals(resolveHelpChapter(['terrain', 'faq']), 'terrain');
  for (const id of HELP_CHAPTER_IDS) assertEquals(resolveHelpChapter(id), id);
});

Deno.test('la progression avance d’un chapitre à l’autre et se ferme au dernier', () => {
  const count = HELP_CHAPTER_IDS.length;
  HELP_CHAPTER_IDS.forEach((id, index) => {
    const progress = helpChapterProgress(id);
    assertEquals(progress.index, index);
    assertEquals(progress.count, count);
    assertEquals(progress.previous, index === 0 ? null : HELP_CHAPTER_IDS[index - 1]);
    assertEquals(progress.next, index === count - 1 ? null : HELP_CHAPTER_IDS[index + 1]);
    assert(progress.ratio > 0 && progress.ratio <= 1, `${id} : barre de progression hors bornes`);
  });
  assertEquals(helpChapterProgress(HELP_CHAPTER_IDS[count - 1]!).ratio, 1);
});
