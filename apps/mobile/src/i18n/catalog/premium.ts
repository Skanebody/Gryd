/**
 * GRYD — i18n : catalogue de l'écran E74 « GRYD Premium » (route `/premium`).
 *
 * ── CE CATALOGUE NE CONTIENT AUCUN PRIX, ET C'EST LE POINT ─────────────────
 * Pas un seul « 39,99 € » ni « 4,99 € » ici : les montants viennent des
 * OFFERINGS RevenueCat (`product.priceString`), déjà localisés et formatés par
 * le Store du joueur (devise, TVA, palier régional). Les gabarits ci-dessous
 * n'ont donc que des trous `{price}` — ce qui rend structurellement impossible
 * d'expédier un prix inventé. La spec E74 est explicite : ces valeurs sont de la
 * CONFIGURATION, jamais du code.
 *
 * ── LES BÉNÉFICES DISENT CE QUI EXISTE LE 27/07/2026, PAS LA MAQUETTE ──────
 * Le catalogue Arsenal annonce pour le Club « stats avancées + heatmap »,
 * « historique complet + export HD » et « templates premium mensuels ». Rien de
 * cela n'est branché dans l'app : `is_club` est LU (`features/arsenal/inventory.ts`,
 * `features/social/economy.ts`) et AFFICHÉ (`app/arsenal.tsx`), mais AUCUN écran
 * ne conditionne une stat, un export ou un template à cette valeur. Vendre ces
 * trois lignes sur un écran de paiement serait exactement la faute que CLAUDE.md
 * interdit — promettre au-delà du code, avec un débit à la clé.
 * On n'annonce donc que ce qui est démontrable aujourd'hui (le statut Club
 * visible, et le modèle sans pay-to-win), et `honestyNote` DIT ce qui n'est pas
 * encore là. Le jour où une capacité premium est réellement branchée, elle
 * rejoint les bénéfices — pas avant.
 *
 * ── ANTI PAY-TO-WIN (§1.6) ─────────────────────────────────────────────────
 * `antiP2wNote` n'est pas un argument marketing : c'est la règle
 * constitutionnelle rendue visible à l'endroit où l'on paie.
 *
 * §A CONTRAIGNANT : libellés d'action COURTS dans les 5 langues (jamais un
 * composé qui tronquerait à 375 px), un seul CTA chartreuse par écran.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── En-tête ────────────────────────────────────────────────────────────────
  title: {
    fr: 'GRYD Premium',
    en: 'GRYD Premium',
    es: 'GRYD Premium',
    de: 'GRYD Premium',
    pt: 'GRYD Premium',
  },
  kicker: {
    fr: 'ABONNEMENT',
    en: 'SUBSCRIPTION',
    es: 'SUSCRIPCIÓN',
    de: 'ABO',
    pt: 'ASSINATURA',
  },
  promise: {
    fr: 'Comprends ton territoire. Jamais un avantage de capture.',
    en: 'Understand your territory. Never a capture advantage.',
    es: 'Entiende tu territorio. Nunca una ventaja de captura.',
    de: 'Versteh dein Gebiet. Niemals ein Eroberungsvorteil.',
    pt: 'Entenda seu território. Nunca uma vantagem de captura.',
  },

  // ── Bénéfices (3 MAXIMUM, E74) — uniquement ce qui existe ─────────────────
  benefitsLabel: {
    fr: 'CE QUE ÇA APPORTE',
    en: 'WHAT YOU GET',
    es: 'LO QUE APORTA',
    de: 'WAS DU BEKOMMST',
    pt: 'O QUE TRAZ',
  },
  benefitStatus: {
    fr: 'Ton statut Club, visible dans l’Arsenal.',
    en: 'Your Club status, visible in the Arsenal.',
    es: 'Tu estatus Club, visible en el Arsenal.',
    de: 'Dein Club-Status, sichtbar im Arsenal.',
    pt: 'Seu estatuto Club, visível no Arsenal.',
  },
  benefitSupport: {
    fr: 'Tu soutiens un jeu où rien de décisif ne s’achète.',
    en: 'You back a game where nothing decisive is for sale.',
    es: 'Apoyas un juego donde nada decisivo se compra.',
    de: 'Du unterstützt ein Spiel, in dem nichts Entscheidendes käuflich ist.',
    pt: 'Apoias um jogo onde nada de decisivo se compra.',
  },
  /** Ce qui N'EST PAS encore là. Dit avant de payer, pas après. */
  honestyNote: {
    fr: 'Les stats avancées, l’export HD et les templates mensuels annoncés dans l’Arsenal ne sont pas encore dans l’app : ils ne sont pas vendus ici tant qu’ils n’existent pas.',
    en: 'The advanced stats, HD export and monthly templates announced in the Arsenal aren’t in the app yet: they aren’t sold here until they exist.',
    es: 'Las estadísticas avanzadas, la exportación HD y los templates mensuales anunciados en el Arsenal aún no están en la app: no se venden aquí mientras no existan.',
    de: 'Die im Arsenal angekündigten erweiterten Statistiken, der HD-Export und die monatlichen Templates sind noch nicht in der App: Sie werden hier nicht verkauft, solange es sie nicht gibt.',
    pt: 'As estatísticas avançadas, a exportação HD e os templates mensais anunciados no Arsenal ainda não estão na app: não são vendidos aqui enquanto não existirem.',
  },
  antiP2wNote: {
    fr: 'Premium ne change RIEN au jeu : ni capture, ni défense, ni points, ni classement.',
    en: 'Premium changes NOTHING in the game: no capture, no defense, no points, no ranking.',
    es: 'Premium no cambia NADA en el juego: ni captura, ni defensa, ni puntos, ni clasificación.',
    de: 'Premium ändert NICHTS am Spiel: keine Eroberung, keine Verteidigung, keine Punkte, kein Ranking.',
    pt: 'Premium não muda NADA no jogo: nem captura, nem defesa, nem pontos, nem classificação.',
  },

  // ── Offres ────────────────────────────────────────────────────────────────
  offersLabel: {
    fr: 'FORMULES',
    en: 'PLANS',
    es: 'PLANES',
    de: 'TARIFE',
    pt: 'PLANOS',
  },
  offerLifetime: {
    fr: 'À vie',
    en: 'Lifetime',
    es: 'De por vida',
    de: 'Lebenslang',
    pt: 'Vitalício',
  },
  offerYearly: {
    fr: 'Annuel',
    en: 'Annual',
    es: 'Anual',
    de: 'Jährlich',
    pt: 'Anual',
  },
  offerMonthly: {
    fr: 'Mensuel',
    en: 'Monthly',
    es: 'Mensual',
    de: 'Monatlich',
    pt: 'Mensal',
  },
  /** Prix non fourni par le Store : on le DIT, on n'en invente pas. */
  priceUnavailable: {
    fr: 'Prix indisponible',
    en: 'Price unavailable',
    es: 'Precio no disponible',
    de: 'Preis nicht verfügbar',
    pt: 'Preço indisponível',
  },
  priceUnavailableHint: {
    fr: 'Le Store n’a pas renvoyé le montant : cette formule ne peut pas être achetée ici pour l’instant.',
    en: 'The Store didn’t return the amount: this plan can’t be purchased here right now.',
    es: 'La tienda no devolvió el importe: este plan no se puede comprar aquí por ahora.',
    de: 'Der Store hat den Betrag nicht geliefert: Dieser Tarif kann hier gerade nicht gekauft werden.',
    pt: 'A loja não devolveu o valor: este plano não pode ser comprado aqui por agora.',
  },
  /** Économie CALCULÉE depuis les deux prix du Store, jamais un « -30 % » décoratif. */
  savings: {
    fr: 'Économie de {pct} %',
    en: 'Save {pct}%',
    es: 'Ahorro del {pct} %',
    de: '{pct} % sparen',
    pt: 'Poupança de {pct} %',
  },
  a11ySelectOffer: {
    fr: 'Choisir la formule {label}',
    en: 'Choose the {label} plan',
    es: 'Elegir el plan {label}',
    de: 'Tarif {label} wählen',
    pt: 'Escolher o plano {label}',
  },

  // ── Essai + renouvellement (E74 : « essai et renouvellement explicités ») ──
  trialNote: {
    fr: 'Essai gratuit de {duration}, puis {price}. Annulable avant la fin.',
    en: 'Free {duration} trial, then {price}. Cancel before it ends.',
    es: 'Prueba gratis de {duration}, luego {price}. Cancelable antes del final.',
    de: '{duration} gratis testen, dann {price}. Vor Ablauf kündbar.',
    pt: 'Teste grátis de {duration}, depois {price}. Cancelável antes do fim.',
  },
  renewalNote: {
    fr: 'Renouvellement automatique jusqu’à résiliation, dans les réglages de ton Store.',
    en: 'Renews automatically until cancelled, from your Store settings.',
    es: 'Se renueva automáticamente hasta su cancelación, desde los ajustes de tu tienda.',
    de: 'Verlängert sich automatisch bis zur Kündigung, in den Einstellungen deines Stores.',
    pt: 'Renova automaticamente até o cancelamento, nas configurações da sua loja.',
  },
  lifetimeNote: {
    fr: 'Paiement unique. Aucun renouvellement.',
    en: 'One-time payment. No renewal.',
    es: 'Pago único. Sin renovación.',
    de: 'Einmalzahlung. Keine Verlängerung.',
    pt: 'Pagamento único. Sem renovação.',
  },
  trialUnitDay: { fr: '{n} jour', en: '{n} day', es: '{n} día', de: '{n} Tag', pt: '{n} dia' },
  trialUnitDays: { fr: '{n} jours', en: '{n} days', es: '{n} días', de: '{n} Tagen', pt: '{n} dias' },
  trialUnitWeek: { fr: '{n} semaine', en: '{n} week', es: '{n} semana', de: '{n} Woche', pt: '{n} semana' },
  trialUnitWeeks: { fr: '{n} semaines', en: '{n} weeks', es: '{n} semanas', de: '{n} Wochen', pt: '{n} semanas' },
  trialUnitMonth: { fr: '{n} mois', en: '{n} month', es: '{n} mes', de: '{n} Monat', pt: '{n} mês' },
  trialUnitMonths: { fr: '{n} mois', en: '{n} months', es: '{n} meses', de: '{n} Monaten', pt: '{n} meses' },
  trialUnitYear: { fr: '{n} an', en: '{n} year', es: '{n} año', de: '{n} Jahr', pt: '{n} ano' },
  trialUnitYears: { fr: '{n} ans', en: '{n} years', es: '{n} años', de: '{n} Jahren', pt: '{n} anos' },

  // ── Actions ───────────────────────────────────────────────────────────────
  ctaSubscribe: {
    fr: 'S’abonner',
    en: 'Subscribe',
    es: 'Suscribirse',
    de: 'Abonnieren',
    pt: 'Assinar',
  },
  ctaBuy: {
    fr: 'Acheter',
    en: 'Buy',
    es: 'Comprar',
    de: 'Kaufen',
    pt: 'Comprar',
  },
  ctaStartTrial: {
    fr: 'Essayer gratuitement',
    en: 'Start free trial',
    es: 'Probar gratis',
    de: 'Gratis testen',
    pt: 'Testar grátis',
  },
  ctaRestore: {
    fr: 'Restaurer mes achats',
    en: 'Restore purchases',
    es: 'Restaurar compras',
    de: 'Käufe wiederherstellen',
    pt: 'Restaurar compras',
  },
  /**
   * ── CE BOUTON NE VA PAS AU STORE, ET NE LE DIT DONC PLUS (28/07/2026) ─────
   * Il a dit « Gérer dans le Store » / « Manage in the Store » pendant tout le
   * temps où son `onPress` était `Linking.openURL(managementUrl)` — c'était
   * exact, et il n'était peint que quand cette URL existait. Depuis E75 il fait
   * `router.push('/abonnement')` : une navigation INTERNE, qui n'ouvre le Store
   * que si E75 y trouve une `managementURL` (sinon E75 rend `manageUnavailable`
   * : « Le Store n'a fourni aucun lien de gestion… »). Un joueur qui tape
   * « Gérer dans le Store » pouvait donc n'atteindre jamais le Store.
   * Le libellé dit maintenant la destination RÉELLE. Le texte « Gérer dans le
   * Store » survit là où il est vrai : `catalog/abonnement.ts` (`C.ctaManage`),
   * sur le seul bouton du dépôt qui appelle réellement `Linking.openURL`.
   * « Gerir » est la forme portugaise d'Europe ; le Brésil dit « Gerenciar »
   * (CLAUDE.md : le portugais vise le BRÉSILIEN).
   */
  ctaManage: {
    fr: 'Gérer mon abonnement',
    en: 'Manage my subscription',
    es: 'Gestionar mi suscripción',
    de: 'Mein Abo verwalten',
    pt: 'Gerenciar minha assinatura',
  },
  ctaSignIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  ctaRetry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  ctaTerms: {
    fr: 'Conditions',
    en: 'Terms',
    es: 'Condiciones',
    de: 'Bedingungen',
    pt: 'Condições',
  },

  // ── États (les six, jamais confondus) ─────────────────────────────────────
  loading: {
    fr: 'Lecture des formules…',
    en: 'Reading plans…',
    es: 'Leyendo los planes…',
    de: 'Tarife werden gelesen…',
    pt: 'Lendo os planos…',
  },
  signedOutTitle: {
    fr: 'Un abonnement s’attache à un compte',
    en: 'A subscription belongs to an account',
    es: 'Una suscripción va ligada a una cuenta',
    de: 'Ein Abo gehört zu einem Konto',
    pt: 'Uma assinatura pertence a uma conta',
  },
  signedOutBody: {
    fr: 'Connecte-toi avant d’acheter : sans compte, un paiement ne pourrait être rattaché à personne.',
    en: 'Sign in before buying: without an account, a payment couldn’t be attached to anyone.',
    es: 'Inicia sesión antes de comprar: sin cuenta, un pago no podría vincularse a nadie.',
    de: 'Melde dich vor dem Kauf an: ohne Konto ließe sich eine Zahlung niemandem zuordnen.',
    pt: 'Entre antes de comprar: sem conta, um pagamento não poderia ser associado a ninguém.',
  },
  unavailableTitle: {
    fr: 'Achat indisponible ici',
    en: 'Purchases unavailable here',
    es: 'Compra no disponible aquí',
    de: 'Kauf hier nicht möglich',
    pt: 'Compra indisponível aqui',
  },
  unavailableWeb: {
    fr: 'Les achats intégrés n’existent pas dans un navigateur. Ouvre GRYD sur iPhone ou Android pour t’abonner.',
    en: 'In-app purchases don’t exist in a browser. Open GRYD on iPhone or Android to subscribe.',
    es: 'Las compras integradas no existen en un navegador. Abre GRYD en iPhone o Android para suscribirte.',
    de: 'In-App-Käufe gibt es im Browser nicht. Öffne GRYD auf iPhone oder Android, um zu abonnieren.',
    pt: 'As compras integradas não existem num navegador. Abra o GRYD no iPhone ou Android para assinar.',
  },
  unavailableSdk: {
    fr: 'Cette version de l’app n’embarque pas le module de paiement. Il arrive avec le prochain build.',
    en: 'This build of the app doesn’t ship the payment module. It comes with the next build.',
    es: 'Esta versión de la app no incluye el módulo de pago. Llega con la próxima compilación.',
    de: 'Dieser App-Build enthält das Zahlungsmodul nicht. Es kommt mit dem nächsten Build.',
    pt: 'Esta versão da app não inclui o módulo de pagamento. Chega na próxima build.',
  },
  unavailableKey: {
    fr: 'L’abonnement n’est pas encore configuré : aucune formule ne peut être lue, donc rien n’est vendu.',
    en: 'The subscription isn’t configured yet: no plan can be read, so nothing is sold.',
    es: 'La suscripción aún no está configurada: no se puede leer ningún plan, así que no se vende nada.',
    de: 'Das Abo ist noch nicht konfiguriert: Kein Tarif kann gelesen werden, also wird nichts verkauft.',
    pt: 'A assinatura ainda não está configurada: nenhum plano pode ser lido, por isso nada é vendido.',
  },
  unavailableSecretKey: {
    fr: 'La clé de paiement installée est une clé SECRÈTE : l’app la refuse. Rien n’est vendu tant qu’elle n’est pas remplacée par la clé publique.',
    en: 'The installed payment key is a SECRET key: the app refuses it. Nothing is sold until it’s replaced with the public key.',
    es: 'La clave de pago instalada es una clave SECRETA: la app la rechaza. No se vende nada hasta reemplazarla por la clave pública.',
    de: 'Der installierte Zahlungsschlüssel ist ein GEHEIMER Schlüssel: Die App lehnt ihn ab. Es wird nichts verkauft, bis er durch den öffentlichen Schlüssel ersetzt ist.',
    pt: 'A chave de pagamento instalada é uma chave SECRETA: a app recusa-a. Nada é vendido até ser substituída pela chave pública.',
  },
  errorTitle: {
    fr: 'Formules illisibles',
    en: 'Plans couldn’t be read',
    es: 'No se pudieron leer los planes',
    de: 'Tarife nicht lesbar',
    pt: 'Planos ilegíveis',
  },
  errorBody: {
    fr: 'La lecture a échoué. On ne sait pas ce qui est proposé : rien n’est affiché plutôt qu’un prix approximatif.',
    en: 'The read failed. We don’t know what’s offered: nothing is shown rather than an approximate price.',
    es: 'La lectura falló. No sabemos qué se ofrece: no se muestra nada en vez de un precio aproximado.',
    de: 'Das Lesen ist fehlgeschlagen. Wir wissen nicht, was angeboten wird: lieber nichts anzeigen als einen ungefähren Preis.',
    pt: 'A leitura falhou. Não sabemos o que é oferecido: nada é mostrado em vez de um preço aproximado.',
  },
  emptyTitle: {
    fr: 'Aucune formule publiée',
    en: 'No plan published',
    es: 'Ningún plan publicado',
    de: 'Kein Tarif veröffentlicht',
    pt: 'Nenhum plano publicado',
  },
  emptyBody: {
    fr: 'Les formules ont bien été lues, et il n’y en a aucune pour l’instant. L’abonnement n’est pas encore ouvert.',
    en: 'Plans were read, and there are none for now. The subscription isn’t open yet.',
    es: 'Los planes se leyeron y no hay ninguno por ahora. La suscripción todavía no está abierta.',
    de: 'Die Tarife wurden gelesen, und es gibt derzeit keinen. Das Abo ist noch nicht offen.',
    pt: 'Os planos foram lidos e não há nenhum por agora. A assinatura ainda não está aberta.',
  },

  // ── Droit déjà possédé ────────────────────────────────────────────────────
  proActiveTitle: {
    fr: 'Premium actif',
    en: 'Premium active',
    es: 'Premium activo',
    de: 'Premium aktiv',
    pt: 'Premium ativo',
  },
  proTrialTitle: {
    fr: 'Essai en cours',
    en: 'Trial running',
    es: 'Prueba en curso',
    de: 'Testphase läuft',
    pt: 'Teste a decorrer',
  },
  proLifetimeTitle: {
    fr: 'Accès à vie',
    en: 'Lifetime access',
    es: 'Acceso de por vida',
    de: 'Lebenslanger Zugang',
    pt: 'Acesso vitalício',
  },
  proRenewsOn: {
    fr: 'Renouvellement le {date}',
    en: 'Renews on {date}',
    es: 'Renovación el {date}',
    de: 'Verlängerung am {date}',
    pt: 'Renovação a {date}',
  },
  proEndsOn: {
    fr: 'Renouvellement coupé — accès jusqu’au {date}',
    en: 'Auto-renew off — access until {date}',
    es: 'Renovación desactivada — acceso hasta el {date}',
    de: 'Verlängerung aus — Zugang bis {date}',
    pt: 'Renovação desligada — acesso até {date}',
  },
  proExpiredTitle: {
    fr: 'Accès Premium terminé',
    en: 'Premium access ended',
    es: 'Acceso Premium terminado',
    de: 'Premium-Zugang beendet',
    pt: 'Acesso Premium terminado',
  },

  // ── Résultat de la dernière action ────────────────────────────────────────
  resultPurchased: {
    fr: 'C’est actif. Merci.',
    en: 'It’s active. Thank you.',
    es: 'Está activo. Gracias.',
    de: 'Es ist aktiv. Danke.',
    pt: 'Está ativo. Obrigado.',
  },
  /**
   * ── LE TROISIÈME RÉSULTAT D'ACHAT (28/07/2026) ────────────────────────────
   * Le Store a accepté, mais le droit `gryd_pro` n'est PAS actif dans le
   * CustomerInfo rendu — achat différé (« Demander à acheter », SCA) ou
   * entitlement mal nommé côté RevenueCat. Dire « C'est actif » ici serait un
   * achat AFFIRMÉ que le Store n'a pas confirmé, pendant que le bandeau Pro du
   * même écran resterait absent. On dit donc exactement les deux faits, dans
   * l'ordre : ce qui est certain (le Store a pris la demande), et ce qui ne
   * l'est pas (le droit). Aucune promesse de délai : on n'en connaît aucun.
   * Aucune mention de débit : l'app ne peut pas le prouver (même doctrine que
   * `resultFailed`).
   */
  resultPurchasePending: {
    fr: 'Le Store a pris ta demande, mais l’accès n’est pas encore actif ici. Utilise « Restaurer mes achats » dans un instant.',
    en: 'The Store took your request, but access isn’t active here yet. Use “Restore purchases” in a moment.',
    es: 'La tienda aceptó tu solicitud, pero el acceso todavía no está activo aquí. Usa «Restaurar mis compras» en un momento.',
    de: 'Der Store hat deine Anfrage angenommen, der Zugang ist hier aber noch nicht aktiv. Nutze gleich „Käufe wiederherstellen“.',
    pt: 'A loja aceitou seu pedido, mas o acesso ainda não está ativo aqui. Use “Restaurar minhas compras” daqui a pouco.',
  },
  resultRestored: {
    fr: 'Achats restaurés.',
    en: 'Purchases restored.',
    es: 'Compras restauradas.',
    de: 'Käufe wiederhergestellt.',
    pt: 'Compras restauradas.',
  },
  resultNothingToRestore: {
    fr: 'Aucun achat à restaurer sur ce compte Store.',
    en: 'No purchase to restore on this Store account.',
    es: 'Ninguna compra que restaurar en esta cuenta de la tienda.',
    de: 'Kein Kauf auf diesem Store-Konto wiederherstellbar.',
    pt: 'Nenhuma compra para restaurar nesta conta da loja.',
  },
  /**
   * Volontairement SANS « rien n'a été débité » : l'app ne peut pas le prouver
   * (un paiement peut aboutir côté Store et échouer à la synchronisation). On
   * dit ce qu'on sait — l'opération n'a pas abouti ici — et rien de plus.
   */
  resultFailed: {
    fr: 'L’opération n’a pas abouti. Réessaie.',
    en: 'It didn’t go through. Try again.',
    es: 'La operación no se completó. Inténtalo de nuevo.',
    de: 'Es hat nicht geklappt. Versuch es erneut.',
    pt: 'A operação não foi concluída. Tenta de novo.',
  },
});
