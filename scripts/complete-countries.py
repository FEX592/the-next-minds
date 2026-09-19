from pathlib import Path
p=Path('/home/ubuntu/the-next-mind/server/routers.ts')
s=p.read_text()
s=s.replace('import { z } from "zod";', 'import { z } from "zod";\nimport { getCountries, getCountryCallingCode } from "libphonenumber-js";')
old='const levels: Record<string, string[]> = { Nigeria: ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"], Ghana: ["Basic 7", "Basic 8", "Basic 9", "SHS 1", "SHS 2", "SHS 3"], "United Kingdom": ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Sixth Form"], "United States": ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"] };\nconst countries = [{ name: "Nigeria", code: "+234", flag: "🇳🇬" }, { name: "Ghana", code: "+233", flag: "🇬🇭" }, { name: "United Kingdom", code: "+44", flag: "🇬🇧" }, { name: "United States", code: "+1", flag: "🇺🇸" }];'
new='''const tailoredLevels: Record<string, string[]> = { Nigeria: ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"], Ghana: ["Basic 7", "Basic 8", "Basic 9", "SHS 1", "SHS 2", "SHS 3"], "United Kingdom": ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Sixth Form"], "United States": ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"] };
const genericLevels = ["Middle school", "High school", "College / university", "Apprentice / vocational", "Other"];
const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
const flagFor = (code: string) => code.replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
const countries = getCountries().map(code => ({ name: displayNames.of(code) || code, isoCode: code, code: `+${getCountryCallingCode(code)}`, flag: flagFor(code) })).filter((country, index, list) => list.findIndex(item => item.name === country.name && item.code === country.code) === index).sort((a, b) => a.name.localeCompare(b.name));
const levels: Record<string, string[]> = Object.fromEntries(countries.map(country => [country.name, tailoredLevels[country.name] ?? genericLevels]));'''
if old not in s: raise SystemExit('country block not found')
s=s.replace(old,new)
p.write_text(s)
