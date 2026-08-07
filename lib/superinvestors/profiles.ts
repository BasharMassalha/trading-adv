/**
 * Superinvestor identity metadata only.
 * Holdings always come from live SEC 13F (see live.ts) — never hardcoded here.
 */

export type SuperinvestorProfile = {
  id: string;
  name: string;
  firm: string;
  /** Short style label for UI badges (not filing data). */
  style: string;
  /** Filing CIK when a public 13F exists. */
  cik?: string;
  reportingEntity: string;
  /** One-line identity — not portfolio or market commentary. */
  bio: string;
};

export const SUPERINVESTOR_PROFILES: SuperinvestorProfile[] = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    firm: "Berkshire Hathaway",
    style: "Value / quality",
    cik: "0001067983",
    reportingEntity: "Berkshire Hathaway Inc.",
    bio: "Chairman of Berkshire Hathaway. 13F filer for Berkshire’s public equity portfolio.",
  },
  {
    id: "mohnish-pabrai",
    name: "Mohnish Pabrai",
    firm: "Pabrai Investment Funds",
    style: "Deep value",
    cik: "0001549575",
    reportingEntity: "Dalal Street, LLC",
    bio: "Value investor. U.S. 13F reported via Dalal Street, LLC.",
  },
  {
    id: "charlie-munger",
    name: "Charlie Munger",
    firm: "Berkshire Hathaway (historical)",
    style: "Value (historical)",
    reportingEntity: "No active personal 13F",
    bio: "Former Vice Chairman of Berkshire Hathaway (d. 2023). No active personal Form 13F — listed for reference only.",
  },
  {
    id: "li-lu",
    name: "Li Lu",
    firm: "Himalaya Capital",
    style: "Value",
    cik: "0001709323",
    reportingEntity: "Himalaya Capital Management LLC",
    bio: "Founder of Himalaya Capital. Holdings from Himalaya Capital Management LLC 13F.",
  },
  {
    id: "guy-spier",
    name: "Guy Spier",
    firm: "Aquamarine Capital",
    style: "Value",
    cik: "0001953324",
    reportingEntity: "Aquamarine Zurich AG",
    bio: "Aquamarine Capital. Holdings from Aquamarine Zurich AG 13F when filed.",
  },
  {
    id: "cathie-wood",
    name: "Cathie Wood",
    firm: "ARK Invest",
    style: "Innovation / growth",
    cik: "0001697748",
    reportingEntity: "ARK Investment Management LLC",
    bio: "CEO of ARK Invest. Holdings from ARK Investment Management LLC 13F.",
  },
  {
    id: "ron-baron",
    name: "Ron Baron",
    firm: "Baron Capital",
    style: "Growth",
    cik: "0001017918",
    reportingEntity: "BAMCO Inc.",
    bio: "Founder of Baron Capital. Holdings from BAMCO Inc. 13F.",
  },
  {
    id: "chase-coleman",
    name: "Chase Coleman",
    firm: "Tiger Global Management",
    style: "Growth / tech",
    cik: "0001167483",
    reportingEntity: "Tiger Global Management LLC",
    bio: "Founder of Tiger Global. Holdings from Tiger Global Management LLC 13F.",
  },
  {
    id: "philippe-laffont",
    name: "Philippe Laffont",
    firm: "Coatue Management",
    style: "Tech / growth",
    cik: "0001135730",
    reportingEntity: "Coatue Management LLC",
    bio: "Founder of Coatue. Holdings from Coatue Management LLC 13F.",
  },
  {
    id: "ray-dalio",
    name: "Ray Dalio",
    firm: "Bridgewater Associates",
    style: "Global macro",
    cik: "0001350694",
    reportingEntity: "Bridgewater Associates, LP",
    bio: "Founder of Bridgewater. Equity/options slice from Bridgewater Associates, LP 13F.",
  },
  {
    id: "stanley-druckenmiller",
    name: "Stanley Druckenmiller",
    firm: "Duquesne Family Office",
    style: "Macro / opportunistic",
    cik: "0001536411",
    reportingEntity: "Duquesne Family Office LLC",
    bio: "Duquesne Family Office. Holdings from Duquesne Family Office LLC 13F.",
  },
  {
    id: "david-tepper",
    name: "David Tepper",
    firm: "Appaloosa Management",
    style: "Opportunistic",
    cik: "0001656456",
    reportingEntity: "Appaloosa LP",
    bio: "Founder of Appaloosa. Holdings from Appaloosa LP 13F.",
  },
  {
    id: "paul-tudor-jones",
    name: "Paul Tudor Jones",
    firm: "Tudor Investment Corp",
    style: "Global macro",
    cik: "0000923093",
    reportingEntity: "Tudor Investment Corp ET AL",
    bio: "Founder of Tudor. Holdings from Tudor Investment Corp ET AL 13F.",
  },
  {
    id: "carl-icahn",
    name: "Carl Icahn",
    firm: "Icahn Enterprises",
    style: "Activist",
    cik: "0000921669",
    reportingEntity: "Icahn Carl C",
    bio: "Activist investor. Holdings from Icahn Carl C 13F.",
  },
  {
    id: "bill-ackman",
    name: "Bill Ackman",
    firm: "Pershing Square Capital Management",
    style: "Concentrated / activist",
    cik: "0001336528",
    reportingEntity: "Pershing Square Capital Management, L.P.",
    bio: "Founder of Pershing Square. Holdings from Pershing Square Capital Management, L.P. 13F.",
  },
  {
    id: "michael-burry",
    name: "Michael Burry",
    firm: "Scion Asset Management",
    style: "Contrarian / value",
    cik: "0001649339",
    reportingEntity: "Scion Asset Management, LLC",
    bio: "Scion Asset Management. Holdings and disclosed puts from Scion Asset Management, LLC 13F.",
  },
  {
    id: "daniel-loeb",
    name: "Daniel Loeb",
    firm: "Third Point",
    style: "Event-driven",
    cik: "0001040273",
    reportingEntity: "Third Point LLC",
    bio: "Founder of Third Point. Holdings from Third Point LLC 13F.",
  },
  {
    id: "jim-simons",
    name: "Jim Simons",
    firm: "Renaissance Technologies",
    style: "Quantitative",
    cik: "0001037389",
    reportingEntity: "Renaissance Technologies LLC",
    bio: "Founder of Renaissance (d. 2024). Public 13F is Renaissance Technologies LLC — not the private Medallion fund.",
  },
  {
    id: "ken-griffin",
    name: "Ken Griffin",
    firm: "Citadel",
    style: "Multi-strategy",
    cik: "0001423053",
    reportingEntity: "Citadel Advisors LLC",
    bio: "Founder of Citadel. Holdings from Citadel Advisors LLC 13F (aggregates many strategies).",
  },
  {
    id: "israel-englander",
    name: "Israel Englander",
    firm: "Millennium Management",
    style: "Multi-manager",
    cik: "0001273087",
    reportingEntity: "Millennium Management LLC",
    bio: "Founder of Millennium. Holdings from Millennium Management LLC 13F.",
  },
];

export function getProfileById(id: string): SuperinvestorProfile | undefined {
  return SUPERINVESTOR_PROFILES.find((p) => p.id === id);
}
