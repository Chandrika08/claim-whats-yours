export type Profile = {
  state: string | null;                 // "Andhra Pradesh"
  age: number | null;
  gender: "male" | "female" | "other" | null;
  occupation: "farmer" | "agricultural_labourer" | "student" | "other" | null;
  land_acres: number | null;
  land_ownership: "owner" | "tenant" | "none" | null;
  leased_cultivated_land_acres?: number | null;  // acres cultivated on lease, separate from land_acres (owned)
  has_ccrc?: boolean | null;                     // Common Charter of Rights for Cultivators card
  epanta_booked?: boolean | null;                // e-Panta crop booking done
  annual_household_income: number | null;   // rupees per year
  social_category: "general" | "obc" | "sc" | "st" | null;  // optional, not used by current schemes, do not ask
  has_bank_account: boolean | null;
  household_has_senior: boolean | null;     // anyone aged 60+
  household_has_student: boolean | null;
  is_income_taxpayer: boolean | null;
  is_govt_employee: boolean | null;
  family_excluded_category: boolean | null; // minister/MP/MLA/mayor, registered professional, or pension of Rs 10,000+
  in_land_records_aug_2019: boolean | null;
  covered_by_other_pension: boolean | null;
  is_widow: boolean | null;
  is_bpl: boolean | null;
  lives_in_rural_area: boolean | null;
  is_destitute: boolean | null;             // little or no means of living and no family to depend on
};

export type Rule = {
  id: string;
  field: keyof Profile;
  op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in" | "is_true" | "is_false";
  value?: unknown;
  hard: boolean;          // hard = must pass to be eligible; soft = note only
  explain: string;        // plain-language reason shown to the user
};

export type Scheme = {
  id: string; name: string; level: "central" | "state"; state: string;   // "ALL" or "Andhra Pradesh"
  category: string; benefit_summary: string;
  official_url: string; last_verified: string;                            // YYYY-MM-DD
  rules: Rule[];
  documents: { name: string; why: string; where_to_get: string }[];
  apply_steps: string[];
  deadline: { type: "rolling" | "fixed" | "seasonal"; date: string | null; note: string };
};

export type RuleResult = { ruleId: string; field: string; result: "pass" | "fail" | "unknown"; explain: string; profileValue: unknown };
export type MatchResult = {
  schemeId: string;
  status: "likely_eligible" | "possibly_eligible" | "not_eligible";
  ruleResults: RuleResult[];
  missingFields: string[];
};
