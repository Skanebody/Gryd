/**
 * GRYD — UNE QUESTION SANS RÉPONSE EST UN BOUTON MORT.
 *
 * ─── ÉTAPE 0 — le défaut existait ───────────────────────────────────────────
 * L'accordéon de l'ancienne `/faq` rendait `{open === index ? <Text>{item.a}</Text> : null}`
 * (app/faq.tsx:27, avant ce chantier) : une réponse vide aurait ouvert un vide,
 * et rien dans le dépôt ne l'aurait dit. La constitution est claire — « aucun
 * bouton mort » — et un accordéon qui s'ouvre sur rien en est un.
 *
 * Ce fichier verrouille aussi la parité FR/EN : une question posée dans une
 * langue et absente dans l'autre est un trou que le type ne voit pas, puisque
 * les deux listes sont écrites à la main.
 */
import { assert, assertEquals } from 'jsr:@std/assert';
import { helpFaq2026 } from './helpFaq2026.ts';

Deno.test('chaque question a une réponse non vide, dans les deux langues', () => {
  for (const fr of [true, false]) {
    const groups = helpFaq2026(fr);
    assert(groups.length >= 4, `${groups.length} thème(s) : la FAQ n’est plus rangée`);
    let questions = 0;
    for (const group of groups) {
      assert(group.title.trim().length > 0, `${group.id} : thème sans titre`);
      assert(group.entries.length > 0, `${group.id} : thème sans question`);
      for (const entry of group.entries) {
        questions++;
        assert(entry.question.trim().length > 0, `${group.id}/${entry.id} : question vide`);
        assert(entry.answer.trim().length > 0, `${group.id}/${entry.id} : RÉPONSE VIDE`);
        assert(entry.question.includes('?') || entry.question.includes('？'), `${group.id}/${entry.id} : « ${entry.question} » n’est pas une question`);
      }
    }
    assert(questions >= 10, `${questions} questions : la FAQ a perdu du contenu`);
  }
});

Deno.test('les identifiants sont uniques et communs aux deux langues', () => {
  const key = (fr: boolean) => helpFaq2026(fr).flatMap((group) => group.entries.map((entry) => `${group.id}/${entry.id}`));
  const inFrench = key(true);
  assertEquals(new Set(inFrench).size, inFrench.length, 'deux questions partagent le même identifiant');
  assertEquals(inFrench, key(false), 'les deux langues ne servent pas les mêmes questions');
});

Deno.test('les réponses françaises restent courtes et sans tiret long', () => {
  for (const group of helpFaq2026(true)) {
    for (const entry of group.entries) {
      assert(!entry.answer.includes('—') && !entry.answer.includes('–'), `${entry.id} : tiret long`);
      assert(!entry.question.includes('—') && !entry.question.includes('–'), `${entry.id} : tiret long dans la question`);
      assert(entry.answer.length <= 260, `${entry.id} : réponse de ${entry.answer.length} signes, c’est un paragraphe`);
    }
  }
});
