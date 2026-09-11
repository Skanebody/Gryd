/**
 * GRYD — surcouche de configuration Expo (12/09/2026).
 *
 * `app.json` reste la vérité, tests compris (`src/lib/links.test.ts` exige
 * `ios.associatedDomains`). Cette surcouche n'existe que pour UN cas : un build
 * signé avec un profil de provisioning qui ne porte PAS encore la capacité
 * « Associated Domains » (build `fe030292` ERRORED le 12/09 : « Provisioning
 * profile … doesn't support the Associated Domains capability »). EAS ne
 * synchronise pas les capacités en non-interactif ; en attendant la session
 * Apple du fondateur (`eas credentials -p ios`), le profil EAS
 * `preview-nolinks` pose `GRYD_UNIVERSAL_LINKS=off` et l'entitlement est
 * retiré du binaire. Le lien universel ouvre alors Safari, et la page
 * `gryd.run/callback` fait le relais (remise de session par nonce, lot E5).
 * Dès que le profil porte la capacité : construire avec `preview`, sans rien
 * changer ici.
 */
module.exports = ({ config }) => {
  if (process.env.GRYD_UNIVERSAL_LINKS !== 'off') return config;
  const ios = { ...(config.ios ?? {}) };
  delete ios.associatedDomains;
  return { ...config, ios };
};
