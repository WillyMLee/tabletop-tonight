import { connectionsRounds, shuffleWordleWords, wordleRounds, wordleWordPool } from '../src/data/puzzles.js'

if (wordleWordPool.length !== 10 || new Set(wordleWordPool).size !== wordleWordPool.length) throw new Error('The Wordle pool requires exactly ten unique words')
if (wordleWordPool.some(word => !/^[A-Z]{5}$/.test(word))) throw new Error('Every Wordle pool entry must have exactly five A-Z letters')
if (wordleRounds.length !== 5) throw new Error('Exactly five Wordle rounds are required')
for (const round of wordleRounds) {
  if (!/^[A-Z]{5}$/.test(round.answer)) throw new Error(`${round.id} must have exactly five A-Z letters`)
  if (!/^[a-z0-9-]{3,64}$/.test(round.id)) throw new Error(`Invalid Wordle puzzle ID: ${round.id}`)
  if (!wordleWordPool.includes(round.answer)) throw new Error(`${round.id} is not part of the approved Wordle pool`)
}
if (new Set(wordleRounds.map(round => round.id)).size !== wordleRounds.length) throw new Error('Wordle puzzle IDs must be unique')
if (new Set(wordleRounds.map(round => round.answer)).size !== wordleRounds.length) throw new Error('Wordle answers must not repeat within the five rounds')
if (shuffleWordleWords('verification-seed').join() !== shuffleWordleWords('verification-seed').join()) throw new Error('The Wordle shuffle must be stable for the same event key')

if (connectionsRounds.length !== 3) throw new Error('Exactly three Connections rounds are required')
for (const round of connectionsRounds) {
  if (!/^[a-z0-9-]{3,64}$/.test(round.id)) throw new Error(`Invalid Connections puzzle ID: ${round.id}`)
  if (round.groups.length !== 4 || round.groups.some(group => group.words.length !== 4)) throw new Error(`${round.id} requires exactly four groups of four words`)
  const answers = round.groups.flatMap(group => group.words)
  if (new Set(answers).size !== 16 || new Set(round.words).size !== 16 || answers.some(word => !round.words.includes(word))) {
    throw new Error(`${round.id} must contain the same 16 unique words in its groups and display order`)
  }
}
if (new Set(connectionsRounds.map(round => round.id)).size !== connectionsRounds.length) throw new Error('Connections puzzle IDs must be unique')

console.log('Puzzle data verified: ten randomized Wordle options and three Connections rounds are ready.')
