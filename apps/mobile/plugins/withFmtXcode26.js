/**
 * GRYD — plugin de config Expo : fmt 11.0.2 (React Native 0.76) contre le clang
 * d'Xcode 26.
 *
 * ─── LE DÉFAUT MESURÉ (11/09/2026) ────────────────────────────────────────────
 * Sur Xcode 26.6, la compilation des pods s'arrête dans
 * `Pods/fmt/include/fmt/format-inl.h` : « call to consteval function
 * 'fmt::basic_format_string<…>' is not a constant expression ». Le pod `fmt`
 * vient de `react-native/third-party-podspecs/fmt.podspec` en 11.0.2 ; sa
 * détection (`base.h`, `FMT_USE_CONSTEVAL`) active `consteval` avec ce clang, et
 * ses propres chaînes de format ne passent plus la vérification. fmt 11.1 l'a
 * corrigé ; React Native 0.76 ne le remonte pas. Les images EAS compilent sur
 * Xcode 16 et ne voient rien : le défaut n'existe que pour un build LOCAL.
 *
 * ─── LE REMÈDE (mesuré, pas déduit) ───────────────────────────────────────────
 * Un `-DFMT_USE_CONSTEVAL=0` sur la ligne de commande NE SUFFIT PAS : dans
 * `base.h` de fmt 11.0.2 la chaîne de détection `#define`-it la macro sans
 * garde `#ifndef`, donc le drapeau est redéfini à 1 (essayé le 11/09 sur les
 * 236 configurations : mêmes erreurs). Le seul point d'appui est le fichier
 * lui-même : dans `post_install`, qui s'exécute APRÈS le téléchargement du pod,
 * on remplace les deux `#  define FMT_USE_CONSTEVAL 1` par `0` — le mode que
 * fmt choisit de lui-même sur les clang plus anciens. Idempotent : un
 * `pod install` suivant retéléchargerait le pod et le patch se rejouerait.
 * Rien ne change à l'exécution ; seule la vérification à la compilation est
 * retirée.
 *
 * Ce plugin injecte le bloc dans le `post_install` du Podfile généré par
 * prebuild — un Podfile édité à la main serait réécrit au prebuild suivant.
 * À retirer le jour où React Native embarque fmt ≥ 11.1 (`package.json` de
 * react-native fait foi).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARK_START = '# GRYD withFmtXcode26 — début';
const MARK_END = '# GRYD withFmtXcode26 — fin';
const BLOCK = `
    ${MARK_START} : fmt 11.0.2 refuse le clang d'Xcode 26 en mode consteval (voir plugins/withFmtXcode26.js)
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      fmt_source = File.read(fmt_base)
      fmt_patched = fmt_source.gsub('#  define FMT_USE_CONSTEVAL 1', '#  define FMT_USE_CONSTEVAL 0')
      if fmt_patched != fmt_source
        File.write(fmt_base, fmt_patched)
        Pod::UI.puts '[GRYD withFmtXcode26] fmt/base.h : consteval désactivé (Xcode 26)'
      end
    end
    ${MARK_END}
`;

/**
 * ⚠️ Ne JAMAIS supprimer `ios/Podfile` pour « forcer » une régénération : prebuild
 * n'écrit le gabarit que si `ios/` n'existe pas, et ses mods de base échouent
 * sinon (« Could not locate a valid Podfile », payé le 11/09). Ce plugin est donc
 * idempotent ET remplaçant : un bloc antérieur (entre les deux marques) est
 * retiré avant que le bloc courant soit injecté.
 */
module.exports = function withFmtXcode26(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfile)) {
        throw new Error(`[withFmtXcode26] ${podfile} absent : relancer \`expo prebuild --platform ios --clean\`.`);
      }
      let source = fs.readFileSync(podfile, 'utf8');
      const start = source.indexOf(`\n    ${MARK_START}`);
      const end = source.indexOf(MARK_END);
      if (start !== -1 && end !== -1) {
        source = source.slice(0, start) + source.slice(end + MARK_END.length + 1);
      }
      const hook = 'post_install do |installer|';
      if (!source.includes(hook)) {
        throw new Error(`[withFmtXcode26] "${hook}" introuvable dans ${podfile} : le gabarit Expo a changé, relire le plugin.`);
      }
      fs.writeFileSync(podfile, source.replace(hook, `${hook}${BLOCK}`));
      return cfg;
    },
  ]);
};
