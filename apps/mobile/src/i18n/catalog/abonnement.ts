/**
 * GRYD — i18n : catalogue de l'écran E75 « Gestion d'abonnement et achats »
 * (spec produit UI/UX, l.2305). Créé le 28/07/2026.
 *
 * ─── POURQUOI UN CATALOGUE POUR UN ÉCRAN QUI N'EXISTE PAS ENCORE ────────────
 * E75 n'a AUCUNE route au 28/07/2026 — et `app/premium.tsx` le dit lui-même
 * dans son docblock (« L'écran E75 n'existe pas encore : on ne peint donc pas
 * d'écran de gestion »). Ses textes vivent donc ici, prêts et relus, plutôt
 * que d'être improvisés en français au moment du rendu : c'est exactement le
 * protocole suivi par `rang.ts` pour E60. Un catalogue n'affirme rien à
 * l'utilisateur tant qu'aucun écran ne le rend — il n'y a donc pas de promesse
 * au-delà du code ici, seulement de la copie en attente de sa surface.
 *
 * ─── AUCUN PRIX, AUCUN MONTANT, AUCUNE DEVISE (constitution §9) ─────────────
 * Pas un « 4,99 € » dans ce fichier. Les montants viennent du Store, déjà
 * localisés et formatés par lui (devise, TVA, palier régional) ; les gabarits
 * ci-dessous n'ont que des trous `{date}`. Un écran de GESTION n'a de toute
 * façon aucun prix à afficher : il montre un droit, pas une offre.
 *
 * ─── CE QUE CE CATALOGUE REFUSE DE PROMETTRE ───────────────────────────────
 * La spec liste « historique minimal ». GRYD N'EN A PAS, et `historyUnavailable`
 * le DIT au lieu de le combler. Preuve : `features/premium/entitlement.ts` ne
 * lit de `CustomerInfo` que `entitlements` et `managementURL` — ni
 * `allPurchaseDates`, ni `nonSubscriptionTransactions`. Fabriquer une ligne
 * d'historique à partir de la seule date d'échéance inventerait une transaction.
 * L'historique reviendra AVEC sa lecture, pas avant.
 * De même `manageUnavailable` : quand le SDK ne fournit pas de `managementURL`,
 * il n'y a pas de bouton — un CTA qui échoue toujours serait un bouton mort.
 *
 * ─── LES ÉTATS, JAMAIS CONFONDUS ───────────────────────────────────────────
 * Trois états NON NOMINAUX obligatoires — `loading` (on n'affirme rien tant
 * qu'on ne sait pas), `signedOut*` (le droit vit sur un compte), `failed*` (on
 * ne sait pas ⇒ on le dit) — plus deux états de LECTURE ABOUTIE qu'il serait
 * fautif de fondre : `none*` (ce compte n'a jamais rien acheté) et
 * `unavailable*` (la plateforme n'a aucun accès au Store — web, configuration
 * absente). « Rien acheté » est un fait sur le JOUEUR ; « pas d'accès au
 * Store » est un fait sur GRYD.
 * Le statut d'abonnement lui-même (`statusActive`, `statusTrial`,
 * `statusLifetime`, `statusCancelled`, `statusExpired`) est le miroir exact de
 * `ProStatus` — aucun libellé n'existe ici sans une branche qui le produise.
 *
 * ─── ANTI PAY-TO-WIN (§1.6) ────────────────────────────────────────────────
 * `antiP2wNote` n'est pas un argument marketing : c'est la règle
 * constitutionnelle rendue visible à l'endroit où l'on résilie. Elle répond à
 * la seule peur qui compte sur cet écran — « si j'arrête, est-ce que je perds
 * mon territoire ? ». La réponse est non, et elle est vraie par construction.
 *
 * INVARIANTS jamais traduits : GRYD, GRYD Premium, Store, Apple, Google.
 * §A CONTRAIGNANT : libellés d'action COURTS dans les 5 langues (allemand
 * concis) — jamais un composé qui tronquerait à 375 px ; un seul CTA chartreuse.
 * Le français TUTOIE (registre.test.ts). Le portugais est BRÉSILIEN (« você »,
 * « Gerenciar », « configurações » — jamais « teu/tua/tens/podes », « gerir »,
 * « definições »).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Chrome ─────────────────────────────────────────────────────────────────
  kicker: {
    fr: 'PROFIL · ABONNEMENT',
    en: 'PROFILE · SUBSCRIPTION',
    es: 'PERFIL · SUSCRIPCIÓN',
    de: 'PROFIL · ABO',
    pt: 'PERFIL · ASSINATURA',
  },
  title: {
    fr: 'Abonnement et achats',
    en: 'Subscription and purchases',
    es: 'Suscripción y compras',
    de: 'Abo und Käufe',
    pt: 'Assinatura e compras',
  },
  /**
   * Sous-titre de la LIGNE DE RÉGLAGES qui mène ici (`features/settings/sections.ts`).
   * Ajouté le 28/07/2026 avec la porte de cet écran : jusque-là E75 n'était
   * atteignable QUE depuis E74 `/premium`, lui-même atteignable seulement
   * depuis `/arsenal` (masqué hors MVP) ou depuis la branche `locked` de
   * `/premium-analytics` — branche qui DISPARAÎT dès que le joueur est abonné.
   * L'écran fait pour les abonnés était donc fermé aux abonnés.
   */
  rowDetail: {
    fr: 'Statut, échéance, restauration',
    en: 'Status, renewal, restore',
    es: 'Estado, vencimiento, restauración',
    de: 'Status, Fälligkeit, Wiederherstellung',
    pt: 'Status, vencimento, restauração',
  },
  a11yBack: {
    fr: 'Retour au profil',
    en: 'Back to profile',
    es: 'Volver al perfil',
    de: 'Zurück zum Profil',
    pt: 'Voltar ao perfil',
  },

  // ── Statut — miroir EXACT de `ProStatus` (features/premium/entitlement.ts) ──
  statusLabel: {
    fr: 'STATUT',
    en: 'STATUS',
    es: 'ESTADO',
    de: 'STATUS',
    pt: 'STATUS',
  },
  statusActive: {
    fr: 'GRYD Premium actif',
    en: 'GRYD Premium active',
    es: 'GRYD Premium activo',
    de: 'GRYD Premium aktiv',
    pt: 'GRYD Premium ativo',
  },
  statusTrial: {
    fr: 'Essai gratuit en cours',
    en: 'Free trial running',
    es: 'Prueba gratuita en curso',
    de: 'Gratis-Testphase läuft',
    pt: 'Teste grátis em andamento',
  },
  statusLifetime: {
    fr: 'Accès à vie',
    en: 'Lifetime access',
    es: 'Acceso de por vida',
    de: 'Lebenslanger Zugang',
    pt: 'Acesso vitalício',
  },
  /** `willRenew === false` : encore actif, mais il s'arrêtera à l'échéance. */
  statusCancelled: {
    fr: 'Actif jusqu’à l’échéance',
    en: 'Active until it ends',
    es: 'Activo hasta el vencimiento',
    de: 'Aktiv bis zum Ablauf',
    pt: 'Ativo até o vencimento',
  },
  statusExpired: {
    fr: 'Abonnement terminé',
    en: 'Subscription ended',
    es: 'Suscripción finalizada',
    de: 'Abo beendet',
    pt: 'Assinatura encerrada',
  },

  // ── Échéance — une DATE RÉELLE ou un aveu, jamais une estimation ───────────
  renewsOn: {
    fr: 'Se renouvelle le {date}.',
    en: 'Renews on {date}.',
    es: 'Se renueva el {date}.',
    de: 'Verlängert sich am {date}.',
    pt: 'Renova em {date}.',
  },
  endsOn: {
    fr: 'Se termine le {date}. Aucun nouveau prélèvement.',
    en: 'Ends on {date}. No further charge.',
    es: 'Termina el {date}. Sin nuevos cargos.',
    de: 'Endet am {date}. Keine weitere Abbuchung.',
    pt: 'Termina em {date}. Sem nova cobrança.',
  },
  trialEndsOn: {
    fr: 'L’essai se termine le {date}. Le premier prélèvement a lieu ce jour-là.',
    en: 'The trial ends on {date}. The first charge happens that day.',
    es: 'La prueba termina el {date}. El primer cargo se hace ese día.',
    de: 'Die Testphase endet am {date}. Die erste Abbuchung erfolgt an diesem Tag.',
    pt: 'O teste termina em {date}. A primeira cobrança acontece nesse dia.',
  },
  expiredOn: {
    fr: 'Terminé le {date}.',
    en: 'Ended on {date}.',
    es: 'Finalizada el {date}.',
    de: 'Beendet am {date}.',
    pt: 'Encerrada em {date}.',
  },
  noExpiry: {
    fr: 'Aucune échéance : c’est un achat unique.',
    en: 'No expiry date: this is a one-time purchase.',
    es: 'Sin vencimiento: es una compra única.',
    de: 'Kein Ablaufdatum: einmaliger Kauf.',
    pt: 'Sem vencimento: é uma compra única.',
  },
  /** Le SDK n'a pas donné de date : on ne date jamais au hasard. */
  dateUnknown: {
    fr: 'Le Store n’a pas donné de date. GRYD n’en invente pas.',
    en: 'The Store gave no date. GRYD doesn’t invent one.',
    es: 'La tienda no dio ninguna fecha. GRYD no se la inventa.',
    de: 'Der Store nannte kein Datum. GRYD erfindet keins.',
    pt: 'A loja não informou a data. O GRYD não inventa uma.',
  },

  // ── Gérer dans le Store ───────────────────────────────────────────────────
  manageLabel: {
    fr: 'GÉRER',
    en: 'MANAGE',
    es: 'GESTIONAR',
    de: 'VERWALTEN',
    pt: 'GERENCIAR',
  },
  ctaManage: {
    fr: 'Gérer dans le Store',
    en: 'Manage in the Store',
    es: 'Gestionar en la tienda',
    de: 'Im Store verwalten',
    pt: 'Gerenciar na loja',
  },
  manageNote: {
    fr: 'La résiliation et le changement de formule se font dans ton Store — GRYD ne peut pas le faire à ta place.',
    en: 'Cancelling or switching plans happens in your Store — GRYD can’t do it for you.',
    es: 'La cancelación y el cambio de plan se hacen en tu tienda: GRYD no puede hacerlo por ti.',
    de: 'Kündigung und Tarifwechsel laufen über deinen Store — GRYD kann das nicht für dich tun.',
    pt: 'O cancelamento e a troca de plano acontecem na sua loja — o GRYD não pode fazer isso por você.',
  },
  /** Aucune `managementURL` : PAS de bouton, une phrase qui indique la sortie réelle. */
  manageUnavailable: {
    fr: 'Le Store n’a fourni aucun lien de gestion pour ce compte. Passe par les réglages d’abonnement de ton appareil.',
    en: 'The Store gave no management link for this account. Use your device’s subscription settings.',
    es: 'La tienda no dio ningún enlace de gestión para esta cuenta. Usa los ajustes de suscripción de tu dispositivo.',
    de: 'Der Store lieferte keinen Verwaltungslink für dieses Konto. Nutze die Abo-Einstellungen deines Geräts.',
    pt: 'A loja não forneceu link de gerenciamento para esta conta. Use as configurações de assinatura do seu aparelho.',
  },

  // ── Restaurer ─────────────────────────────────────────────────────────────
  restoreLabel: {
    fr: 'ACHATS',
    en: 'PURCHASES',
    es: 'COMPRAS',
    de: 'KÄUFE',
    pt: 'COMPRAS',
  },
  ctaRestore: {
    fr: 'Restaurer mes achats',
    en: 'Restore purchases',
    es: 'Restaurar compras',
    de: 'Käufe wiederherstellen',
    pt: 'Restaurar compras',
  },
  restoreNote: {
    fr: 'Nouvel appareil ou réinstallation : la restauration récupère ce que tu as déjà payé.',
    en: 'New device or fresh install: restoring brings back what you already paid for.',
    es: 'Dispositivo nuevo o reinstalación: la restauración recupera lo que ya pagaste.',
    de: 'Neues Gerät oder Neuinstallation: Die Wiederherstellung holt zurück, was du schon bezahlt hast.',
    pt: 'Aparelho novo ou reinstalação: a restauração recupera o que você já pagou.',
  },
  restoreOk: {
    fr: 'Achats restaurés.',
    en: 'Purchases restored.',
    es: 'Compras restauradas.',
    de: 'Käufe wiederhergestellt.',
    pt: 'Compras restauradas.',
  },
  restoreNone: {
    fr: 'Aucun achat à restaurer sur ce compte Store.',
    en: 'No purchase to restore on this Store account.',
    es: 'No hay compras que restaurar en esta cuenta de la tienda.',
    de: 'Auf diesem Store-Konto gibt es nichts wiederherzustellen.',
    pt: 'Nenhuma compra para restaurar nesta conta da loja.',
  },
  restoreFailed: {
    fr: 'La restauration n’a pas abouti. Rien n’a changé sur ton compte.',
    en: 'Restore didn’t go through. Nothing changed on your account.',
    es: 'La restauración no se completó. Nada cambió en tu cuenta.',
    de: 'Die Wiederherstellung schlug fehl. An deinem Konto hat sich nichts geändert.',
    pt: 'A restauração não foi concluída. Nada mudou na sua conta.',
  },

  // ── Historique — CE QUE GRYD NE SAIT PAS FAIRE, ET LE DIT ─────────────────
  historyLabel: {
    fr: 'HISTORIQUE',
    en: 'HISTORY',
    es: 'HISTORIAL',
    de: 'VERLAUF',
    pt: 'HISTÓRICO',
  },
  /**
   * Le SDK n'a pas fourni `allPurchaseDatesByProduct` du tout. Ce n'est pas
   * « aucun achat » : c'est « on ne peut pas savoir ». La phrase indique alors
   * le seul endroit qui détient l'information.
   */
  historyUnavailable: {
    fr: 'GRYD ne lit pas ton historique d’achats : seul le Store le détient. Tu le retrouves dans ton compte Apple ou Google.',
    en: 'GRYD doesn’t read your purchase history: only the Store holds it. You’ll find it in your Apple or Google account.',
    es: 'GRYD no lee tu historial de compras: solo lo tiene la tienda. Lo encuentras en tu cuenta de Apple o Google.',
    de: 'GRYD liest deinen Kaufverlauf nicht: Nur der Store hat ihn. Du findest ihn in deinem Apple- oder Google-Konto.',
    pt: 'O GRYD não lê seu histórico de compras: só a loja tem. Você o encontra na sua conta Apple ou Google.',
  },
  /**
   * ── AJOUTÉ LE 28/07/2026 AVEC LA LECTURE RÉELLE ──────────────────────────
   * `entitlement.ts` lit désormais `allPurchaseDatesByProduct`, et
   * `purchaseHistory.ts` en tire des lignes (produit + date). L'historique
   * n'est donc plus « indisponible » par construction : les quatre clés
   * ci-dessous servent le cas où il EST lisible. `historyUnavailable` reste
   * pour le cas — réel — où le SDK ne fournit pas le champ.
   */
  historyEmpty: {
    fr: 'Aucun achat enregistré sur ce compte Store.',
    en: 'No purchase recorded on this Store account.',
    es: 'Ninguna compra registrada en esta cuenta de la tienda.',
    de: 'Kein Kauf auf diesem Store-Konto erfasst.',
    pt: 'Nenhuma compra registrada nesta conta da loja.',
  },
  /** Une ligne : le produit, puis la date. Rien d'autre n'est connu. */
  historyRow: {
    fr: '{product} · {date}',
    en: '{product} · {date}',
    es: '{product} · {date}',
    de: '{product} · {date}',
    pt: '{product} · {date}',
  },
  historyTruncated: {
    fr: 'Seuls les achats les plus récents sont listés. Le détail complet vit dans ton Store.',
    en: 'Only the most recent purchases are listed. The full detail lives in your Store.',
    es: 'Solo se listan las compras más recientes. El detalle completo está en tu tienda.',
    de: 'Es werden nur die neuesten Käufe gelistet. Alle Details stehen in deinem Store.',
    pt: 'Só as compras mais recentes aparecem. O detalhe completo está na sua loja.',
  },
  /** Pourquoi il n'y a pas de montant : GRYD ne l'a pas, il ne l'invente pas. */
  historyNoAmount: {
    fr: 'Les montants ne sont pas affichés : le Store ne les transmet pas à GRYD.',
    en: 'Amounts aren’t shown: the Store doesn’t pass them to GRYD.',
    es: 'Los importes no se muestran: la tienda no se los pasa a GRYD.',
    de: 'Beträge werden nicht gezeigt: Der Store gibt sie nicht an GRYD weiter.',
    pt: 'Os valores não aparecem: a loja não os envia ao GRYD.',
  },

  // ── Support ───────────────────────────────────────────────────────────────
  supportLabel: {
    fr: 'AIDE',
    en: 'HELP',
    es: 'AYUDA',
    de: 'HILFE',
    pt: 'AJUDA',
  },
  ctaSupport: {
    fr: 'Contacter le support',
    en: 'Contact support',
    es: 'Contactar con soporte',
    de: 'Support kontaktieren',
    pt: 'Falar com o suporte',
  },
  supportNote: {
    fr: 'Un remboursement se demande au Store, jamais à GRYD : c’est lui qui a encaissé.',
    en: 'Refunds are requested from the Store, never from GRYD: it took the payment.',
    es: 'Los reembolsos se piden a la tienda, nunca a GRYD: es quien cobró.',
    de: 'Rückerstattungen fordert man beim Store an, nie bei GRYD: Er hat kassiert.',
    pt: 'O reembolso se pede à loja, nunca ao GRYD: foi ela que recebeu.',
  },

  // ── Les états NON NOMINAUX, jamais confondus ──────────────────────────────
  loading: {
    fr: 'Lecture de ton abonnement…',
    en: 'Reading your subscription…',
    es: 'Leyendo tu suscripción…',
    de: 'Dein Abo wird gelesen…',
    pt: 'Lendo sua assinatura…',
  },
  signedOutTitle: {
    fr: 'Un abonnement s’attache à un compte',
    en: 'A subscription belongs to an account',
    es: 'Una suscripción va ligada a una cuenta',
    de: 'Ein Abo gehört zu einem Konto',
    pt: 'Uma assinatura pertence a uma conta',
  },
  signedOutBody: {
    fr: 'Connecte-toi pour voir ce que tu as acheté et le gérer.',
    en: 'Sign in to see what you bought and manage it.',
    es: 'Inicia sesión para ver lo que compraste y gestionarlo.',
    de: 'Melde dich an, um deine Käufe zu sehen und zu verwalten.',
    pt: 'Entre para ver o que você comprou e gerenciar.',
  },
  ctaSignIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  /** LECTURE ABOUTIE, rien acheté — un fait sur le JOUEUR. */
  noneTitle: {
    fr: 'Aucun achat sur ce compte',
    en: 'No purchase on this account',
    es: 'Ninguna compra en esta cuenta',
    de: 'Keine Käufe auf diesem Konto',
    pt: 'Nenhuma compra nesta conta',
  },
  noneBody: {
    fr: 'La lecture a abouti : rien n’a jamais été acheté ici. Si tu as payé sur un autre appareil, restaure tes achats.',
    en: 'The read went through: nothing was ever bought here. If you paid on another device, restore your purchases.',
    es: 'La lectura funcionó: aquí nunca se compró nada. Si pagaste en otro dispositivo, restaura tus compras.',
    de: 'Die Abfrage lief durch: Hier wurde nie etwas gekauft. Falls du auf einem anderen Gerät bezahlt hast, stelle deine Käufe wieder her.',
    pt: 'A leitura funcionou: nada foi comprado aqui. Se você pagou em outro aparelho, restaure suas compras.',
  },
  failedTitle: {
    fr: 'Impossible de lire ton abonnement',
    en: 'Couldn’t read your subscription',
    es: 'No se pudo leer tu suscripción',
    de: 'Dein Abo ließ sich nicht lesen',
    pt: 'Não foi possível ler sua assinatura',
  },
  failedBody: {
    fr: 'On ne sait pas où en est ton abonnement — ce n’est pas la même chose que ne pas en avoir. Rien n’a été modifié.',
    en: 'We don’t know where your subscription stands — that isn’t the same as not having one. Nothing was changed.',
    es: 'No sabemos en qué punto está tu suscripción, y eso no es lo mismo que no tenerla. No se cambió nada.',
    de: 'Wir wissen nicht, wie es um dein Abo steht — das ist nicht dasselbe wie keines zu haben. Es wurde nichts geändert.',
    pt: 'Não sabemos como está sua assinatura — isso não é o mesmo que não ter uma. Nada foi alterado.',
  },
  ctaRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  /** AUCUN accès Store possible (web, configuration absente) — un fait sur GRYD. */
  unavailableTitle: {
    fr: 'Les achats ne sont pas disponibles ici',
    en: 'Purchases aren’t available here',
    es: 'Las compras no están disponibles aquí',
    de: 'Käufe sind hier nicht verfügbar',
    pt: 'As compras não estão disponíveis aqui',
  },
  unavailableBody: {
    fr: 'Cette version de GRYD n’a aucun accès au Store. Ouvre l’app sur ton téléphone pour gérer ton abonnement.',
    en: 'This build of GRYD has no Store access. Open the app on your phone to manage your subscription.',
    es: 'Esta versión de GRYD no tiene acceso a la tienda. Abre la app en tu teléfono para gestionar tu suscripción.',
    de: 'Diese GRYD-Version hat keinen Store-Zugang. Öffne die App auf deinem Handy, um dein Abo zu verwalten.',
    pt: 'Esta versão do GRYD não tem acesso à loja. Abra o app no seu celular para gerenciar sua assinatura.',
  },

  // ── La règle constitutionnelle, à l'endroit où l'on résilie ───────────────
  antiP2wNote: {
    fr: 'Premium ne donne ni territoire, ni points, ni protection. Résilier ne t’enlève aucun terrain.',
    en: 'Premium grants no territory, no points, no protection. Cancelling takes no ground away from you.',
    es: 'Premium no da territorio, ni puntos, ni protección. Cancelar no te quita ningún terreno.',
    de: 'Premium gibt weder Gebiet noch Punkte noch Schutz. Kündigen nimmt dir kein Land weg.',
    pt: 'O Premium não dá território, nem pontos, nem proteção. Cancelar não tira nenhum terreno de você.',
  },
  ctaSeePremium: {
    fr: 'Voir GRYD Premium',
    en: 'See GRYD Premium',
    es: 'Ver GRYD Premium',
    de: 'GRYD Premium ansehen',
    pt: 'Ver o GRYD Premium',
  },
});
