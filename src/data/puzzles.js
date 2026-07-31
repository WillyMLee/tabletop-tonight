// Replace these placeholder Wordles with the host's final word list. Keep each
// ID stable once guests begin playing so its leaderboard remains intact.
export const wordleRounds = [
  { id: 'wordle-night-1', label: 'Round 1', answer: 'GHOST' },
  { id: 'wordle-night-2', label: 'Round 2', answer: 'CRANE' },
  { id: 'wordle-night-3', label: 'Round 3', answer: 'PLANT' },
  { id: 'wordle-night-4', label: 'Round 4', answer: 'SHORE' },
  { id: 'wordle-night-5', label: 'Round 5', answer: 'BLEND' },
]

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
