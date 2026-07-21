/**
 * GRYD — i18n : catalogue « raison quotidienne de revenir » (LOT 3, A-45 §3) —
 * la ZONE DU JOUR et le DÉFI 7 JOURS D'ACCUEIL.
 *
 * INVARIANTS (jamais traduits) : GRYD, km, les noms de secteurs (ils viennent
 * du reverse-geocode réel, on ne traduit pas un nom de quartier). La parité
 * 5 langues est imposée PAR LE TYPE (Entry).
 *
 * DEUX RÈGLES GOUVERNENT CETTE COPIE, et elles se voient dans chaque phrase :
 *
 *  1. L'APP NE MENT JAMAIS. Il existe une phrase pour « pas de zone du jour
 *     aujourd'hui » et elle est écrite comme un fait tranquille, pas comme une
 *     panne. Aucune formule ne laisse croire qu'une zone existe quand le serveur
 *     n'en a pas trouvé, et aucun nom de quartier n'est inventé : sans nom réel,
 *     on dit « une zone de ta ville ».
 *
 *  2. ANTI-SHAME. Le défi d'accueil ne parle JAMAIS de jours écoulés, de retard
 *     ni d'échéance. « Rien n'expire, rien ne se perd » est dit explicitement,
 *     dans les cinq langues, parce que c'est la promesse mécanique du défi
 *     (aucun palier ne se re-perd — cf. engine/welcomeChallenge.ts).
 *
 * ANTI PAY-TO-WIN : la récompense de la Zone du Jour est nommée pour ce qu'elle
 * est — « une distinction, aucun point ». Dire moins laisserait croire à un
 * avantage ; l'app est gratuite et la mécanique ne donne rien de jouable.
 *
 * §A CONTRAIGNANT : ces libellés vivent dans un bloc compact (375 px, plancher
 * a11y 12 px). Ils restent COURTS dans les 5 langues et ne se tronquent JAMAIS —
 * l'allemand est reformulé concis plutôt qu'en composé à rallonge.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ══ Zone du Jour ═══════════════════════════════════════════════════════════
  dailyZoneKicker: {
    fr: 'ZONE DU JOUR',
    en: 'ZONE OF THE DAY',
    es: 'ZONA DEL DÍA',
    de: 'ZONE DES TAGES',
    pt: 'ZONA DO DIA',
  },
  /** Secteur RÉEL sans nom géocodé — on ne fabrique pas de quartier. */
  dailyZoneUnnamed: {
    fr: 'Une zone de ta ville',
    en: 'A zone in your city',
    es: 'Una zona de tu ciudad',
    de: 'Eine Zone in deiner Stadt',
    pt: 'Uma zona da tua cidade',
  },
  /** Rôle neutre : du terrain réellement libre. */
  dailyZoneFree: {
    fr: 'Terrain libre à prendre',
    en: 'Open ground to take',
    es: 'Terreno libre para tomar',
    de: 'Freies Gebiet zu holen',
    pt: 'Terreno livre para tomar',
  },
  /** Rôle fragile : des zones arrivent à échéance. Aucun détenteur n'est nommé. */
  dailyZoneFragile: {
    fr: 'Des zones y arrivent à échéance',
    en: 'Zones there are expiring',
    es: 'Allí caducan algunas zonas',
    de: 'Dort laufen Zonen ab',
    pt: 'Ali há zonas a expirar',
  },
  /**
   * La récompense, dite en entier. « aucun point » n'est pas une précaution
   * juridique : c'est la règle anti pay-to-win, et le joueur a le droit de la lire.
   */
  dailyZoneReward: {
    fr: 'Capture ici aujourd’hui : une distinction, aucun point.',
    en: 'Capture here today: a mark of honour, no points.',
    es: 'Captura aquí hoy: una distinción, ningún punto.',
    de: 'Heute hier erobern: eine Auszeichnung, keine Punkte.',
    pt: 'Captura aqui hoje: uma distinção, nenhum ponto.',
  },
  /** Distinction déjà obtenue aujourd'hui — on félicite, on ne relance pas. */
  dailyZoneDone: {
    fr: 'Zone du jour capturée.',
    en: 'Zone of the day captured.',
    es: 'Zona del día capturada.',
    de: 'Zone des Tages erobert.',
    pt: 'Zona do dia capturada.',
  },
  /** ÉTAT HONNÊTE : aucune zone réelle ne convient aujourd'hui. */
  dailyZoneNone: {
    fr: 'Pas de zone du jour aujourd’hui.',
    en: 'No zone of the day today.',
    es: 'Hoy no hay zona del día.',
    de: 'Heute keine Zone des Tages.',
    pt: 'Hoje não há zona do dia.',
  },
  dailyZoneNoneDetail: {
    fr: 'Aucun secteur libre ou fragile autour de toi.',
    en: 'No open or expiring sector around you.',
    es: 'Ningún sector libre o a punto de caducar cerca.',
    de: 'Kein freier oder ablaufender Sektor in der Nähe.',
    pt: 'Nenhum setor livre ou a expirar perto de ti.',
  },
  dailyZoneA11y: {
    fr: 'Zone du jour : {zone}. {detail}',
    en: 'Zone of the day: {zone}. {detail}',
    es: 'Zona del día: {zone}. {detail}',
    de: 'Zone des Tages: {zone}. {detail}',
    pt: 'Zona do dia: {zone}. {detail}',
  },

  // ══ Défi 7 jours d'accueil ═════════════════════════════════════════════════
  welcomeKicker: {
    fr: 'PREMIERS PAS',
    en: 'FIRST STEPS',
    es: 'PRIMEROS PASOS',
    de: 'ERSTE SCHRITTE',
    pt: 'PRIMEIROS PASSOS',
  },
  welcomeProgress: {
    fr: '{done} sur {total}',
    en: '{done} of {total}',
    es: '{done} de {total}',
    de: '{done} von {total}',
    pt: '{done} de {total}',
  },
  /** Les 5 paliers, formulés comme des invitations — jamais comme des quotas. */
  welcomeStepRun3k: {
    fr: 'Cours 3 km d’une traite',
    en: 'Run 3 km in one go',
    es: 'Corre 3 km de una vez',
    de: 'Lauf 3 km am Stück',
    pt: 'Corre 3 km de uma vez',
  },
  welcomeStepRun5k: {
    fr: 'Cours 5 km d’une traite',
    en: 'Run 5 km in one go',
    es: 'Corre 5 km de una vez',
    de: 'Lauf 5 km am Stück',
    pt: 'Corre 5 km de uma vez',
  },
  welcomeStepLoop: {
    fr: 'Ferme une boucle',
    en: 'Close a loop',
    es: 'Cierra un bucle',
    de: 'Schließe eine Schleife',
    pt: 'Fecha um circuito',
  },
  welcomeStepCapture: {
    fr: 'Capture ta première zone',
    en: 'Capture your first zone',
    es: 'Captura tu primera zona',
    de: 'Erobere deine erste Zone',
    pt: 'Captura a tua primeira zona',
  },
  welcomeStepShare: {
    fr: 'Partage une course',
    en: 'Share a run',
    es: 'Comparte una carrera',
    de: 'Teile einen Lauf',
    pt: 'Partilha uma corrida',
  },
  /** LA phrase anti-shame. Elle est dite, pas sous-entendue. */
  welcomeNoRush: {
    fr: 'À ton rythme. Rien n’expire, rien ne se perd.',
    en: 'At your own pace. Nothing expires, nothing is lost.',
    es: 'A tu ritmo. Nada caduca, nada se pierde.',
    de: 'In deinem Tempo. Nichts läuft ab, nichts geht verloren.',
    pt: 'Ao teu ritmo. Nada expira, nada se perde.',
  },
  welcomeComplete: {
    fr: 'Premiers pas terminés. Le terrain est à toi.',
    en: 'First steps done. The ground is yours.',
    es: 'Primeros pasos completados. El terreno es tuyo.',
    de: 'Erste Schritte geschafft. Das Gebiet gehört dir.',
    pt: 'Primeiros passos concluídos. O terreno é teu.',
  },
  welcomeA11y: {
    fr: 'Premiers pas, {done} sur {total}. Prochaine étape : {step}. {note}',
    en: 'First steps, {done} of {total}. Next step: {step}. {note}',
    es: 'Primeros pasos, {done} de {total}. Siguiente paso: {step}. {note}',
    de: 'Erste Schritte, {done} von {total}. Nächster Schritt: {step}. {note}',
    pt: 'Primeiros passos, {done} de {total}. Próxima etapa: {step}. {note}',
  },
});
