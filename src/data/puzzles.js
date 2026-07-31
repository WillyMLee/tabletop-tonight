// The event key seeds a stable shuffle: every guest gets the same five rounds,
// the answers do not change on refresh, and no word repeats during the event.
export const wordleWordPool = ['XENON', 'SNACK', 'SMILE', 'SWEAT', 'TREAT', 'TULIP', 'PROOF', 'CHECK', 'ALIEN', 'GHOST']

const hashSeed = value => {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const seededRandom = seed => () => {
  seed += 0x6D2B79F5
  let value = seed
  value = Math.imul(value ^ value >>> 15, value | 1)
  value ^= value + Math.imul(value ^ value >>> 7, value | 61)
  return ((value ^ value >>> 14) >>> 0) / 4294967296
}

export const shuffleWordleWords = seed => {
  const words = [...wordleWordPool]
  const random = seededRandom(hashSeed(seed))
  for (let index = words.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const current = words[index]
    words[index] = words[target]
    words[target] = current
  }
  return words
}

const wordleSeed = import.meta.env?.VITE_GAME_NIGHT_KEY || 'tabletop-tonight'
export const wordleRounds = shuffleWordleWords(`wordle:${wordleSeed}`).slice(0, 5).map((answer, index) => ({
  id: `wordle-pool-v1-${index + 1}`,
  label: `Round ${index + 1}`,
  answer,
}))

// Original New York-inspired boards for this game night. The display order is
// deliberately mixed so groups are not adjacent when a round begins.
export const connectionsRounds = [
  {
    id: 'connections-nyc-1',
    label: 'Round 1',
    title: 'Getting Around',
    groups: [
      { label: 'Subway essentials', words: ['OMNY', 'TURNSTILE', 'PLATFORM', 'METROCARD'], color: 'yellow' },
      { label: 'Yellow-cab vocabulary', words: ['METER', 'MEDALLION', 'HAIL', 'TIP'], color: 'green' },
      { label: '___ Bridge in NYC', words: ['BROOKLYN', 'MANHATTAN', 'WILLIAMSBURG', 'QUEENSBORO'], color: 'blue' },
      { label: 'Ways to cross the city', words: ['FERRY', 'BUS', 'BIKE', 'TRAIN'], color: 'purple' },
    ],
    words: ['HAIL', 'PLATFORM', 'BROOKLYN', 'FERRY', 'OMNY', 'TIP', 'BIKE', 'MANHATTAN', 'METER', 'TRAIN', 'TURNSTILE', 'WILLIAMSBURG', 'BUS', 'MEDALLION', 'QUEENSBORO', 'METROCARD'],
  },
  {
    id: 'connections-nyc-2',
    label: 'Round 2',
    title: 'City Food Run',
    groups: [
      { label: 'Bagel order add-ons', words: ['SCHMEAR', 'LOX', 'CAPERS', 'ONION'], color: 'yellow' },
      { label: 'Pizza-counter words', words: ['SLICE', 'PIE', 'PLAIN', 'SICILIAN'], color: 'green' },
      { label: 'Bodega staples', words: ['COFFEE', 'LOTTO', 'CHIPS', 'SANDWICH'], color: 'blue' },
      { label: 'Classic NYC treats', words: ['CHEESECAKE', 'CRONUT', 'EGG CREAM', 'BLACK AND WHITE'], color: 'purple' },
    ],
    words: ['SLICE', 'LOX', 'LOTTO', 'CRONUT', 'CAPERS', 'PLAIN', 'COFFEE', 'CHEESECAKE', 'SCHMEAR', 'PIE', 'BLACK AND WHITE', 'CHIPS', 'ONION', 'SICILIAN', 'SANDWICH', 'EGG CREAM'],
  },
  {
    id: 'connections-nyc-3',
    label: 'Round 3',
    title: 'New York Energy',
    groups: [
      { label: 'A New York weekend', words: ['BRUNCH', 'ROOFTOP', 'GALLERY', 'PICNIC'], color: 'yellow' },
      { label: 'Central Park landmarks', words: ['RESERVOIR', 'RAMBLE', 'BETHESDA', 'BOW BRIDGE'], color: 'green' },
      { label: 'Sounds of the city', words: ['SIREN', 'HORN', 'RUMBLE', 'CHATTER'], color: 'blue' },
      { label: 'Late-night plans', words: ['BODEGA', 'KARAOKE', 'COMEDY', 'DANCING'], color: 'purple' },
    ],
    words: ['HORN', 'ROOFTOP', 'BETHESDA', 'KARAOKE', 'PICNIC', 'SIREN', 'RAMBLE', 'BODEGA', 'GALLERY', 'CHATTER', 'BOW BRIDGE', 'COMEDY', 'BRUNCH', 'RESERVOIR', 'RUMBLE', 'DANCING'],
  },
]

export const activeWordle = wordleRounds[0]
export const activeConnections = connectionsRounds[0]
export const connectionWords = activeConnections.words
