import { describe, it, expect } from 'vitest';
import { extractProfile } from './extract';
import { nextQuestions } from './questions';
import type { Profile, Scheme } from '../types';
import schemesData from '../data/schemes.json';

const schemes = schemesData as unknown as Scheme[];

describe('English statements', () => {
  it('reads owned acres, age and owner status', () => {
    const { profile, evidence } = extractProfile('I own 2 acres of land. I am 45 years old.');
    expect(profile.land_acres).toBe(2);
    expect(profile.land_ownership).toBe('owner');
    expect(profile.age).toBe(45);
    expect(evidence.land_acres).toBe('2 acres');
  });

  it('reads land in any word order', () => {
    const { profile } = extractProfile('Land I have is 3 acres.');
    expect(profile.land_acres).toBe(3);
    expect(profile.land_ownership).toBeUndefined();
  });

  it('converts 50 cents to 0.5 acres', () => {
    const { profile } = extractProfile('I cultivate 50 cents of land in my own name.');
    expect(profile.land_acres).toBe(0.5);
    expect(profile.land_ownership).toBe('owner');
  });

  it('converts 40 guntas to 1 acre', () => {
    expect(extractProfile('I have 40 guntas of land. I own it.').profile.land_acres).toBe(1);
  });

  it('does not read "house rent" as a lease', () => {
    const { profile } = extractProfile('I pay house rent every month. I own 2 acres.');
    expect(profile.land_ownership).toBe('owner');
  });

  it('leaves tenancy unset when only house rent is mentioned', () => {
    expect(extractProfile('I pay house rent every month.').profile.land_ownership).toBeUndefined();
  });

  it('reads a curly apostrophe negation for bank account', () => {
    expect(extractProfile('I don\u2019t have a bank account.').profile.has_bank_account).toBe(false);
  });

  it('reads a monthly income as annual', () => {
    expect(extractProfile('We earn 15000 per month.').profile.annual_household_income).toBe(180000);
  });

  it('reads "Rs 1.5 lakh per annum" as 150000', () => {
    expect(extractProfile('Our income is Rs 1.5 lakh per annum.').profile.annual_household_income).toBe(150000);
  });

  it('reads a comma-grouped monthly income', () => {
    expect(extractProfile('Income is 15,000 rupees per month.').profile.annual_household_income).toBe(180000);
  });

  it('leaves an income with no period unresolved', () => {
    expect(extractProfile('We earn 2 lakh.').profile.annual_household_income).toBeUndefined();
  });

  it('keeps owned and leased area separate and leaves ownership unresolved when both are stated', () => {
    const { profile, warnings } = extractProfile('I own 2 acres and lease 1 acre.');
    expect(profile.land_acres).toBe(2);
    expect(profile.leased_cultivated_land_acres).toBe(1);
    expect(profile.land_ownership).toBeUndefined();
    expect(warnings?.length ?? 0).toBeGreaterThan(0);
  });

  it('reads a leased cultivation statement as tenant with the leased area', () => {
    const { profile } = extractProfile('I cultivate 3 acres of leased land and I am 38.');
    expect(profile.land_ownership).toBe('tenant');
    expect(profile.land_acres).toBe(3);
    expect(profile.leased_cultivated_land_acres).toBe(3);
  });

  it('leaves landless cultivator unresolved and records a warning', () => {
    const { profile, warnings } = extractProfile('I have no land but I cultivate 2 acres on lease.');
    expect(profile.land_ownership).toBeUndefined();
    expect(profile.leased_cultivated_land_acres).toBe(2);
    expect(warnings?.length ?? 0).toBeGreaterThan(0);
  });

  it('leaves unknown units unresolved', () => {
    expect(extractProfile('I have 3 bigha of land.').profile.land_acres).toBeUndefined();
  });

  it('leaves a contradictory age unresolved and warns', () => {
    const { profile, warnings } = extractProfile('I am 45. I am 52.');
    expect(profile.age).toBeUndefined();
    expect(warnings?.length ?? 0).toBeGreaterThan(0);
  });

  it('leaves contradictory acreage unresolved and warns', () => {
    const { profile, warnings } = extractProfile('I have 2 acres and 3 acres of land.');
    expect(profile.land_acres).toBeUndefined();
    expect(warnings?.length ?? 0).toBeGreaterThan(0);
  });

  it('leaves contradictory income unresolved and warns', () => {
    const { profile, warnings } = extractProfile('Our income is 2 lakh a year. We earned 1 lakh a year.');
    expect(profile.annual_household_income).toBeUndefined();
    expect(warnings?.length ?? 0).toBeGreaterThan(0);
  });

  it('reads CCRC and e-Panta status only when stated', () => {
    const yes = extractProfile('I have a CCRC card and my e-Panta crop booking is done.').profile;
    expect(yes.has_ccrc).toBe(true);
    expect(yes.epanta_booked).toBe(true);
    const no = extractProfile("I don't have a CCRC card. I have not booked e-Panta.").profile;
    expect(no.has_ccrc).toBe(false);
    expect(no.epanta_booked).toBe(false);
    const silent = extractProfile('I own 2 acres.').profile;
    expect(silent.has_ccrc).toBeUndefined();
    expect(silent.epanta_booked).toBeUndefined();
  });

  it('does not ask again for fields the story already settled', () => {
    const { profile } = extractProfile('I own 2 acres of land. I am 45 years old.');
    const asked = nextQuestions(profile as Profile, schemes, []).map((q) => q.field);
    expect(asked).not.toContain('land_acres');
    expect(asked).not.toContain('land_ownership');
    expect(asked).not.toContain('age');
  });

  it('asks for land ownership when it was left unresolved', () => {
    const { profile } = extractProfile('I own 2 acres and lease 1 acre.');
    const asked = nextQuestions(profile as Profile, schemes, []).map((q) => q.field);
    expect(asked).toContain('land_ownership');
  });
});

describe('Telugu statements', () => {
  it('reads owned acres written with Telugu digits and the name-on-record owner phrase', () => {
    const { profile, evidence } = extractProfile('నా పేరు మీద ౩ ఎకరాల భూమి ఉంది. నా వయసు ౪౫.');
    expect(profile.land_acres).toBe(3);
    expect(profile.land_ownership).toBe('owner');
    expect(profile.age).toBe(45);
    expect(evidence.land_acres).toContain('ఎకరాల');
  });

  it('reads a leased Telugu statement as tenant with leased area', () => {
    const { profile } = extractProfile('నేను 2 ఎకరాలు కౌలుకు తీసుకున్నాను. నా వయసు 38.');
    expect(profile.land_ownership).toBe('tenant');
    expect(profile.leased_cultivated_land_acres).toBe(2);
    expect(profile.land_acres).toBe(2);
    expect(profile.age).toBe(38);
  });

  it('reads Telugu number words as acres', () => {
    const { profile } = extractProfile('నా పేరు మీద రెండు ఎకరాలు భూమి ఉంది.');
    expect(profile.land_acres).toBe(2);
    expect(profile.land_ownership).toBe('owner');
  });

  it('reads Telugu cents (sentlu) as 0.01 acre each', () => {
    expect(extractProfile('నా పేరు మీద 50 సెంట్లు భూమి ఉంది.').profile.land_acres).toBe(0.5);
  });

  it('reads a Telugu monthly income with Telugu digits', () => {
    const { profile } = extractProfile('మా కుటుంబ ఆదాయం నెలకు ౧౫౦౦౦ రూపాయలు.');
    expect(profile.annual_household_income).toBe(180000);
  });

  it('reads Telugu bank account negation', () => {
    expect(extractProfile('బ్యాంకు ఖాతా లేదు.').profile.has_bank_account).toBe(false);
    expect(extractProfile('నాకు బ్యాంకు ఖాతా ఉంది.').profile.has_bank_account).toBe(true);
  });

  it('reads Telugu-script farmer status', () => {
    expect(extractProfile('నేను రైతును. నా పేరు మీద భూమి ఉంది.').profile.occupation).toBe('farmer');
  });

  it('reads romanised Telugu land without inferring ownership', () => {
    const { profile } = extractProfile('naa daggara 3 ekaralu bhoomi undi');
    expect(profile.land_acres).toBe(3);
    expect(profile.land_ownership).toBeUndefined();
  });

  it('reads romanised Telugu word numbers', () => {
    expect(extractProfile('naaku rendu ekaralu bhoomi undi').profile.land_acres).toBe(2);
  });

  it('reads romanised Telugu monthly income written before the amount', () => {
    const { profile } = extractProfile('naa daggara 3 ekaralu bhoomi undi. nelaku 10000 vastundi.');
    expect(profile.annual_household_income).toBe(120000);
  });
});

describe('Hindi statements', () => {
  it('reads Devanagari digits and the owner phrase', () => {
    const { profile, evidence } = extractProfile('मेरी ज़मीन है, ३ एकड़, मेरी उम्र ४५ साल है');
    expect(profile.land_acres).toBe(3);
    expect(profile.land_ownership).toBe('owner');
    expect(profile.age).toBe(45);
    expect(evidence.land_acres).toContain('एकड़');
  });

  it('reads a leased Hindi statement as tenant with leased area', () => {
    const { profile } = extractProfile('मैं 2 एकड़ ज़मीन पट्टे पर लेता हूँ।');
    expect(profile.land_ownership).toBe('tenant');
    expect(profile.leased_cultivated_land_acres).toBe(2);
  });

  it('reads Hindi number words in acres', () => {
    const { profile } = extractProfile('मेरे पास दो एकड़ ज़मीन है।');
    expect(profile.land_acres).toBe(2);
    expect(profile.land_ownership).toBeUndefined();
  });

  it('reads a lakh annual income and Devanagari digits in monthly income', () => {
    expect(extractProfile('हमारी आय 2 लाख रुपये सालाना है।').profile.annual_household_income).toBe(200000);
    expect(extractProfile('हमारी आय १५००० रुपये प्रति माह है।').profile.annual_household_income).toBe(180000);
  });

  it('reads Hindi bank account negation', () => {
    expect(extractProfile('मेरा बैंक खाता नहीं है।').profile.has_bank_account).toBe(false);
    expect(extractProfile('मेरा बैंक खाता है।').profile.has_bank_account).toBe(true);
  });

  it('reads Hindi farmer and female status', () => {
    const { profile } = extractProfile('मैं एक महिला किसान हूँ।');
    expect(profile.occupation).toBe('farmer');
    expect(profile.gender).toBe('female');
  });

  it('reads Hindi cents (guntha) as 40 per acre', () => {
    expect(extractProfile('मेरे पास 40 गुंठा ज़मीन है।').profile.land_acres).toBe(1);
  });

  it('reads romanised Hindi owner phrase with acres', () => {
    const { profile } = extractProfile('main kisan hoon, meri zameen 2 acre hai');
    expect(profile.occupation).toBe('farmer');
    expect(profile.land_acres).toBe(2);
    expect(profile.land_ownership).toBe('owner');
  });
});

describe('backward compatibility', () => {
  it('keeps the existing plain-acres behaviour for an owner statement', () => {
    const { profile } = extractProfile('I am a farmer in Andhra Pradesh. I own 2 acres of land.');
    expect(profile.land_acres).toBe(2);
    expect(profile.land_ownership).toBe('owner');
    expect(profile.occupation).toBe('farmer');
    expect(profile.state).toBe('Andhra Pradesh');
  });

  it('keeps the no-period income as unresolved', () => {
    expect(extractProfile('We have 50000 in savings.').profile.annual_household_income).toBeUndefined();
  });
});
