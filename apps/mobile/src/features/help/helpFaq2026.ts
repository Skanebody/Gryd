/**
 * GRYD — LA FAQ, chapitre 08 du guide « Comment ça marche ».
 *
 * ─── CE QUI CHANGE PAR RAPPORT À L'ANCIENNE `/faq` ──────────────────────────
 * L'ancienne liste était une pile de dix questions à plat, sans thème, et son
 * libellé de question était peint en `refonteColors.ink` (#101010) sur
 * `refonteColors.carbon` (#0A0A0A) : un contraste de 1,03:1, donc INVISIBLE.
 * Le contenu, lui, était juste. Il est repris ici, raccourci, rangé par thème,
 * et rendu par le guide avec les tokens de la tonalité sombre.
 *
 * RÈGLES : phrases courtes, tutoiement, aucun chiffre écrit à la main (tout
 * vient de `helpFacts2026`), une réponse NON VIDE pour chaque question — un
 * accordéon qui s'ouvre sur rien est un bouton mort au sens de la constitution.
 */
import type { GrydIconName } from '../../ui/gryd/glyphs';
import { helpFacts2026, say } from './helpFacts2026';

export interface HelpFaqEntry {
  /** Stable, indépendant de la langue : sert de clé de liste et d'état ouvert. */
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export interface HelpFaqGroup {
  readonly id: string;
  readonly title: string;
  readonly icon: GrydIconName;
  readonly entries: readonly HelpFaqEntry[];
}

export function helpFaq2026(fr: boolean): readonly HelpFaqGroup[] {
  const f = helpFacts2026(fr);
  if (!fr) return [
    {
      id: 'outings', title: 'Your outings', icon: 'route', entries: [
        { id: 'no-loop', question: 'Does an outing without a loop count?', answer: 'Yes. Its route, distance and time stay in your journal. It can earn XP without taking any terrain.' },
        { id: 'sports', question: 'Are running and cycling mixed together?', answer: 'One account, one journal, one level. Each sport keeps its own map and its own challenges. Pick your sport before you start.' },
        { id: 'pending', question: 'What does “sync pending” mean?', answer: 'Your outing is saved on this phone and waiting to be sent. Nothing is announced before the server confirms. Reconnect to finish.' },
      ],
    },
    {
      id: 'terrain', title: 'The terrain', icon: 'map', entries: [
        { id: 'gain', question: 'How do I gain terrain?', answer: 'Close a loop that meets the rules. The server checks the trace and hands you the area inside, in that sport.' },
        { id: 'lost', question: 'What if someone takes my area back?', answer: 'The newer loop takes the overlapping part. You keep your outing, your footprint and your XP. A new loop is the only way to take it back.' },
        { id: 'refused', question: 'Why was my loop refused?', answer: 'The app tells you the exact reason: no complete loop, an area too small, or GPS accuracy too low. Your outing is kept either way.' },
      ],
    },
    {
      id: 'progress', title: 'Progression', icon: 'chart', entries: [
        { id: 'xp', question: 'How does XP work?', answer: `A day with at least ${say(f.dailyMovement)} of movement is worth ${say(f.xpPerDay)}. The first ${say(f.creditedDaysPerWeek)} days of the week earn XP, both sports together.` },
        { id: 'rest', question: 'Does resting cost me anything?', answer: 'No. Rest never removes XP, levels, memories or items. There is no daily streak to protect.' },
        { id: 'ranking', question: 'Why is there no ranking near me?', answer: `A ranking only appears once at least ${say(f.rankedMinimum)} are ranked in that area. Below that, a podium would be a made-up number.` },
      ],
    },
    {
      id: 'crew', title: 'The crew', icon: 'crew', entries: [
        { id: 'need-crew', question: 'Do I have to join a crew?', answer: 'No. You can explore, record and progress alone. A crew is there to meet people and plan real outings.' },
        { id: 'challenge', question: 'How do I earn challenge points?', answer: `Close a loop with part of your trace inside the sector: ${say(f.insideSectorRun)} on foot, ${say(f.insideSectorBike)} by bike. Each counted day is worth ${say(f.pointsPerDay)}.` },
      ],
    },
    {
      id: 'privacy', title: 'Privacy and money', icon: 'lock', entries: [
        { id: 'private', question: 'Are my private places public?', answer: 'Your privacy settings decide what is shared. A loop that would reveal a protected area stays private by default. Check the preview before sharing.' },
        { id: 'pay', question: 'Do I have to pay to play?', answer: 'No. Sport, capture, crews and progression are free. No purchase increases terrain, XP or challenge points.' },
      ],
    },
  ];
  return [
    {
      id: 'outings', title: 'Tes sorties', icon: 'route', entries: [
        { id: 'no-loop', question: 'Une sortie sans boucle compte-t-elle ?', answer: 'Oui. Son tracé, sa distance et sa durée restent dans ton journal. Elle peut rapporter des XP sans prendre de terrain.' },
        { id: 'sports', question: 'La course et le vélo se mélangent-ils ?', answer: 'Un compte, un journal, un niveau. Chaque sport garde sa carte et ses défis. Choisis ta discipline avant de partir.' },
        { id: 'pending', question: 'Que veut dire « synchronisation en attente » ?', answer: 'Ta sortie est gardée sur ce téléphone et attend d’être envoyée. Rien n’est annoncé avant la confirmation du serveur. Reconnecte-toi pour finir.' },
      ],
    },
    {
      id: 'terrain', title: 'Le terrain', icon: 'map', entries: [
        { id: 'gain', question: 'Comment gagner du terrain ?', answer: 'Ferme une boucle qui respecte les règles. Le serveur vérifie la trace et te donne la surface à l’intérieur, dans ce sport.' },
        { id: 'lost', question: 'Et si quelqu’un reprend ma zone ?', answer: 'La boucle la plus récente prend la part qu’elle recouvre. Tu gardes ta sortie, ton empreinte et tes XP. Une nouvelle boucle est la seule façon de la reprendre.' },
        { id: 'refused', question: 'Pourquoi ma boucle a-t-elle été refusée ?', answer: 'L’app te donne la raison exacte : pas de boucle complète, surface trop petite, ou précision GPS insuffisante. Ta sortie est gardée dans tous les cas.' },
      ],
    },
    {
      id: 'progress', title: 'La progression', icon: 'chart', entries: [
        { id: 'xp', question: 'Comment marchent les XP ?', answer: `Une journée avec au moins ${say(f.dailyMovement)} de mouvement vaut ${say(f.xpPerDay)}. Les ${say(f.creditedDaysPerWeek)} premières journées de la semaine rapportent, les deux sports confondus.` },
        { id: 'rest', question: 'Est-ce que le repos me coûte quelque chose ?', answer: 'Non. Le repos ne retire ni XP, ni niveau, ni souvenir, ni objet. Il n’y a aucune série quotidienne à tenir.' },
        { id: 'ranking', question: 'Pourquoi n’y a-t-il pas de classement chez moi ?', answer: `Un classement n’apparaît qu’à partir de ${say(f.rankedMinimum)} classés dans la zone. En dessous, un podium serait un chiffre inventé.` },
      ],
    },
    {
      id: 'crew', title: 'Le crew', icon: 'crew', entries: [
        { id: 'need-crew', question: 'Faut-il rejoindre un crew ?', answer: 'Non. Tu peux explorer, enregistrer et progresser seul. Un crew sert à retrouver des gens et à organiser de vraies sorties.' },
        { id: 'challenge', question: 'Comment gagner des points de défi ?', answer: `Ferme une boucle avec une part de trace dans le secteur : ${say(f.insideSectorRun)} à pied, ${say(f.insideSectorBike)} à vélo. Chaque journée comptée vaut ${say(f.pointsPerDay)}.` },
      ],
    },
    {
      id: 'privacy', title: 'Vie privée et argent', icon: 'lock', entries: [
        { id: 'private', question: 'Mes lieux privés sont-ils publics ?', answer: 'Tes réglages de confidentialité décident de ce qui est partagé. Une boucle qui montrerait une zone protégée reste privée par défaut. Vérifie l’aperçu avant de partager.' },
        { id: 'pay', question: 'Faut-il payer pour jouer ?', answer: 'Non. Le sport, la capture, le crew et la progression sont gratuits. Aucun achat n’augmente le terrain, les XP ou les points de défi.' },
      ],
    },
  ];
}
