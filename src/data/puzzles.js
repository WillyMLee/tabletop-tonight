// Replace these entries with the final party word dumps. The IDs should change
// whenever a new puzzle becomes the active leaderboard challenge.
export const activeWordle = {
  id: 'wordle-night-1',
  answer: 'GHOST',
}

export const activeConnections = {
  id: 'connections-night-1',
  groups: [
    { label: 'Board-game pieces', words: ['PAWN', 'TOKEN', 'MEEPLE', 'DIE'], color: 'yellow' },
    { label: 'GameCube heroes', words: ['MARIO', 'LINK', 'KIRBY', 'SAMUS'], color: 'green' },
    { label: 'Things you can stack', words: ['BLOCK', 'CUP', 'CARD', 'CHIP'], color: 'blue' },
    { label: '___ board', words: ['GAME', 'SCORE', 'SURF', 'ROOM'], color: 'purple' },
  ],
  words: ['TOKEN', 'MARIO', 'BLOCK', 'SCORE', 'LINK', 'CUP', 'PAWN', 'ROOM', 'CARD', 'KIRBY', 'GAME', 'DIE', 'SAMUS', 'CHIP', 'MEEPLE', 'SURF'],
}

export const connectionWords = activeConnections.words
