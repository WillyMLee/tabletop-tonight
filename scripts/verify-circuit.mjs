import {
  circuitFourSuggestedAssignments,
  circuitRounds,
  initialRoster,
} from '../convex/eventConfig.ts'

const teams = Object.fromEntries(initialRoster.map(player => [player.name, player.team]))
const firstThreeGames = new Map(initialRoster.map(player => [player.name, new Set()]))
const opponents = new Map(initialRoster.map(player => [player.name, new Set()]))

for (const [roundIndex, round] of circuitRounds.entries()) {
  const seen = []

  for (const station of round.stations) {
    const names = roundIndex === 3
      ? Object.entries(circuitFourSuggestedAssignments)
          .filter(([, pod]) => pod === station.pod)
          .map(([name]) => name)
      : station.players

    if (names.length !== 4) throw new Error(`${round.label} ${station.name} must have four players`)
    if (names.filter(name => teams[name] === 'meeple').length !== 2) {
      throw new Error(`${round.label} ${station.name} must have two players from each team`)
    }

    for (const name of names) {
      seen.push(name)
      if (roundIndex < 3) firstThreeGames.get(name).add(station.slug)
      for (const opponent of names) {
        if (teams[opponent] !== teams[name]) opponents.get(name).add(opponent)
      }
    }
  }

  if (seen.length !== initialRoster.length || new Set(seen).size !== initialRoster.length) {
    throw new Error(`${round.label} must use every player exactly once`)
  }
}

for (const player of initialRoster) {
  if (firstThreeGames.get(player.name).size !== 3) {
    throw new Error(`${player.name} does not play all three games in rounds 1–3`)
  }
  if (opponents.get(player.name).size !== 6) {
    throw new Error(`${player.name} does not meet all six opposing-team players`)
  }
}

console.log('Circuit verified: every station is 2v2, all players rotate through all three games, and every opposing pair meets.')
