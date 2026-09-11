export const CRITERIA = [
  {
    id: "impact",
    name: "Impact",
    description:
      "How much impact (quality and quantity) can this project have? Does it solve a big problem or a little problem? Will it inspire or help many, or a few?",
  },
  {
    id: "creativity",
    name: "Creativity",
    description:
      "How creative/innovative is the approach? Is the project novel and something that hasn't been attempted before, or is it an incremental improvement on something that already exists?",
  },
  {
    id: "validity",
    name: "Validity",
    description:
      "Is the solution scientifically valid? Will it do what it sets out to do? Can it work in the real world?",
  },
  {
    id: "relevance",
    name: "Relevance",
    description:
      "Is this project responsive to the challenge for which it was submitted? Is it a complete solution or does it have a long way to go? Is it technically feasible? How usable or user friendly is the solution?",
  },
  {
    id: "presentation",
    name: "Presentation",
    description:
      "How well did the team communicate their project? Were they effective in telling the story of the project: the challenge, the solution, and why it is important?",
  },
];
export const AWARDS = {
  Agriculture: [
    [
      "agri-excellence",
      "Agri Innovation Excellence Award",
      "Most innovative agriculture idea",
    ],
    [
      "agri-impact",
      "Agricultural Impact Award",
      "Solution with the greatest benefit to farmers/agriculture",
    ],
    [
      "agri-sustainable",
      "Sustainable Agriculture Award",
      "Best environmentally sustainable solution",
    ],
    [
      "agri-smart",
      "Smart Farming Award",
      "Best idea for making farming smarter and more efficient",
    ],
    [
      "agri-empowerment",
      "Farmer Empowerment Award",
      "Best solution directly supporting farmers and their livelihoods",
    ],
    [
      "agri-future",
      "Future of Agriculture Award",
      "Most promising idea capable of transforming agriculture in the future",
    ],
  ],
  Healthcare: [
    [
      "health-excellence",
      "Healthcare Innovation Excellence Award",
      "Most innovative healthcare solution",
    ],
    [
      "health-impact",
      "Healthcare Impact Award",
      "Solution capable of creating significant healthcare impact",
    ],
    [
      "health-digital",
      "Digital Health Innovation Award",
      "Best use of digital solutions in healthcare",
    ],
    [
      "health-care",
      "Patient Care Excellence Award",
      "Best solution for improving patient care and experience",
    ],
    [
      "health-accessible",
      "Accessible Healthcare Award",
      "Best idea for making healthcare more affordable or accessible",
    ],
    [
      "health-future",
      "Future of Healthcare Award",
      "Most promising idea for the future of healthcare",
    ],
  ],
  Education: [
    [
      "edu-excellence",
      "Educational Innovation Excellence Award",
      "Most innovative education solution",
    ],
    [
      "edu-impact",
      "Learning Impact Award",
      "Solution with the greatest potential to improve learning",
    ],
    [
      "edu-future",
      "Future of Education Award",
      "Most promising idea for transforming education",
    ],
    [
      "edu-inclusive",
      "Inclusive Education Award",
      "Best solution for making education accessible to everyone",
    ],
    [
      "edu-empowerment",
      "Student Empowerment Award",
      "Best idea that directly supports students and their development",
    ],
    [
      "edu-smart",
      "Smart Learning Award",
      "Best solution for making teaching or learning smarter and more effective",
    ],
  ],
};
export function validScores(scores, complete = false) {
  return (
    scores &&
    typeof scores === "object" &&
    !Array.isArray(scores) &&
    Object.keys(scores).every((key) => CRITERIA.some((c) => c.id === key)) &&
    Object.values(scores).every(
      (value) => Number.isInteger(value) && value >= 0 && value <= 5,
    ) &&
    (!complete || CRITERIA.every((c) => Object.hasOwn(scores, c.id)))
  );
}
export const scoreTotal = (scores) =>
  CRITERIA.reduce((total, c) => total + (scores?.[c.id] ?? 0), 0);
export function decodeEvaluation(row) {
  if (!row) return null;
  return {
    ...row,
    nominations: JSON.parse(row.nominations),
    scores: JSON.parse(row.scores),
    team_snapshot: JSON.parse(row.team_snapshot),
  };
}
