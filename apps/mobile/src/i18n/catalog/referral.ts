/**
 * GRYD — i18n : catalogue DÉDIÉ au parrainage (`/parrainage`, le bloc social du
 * Profil, l'atterrissage `gryd://r/<code>`).
 *
 * DÉROGATION FONDATEUR DU 11/09/2026 : « offre un boost ou autre au moins pour
 * les deux, il faut faire comme Tesla, il faut qu'un mec qui parraine ait
 * quelque chose à gagner que les autres n'ont pas ». Ces textes ANNONCENT donc
 * une récompense, ce que le cahier §15.2 interdisait. Ils restent tenus par le
 * reste de la constitution, et ça se voit dans ce qu'ils ne disent JAMAIS :
 *
 *  · AUCUN POINT, AUCUN CLASSEMENT. Pas « monte au classement », pas « prends
 *    de l'avance » : les points de territoire, de performance et de défi ne
 *    bougent pas d'un iota, et un texte qui le laisserait croire serait faux.
 *  · AUCUN COMPTE À REBOURS, AUCUNE RELANCE (§4.2, G24). Un filleul qui n'a pas
 *    encore couru n'est pas un retard : c'est un état, il se dit au présent et
 *    sans reproche. On ne met jamais quelqu'un au travail sur le dos d'un tiers.
 *  · AUCUNE PROMESSE AU-DELÀ DU CODE. Le crédit GRYD+ se dit « crédité » et
 *    « démarre à l'ouverture », parce que c'est exactement son état en base
 *    (`referral_gryd_plus_credits_2026.consumed_at is null`). Le message qui
 *    SORT de l'app, lui, ne le mentionne même pas : le destinataire n'a pas
 *    notre note en bas d'écran, et une boutique qui ne vend rien ne se promet
 *    pas à un inconnu.
 *  · AUCUN CHIFFRE INVENTÉ. « 5 par saison » et « 7 jours » viennent de
 *    `game-rules.ts` §3.7 et sont INTERPOLÉS, jamais écrits ici.
 *
 * §A CONTRAIGNANT : libellés courts dans les cinq langues (l'allemand est
 * reformulé concis) pour ne jamais tronquer à 375 px.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ═══════════════════════ En-tête et règle ════════════════════════════════
  titre: {
    fr: 'Mon parrainage',
    en: 'My referrals',
    es: 'Mis invitaciones',
    de: 'Meine Empfehlungen',
    pt: 'Meus convites',
  },
  intro: {
    fr: 'Invite quelqu’un que tu connais. Ton ami et toi recevez chacun des objets que personne ne peut acheter.',
    en: 'Invite someone you know. You both receive items nobody can buy.',
    es: 'Invita a alguien que conozcas. Los dos recibís objetos que nadie puede comprar.',
    de: 'Lade jemanden ein, den du kennst. Ihr bekommt beide Objekte, die niemand kaufen kann.',
    pt: 'Convide alguém que você conhece. Os dois recebem objetos que ninguém pode comprar.',
  },
  regle1: {
    fr: 'Un. Tu partages ton code. Ton ami le saisit dans ses {jours} premiers jours.',
    en: 'One. You share your code. Your friend enters it within their first {jours} days.',
    es: 'Uno. Compartes tu código. Tu amigo lo introduce en sus primeros {jours} días.',
    de: 'Eins. Du teilst deinen Code. Dein Freund gibt ihn in seinen ersten {jours} Tagen ein.',
    pt: 'Um. Você compartilha seu código. Seu amigo digita ele nos primeiros {jours} dias.',
  },
  regle2: {
    fr: 'Deux. Ton ami et toi sortez chacun au moins une fois, et le serveur valide la sortie.',
    en: 'Two. You each go out at least once, and the server validates the activity.',
    es: 'Dos. Cada uno sale al menos una vez y el servidor valida la actividad.',
    de: 'Zwei. Ihr geht beide mindestens einmal raus, der Server bestätigt die Aktivität.',
    pt: 'Dois. Cada um sai pelo menos uma vez e o servidor valida a atividade.',
  },
  regle3: {
    fr: 'Trois. Les deux récompenses arrivent. Elles ne changent aucun classement.',
    en: 'Three. Both rewards arrive. They change no ranking.',
    es: 'Tres. Llegan las dos recompensas. No cambian ninguna clasificación.',
    de: 'Drei. Beide Belohnungen kommen. Sie ändern keine Rangliste.',
    pt: 'Três. As duas recompensas chegam. Não mudam nenhuma classificação.',
  },

  // ═══════════════════════ Le code ═════════════════════════════════════════
  codeTitre: {
    fr: 'Ton code',
    en: 'Your code',
    es: 'Tu código',
    de: 'Dein Code',
    pt: 'Seu código',
  },
  codeAide: {
    fr: 'Il ne change jamais. Un seul code par compte.',
    en: 'It never changes. One code per account.',
    es: 'Nunca cambia. Un solo código por cuenta.',
    de: 'Er ändert sich nie. Ein Code pro Konto.',
    pt: 'Nunca muda. Um código por conta.',
  },
  actionCopier: { fr: 'Copier', en: 'Copy', es: 'Copiar', de: 'Kopieren', pt: 'Copiar' },
  actionCopie: { fr: 'Copié', en: 'Copied', es: 'Copiado', de: 'Kopiert', pt: 'Copiado' },
  actionPartager: { fr: 'Partager', en: 'Share', es: 'Compartir', de: 'Teilen', pt: 'Compartilhar' },
  copieImpossible: {
    fr: 'La copie n’est pas disponible sur cet appareil. Le code reste sélectionnable.',
    en: 'Copying is unavailable on this device. The code stays selectable.',
    es: 'Copiar no está disponible en este dispositivo. El código sigue seleccionable.',
    de: 'Kopieren ist auf diesem Gerät nicht möglich. Der Code bleibt auswählbar.',
    pt: 'Copiar não está disponível neste dispositivo. O código continua selecionável.',
  },
  partageImpossible: {
    fr: 'Le partage n’est pas disponible sur cet appareil.',
    en: 'Sharing is unavailable on this device.',
    es: 'Compartir no está disponible en este dispositivo.',
    de: 'Teilen ist auf diesem Gerät nicht möglich.',
    pt: 'Compartilhar não está disponível neste dispositivo.',
  },
  /**
   * LE MESSAGE QUI SORT DE L'APP. Il porte le code, le lien, et ce que les DEUX
   * gagnent. Il ne mentionne PAS le crédit GRYD+ : il est banqué jusqu'à
   * l'ouverture de la boutique, et promettre une boutique qui ne vend rien à
   * quelqu'un qui n'a même pas l'app serait une promesse au-delà du code.
   */
  partageMessage: {
    fr: 'Rejoins-moi sur GRYD : mes sorties dessinent mon terrain sur la carte. Avec mon code {code}, on gagne tous les deux un cadre, un style de trace et un titre que personne ne peut acheter, dès qu’on aura chacun fait une sortie. {lien}',
    en: 'Join me on GRYD: my activities draw my ground on the map. With my code {code}, we both earn a frame, a trace style and a title nobody can buy, as soon as we have each been out once. {lien}',
    es: 'Únete a mí en GRYD: mis actividades dibujan mi terreno en el mapa. Con mi código {code}, los dos ganamos un marco, un estilo de trazo y un título que nadie puede comprar, en cuanto cada uno salga una vez. {lien}',
    de: 'Komm zu GRYD: Meine Aktivitäten zeichnen mein Gebiet auf der Karte. Mit meinem Code {code} bekommen wir beide einen Rahmen, einen Spurstil und einen Titel, die niemand kaufen kann, sobald jeder einmal draußen war. {lien}',
    pt: 'Venha para o GRYD comigo: minhas atividades desenham meu terreno no mapa. Com meu código {code}, nós dois ganhamos uma moldura, um estilo de traço e um título que ninguém pode comprar, assim que cada um sair uma vez. {lien}',
  },

  // ═══════════════════════ Les quatre états ════════════════════════════════
  etatDeconnecte: {
    fr: 'Un compte relie ton code à tes sorties. Sans lui, personne ne peut te parrainer.',
    en: 'An account links your code to your activities. Without one, nobody can refer you.',
    es: 'Una cuenta une tu código a tus actividades. Sin ella, nadie puede invitarte.',
    de: 'Ein Konto verbindet deinen Code mit deinen Aktivitäten. Ohne Konto kann dich niemand einladen.',
    pt: 'Uma conta liga seu código às suas atividades. Sem ela, ninguém pode convidar você.',
  },
  etatLecture: {
    fr: 'Lecture de ton parrainage.',
    en: 'Reading your referrals.',
    es: 'Leyendo tus invitaciones.',
    de: 'Empfehlungen werden gelesen.',
    pt: 'Lendo seus convites.',
  },
  etatEchec: {
    fr: 'Ton parrainage n’a pas pu être lu. Rien n’est perdu : réessaie.',
    en: 'Your referrals could not be read. Nothing is lost: try again.',
    es: 'No se han podido leer tus invitaciones. No se pierde nada: inténtalo otra vez.',
    de: 'Deine Empfehlungen konnten nicht gelesen werden. Nichts geht verloren: versuch es erneut.',
    pt: 'Não foi possível ler seus convites. Nada se perde: tente de novo.',
  },
  etatIndisponible: {
    fr: 'Aucun serveur n’est configuré sur ce build : le parrainage ne peut pas être lu ici.',
    en: 'No server is configured in this build: referrals cannot be read here.',
    es: 'No hay servidor configurado en esta versión: las invitaciones no se pueden leer aquí.',
    de: 'In diesem Build ist kein Server konfiguriert: Empfehlungen sind hier nicht lesbar.',
    pt: 'Nenhum servidor configurado nesta versão: os convites não podem ser lidos aqui.',
  },
  actionReessayer: { fr: 'Réessayer', en: 'Try again', es: 'Reintentar', de: 'Erneut versuchen', pt: 'Tentar de novo' },

  // ═══════════════════════ Les filleuls ════════════════════════════════════
  sectionFilleuls: {
    fr: 'Tes filleuls',
    en: 'People you referred',
    es: 'A quién has invitado',
    de: 'Wen du eingeladen hast',
    pt: 'Quem você convidou',
  },
  filleulsVide: {
    fr: 'Personne n’a encore saisi ton code.',
    en: 'Nobody has entered your code yet.',
    es: 'Nadie ha introducido tu código todavía.',
    de: 'Noch hat niemand deinen Code eingegeben.',
    pt: 'Ainda ninguém inseriu seu código.',
  },
  etatCodeSaisi: {
    fr: 'Code saisi. Sa première sortie reste à venir.',
    en: 'Code entered. Their first activity is still to come.',
    es: 'Código introducido. Su primera actividad está por llegar.',
    de: 'Code eingegeben. Die erste Aktivität steht noch aus.',
    pt: 'Código inserido. A primeira atividade ainda está para vir.',
  },
  etatMaSortie: {
    fr: 'Il a couru. C’est ta sortie qui manque.',
    en: 'They have been out. Yours is the missing one.',
    es: 'Ya ha salido. Falta tu actividad.',
    de: 'Er war schon draußen. Deine Aktivität fehlt.',
    pt: 'Já saiu. Falta a sua atividade.',
  },
  etatRecompense: {
    fr: 'Récompenses reçues, des deux côtés.',
    en: 'Rewards received, on both sides.',
    es: 'Recompensas recibidas por los dos.',
    de: 'Belohnungen auf beiden Seiten erhalten.',
    pt: 'Recompensas recebidas dos dois lados.',
  },
  etatPlafond: {
    fr: 'Récompense reçue de son côté. Tu avais atteint le plafond de la saison.',
    en: 'Reward received on their side. You had reached this season’s cap.',
    es: 'Recompensa recibida por su parte. Tú habías llegado al tope de la temporada.',
    de: 'Belohnung auf seiner Seite. Du hattest das Saisonlimit erreicht.',
    pt: 'Recompensa recebida do lado dele. Você tinha atingido o limite da temporada.',
  },
  etatExpire: {
    fr: 'Les {jours} jours sont passés avant que chacun ait fait une sortie.',
    en: 'The {jours} days passed before you had both been out.',
    es: 'Los {jours} días pasaron antes de que salierais los dos.',
    de: 'Die {jours} Tage vergingen, bevor ihr beide draußen wart.',
    pt: 'Os {jours} dias passaram antes de saírem os dois.',
  },
  etatRevoque: {
    fr: 'Annulé : la sortie qui l’avait validé a été rejetée.',
    en: 'Cancelled: the activity that validated it was rejected.',
    es: 'Anulado: la actividad que lo validó fue rechazada.',
    de: 'Storniert: die bestätigende Aktivität wurde abgelehnt.',
    pt: 'Anulado: a atividade que o validou foi rejeitada.',
  },
  restantSaison: {
    fr: 'Il te reste {n} parrainages récompensés cette saison.',
    en: '{n} rewarded referrals left this season.',
    es: 'Te quedan {n} invitaciones con recompensa esta temporada.',
    de: 'Noch {n} belohnte Empfehlungen in dieser Saison.',
    pt: 'Restam {n} convites com recompensa nesta temporada.',
  },
  plafondAtteint: {
    fr: 'Tu as atteint les {n} parrainages récompensés de la saison. Tes prochains filleuls recevront quand même leur part.',
    en: 'You have reached this season’s {n} rewarded referrals. The people you refer next still receive their share.',
    es: 'Has llegado a las {n} invitaciones con recompensa de la temporada. Quienes invites después seguirán recibiendo su parte.',
    de: 'Du hast die {n} belohnten Empfehlungen der Saison erreicht. Wen du danach einlädst, bekommt trotzdem seinen Teil.',
    pt: 'Você atingiu os {n} convites com recompensa da temporada. Quem você convidar depois recebe a parte dele mesmo assim.',
  },

  // ═══════════════════════ Mon parrain ═════════════════════════════════════
  sectionParrain: {
    fr: 'Ton parrain',
    en: 'Who referred you',
    es: 'Quién te invitó',
    de: 'Wer dich eingeladen hat',
    pt: 'Quem te convidou',
  },
  parrainSortieAMoi: {
    fr: 'Il a couru. Fais une sortie et les deux récompenses arrivent.',
    en: 'They have been out. Go for one activity and both rewards arrive.',
    es: 'Ya ha salido. Sal una vez y llegan las dos recompensas.',
    de: 'Er war draußen. Geh einmal raus, dann kommen beide Belohnungen.',
    pt: 'Já saiu. Saia uma vez e as duas recompensas chegam.',
  },

  // ═══════════════════════ Les récompenses ═════════════════════════════════
  sectionRecompenses: {
    fr: 'Tes récompenses',
    en: 'Your rewards',
    es: 'Tus recompensas',
    de: 'Deine Belohnungen',
    pt: 'Suas recompensas',
  },
  recompensesVide: {
    fr: 'Rien encore. Elles arrivent quand chacun a fait une sortie.',
    en: 'Nothing yet. They arrive once you have both been out.',
    es: 'Nada todavía. Llegan cuando hayáis salido los dos.',
    de: 'Noch nichts. Sie kommen, wenn ihr beide draußen wart.',
    pt: 'Ainda nada. Chegam quando os dois tiverem saído.',
  },
  objetCadre: {
    fr: 'Cadre Parrainage',
    en: 'Referral frame',
    es: 'Marco de invitación',
    de: 'Empfehlungs-Rahmen',
    pt: 'Moldura de convite',
  },
  objetTrace: {
    fr: 'Trace Parrainage',
    en: 'Referral trace',
    es: 'Trazo de invitación',
    de: 'Empfehlungs-Spur',
    pt: 'Traço de convite',
  },
  objetTitreParrain: { fr: 'Titre Parrain', en: 'Referrer title', es: 'Título Padrino', de: 'Titel Empfehler', pt: 'Título Padrinho' },
  objetTitreFilleul: { fr: 'Titre Filleul', en: 'Referred title', es: 'Título Invitado', de: 'Titel Eingeladener', pt: 'Título Convidado' },
  objetExclusif: {
    fr: 'Introuvable en boutique, jamais donné par un niveau.',
    en: 'Not in the store, never given by a level.',
    es: 'No está en la tienda, nunca lo da un nivel.',
    de: 'Nicht im Shop, nie über ein Level.',
    pt: 'Não está na loja, nunca é dado por um nível.',
  },
  /**
   * Les DEUX TITRES ne sont pas des cosmétiques de profil : aucune des deux
   * maisons de titres du dépôt (saison 0121, niveau 0144) ne sait les porter
   * sans qu'on lui invente une saison ou un palier (migration 0191, note « LES
   * DEUX TITRES »). Ils sont à toi, ils sont écrits ici, et l'écran ne promet
   * PAS un emplacement de profil qui n'existe pas.
   */
  objetTitresIci: {
    fr: 'Les deux titres sont à toi. Aucun emplacement du profil ne sait encore les afficher : ils se lisent ici.',
    en: 'Both titles are yours. No profile slot can show them yet: they are listed here.',
    es: 'Los dos títulos son tuyos. Ningún espacio del perfil puede mostrarlos aún: se leen aquí.',
    de: 'Beide Titel gehören dir. Noch kein Profilplatz kann sie zeigen – sie stehen hier.',
    pt: 'Os dois títulos são seus. Nenhum espaço do perfil sabe exibi-los ainda: eles se leem aqui.',
  },
  /** La porte vers `/arsenal`, segment Personnalisation, où l'objet s'ÉQUIPE. */
  actionCollection: {
    fr: 'Voir dans ma collection',
    en: 'View in my collection',
    es: 'Ver en mi colección',
    de: 'In meiner Sammlung ansehen',
    pt: 'Ver na minha coleção',
  },
  /** Ce que le cadre et la trace font, une fois équipés. Vérifiable, pas vague. */
  objetPorte: {
    fr: 'À équiper dans ta collection. Le cadre se voit sur ton profil, la trace sur ta carte.',
    en: 'Equip it from your collection. The frame shows on your profile, the trace on your map.',
    es: 'Equípalo desde tu colección. El marco se ve en tu perfil, el trazo en tu mapa.',
    de: 'In deiner Sammlung ausrüstbar. Der Rahmen zeigt sich im Profil, die Spur auf deiner Karte.',
    pt: 'Equipe na sua coleção. A moldura aparece no seu perfil, o traço no seu mapa.',
  },
  objetBoost: {
    fr: 'Boost d’XP ×{x}',
    en: 'XP boost ×{x}',
    es: 'Boost de XP ×{x}',
    de: 'XP-Boost ×{x}',
    pt: 'Boost de XP ×{x}',
  },
  boostPortee: {
    fr: 'Sur l’XP de progression seulement. Ni territoire, ni performance, ni défi.',
    en: 'On progression XP only. No territory, no performance, no challenge.',
    es: 'Solo sobre el XP de progreso. Ni territorio, ni rendimiento, ni retos.',
    de: 'Nur auf Fortschritts-XP. Kein Gebiet, keine Leistung, keine Aufgabe.',
    pt: 'Só no XP de progresso. Nem território, nem desempenho, nem desafios.',
  },
  boostActif: {
    fr: 'Actif jusqu’au {date}',
    en: 'Active until {date}',
    es: 'Activo hasta el {date}',
    de: 'Aktiv bis {date}',
    pt: 'Ativo até {date}',
  },
  boostTermine: {
    fr: 'Fenêtre terminée. Les XP gagnées restent acquises.',
    en: 'Window over. The XP earned stays earned.',
    es: 'Ventana terminada. El XP ganado se queda.',
    de: 'Fenster vorbei. Die verdienten XP bleiben.',
    pt: 'Janela terminada. O XP ganho fica.',
  },
  bonusXp: {
    fr: '{n} XP de bonus déjà crédités',
    en: '{n} bonus XP already credited',
    es: '{n} XP de bonus ya acreditados',
    de: '{n} Bonus-XP bereits gutgeschrieben',
    pt: '{n} XP de bônus já creditados',
  },
  objetGrydPlus: {
    fr: '{n} jours de GRYD+',
    en: '{n} days of GRYD+',
    es: '{n} días de GRYD+',
    de: '{n} Tage GRYD+',
    pt: '{n} dias de GRYD+',
  },
  creditBanque: {
    fr: 'Crédités. Ils démarreront le jour où GRYD+ ouvrira.',
    en: 'Credited. They start the day GRYD+ opens.',
    es: 'Acreditados. Empiezan el día que abra GRYD+.',
    de: 'Gutgeschrieben. Sie starten, sobald GRYD+ öffnet.',
    pt: 'Creditados. Começam no dia em que o GRYD+ abrir.',
  },
  creditEnCours: {
    fr: 'En cours jusqu’au {date}',
    en: 'Running until {date}',
    es: 'En curso hasta el {date}',
    de: 'Läuft bis {date}',
    pt: 'Em andamento até {date}',
  },
  creditTermine: {
    fr: 'Terminés.',
    en: 'Finished.',
    es: 'Terminados.',
    de: 'Beendet.',
    pt: 'Terminados.',
  },

  // ═══════════════════════ Saisir un code ══════════════════════════════════
  sectionSaisie: {
    fr: 'Entrer un code de parrainage',
    en: 'Enter a referral code',
    es: 'Introducir un código',
    de: 'Empfehlungscode eingeben',
    pt: 'Inserir um código',
  },
  saisieAide: {
    fr: '{n} caractères, sans les lettres qui se confondent avec des chiffres.',
    en: '{n} characters, without the letters that look like digits.',
    es: '{n} caracteres, sin las letras que se confunden con cifras.',
    de: '{n} Zeichen, ohne die Buchstaben, die wie Ziffern aussehen.',
    pt: '{n} caracteres, sem as letras que se confundem com números.',
  },
  saisiePlaceholder: { fr: 'Code', en: 'Code', es: 'Código', de: 'Code', pt: 'Código' },
  saisieAction: { fr: 'Valider', en: 'Confirm', es: 'Confirmar', de: 'Bestätigen', pt: 'Confirmar' },
  saisieAbsenteDejaParraine: {
    fr: 'Tu as déjà un parrain. Un compte n’en a qu’un, et c’est définitif.',
    en: 'You already have a referrer. An account has only one, for good.',
    es: 'Ya tienes padrino. Una cuenta solo tiene uno, y es definitivo.',
    de: 'Du hast schon einen Empfehler. Ein Konto hat genau einen, endgültig.',
    pt: 'Você já tem padrinho. Uma conta só tem um, e é definitivo.',
  },
  saisieAbsenteCompteTropAncien: {
    fr: 'Un code se saisit dans les {jours} premiers jours d’un compte. Le tien en a {age}.',
    en: 'A code is entered within an account’s first {jours} days. Yours is {age} days old.',
    es: 'Un código se introduce en los primeros {jours} días de una cuenta. La tuya tiene {age}.',
    de: 'Ein Code wird in den ersten {jours} Tagen eines Kontos eingegeben. Deines ist {age} Tage alt.',
    pt: 'Um código é digitado nos primeiros {jours} dias de uma conta. A sua tem {age}.',
  },
  refusBadCode: {
    fr: 'Ce code n’a pas la bonne forme.',
    en: 'That code has the wrong shape.',
    es: 'Ese código no tiene la forma correcta.',
    de: 'Dieser Code hat nicht die richtige Form.',
    pt: 'Esse código não tem a forma certa.',
  },
  refusUnknownCode: {
    fr: 'Aucun compte ne porte ce code.',
    en: 'No account carries that code.',
    es: 'Ninguna cuenta tiene ese código.',
    de: 'Kein Konto trägt diesen Code.',
    pt: 'Nenhuma conta tem esse código.',
  },
  refusSelfReferral: {
    fr: 'C’est ton propre code.',
    en: 'That is your own code.',
    es: 'Ese es tu propio código.',
    de: 'Das ist dein eigener Code.',
    pt: 'Esse é o seu próprio código.',
  },
  refusAlreadyReferred: {
    fr: 'Tu as déjà un parrain.',
    en: 'You already have a referrer.',
    es: 'Ya tienes padrino.',
    de: 'Du hast schon einen Empfehler.',
    pt: 'Você já tem padrinho.',
  },
  refusReciprocity: {
    fr: 'Tu as déjà parrainé cette personne. Le parrainage va dans un seul sens.',
    en: 'You already referred that person. Referral goes one way only.',
    es: 'Ya has invitado a esa persona. La invitación va en un solo sentido.',
    de: 'Du hast diese Person schon eingeladen. Empfehlung geht nur in eine Richtung.',
    pt: 'Você já convidou essa pessoa. O convite vai em um só sentido.',
  },
  refusAccountTooOld: {
    fr: 'Ton compte a plus de {jours} jours.',
    en: 'Your account is older than {jours} days.',
    es: 'Tu cuenta tiene más de {jours} días.',
    de: 'Dein Konto ist älter als {jours} Tage.',
    pt: 'Sua conta tem mais de {jours} dias.',
  },
  refusReseau: {
    fr: 'Le serveur n’a pas répondu. Ton code n’a pas été saisi.',
    en: 'The server did not answer. Your code was not entered.',
    es: 'El servidor no ha respondido. Tu código no se ha introducido.',
    de: 'Der Server hat nicht geantwortet. Dein Code wurde nicht eingegeben.',
    pt: 'O servidor não respondeu. Seu código não foi inserido.',
  },
  saisieReussie: {
    fr: 'Code accepté. Fais une sortie, et les deux récompenses arrivent.',
    en: 'Code accepted. Go for one activity, and both rewards arrive.',
    es: 'Código aceptado. Sal una vez y llegan las dos recompensas.',
    de: 'Code akzeptiert. Geh einmal raus, dann kommen beide Belohnungen.',
    pt: 'Código aceito. Saia uma vez e as duas recompensas chegam.',
  },

  // ═══════════════════════ La prochaine étape ══════════════════════════════
  etapePartage: {
    fr: 'Prochaine étape : partager ton code.',
    en: 'Next step: share your code.',
    es: 'Siguiente paso: comparte tu código.',
    de: 'Nächster Schritt: teile deinen Code.',
    pt: 'Próximo passo: compartilhe seu código.',
  },
  etapeCourir: {
    fr: 'Prochaine étape : faire une sortie.',
    en: 'Next step: go for one activity.',
    es: 'Siguiente paso: sal una vez.',
    de: 'Nächster Schritt: einmal rausgehen.',
    pt: 'Próximo passo: saia uma vez.',
  },
  etapeAttendre: {
    fr: 'Rien à faire de ton côté.',
    en: 'Nothing to do on your side.',
    es: 'Nada que hacer por tu parte.',
    de: 'Auf deiner Seite ist nichts zu tun.',
    pt: 'Nada a fazer do seu lado.',
  },
  etapeFini: {
    fr: 'Tout est réglé.',
    en: 'All settled.',
    es: 'Todo listo.',
    de: 'Alles erledigt.',
    pt: 'Tudo resolvido.',
  },

  // ═══════════════════════ Atterrissage `gryd://r/<code>` ══════════════════
  lienTitre: {
    fr: 'Invitation',
    en: 'Invitation',
    es: 'Invitación',
    de: 'Einladung',
    pt: 'Convite',
  },
  lienCorpsConnecte: {
    fr: 'Quelqu’un t’invite sur GRYD avec ce code. On l’applique à ton compte.',
    en: 'Someone is inviting you to GRYD with this code. We are applying it to your account.',
    es: 'Alguien te invita a GRYD con este código. Lo aplicamos a tu cuenta.',
    de: 'Jemand lädt dich mit diesem Code zu GRYD ein. Wir wenden ihn auf dein Konto an.',
    pt: 'Alguém está convidando você para o GRYD com este código. Estamos aplicando na sua conta.',
  },
  lienCorpsInvite: {
    fr: 'Crée ton compte : le code sera appliqué tout seul, et les deux récompenses suivront les premières sorties de chacun.',
    en: 'Create your account: the code applies by itself, and both rewards follow your first activities.',
    es: 'Crea tu cuenta: el código se aplica solo y las dos recompensas siguen a vuestras primeras salidas.',
    de: 'Erstelle dein Konto: der Code wird von selbst angewendet, beide Belohnungen folgen euren ersten Aktivitäten.',
    pt: 'Crie sua conta: o código é aplicado sozinho e as duas recompensas vêm depois das primeiras saídas de cada um.',
  },
  lienCodeIllisible: {
    fr: 'Ce lien ne porte pas un code valide. Tu peux toujours saisir le code à la main.',
    en: 'This link does not carry a valid code. You can still enter the code by hand.',
    es: 'Este enlace no lleva un código válido. Puedes introducirlo a mano.',
    de: 'Dieser Link enthält keinen gültigen Code. Du kannst ihn von Hand eingeben.',
    pt: 'Este link não traz um código válido. Você pode digitar o código à mão.',
  },
  lienAllerAuParrainage: {
    fr: 'Voir mon parrainage',
    en: 'See my referrals',
    es: 'Ver mis invitaciones',
    de: 'Meine Empfehlungen ansehen',
    pt: 'Ver meus convites',
  },

  // ═══════════════════════ Bloc social du Profil ═══════════════════════════
  profilLigne: {
    fr: 'Mon parrainage',
    en: 'My referrals',
    es: 'Mis invitaciones',
    de: 'Meine Empfehlungen',
    pt: 'Meus convites',
  },
  profilInviterAide: {
    fr: 'Ton ami et toi gagnez chacun un cadre, une trace et un titre introuvables ailleurs.',
    en: 'Your friend and you each earn a frame, a trace and a title found nowhere else.',
    es: 'Tu amigo y tú ganáis cada uno un marco, un trazo y un título que no están en ningún otro sitio.',
    de: 'Dein Freund und du bekommt je einen Rahmen, eine Spur und einen Titel, die es sonst nirgends gibt.',
    pt: 'Você e seu amigo ganham cada um uma moldura, um traço e um título que não existem em outro lugar.',
  },
});
