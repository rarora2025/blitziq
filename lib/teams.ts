export interface Team {
  name: string;
  city: string;
  abbr: string;
  color: string;
}

export const TEAMS: Team[] = [
  { name: "Cardinals", city: "Arizona", abbr: "ARI", color: "#97233F" },
  { name: "Falcons", city: "Atlanta", abbr: "ATL", color: "#A71930" },
  { name: "Ravens", city: "Baltimore", abbr: "BAL", color: "#241773" },
  { name: "Bills", city: "Buffalo", abbr: "BUF", color: "#00338D" },
  { name: "Panthers", city: "Carolina", abbr: "CAR", color: "#0085CA" },
  { name: "Bears", city: "Chicago", abbr: "CHI", color: "#0B162A" },
  { name: "Bengals", city: "Cincinnati", abbr: "CIN", color: "#FB4F14" },
  { name: "Browns", city: "Cleveland", abbr: "CLE", color: "#311D00" },
  { name: "Cowboys", city: "Dallas", abbr: "DAL", color: "#003594" },
  { name: "Broncos", city: "Denver", abbr: "DEN", color: "#FB4F14" },
  { name: "Lions", city: "Detroit", abbr: "DET", color: "#0076B6" },
  { name: "Packers", city: "Green Bay", abbr: "GB", color: "#203731" },
  { name: "Texans", city: "Houston", abbr: "HOU", color: "#03202F" },
  { name: "Colts", city: "Indianapolis", abbr: "IND", color: "#002C5F" },
  { name: "Jaguars", city: "Jacksonville", abbr: "JAX", color: "#006778" },
  { name: "Chiefs", city: "Kansas City", abbr: "KC", color: "#E31837" },
  { name: "Raiders", city: "Las Vegas", abbr: "LV", color: "#A5ACAF" },
  { name: "Chargers", city: "Los Angeles", abbr: "LAC", color: "#0080C6" },
  { name: "Rams", city: "Los Angeles", abbr: "LAR", color: "#003594" },
  { name: "Dolphins", city: "Miami", abbr: "MIA", color: "#008E97" },
  { name: "Vikings", city: "Minnesota", abbr: "MIN", color: "#4F2683" },
  { name: "Patriots", city: "New England", abbr: "NE", color: "#002244" },
  { name: "Saints", city: "New Orleans", abbr: "NO", color: "#D3BC8D" },
  { name: "Giants", city: "New York", abbr: "NYG", color: "#0B2265" },
  { name: "Jets", city: "New York", abbr: "NYJ", color: "#125740" },
  { name: "Eagles", city: "Philadelphia", abbr: "PHI", color: "#004C54" },
  { name: "Steelers", city: "Pittsburgh", abbr: "PIT", color: "#FFB612" },
  { name: "49ers", city: "San Francisco", abbr: "SF", color: "#AA0000" },
  { name: "Seahawks", city: "Seattle", abbr: "SEA", color: "#69BE28" },
  { name: "Buccaneers", city: "Tampa Bay", abbr: "TB", color: "#D50A0A" },
  { name: "Titans", city: "Tennessee", abbr: "TEN", color: "#4B92DB" },
  { name: "Commanders", city: "Washington", abbr: "WAS", color: "#5A1414" },
];

export function team(name: string): Team {
  return (
    TEAMS.find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? {
      name,
      city: "",
      abbr: name.slice(0, 3).toUpperCase(),
      color: "#3F3F46",
    }
  );
}
