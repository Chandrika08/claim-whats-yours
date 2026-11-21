// Telugu and Hindi wording for the follow-up questions in src/lib/questions.ts.
// English stays in src/lib/questions.ts; callers fall back to it when these return undefined.

export type QuestionLang = 'en' | 'te' | 'hi';
export type QuestionCopy = { text?: string; helper?: string };

export type QuestionField =
  | 'land_ownership'
  | 'land_acres'
  | 'age'
  | 'annual_household_income'
  | 'has_bank_account'
  | 'is_income_taxpayer'
  | 'is_govt_employee'
  | 'family_excluded_category'
  | 'in_land_records_aug_2019'
  | 'covered_by_other_pension';

export type LandOwnership = 'owner' | 'tenant' | 'none';

const LAND_OWNERSHIP_VALUES: readonly string[] = ['owner', 'tenant', 'none'];

const YES_NO_FIELDS: ReadonlySet<string> = new Set<string>([
  'has_bank_account',
  'is_income_taxpayer',
  'is_govt_employee',
  'family_excluded_category',
  'in_land_records_aug_2019',
  'covered_by_other_pension',
]);

// English source (src/lib/questions.ts):
// land_ownership: 'Is the land in your name, or do you cultivate it on lease?'
// land_acres: 'About how many acres do you cultivate?'
// age: 'How old are you?'
// annual_household_income: 'About how much does your family earn in a year?'
//   helper: '1 lakh = 1,00,000 rupees'
// has_bank_account: 'Do you have a savings bank account?'
// is_income_taxpayer: 'Did anyone in your family pay income tax last year?'
// is_govt_employee: 'Does anyone in your family work, or used to work, for the government? (Not counting peons or Class IV staff)'
// family_excluded_category: 'Is anyone in your family a current or former minister, MP, MLA or mayor, a registered doctor, engineer, lawyer, CA or architect, or getting a pension of Rs 10,000 or more a month?'
// in_land_records_aug_2019: 'Was your name in the land records on 1 August 2019?'
// covered_by_other_pension: 'Are you already covered by any other pension scheme (such as NPS, ESIC or EPFO)?'

export const QUESTION_TEXT_TE: Record<QuestionField, QuestionCopy> = {
  land_ownership: { text: 'భూమి మీ పేరులో ఉందా, లేదా కౌలుకు సాగు చేస్తున్నారా?' },
  land_acres: { text: 'మీరు సాగు చేసే భూమి సుమారు ఎన్ని ఎకరాలు?' },
  age: { text: 'మీ వయసు ఎంత?' },
  annual_household_income: {
    text: 'మీ కుటుంబం ఏడాదికి సుమారు ఎంత సంపాదిస్తుంది?',
    helper: '1 లక్ష = 1,00,000 రూపాయలు',
  },
  has_bank_account: { text: 'మీకు సేవింగ్స్ బ్యాంక్ ఖాతా ఉందా?' },
  is_income_taxpayer: { text: 'గత ఏడాది మీ కుటుంబంలో ఎవరైనా ఆదాయపు పన్ను కట్టారా?' },
  is_govt_employee: {
    text: 'మీ కుటుంబంలో ఎవరైనా ప్రభుత్వ ఉద్యోగం చేస్తున్నారా, లేదా గతంలో చేశారా? (పియ్యన్ లేదా క్లాస్ IV ఉద్యోగులను లెక్కించకుండా)',
  },
  family_excluded_category: {
    text: 'మీ కుటుంబంలో ఎవరైనా ప్రస్తుత లేదా మాజీ మంత్రి, ఎంపీ, ఎమ్మెల్యే లేదా మేయర్ ఉన్నారా, లేదా రిజిస్టర్ అయిన డాక్టర్, ఇంజనీర్, లాయర్, CA లేదా ఆర్కిటెక్ట్ ఉన్నారా, లేదా నెలకు 10,000 రూపాయలు లేదా అంతకంటే ఎక్కువ పెన్షన్ వస్తోందా?',
  },
  in_land_records_aug_2019: { text: '1 ఆగస్టు 2019న భూమి రికార్డుల్లో మీ పేరు ఉందా?' },
  covered_by_other_pension: {
    text: 'NPS, ESIC లేదా EPFO వంటి ఏదైనా ఇతర పెన్షన్ పథకంలో మీరు ఇప్పటికే ఉన్నారా?',
  },
};

export const QUESTION_TEXT_HI: Record<QuestionField, QuestionCopy> = {
  land_ownership: { text: 'जमीन आपके नाम पर है, या आप उसे पट्टे पर जोतते हैं?' },
  land_acres: { text: 'आप लगभग कितने एकड़ जमीन जोतते हैं?' },
  age: { text: 'आपकी उम्र कितनी है?' },
  annual_household_income: {
    text: 'आपका परिवार एक साल में लगभग कितना कमाता है?',
    helper: '1 लाख = 1,00,000 रुपये',
  },
  has_bank_account: { text: 'क्या आपका सेविंग्स बैंक खाता है?' },
  is_income_taxpayer: { text: 'पिछले साल आपके परिवार में किसी ने आयकर भरा था?' },
  is_govt_employee: {
    text: 'क्या आपके परिवार में कोई सरकार के लिए काम करता है, या पहले करता था? (चपरासी या क्लास IV कर्मचारियों को छोड़कर)',
  },
  family_excluded_category: {
    text: 'क्या आपके परिवार में कोई वर्तमान या पूर्व मंत्री, सांसद, विधायक या मेयर है, कोई पंजीकृत डॉक्टर, इंजीनियर, वकील, CA या आर्किटेक्ट है, या किसी को महीने के 10,000 रुपये या उससे ज़्यादा पेंशन मिलती है?',
  },
  in_land_records_aug_2019: { text: 'क्या 1 अगस्त 2019 को भूमि रिकॉर्ड में आपका नाम था?' },
  covered_by_other_pension: {
    text: 'क्या आप पहले से किसी और पेंशन योजना (जैसे NPS, ESIC या EPFO) में शामिल हैं?',
  },
};

export const YES_NO_LABELS: Record<'te' | 'hi', { yes: string; no: string; notSure: string }> = {
  te: { yes: 'అవును', no: 'లేదు', notSure: 'తెలియదు' },
  hi: { yes: 'हाँ', no: 'नहीं', notSure: 'पता नहीं' },
};

export const LAND_OWNERSHIP_LABELS: Record<'te' | 'hi', Record<LandOwnership, string>> = {
  te: { owner: 'మీ పేరు మీద', tenant: 'కౌలుకు', none: 'భూమి లేదు' },
  hi: { owner: 'आपके नाम पर', tenant: 'पट्टे पर', none: 'कोई जमीन नहीं' },
};

export function questionCopy(field: string, lang: QuestionLang): QuestionCopy {
  if (lang === 'en') return {};
  const table: Partial<Record<string, QuestionCopy>> = lang === 'te' ? QUESTION_TEXT_TE : QUESTION_TEXT_HI;
  return table[field] ?? {};
}

export function optionLabel(
  field: string,
  value: string | boolean | null,
  lang: QuestionLang,
): string | undefined {
  if (lang === 'en') return undefined;

  if (field === 'land_ownership' && typeof value === 'string' && LAND_OWNERSHIP_VALUES.includes(value)) {
    return LAND_OWNERSHIP_LABELS[lang][value as LandOwnership];
  }

  if (YES_NO_FIELDS.has(field)) {
    const labels = YES_NO_LABELS[lang];
    if (value === true) return labels.yes;
    if (value === false) return labels.no;
    if (value === null) return labels.notSure;
  }

  return undefined;
}
