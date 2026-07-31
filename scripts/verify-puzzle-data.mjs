import { activeConnections, activeWordle, connectionWords } from '../src/data/puzzles.js'

if (!/^[A-Z]{5}$/.test(activeWordle.answer)) throw new Error('The active Wordle answer must be exactly five A-Z letters')
if (!/^[a-z0-9-]{3,64}$/.test(activeWordle.id)) throw new Error('The Wordle puzzle ID is invalid')
if (!/^[a-z0-9-]{3,64}$/.test(activeConnections.id)) throw new Error('The Connections puzzle ID is invalid')
if (activeConnections.groups.length !== 4 || activeConnections.groups.some(group => group.words.length !== 4)) {
  throw new Error('Connections requires exactly four groups of four words')
}

const answers = activeConnections.groups.flatMap(group => group.words)
if (new Set(answers).size !== 16 || new Set(connectionWords).size !== 16 || answers.some(word => !connectionWords.includes(word))) {
  throw new Error('Connections must contain the same 16 unique words in its groups and display order')
}

console.log('Puzzle data verified: one Wordle answer and four Connections groups are ready.')
