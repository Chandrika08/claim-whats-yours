# Scheme data guide

## Where the data comes from
- myscheme.gov.in (search by scheme name; filter by state "Andhra Pradesh" and category "Agriculture, Rural & Environment")
- The scheme's own official portal (link is usually on the myscheme page). Cross-check both.
Use only public pages. No personal data. Note the date you checked (last_verified).

## Which schemes (aim for 8 to 10)
Central, usually relevant to small farmers (look each up and confirm it is active):
- PM-KISAN
- Pradhan Mantri Fasal Bima Yojana (crop insurance)
- Kisan Credit Card
- PM Kisan Maandhan Yojana (pension)
- Soil Health Card scheme
- Ayushman Bharat PM-JAY (health cover) and/or a pension scheme for senior citizens
Andhra Pradesh: pick 3 or 4 that the portal currently lists as active for farmers or rural families. Skip anything marked closed or unclear.

## What to copy for each scheme (paste into chat using this template)
SCHEME NAME:
URL:
DATE CHECKED:
BENEFIT (copy the text):
ELIGIBILITY (copy the text):
EXCLUSIONS (if any):
DOCUMENTS REQUIRED (copy the text):
HOW TO APPLY (copy the text):
DEADLINE / WINDOW (if any):

## How rules get written (examples of the pattern, values come from the portal)
| Text on the portal | Rule |
|---|---|
| "Farmer family owning cultivable land" | land_ownership in [owner], hard |
| "Age between X and Y" | age gte X, age lte Y, both hard |
| "Annual family income below N" | annual_household_income lt N, hard |
| "Government employees are excluded" | is_govt_employee is_false, hard |
| "Preference for women" | gender eq female, soft |
- If a rule needs a field we do not have, say so and we either add a field or leave it out. Never invent a rule.
- If the portal text is vague, mark that rule soft and explain in the text.
- "explain" is one plain sentence a farmer would understand.

## Dummy data
seed/sample-profiles.json has 4 invented people. Add more if you want, always invented.
