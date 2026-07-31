export const eventDetails = {
  title: 'Game Night',
  date: 'Saturday, August 1, 2026',
  host: 'Jessa',
  playerCount: 14,
}

export const initialRoster = [
  { id: 1, name: 'Don Robert', team: 'meeple' as const },
  { id: 2, name: 'Melissa', team: 'meeple' as const },
  { id: 3, name: 'Julie', team: 'meeple' as const },
  { id: 4, name: 'Thomas', team: 'meeple' as const },
  { id: 5, name: 'Valeria', team: 'meeple' as const },
  { id: 6, name: 'Annhien', team: 'meeple' as const },
  { id: 7, name: 'Rebekah', team: 'meeple' as const },
  { id: 8, name: 'Willy', team: 'mayhem' as const },
  { id: 9, name: 'Brendan', team: 'mayhem' as const },
  { id: 10, name: 'Joanna', team: 'mayhem' as const },
  { id: 11, name: 'Omar', team: 'mayhem' as const },
  { id: 12, name: 'Andrew', team: 'mayhem' as const },
  { id: 13, name: 'Young', team: 'mayhem' as const },
  { id: 14, name: 'Janice', team: 'mayhem' as const },
]

export const jengaMatches = [
  ['Don Robert', 'Willy'],
  ['Melissa', 'Brendan'],
  ['Julie', 'Joanna'],
  ['Thomas', 'Omar'],
  ['Valeria', 'Andrew'],
  ['Annhien', 'Young'],
  ['Rebekah', 'Janice'],
]

export const circuitRounds = [
  {
    label: 'Circuit 1', time: '8:00–8:20 PM',
    stations: [
      { slug: 'mario-strikers-gc', name: 'Mario Strikers', location: 'Couch', players: ['Don Robert', 'Julie', 'Young', 'Janice'] },
      { slug: 'blokus', name: 'Blokus', location: 'Dinner Table #1', players: ['Melissa', 'Annhien', 'Willy', 'Andrew'] },
      { slug: 'flip-7', name: 'Flip 7', location: 'Dinner Table #2', players: ['Thomas', 'Valeria', 'Rebekah', 'Brendan', 'Joanna', 'Omar'] },
    ],
  },
  {
    label: 'Circuit 2', time: '8:25–8:45 PM',
    stations: [
      { slug: 'mario-strikers-gc', name: 'Mario Strikers', location: 'Couch', players: ['Don Robert', 'Rebekah', 'Willy', 'Joanna'] },
      { slug: 'blokus', name: 'Blokus', location: 'Dinner Table #1', players: ['Melissa', 'Valeria', 'Brendan', 'Young'] },
      { slug: 'flip-7', name: 'Flip 7', location: 'Dinner Table #2', players: ['Julie', 'Thomas', 'Annhien', 'Omar', 'Andrew', 'Janice'] },
    ],
  },
  {
    label: 'Circuit 3', time: '8:50–9:10 PM',
    stations: [
      { slug: 'mario-strikers-gc', name: 'Mario Strikers', location: 'Couch', players: ['Melissa', 'Thomas', 'Willy', 'Omar'] },
      { slug: 'blokus', name: 'Blokus', location: 'Dinner Table #1', players: ['Julie', 'Rebekah', 'Brendan', 'Janice'] },
      { slug: 'flip-7', name: 'Flip 7', location: 'Dinner Table #2', players: ['Don Robert', 'Valeria', 'Annhien', 'Joanna', 'Andrew', 'Young'] },
    ],
  },
  {
    label: 'Circuit 4', time: '9:15–9:35 PM',
    stations: [
      { slug: 'mario-strikers-gc', name: 'Mario Strikers', location: 'Couch', players: ['Valeria', 'Annhien', 'Brendan', 'Andrew'] },
      { slug: 'blokus', name: 'Blokus', location: 'Dinner Table #1', players: ['Don Robert', 'Thomas', 'Joanna', 'Omar'] },
      { slug: 'flip-7', name: 'Flip 7', location: 'Dinner Table #2', players: ['Melissa', 'Julie', 'Rebekah', 'Willy', 'Young', 'Janice'] },
    ],
  },
]

export const eventTimeline = [
  { time: '6:00–6:15', activity: 'Arrival and setup', detail: 'Claim your pre-listed name, find your team, and get settled.' },
  { time: '6:15–6:20', activity: 'Welcome and rules', detail: 'Jessa explains individual and team scoring plus the tie-breaker.' },
  { time: '6:20–6:45', activity: 'GeoGuessr', detail: 'Three five-location rounds; one envelope after each round.' },
  { time: '6:45–7:10', activity: 'Wordle', detail: 'Five words; one envelope after each word.' },
  { time: '7:10–7:30', activity: 'Connections', detail: 'Three fastest-solve rounds; one envelope after each round.' },
  { time: '7:30–8:00', activity: 'Jenga head-to-head', detail: 'Seven cross-team matches with a four-minute hard stop.' },
  { time: '8:00–9:35', activity: 'Main circuit', detail: 'Four 20-minute rounds with a five-minute switch after rounds 1–3.' },
  { time: '9:35–9:45', activity: 'Final scoring', detail: 'Add points and run one sudden-death tie-breaker only if needed.' },
  { time: '9:45–9:50', activity: 'Final prizes', detail: 'Award the individual champion and every winning-team member.' },
]

export const pointRules = [
  { result: 'GeoGuessr, Wordle, or Connections win', individual: 3, team: 3 },
  { result: 'Jenga 1v1 win', individual: 1, team: 1 },
  { result: 'Blokus, Mario Strikers, or Flip 7 win', individual: 2, team: 2 },
]

export const envelopeGroups = [
  { title: 'Group Games', amount: '$1', labels: ['GeoGuessr — Round 1 Winner', 'GeoGuessr — Round 2 Winner', 'GeoGuessr — Round 3 Winner', 'Wordle — Word 1 Winner', 'Wordle — Word 2 Winner', 'Wordle — Word 3 Winner', 'Wordle — Word 4 Winner', 'Wordle — Word 5 Winner', 'Connections — Round 1 Winner', 'Connections — Round 2 Winner', 'Connections — Round 3 Winner', ...Array.from({ length: 7 }, (_, index) => `Jenga — Match ${index + 1} Winner`)] },
  { title: 'Main Circuit', amount: '$1', labels: circuitRounds.flatMap((round, index) => ['Blokus', 'Mario Soccer', 'Flip 7'].map(game => `Circuit Round ${index + 1} — ${game} Winner`)) },
  { title: 'Final Awards', amount: '$5', labels: ['Individual Champion', ...Array.from({ length: 7 }, (_, index) => `Winning Team Member ${index + 1}`)] },
]
