import { useEffect } from 'react';
import { C, LEGAL_ENTITY, LEGAL_HOSTING, LEGAL_LAST_UPDATED } from '../src/i18n/catalog/legal';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { Text, View } from 'react-native';
import type { LegalSection } from '../src/ui/LegalDoc';
import { ProfilePage, ProfileSection, s, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';

export default function AProposScreen() {
  const t = useT();
  const copy = useRefonteCopy();
  useEffect(() => {
    screen('a_propos');
  }, []);

  // Les variables d'identité viennent de LEGAL_ENTITY : une seule vérité, et
  // aucune mention obligatoire ne peut diverger d'un écran à l'autre.
  const vars = {
    name: LEGAL_ENTITY.name,
    form: LEGAL_ENTITY.form,
    capital: LEGAL_ENTITY.capital,
    address: LEGAL_ENTITY.address,
    rcs: LEGAL_ENTITY.rcsCity,
    siren: LEGAL_ENTITY.siren,
    vat: LEGAL_ENTITY.vat,
    president: LEGAL_ENTITY.president,
  };

  const sections: readonly LegalSection[] = [
    {
      heading: t(C.publisherHeading),
      body: [t(C.publisherBody, vars), t(C.publisherDirector, vars), t(C.publisherVat, vars)],
      // LA section d'identité : c'est le seul bloc de cet écran qu'un tiers
      // (plateforme, juriste, joueur) vient chercher isolément.
      surface: true,
    },
    {
      heading: t(C.hostingHeading),
      body: t(C.hostingBody, {
        provider: LEGAL_HOSTING.provider,
        region: LEGAL_HOSTING.region,
      }),
    },
    { heading: t(C.dataHeading), body: t(C.dataBody) },
    { heading: t(C.contactHeading), body: t(C.contactBody, vars) },
  ];

  return <ProfilePage title={t(C.aboutTitle)} back>
    <Text style={s.kicker}>GRYD</Text>
    <Text style={[s.title, { marginTop: 12, marginBottom: 20 }]}>{copy('Cours. Roule.\nFais grandir\nton terrain.', 'Run. Ride.\nGrow your\nterrain.')}</Text>
    <Text style={s.subtitle}>{copy('Une sortie qui te fait du bien, une trace dont tu es fier, une aventure à partager.', 'An outing that feels good, a route you are proud of, an adventure to share.')}</Text>
    <Text style={[s.meta, { marginTop: 24 }]}>{t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}</Text>
    {sections.map(section => <View key={section.heading}>
      <ProfileSection title={section.heading} />
      {(Array.isArray(section.body) ? section.body : [section.body]).map((paragraph, index) => <Text key={index} style={[s.body, { marginBottom: 12 }]}>{paragraph}</Text>)}
    </View>)}
  </ProfilePage>;
}
