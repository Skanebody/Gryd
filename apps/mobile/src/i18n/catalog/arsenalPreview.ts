/**
 * GRYD — i18n : labels a11y (VoiceOver) des APERÇUS de l'Arsenal.
 *
 * Les composants de preview (features/arsenal/preview/mechanics.tsx & cosmetic.tsx)
 * décrivaient l'objet à VoiceOver en français dur. Ici les mêmes phrases, 5 langues,
 * résolues au rendu. {name} = le nom de l'item (arsenalName), {hours} = durée bouclier.
 */
import { defineCatalog, type Entry } from '../types';

export const ARSENAL_PREVIEW_I18N = {
  'preview.cosmetic.banner': { fr: 'Aperçu de la bannière crew : {name}. Style visuel uniquement, aucun effet de jeu.', en: 'Preview of the Crew banner: {name}. Visual style only, no gameplay effect.', es: 'Vista previa de la bandera del Crew: {name}. Solo estilo visual, sin ningún efecto de juego.', de: 'Vorschau des Crew-Banners: {name}. Nur visueller Stil, keine Spielwirkung.', pt: 'Pré-visualização da bandeira do Crew: {name}. Apenas estilo visual, sem nenhum efeito de jogo.' },
  'preview.cosmetic.emblem': { fr: 'Aperçu du blason crew : {name}. Style visuel uniquement, aucun effet de jeu.', en: 'Preview of the Crew emblem: {name}. Visual style only, no gameplay effect.', es: 'Vista previa del blasón del Crew: {name}. Solo estilo visual, sin ningún efecto de juego.', de: 'Vorschau des Crew-Wappens: {name}. Nur visueller Stil, keine Spielwirkung.', pt: 'Pré-visualização do brasão do Crew: {name}. Apenas estilo visual, sem nenhum efeito de jogo.' },
  'preview.cosmetic.frame': { fr: 'Aperçu du cadre de profil : {name}. Style visuel uniquement, aucun effet de jeu.', en: 'Preview of the profile frame: {name}. Visual style only, no gameplay effect.', es: 'Vista previa del marco de perfil: {name}. Solo estilo visual, sin ningún efecto de juego.', de: 'Vorschau des Profilrahmens: {name}. Nur visueller Stil, keine Spielwirkung.', pt: 'Pré-visualização da moldura de perfil: {name}. Apenas estilo visual, sem nenhum efeito de jogo.' },
  'preview.cosmetic.skinTerritory': { fr: 'Aperçu du skin de territoire : {name}. Style visuel uniquement, aucun effet de jeu.', en: 'Preview of the territory skin: {name}. Visual style only, no gameplay effect.', es: 'Vista previa del skin de territorio: {name}. Solo estilo visual, sin ningún efecto de juego.', de: 'Vorschau des Territorium-Skins: {name}. Nur visueller Stil, keine Spielwirkung.', pt: 'Pré-visualização do skin de território: {name}. Apenas estilo visual, sem nenhum efeito de jogo.' },
  'preview.cosmetic.skinTrace': { fr: 'Aperçu du skin de trace : {name}. Style visuel uniquement, aucun effet de jeu.', en: 'Preview of the trace skin: {name}. Visual style only, no gameplay effect.', es: 'Vista previa del skin de trazado: {name}. Solo estilo visual, sin ningún efecto de juego.', de: 'Vorschau des Spur-Skins: {name}. Nur visueller Stil, keine Spielwirkung.', pt: 'Pré-visualização do skin de traçado: {name}. Apenas estilo visual, sem nenhum efeito de jogo.' },
  'preview.cosmetic.template': { fr: 'Aperçu de la share card : {name}. Style visuel uniquement, aucun effet de jeu.', en: 'Preview of the share card: {name}. Visual style only, no gameplay effect.', es: 'Vista previa de la share card: {name}. Solo estilo visual, sin ningún efecto de juego.', de: 'Vorschau der Share Card: {name}. Nur visueller Stil, keine Spielwirkung.', pt: 'Pré-visualização da share card: {name}. Apenas estilo visual, sem nenhum efeito de jogo.' },
  'preview.mechanics.club': { fr: '{name} : stats, heatmap, export HD et templates premium — zéro avantage de jeu, aucun bouclier, aucune info tactique.', en: '{name}: stats, heatmap, HD export and premium templates — zero gameplay advantage, no shield, no tactical intel.', es: '{name}: estadísticas, heatmap, exportación HD y templates premium — cero ventaja de juego, ningún escudo, ninguna información táctica.', de: '{name}: Statistiken, Heatmap, HD-Export und Premium-Templates — null Spielvorteil, kein Schild, keine taktischen Infos.', pt: '{name}: estatísticas, heatmap, exportação HD e templates premium — zero vantagem de jogo, nenhum escudo, nenhuma informação tática.' },
  'preview.mechanics.crewBoost': { fr: '{name} : +25 % de progression du coffre crew — jamais de points ni de zones.', en: '{name}: +25% Crew chest progress — never points or zones.', es: '{name}: +25 % de progreso del cofre del Crew — nunca puntos ni zonas.', de: '{name}: +25 % Fortschritt der Crew-Truhe — niemals Punkte oder Zonen.', pt: '{name}: +25 % de progresso do baú do Crew — nunca pontos nem zonas.' },
  'preview.mechanics.eclats': { fr: '{name} : des Éclats — la monnaie du style (skins, frames, templates), jamais du territoire.', en: '{name}: Éclats — the currency of style (skins, frames, templates), never of territory.', es: '{name}: Éclats — la moneda del estilo (skins, frames, templates), nunca del territorio.', de: '{name}: Éclats — die Währung für Stil (Skins, Frames, Templates), niemals für Territorium.', pt: '{name}: Éclats — a moeda do estilo (skins, frames, templates), nunca do território.' },
  'preview.mechanics.pack': { fr: '{name} : un bundle qui livre plusieurs cosmétiques d\'un coup — du style, aucun avantage de jeu.', en: '{name}: a bundle that delivers several cosmetics at once — style, no gameplay advantage.', es: '{name}: un pack que entrega varios cosméticos de una vez — estilo, ninguna ventaja de juego.', de: '{name}: ein Bundle, das mehrere Kosmetika auf einmal liefert — Stil, kein Spielvorteil.', pt: '{name}: um pacote que entrega vários cosméticos de uma vez — estilo, nenhuma vantagem de jogo.' },
  'preview.mechanics.pass': { fr: '{name} : 30 niveaux de récompenses de saison — pas encore lancé (bientôt).', en: '{name}: 30 levels of season rewards — not launched yet (soon).', es: '{name}: 30 niveles de recompensas de temporada — aún no disponible (pronto).', de: '{name}: 30 Stufen an Saisonbelohnungen — noch nicht gestartet (bald).', pt: '{name}: 30 níveis de recompensas de temporada — ainda não lançado (em breve).' },
  'preview.mechanics.scoutPing': { fr: '{name} : un ping révèle une zone fragile ou rentable — une info, aucune capture automatique.', en: '{name}: a ping reveals a fragile or profitable zone — information only, no automatic capture.', es: '{name}: un ping revela una zona frágil o rentable — solo información, ninguna captura automática.', de: '{name}: Ein Ping enthüllt eine schwache oder lohnende Zone — eine Information, keine automatische Einnahme.', pt: '{name}: um ping revela uma zona frágil ou rentável — apenas informação, nenhuma captura automática.' },
  'preview.mechanics.shield': { fr: '{name} : protège une zone pendant {hours} h, sans la rendre invincible.', en: '{name}: protects a zone for {hours} h without making it invincible.', es: '{name}: protege una zona durante {hours} h, sin volverla invencible.', de: '{name}: schützt eine Zone für {hours} h, ohne sie unverwundbar zu machen.', pt: '{name}: protege uma zona durante {hours} h, sem torná-la invencível.' },
  'preview.mechanics.streakGel': { fr: '{name} : gèle et protège ta série hebdo une semaine — et donc le multiplicateur de points qu\'elle porte. Ne capture aucune zone, ne se vend jamais.', en: '{name}: freezes and protects your weekly streak for one week — and with it the points multiplier it carries. Captures no zone, never for sale.', es: '{name}: congela y protege tu racha semanal durante una semana — y con ella el multiplicador de puntos que conlleva. No captura ninguna zona, nunca se vende.', de: '{name}: friert deine Wochen-Serie eine Woche lang ein und schützt sie — und damit den Punktemultiplikator, den sie trägt. Nimmt keine Zone ein, wird nie verkauft.', pt: '{name}: congela e protege sua sequência semanal durante uma semana — e com ela o multiplicador de pontos que carrega. Não captura nenhuma zona, nunca é vendida.' },
} satisfies Record<string, Entry>;

/**
 * ═══ MINI-LABELS DES APERÇUS (25/07/2026) ══════════════════════════════════
 *
 * Chaque aperçu SVG porte un mot sous l'illustration (`PreviewLabel`). Ces mots
 * étaient du FRANÇAIS EN DUR dans `preview/cosmetic.tsx` — « Frontière or »,
 * « Trame nuit », « Hachures », « Braise », « Givre », « Première zone »… — et
 * ils sont VISIBLES en grille comme dans la sheet de détail. Un joueur
 * en/es/de/pt les lisait en français.
 *
 * Clé = `item_key` du catalogue. Un item sans entrée retombe sur le libellé du
 * composant (repli du resolver), jamais sur du vide.
 *
 * NOMS PROPRES DE MARQUE identiques dans les 5 langues (« Blackout »,
 * « Neon Ivory », « Carbon Dash », « War Ready »…) : un nom de produit ne se
 * traduit pas — même règle que le catalogue produit.
 */
export const ARSENAL_PREVIEW_LABEL_I18N: Record<string, Entry> = {
  // ── Skins territoire ──
  skin_territory_gold_border: { fr: 'Frontière or', en: 'Gold border', es: 'Frontera dorada', de: 'Goldene Grenze', pt: 'Fronteira dourada' },
  skin_territory_ghost: { fr: 'Fantôme', en: 'Ghost', es: 'Fantasma', de: 'Geist', pt: 'Fantasma' },
  skin_territory_night_grid: { fr: 'Trame nuit', en: 'Night grid', es: 'Trama nocturna', de: 'Nachtraster', pt: 'Trama noturna' },
  skin_territory_blackout: { fr: 'Blackout', en: 'Blackout', es: 'Blackout', de: 'Blackout', pt: 'Blackout' },
  skin_territory_ivory_lines: { fr: 'Hachures', en: 'Hatching', es: 'Rayado', de: 'Schraffur', pt: 'Hachura' },
  skin_territory_ember: { fr: 'Braise', en: 'Ember', es: 'Brasa', de: 'Glut', pt: 'Brasa' },
  skin_territory_frost: { fr: 'Givre', en: 'Frost', es: 'Escarcha', de: 'Frost', pt: 'Geada' },
  skin_territory_founder_glow: { fr: 'Founder', en: 'Founder', es: 'Founder', de: 'Founder', pt: 'Founder' },
  // ── Skins trace ──
  skin_trace_electric: { fr: 'Électrique', en: 'Electric', es: 'Eléctrico', de: 'Elektrisch', pt: 'Elétrico' },
  skin_trace_chartreuse_pulse: { fr: 'Pulse', en: 'Pulse', es: 'Pulse', de: 'Pulse', pt: 'Pulse' },
  skin_trace_neon_ivory: { fr: 'Neon Ivory', en: 'Neon Ivory', es: 'Neon Ivory', de: 'Neon Ivory', pt: 'Neon Ivory' },
  skin_trace_ghost_line: { fr: 'Ghost', en: 'Ghost', es: 'Ghost', de: 'Ghost', pt: 'Ghost' },
  skin_trace_carbon_dash: { fr: 'Carbon Dash', en: 'Carbon Dash', es: 'Carbon Dash', de: 'Carbon Dash', pt: 'Carbon Dash' },
  skin_trace_midnight: { fr: 'Midnight', en: 'Midnight', es: 'Midnight', de: 'Midnight', pt: 'Midnight' },
  skin_trace_blade: { fr: 'Blade', en: 'Blade', es: 'Blade', de: 'Blade', pt: 'Blade' },
  skin_trace_founder_line: { fr: 'Founder Line', en: 'Founder Line', es: 'Founder Line', de: 'Founder Line', pt: 'Founder Line' },
  // ── Cadres, badge et titre de profil ──
  frame_road: { fr: 'Road', en: 'Road', es: 'Road', de: 'Road', pt: 'Road' },
  frame_tempo: { fr: 'Tempo', en: 'Tempo', es: 'Tempo', de: 'Tempo', pt: 'Tempo' },
  frame_race: { fr: 'Race', en: 'Race', es: 'Race', de: 'Race', pt: 'Race' },
  frame_carbon: { fr: 'Carbon', en: 'Carbon', es: 'Carbon', de: 'Carbon', pt: 'Carbon' },
  frame_elite: { fr: 'Elite', en: 'Elite', es: 'Elite', de: 'Elite', pt: 'Elite' },
  frame_founder: { fr: 'Founder', en: 'Founder', es: 'Founder', de: 'Founder', pt: 'Founder' },
  founder_badge: { fr: 'Badge Founder', en: 'Founder Badge', es: 'Badge Founder', de: 'Founder-Badge', pt: 'Badge Founder' },
  title_founder_runner: { fr: 'Founder Runner', en: 'Founder Runner', es: 'Founder Runner', de: 'Founder Runner', pt: 'Founder Runner' },
  // ── Bannières crew ──
  crew_banner_impact: { fr: 'Impact', en: 'Impact', es: 'Impact', de: 'Impact', pt: 'Impact' },
  crew_banner_war_ready: { fr: 'War Ready', en: 'War Ready', es: 'War Ready', de: 'War Ready', pt: 'War Ready' },
  crew_banner_blackline: { fr: 'Black Line', en: 'Black Line', es: 'Black Line', de: 'Black Line', pt: 'Black Line' },
  crew_banner_chartreuse: { fr: 'Chartreuse Storm', en: 'Chartreuse Storm', es: 'Chartreuse Storm', de: 'Chartreuse Storm', pt: 'Chartreuse Storm' },
  crew_banner_district: { fr: 'District', en: 'District', es: 'District', de: 'District', pt: 'District' },
  crew_banner_legend: { fr: 'Legend Row', en: 'Legend Row', es: 'Legend Row', de: 'Legend Row', pt: 'Legend Row' },
  // ── Blasons crew ──
  crew_emblem_ghost: { fr: 'Ghost', en: 'Ghost', es: 'Ghost', de: 'Ghost', pt: 'Ghost' },
  crew_emblem_carbon: { fr: 'Carbon', en: 'Carbon', es: 'Carbon', de: 'Carbon', pt: 'Carbon' },
  crew_emblem_gold: { fr: 'Or', en: 'Gold', es: 'Oro', de: 'Gold', pt: 'Ouro' },
  crew_emblem_founder: { fr: 'Founder', en: 'Founder', es: 'Founder', de: 'Founder', pt: 'Founder' },
  // ── Templates de partage ──
  template_first_zone: { fr: 'Première zone', en: 'First zone', es: 'Primera zona', de: 'Erste Zone', pt: 'Primeira zona' },
  template_zone_taken: { fr: 'Zone prise', en: 'Zone taken', es: 'Zona tomada', de: 'Zone erobert', pt: 'Zona tomada' },
  template_night_run: { fr: 'Night Run', en: 'Night Run', es: 'Night Run', de: 'Night Run', pt: 'Night Run' },
  template_before_after: { fr: 'Before / After', en: 'Before / After', es: 'Before / After', de: 'Before / After', pt: 'Before / After' },
  template_route_opened: { fr: 'Route ouverte', en: 'Route opened', es: 'Ruta abierta', de: 'Route eröffnet', pt: 'Rota aberta' },
  template_founder: { fr: 'Founder', en: 'Founder', es: 'Founder', de: 'Founder', pt: 'Founder' },
  crew_recruit_template: { fr: 'Recrutement', en: 'Recruiting', es: 'Reclutamiento', de: 'Rekrutierung', pt: 'Recrutamento' },
};

/**
 * LÉGENDES des schémas de mécanique (`preview/mechanics.tsx`). Elles étaient en
 * français dur, et ce sont les phrases les plus IMPORTANTES des aperçus : ce
 * sont elles qui disent la LIMITE anti-pay-to-win (« ne capture rien », « jamais
 * points ni zones »). Les afficher en français à un joueur allemand, c'est lui
 * cacher la garantie.
 *
 * `{pct}` = bonus de coffre dérivé de `CREW_BOOST_CHEST_MULTIPLIER`, interpolé
 * au rendu — jamais un nombre écrit dans la copie.
 */
export const PREVIEW_CAPTION_C = defineCatalog({
  shield: {
    fr: 'Protège une zone · pas invincible',
    en: 'Protects a zone · not invincible',
    es: 'Protege una zona · no invencible',
    de: 'Schützt eine Zone · nicht unbesiegbar',
    pt: 'Protege uma zona · não invencível',
  },
  scoutPing: {
    fr: 'Révèle une info · aucune capture',
    en: 'Reveals intel · no capture',
    es: 'Revela información · ninguna captura',
    de: 'Zeigt eine Info · keine Eroberung',
    pt: 'Revela uma info · nenhuma captura',
  },
  streakGel: {
    fr: 'Ne capture aucune zone · jamais vendu',
    en: 'Captures no zone · never sold',
    es: 'No captura ninguna zona · nunca a la venta',
    de: 'Erobert keine Zone · nie verkauft',
    pt: 'Não captura nenhuma zona · nunca vendido',
  },
  crewBoost: {
    fr: '+{pct}% coffre · jamais points ni zones',
    en: '+{pct}% chest · never points or zones',
    es: '+{pct}% cofre · nunca puntos ni zonas',
    de: '+{pct}% Kiste · nie Punkte oder Zonen',
    pt: '+{pct}% baú · nunca pontos nem zonas',
  },
  pack: {
    fr: 'Plusieurs cosmétiques · pas un avantage',
    en: 'Several cosmetics · not an advantage',
    es: 'Varios cosméticos · no una ventaja',
    de: 'Mehrere Kosmetika · kein Vorteil',
    pt: 'Vários cosméticos · não uma vantagem',
  },
  eclats: {
    fr: 'Pour le style · pas le territoire',
    en: 'For style · not territory',
    es: 'Para el estilo · no el territorio',
    de: 'Für den Style · nicht das Gebiet',
    pt: 'Para o estilo · não o território',
  },
  club: {
    fr: 'Zéro avantage de jeu · aucun bouclier',
    en: 'Zero gameplay advantage · no shield',
    es: 'Cero ventaja de juego · ningún escudo',
    de: 'Null Spielvorteil · kein Schild',
    pt: 'Zero vantagem de jogo · nenhum escudo',
  },
  pass: {
    fr: 'Récompenses de saison · à venir',
    en: 'Season rewards · coming',
    es: 'Recompensas de temporada · próximamente',
    de: 'Saisonbelohnungen · demnächst',
    pt: 'Recompensas de temporada · em breve',
  },
});
