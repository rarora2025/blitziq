import type { BankQuestion } from "./types";

type Seed = Omit<BankQuestion, "isSeed" | "options"> & { options: string[] };

const raw: Seed[] = [
  // Player battles
  {
    id: "seed-01",
    category: "Player battles",
    prompt: "Which quarterback throws for more yards in {q}?",
    options: ["{away} QB", "{home} QB"],
    rule: "Official passing yards during the quarter only. If they are tied, the question is voided.",
  },
  {
    id: "seed-02",
    category: "Player battles",
    prompt: "Which team piles up more rushing yards in {q}?",
    options: ["{away}", "{home}"],
    rule: "Team rushing yards during the quarter. Kneel-downs count. A tie voids the question.",
  },
  {
    id: "seed-03",
    category: "Player battles",
    prompt: "Does a quarterback pick up a first down with his legs in {q}?",
    options: ["Both QBs do", "Just one", "Neither"],
    rule: "A designed run or scramble by either starting or backup QB that gains a first down or scores.",
  },
  {
    id: "seed-04",
    category: "Player battles",
    prompt: "Who catches the longest pass of {q}?",
    options: ["A wide receiver", "A tight end", "A running back", "No completions"],
    rule: "Longest completed reception in the quarter, by the player's listed position on the official roster.",
  },
  // Biggest plays
  {
    id: "seed-05",
    category: "Biggest plays",
    prompt: "Who makes the longest offensive play of {q}?",
    options: ["{away}", "{home}"],
    rule: "Longest single rush or reception from scrimmage in the quarter. A tie voids the question.",
  },
  {
    id: "seed-06",
    category: "Biggest plays",
    prompt: "How long is the biggest play from scrimmage in {q}?",
    options: ["Under 20 yards", "20 to 34 yards", "35 to 49 yards", "50+ yards"],
    rule: "Longest rush or reception by either team in the quarter, using the official play-by-play.",
  },
  {
    id: "seed-07",
    category: "Biggest plays",
    prompt: "Does anybody rip off a 40+ yard play in {q}?",
    options: ["Yes", "No"],
    rule: "Any rush, reception or return of 40 or more yards. Plays wiped out by penalty do not count.",
  },
  {
    id: "seed-08",
    category: "Biggest plays",
    prompt: "What kind of play is the biggest gain of {q}?",
    options: ["A pass", "A run", "A return"],
    rule: "Compares the longest pass, run, and kick, punt or turnover return of the quarter.",
  },
  // Touchdowns
  {
    id: "seed-09",
    category: "Touchdowns",
    prompt: "How will the first touchdown of {q} be scored?",
    options: ["Passing TD", "Rushing TD", "Defense or special teams", "No touchdown"],
    rule: "The first touchdown scored in the quarter by either team.",
  },
  {
    id: "seed-10",
    category: "Touchdowns",
    prompt: "Who finds the end zone first in {q}?",
    options: ["{away}", "{home}", "Nobody scores a TD"],
    rule: "The first touchdown of the quarter, by either team, on any type of play.",
  },
  {
    id: "seed-11",
    category: "Touchdowns",
    prompt: "How many touchdowns are scored in {q}?",
    options: ["Zero", "One", "Two", "Three or more"],
    rule: "Total touchdowns by both teams during the quarter.",
  },
  {
    id: "seed-12",
    category: "Touchdowns",
    prompt: "Does a quarterback run one in himself in {q}?",
    options: ["Yes", "No"],
    rule: "A rushing touchdown by any quarterback, including sneaks.",
  },
  // Comebacks
  {
    id: "seed-13",
    category: "Comebacks",
    prompt: "Does the trailing team win {q}?",
    options: ["Yes, they outscore the leader", "No", "The quarter is tied"],
    rule: "Compares points scored in the quarter only. If the game is tied when the quarter starts, the question is voided.",
  },
  {
    id: "seed-14",
    category: "Comebacks",
    prompt: "Will the lead change hands in {q}?",
    options: ["Yes", "No"],
    rule: "Yes if a team that was not leading when the quarter started takes the lead at any point in the quarter.",
  },
  {
    id: "seed-15",
    category: "Comebacks",
    prompt: "Who's on top when {q} ends?",
    options: ["{away}", "{home}", "All tied up"],
    rule: "The game score at the end of the quarter.",
  },
  // Turnovers
  {
    id: "seed-16",
    category: "Turnovers",
    prompt: "Will anyone cough it up in {q}?",
    options: ["Yes, there's a turnover", "No, clean quarter"],
    rule: "An interception or a lost fumble by either team. Turnovers on downs do not count.",
  },
  {
    id: "seed-17",
    category: "Turnovers",
    prompt: "What's the first takeaway of {q}?",
    options: ["Interception", "Fumble recovery", "No takeaways"],
    rule: "The first interception or lost fumble of the quarter.",
  },
  {
    id: "seed-18",
    category: "Turnovers",
    prompt: "Which defense wins the turnover battle in {q}?",
    options: ["{away}", "{home}", "Even"],
    rule: "Interceptions plus fumbles recovered during the quarter. Zero to zero counts as even.",
  },
  // Coaching decisions
  {
    id: "seed-19",
    category: "Coaching decisions",
    prompt: "Does a coach throw the red challenge flag in {q}?",
    options: ["Yes", "No"],
    rule: "Any coach's challenge. Booth reviews do not count.",
  },
  {
    id: "seed-20",
    category: "Coaching decisions",
    prompt: "Does anyone go for two in {q}?",
    options: ["Yes", "No"],
    rule: "Any two-point conversion attempt, successful or not. A penalty-erased attempt still counts if it was snapped.",
  },
  {
    id: "seed-21",
    category: "Coaching decisions",
    prompt: "Does a kicker attempt a 50+ yard field goal in {q}?",
    options: ["Yes, and it's good", "Yes, and it's no good", "No attempt"],
    rule: "A field goal attempt of 50 yards or longer. If there are several, the first one decides it.",
  },
  // Quarter scoring
  {
    id: "seed-22",
    category: "Quarter scoring",
    prompt: "Who wins {q} on the scoreboard?",
    options: ["{away}", "{home}", "Tied quarter"],
    rule: "Points scored during the quarter only.",
  },
  {
    id: "seed-23",
    category: "Quarter scoring",
    prompt: "How many total points go up in {q}?",
    options: ["0 to 6", "7 to 13", "14 to 20", "21 or more"],
    rule: "Combined points scored by both teams during the quarter.",
  },
  {
    id: "seed-24",
    category: "Quarter scoring",
    prompt: "What's the first score of {q}?",
    options: ["Touchdown", "Field goal", "Safety", "No points"],
    rule: "The first scoring play of the quarter. Extra points do not count as a separate score.",
  },
  // Fourth-down gambles
  {
    id: "seed-25",
    category: "Fourth-down gambles",
    prompt: "Will either team convert a fourth down in {q}?",
    options: ["Yes", "No"],
    rule: "A fourth-down play that gains a first down or scores, including fakes. Penalties that award a first down count.",
  },
  {
    id: "seed-26",
    category: "Fourth-down gambles",
    prompt: "How many times does somebody go for it on fourth in {q}?",
    options: ["Never", "Once", "Twice or more"],
    rule: "Offensive plays snapped on fourth down that are not punts or field goal attempts.",
  },
  {
    id: "seed-27",
    category: "Fourth-down gambles",
    prompt: "Who rolls the dice on fourth down first in {q}?",
    options: ["{away}", "{home}", "Nobody does"],
    rule: "The first team to run an offensive play on fourth down that is not a punt or field goal attempt.",
  },
  // Wild cards
  {
    id: "seed-28",
    category: "Wild cards",
    prompt: "What happens on the final scoring possession of {q}?",
    options: ["Touchdown", "Field goal", "Defensive score", "No points in the quarter"],
    rule: "The last scoring play of the quarter. Pick-sixes, fumble returns and safeties count as defensive scores.",
  },
  {
    id: "seed-29",
    category: "Wild cards",
    prompt: "Does a flag wipe out a touchdown in {q}?",
    options: ["Yes", "No"],
    rule: "A touchdown signaled on the field that is nullified by a penalty. Overturned reviews do not count.",
  },
  {
    id: "seed-30",
    category: "Wild cards",
    prompt: "How many sacks in {q}?",
    options: ["None", "One", "Two", "Three or more"],
    rule: "Official sacks recorded by both defenses during the quarter.",
  },
];

const IDS = ["a", "b", "c", "d"];

export const SEED_QUESTIONS: BankQuestion[] = raw.map((q) => ({
  ...q,
  isSeed: true,
  options: q.options.map((label, i) => ({ id: IDS[i], label })),
}));

/** A balanced default set: five different categories per quarter, no repeats across the game. */
export const DEFAULT_QUARTERS: string[][] = [
  ["seed-05", "seed-09", "seed-01", "seed-25", "seed-28"],
  ["seed-10", "seed-06", "seed-16", "seed-20", "seed-22"],
  ["seed-15", "seed-07", "seed-17", "seed-27", "seed-03"],
  ["seed-13", "seed-11", "seed-18", "seed-21", "seed-29"],
];

export function render(text: string, ctx: { home: string; away: string; quarter: number }) {
  return text
    .replaceAll("{home}", ctx.home)
    .replaceAll("{away}", ctx.away)
    .replaceAll("{q}", `Q${ctx.quarter}`);
}
