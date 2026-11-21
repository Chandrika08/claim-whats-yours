export const navEn = {
  'nav.tagline': "Claim what's yours",
  'nav.home': 'Home',
  'nav.results': 'Results',
  'nav.tracker': 'Tracker',
  'nav.admin': 'Admin',
  'nav.partners': 'Partners',
  'nav.openMenu': 'Open menu',
  'nav.closeMenu': 'Close menu',
  'nav.trackedCount': '{count} tracked',
  'nav.language': 'Language',
} as const;

export const navTe: Record<keyof typeof navEn, string> = {
  'nav.tagline': 'మీ హక్కును పొందండి',
  'nav.home': 'హోమ్',
  'nav.results': 'ఫలితాలు',
  'nav.tracker': 'ట్రాకర్',
  'nav.admin': 'అడ్మిన్',
  'nav.partners': 'భాగస్వాములు',
  'nav.openMenu': 'మెనూ తెరవండి',
  'nav.closeMenu': 'మెనూ మూసివేయండి',
  'nav.trackedCount': '{count} ట్రాక్ అవుతున్నాయి',
  'nav.language': 'భాష',
};

export const navHi: Record<keyof typeof navEn, string> = {
  'nav.tagline': 'अपना हक़ पाएं',
  'nav.home': 'होम',
  'nav.results': 'नतीजे',
  'nav.tracker': 'ट्रैकर',
  'nav.admin': 'एडमिन',
  'nav.partners': 'साझेदार',
  'nav.openMenu': 'मेनू खोलें',
  'nav.closeMenu': 'मेनू बंद करें',
  'nav.trackedCount': '{count} ट्रैक हो रही हैं',
  'nav.language': 'भाषा',
};
