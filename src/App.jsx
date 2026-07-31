import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useConvexConnectionState, useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api.js'
import {
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crown,
  Dice5,
  Gamepad2,
  House,
  Lightbulb,
  Library,
  ListChecks,
  Medal,
  Minus,
  PartyPopper,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
  Trophy,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { games, getGame, tonightSlugs } from './data/games.js'
import { activeConnections, connectionWords, connectionsRounds, wordleRounds } from './data/puzzles.js'
import { circuitRounds, envelopeGroups, eventDetails, eventTimeline, initialRoster, jengaMatches, pointRules } from '../convex/eventConfig'

const defaultPlayers = initialRoster.map(player => ({ ...player, points: 0, checkedIn: false }))

const defaultPodAssignments = {}

const storedPlayerIdentity = storageKey => {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey))
    return Number.isInteger(value?.id) && value.id > 0 && typeof value.name === 'string' && typeof value.claimToken === 'string' ? value : null
  } catch {
    return null
  }
}

const rememberPlayerIdentity = (storageKey, identity) => {
  if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(identity))
}

const legacyTeamInfo = {
  meeple: { name: 'Team Meeple', short: 'Meeple', color: 'coral', mascot: '◆' },
  mayhem: { name: 'Team Mayhem', short: 'Mayhem', color: 'lime', mascot: '✦' },
}

const legacyItinerary = [
  { time: '6:30', period: 'PM', title: 'Doors open', detail: 'Grab a name tag, snack, and your team color.', duration: '20 min', type: 'welcome', icon: '👋' },
  { time: '6:50', period: 'PM', title: 'Wavelength warm-up', detail: 'One big team-vs-team round to get everyone talking.', duration: '20 min', points: '10 pts', type: 'group', icon: '〰️' },
  { time: '7:10', period: 'PM', title: 'Rotation circuit', detail: 'Three pods rotate through Blokus, Jenga, and GameCube. Nobody sits out.', duration: '80 min', points: '30 pts', type: 'circuit', icon: '🔁' },
  { time: '8:30', period: 'PM', title: 'Snack + Party Grid', detail: 'Refuel while both teams race through the in-app word wall.', duration: '20 min', points: '10 pts', type: 'app', icon: '🧩' },
  { time: '8:50', period: 'PM', title: 'Team gauntlet', detail: 'Yahtzee relay, Liar’s Dice, and Signal Sprint run simultaneously.', duration: '45 min', points: '30 pts', type: 'group', icon: '⚡' },
  { time: '9:35', period: 'PM', title: 'Finale + awards', detail: 'Captain’s choice challenge, trophy reveal, and ridiculous awards.', duration: '25 min', points: '20 pts', type: 'finale', icon: '🏆' },
  { time: '10:00', period: 'PM', title: 'After-hours side quests', detail: 'Hot Streak, Magical Athlete, rematches, or more GameCube for anyone still standing.', duration: 'Optional', type: 'after', icon: '🌙' },
]

const legacyRotations = [
  { round: 'Round 1', time: '7:10–7:34', stations: [
    { name: 'Blokus', icon: '▦', pod: 'Pod A', players: ['Maya', 'Chris', 'Jordan', 'Priya'] },
    { name: 'GameCube', icon: '🎮', pod: 'Pod B', players: ['Sam', 'Taylor', 'Alex', 'Nina'] },
    { name: 'Jenga', icon: '▥', pod: 'Pod C', players: ['Marcus', 'Zoe', 'Eli', 'Brooke'] },
  ]},
  { round: 'Round 2', time: '7:38–8:02', stations: [
    { name: 'GameCube', icon: '🎮', pod: 'Pod A', players: ['Maya', 'Chris', 'Jordan', 'Priya'] },
    { name: 'Jenga', icon: '▥', pod: 'Pod B', players: ['Sam', 'Taylor', 'Alex', 'Nina'] },
    { name: 'Blokus', icon: '▦', pod: 'Pod C', players: ['Marcus', 'Zoe', 'Eli', 'Brooke'] },
  ]},
  { round: 'Round 3', time: '8:06–8:30', stations: [
    { name: 'Jenga', icon: '▥', pod: 'Pod A', players: ['Maya', 'Chris', 'Jordan', 'Priya'] },
    { name: 'Blokus', icon: '▦', pod: 'Pod B', players: ['Sam', 'Taylor', 'Alex', 'Nina'] },
    { name: 'GameCube', icon: '🎮', pod: 'Pod C', players: ['Marcus', 'Zoe', 'Eli', 'Brooke'] },
  ]},
]

const teamInfo = {
  meeple: { name: 'Team Jessa', short: 'Jessa', color: 'coral', mascot: '●' },
  mayhem: { name: 'Team Willy', short: 'Willy', color: 'lime', mascot: '●' },
}

const itinerary = [
  { time: '6:00', period: 'PM', title: 'Players ready up', detail: 'Snacks, check-in, teams, and ghost colors.', duration: '20 min', type: 'welcome', icon: '●' },
  { time: '6:20', period: 'PM', title: 'Welcome + quick intro', detail: 'Finish the 30-minute welcome block with teams, scoring, and the four-station circuit.', duration: '10 min', type: 'welcome', icon: '◌' },
  { time: '6:30', period: 'PM', title: 'Group game session', detail: 'GeoGuessr, Wordle, then Connections. Each player records their own result.', duration: '50 min', points: 'Individual results', type: 'group', icon: '◎' },
  { time: '7:20', period: 'PM', title: 'Quick dinner', detail: 'Eat what was ordered while the host finishes resetting the four stations.', duration: '10 min', type: 'break', icon: '☕' },
  { time: '7:30', period: 'PM', title: 'Circuit 1 · Starting stations', detail: 'Shuffle once and send every pod to its first location.', duration: '20 min', points: '40 pts', type: 'circuit', icon: 'Ⅰ' },
  { time: '7:50', period: 'PM', title: 'Circuit 2 · Rotate', detail: 'Keep the same pod and move clockwise to the next station.', duration: '20 min', points: '40 pts', type: 'circuit', icon: 'Ⅱ' },
  { time: '8:10', period: 'PM', title: 'Circuit 3 · Rotate', detail: 'Move clockwise again; everyone reaches a third game.', duration: '20 min', points: '40 pts', type: 'circuit', icon: 'Ⅲ' },
  { time: '8:30', period: 'PM', title: 'Circuit 4 · Final rotation', detail: 'Complete the loop at the one station your pod has not played.', duration: '20 min', points: '40 pts', type: 'circuit', icon: 'Ⅳ' },
  { time: '8:50', period: 'PM', title: 'Dessert + chill', detail: 'Dessert, leaderboard reveal, and a breather.', duration: '30 min', type: 'break', icon: '▣' },
  { time: '9:20', period: 'PM', title: 'Optional Secret Hitler', detail: 'One last social-deduction game for anyone who wants in.', duration: '45 min', points: '10 pts', type: 'group', icon: '◉' },
  { time: '10:05', period: 'PM', title: 'Homeee', detail: 'Final scores, leftovers, rides, cleanup, and victory laps.', duration: '10 min', type: 'finale', icon: '⌂' },
]

const phaseGuidance = [
  { phase: 'Ready room', objective: 'Get everyone checked in, snacking, and clear on their house team.', everyone: 'Grab food, find your ghost team, and confirm your name on the roster.', blinky: 'Meet the pink captain and help welcome late arrivals.', inky: 'Meet the cyan captain and help welcome late arrivals.', host: 'Balance the teams and explain team points versus individual points.', cta: 'Manage teams', path: '/teams' },
  { phase: 'Quick welcome', objective: 'Explain only what people need before the first game.', everyone: 'Listen for individual puzzle scores, team circuit points, and the four locations.', blinky: 'Confirm the pink captain.', inky: 'Confirm the cyan captain.', host: 'Keep the full ready-up and welcome block to 30 minutes, then launch GeoGuessr at 6:30.', cta: 'Continue to group games', path: '/run-of-show' },
  { phase: 'Individual arcade', objective: 'Play GeoGuessr, Wordle, and Connections in that order during one 50-minute block.', everyone: 'Use your own device and record your own result in all three games.', blinky: 'Help teammates join the correct GeoGuessr lobby without sharing guesses.', inky: 'Help teammates join the correct GeoGuessr lobby without sharing guesses.', host: 'Run three GeoGuessr games of five rounds, then launch Wordle and Connections from the lineup.', cta: 'Open group game lineup', path: '/run-of-show' },
  { phase: 'Dinner', objective: 'Eat the food that was ordered. Nothing else is scheduled.', everyone: 'Grab dinner and take a real break.', blinky: 'No team task during dinner.', inky: 'No team task during dinner.', host: 'Put the order on screen and quietly reset all four circuit stations.', cta: 'Continue to circuits', path: '/run-of-show' },
  { phase: 'Starting circuit', objective: 'Create four balanced pods and start them at four different games.', everyone: 'Go to the location shown beside your pod and stay for the full 20-minute round.', blinky: 'Record pink individual awards before rotating.', inky: 'Verify the station result before rotating.', host: 'Shuffle once, reveal the four starting locations, and run one 20-minute clock.', cta: 'Shuffle pods', path: '/run-of-show' },
  { phase: 'Second circuit', objective: 'Keep pods together and rotate every group clockwise.', everyone: 'Move to the next location shown for your pod.', blinky: 'Carry only score notes; leave game pieces reset.', inky: 'Help reset the station before moving.', host: 'Call time at 20 minutes and allow a fast handoff only.', cta: 'View rotation', path: '/run-of-show' },
  { phase: 'Third circuit', objective: 'Continue the fixed rotation so every pod reaches a third game.', everyone: 'Stay with your pod and follow the circuit map.', blinky: 'Confirm the prior station result is recorded.', inky: 'Confirm the next game is ready.', host: 'Start the next 20-minute clock as soon as groups are seated.', cta: 'View rotation', path: '/run-of-show' },
  { phase: 'Final circuit', objective: 'Complete the loop at the one remaining station for each pod.', everyone: 'Play the final game on your pod’s route.', blinky: 'Record the final individual awards.', inky: 'Verify the final team result.', host: 'Close the circuit after 20 minutes and move everyone to dessert.', cta: 'Finish circuit', path: '/run-of-show' },
  { phase: 'Dessert reset', objective: 'Give the room a real breather before the optional finale.', everyone: 'Grab dessert and check the Wordle and Connections leaderboards.', blinky: 'Nominate an MVP and sportsmanship pick.', inky: 'Nominate an MVP and sportsmanship pick.', host: 'Project the live puzzle standings and the team scoreboard.', cta: 'Open Wordle leaderboard', path: '/play/wordle' },
  { phase: 'Optional social deduction', objective: 'Offer one final high-energy game without trapping tired guests.', everyone: 'Opt in before roles are dealt; everyone else can chill or head out.', blinky: 'House teams pause—Secret Hitler uses its own hidden sides.', inky: 'House teams pause—Secret Hitler uses its own hidden sides.', host: 'Only award house points if both teams have similar representation.', cta: 'Open game guide', path: '/games/secret-hitler' },
  { phase: 'Closeout', objective: 'End on time with clear winners and an easy exit.', everyone: 'Collect belongings, leftovers, and rides; help with one cleanup task.', blinky: 'Captain confirms the final team score.', inky: 'Captain confirms the final team score.', host: 'Announce champions and individual awards, then close the scoreboard.', cta: 'Open scoreboard', path: '/scores' },
]

const circuitStations = [
  { pod: 'A', location: 'Couch', name: 'Mario Strikers', slug: 'mario-strikers-gc', icon: '⚽' },
  { pod: 'B', location: 'Island', name: 'Jenga', slug: 'jenga', icon: '▥' },
  { pod: 'C', location: 'Dinner Table #1', name: 'Blokus', slug: 'blokus', icon: '▦' },
  { pod: 'D', location: 'Dinner Table #2', name: 'Flip 7 or Magical Athlete', slug: 'magical-athlete', icon: '★', options: ['flip-7', 'magical-athlete'] },
]

const rotationStations = offset => circuitStations.map((station, locationIndex) => ({ ...station, pod: ['A', 'B', 'C', 'D'][(locationIndex - offset + 4) % 4] }))

const rotations = [
  { round: 'Circuit 1 · Start', time: '7:30–7:50', stations: rotationStations(0) },
  { round: 'Circuit 2 · Rotate', time: '7:50–8:10', stations: rotationStations(1) },
  { round: 'Circuit 3 · Rotate', time: '8:10–8:30', stations: rotationStations(2) },
  { round: 'Circuit 4 · Finish', time: '8:30–8:50', stations: rotationStations(3) },
]

const groupGameLineup = [
  { order: 1, slug: 'geoguessr', duration: '25 min', location: 'Everyone’s phone', note: 'Play 3 separate games of 5 locations. Each round winner receives 3 individual and 3 team points.' },
  { order: 2, slug: 'wordle', duration: '25 min', location: 'Everyone’s phone', note: 'Play all 5 words. Fewest attempts wins each word and earns 3 individual and 3 team points.' },
  { order: 3, slug: 'connections', duration: '20 min', location: 'Everyone’s phone', note: 'Play 3 rounds. Fastest successful solve earns 3 individual and 3 team points.' },
  { order: 4, slug: 'jenga', duration: '30 min', location: 'Island', note: 'Run all 7 fixed cross-team matches. Each match has a four-minute hard stop and awards 1 individual + 1 team point.' },
]

const gamePointValues = { geoguessr: 3, wordle: 3, connections: 3, jenga: 1, blokus: 2, 'mario-strikers-gc': 2, 'flip-7': 2, 'magical-athlete': 2, 'table-choice': 2 }
const groupWinnerRounds = {
  geoguessr: Array.from({ length: 3 }, (_, index) => ({ key: `geoguessr:${index + 1}`, label: `Game ${index + 1}` })),
  wordle: Array.from({ length: 5 }, (_, index) => ({ key: `wordle:${index + 1}`, label: `Word ${index + 1}` })),
  connections: Array.from({ length: 3 }, (_, index) => ({ key: `connections:${index + 1}`, label: `Round ${index + 1}` })),
}

const phaseLogistics = [
  { games: [], places: [{ group: 'Everyone', location: 'Entry + kitchen', detail: 'Check in, grab snacks and a team color, then meet your captain.' }] },
  { games: [], places: [] },
  { games: ['geoguessr', 'wordle', 'connections'], places: [] },
  { games: [], places: [] },
  ...rotations.map((rotation, index) => ({
    assignmentMode: index === 0 ? 'random' : 'rotation',
    games: ['mario-strikers-gc', 'jenga', 'blokus', 'magical-athlete', 'flip-7'],
    stations: rotation.stations,
    places: rotation.stations.map(station => ({ group: `Pod ${station.pod}`, location: station.location, game: station.slug, detail: station.options ? 'Choose Flip 7 or Magical Athlete before the timer starts.' : `Play ${station.name} here for the full circuit.` })),
    rotationRange: [index, index],
  })),
  { games: [], places: [{ group: 'Everyone', location: 'Dessert table + living room', detail: 'Chill, check scores, and reveal the live Wordle and Connections leaders.' }] },
  { games: ['secret-hitler'], places: [{ group: 'Opt-in players', location: 'Dining table', game: 'secret-hitler' }, { group: 'Chill group', location: 'Living room', detail: 'Dessert, conversation, or an early exit—no pressure to join.' }] },
  { games: [], places: [{ group: 'Everyone', location: 'Entry + living room', detail: 'Final awards, leftovers, rides, cleanup, and home.' }] },
]

const phaseScoring = [
  { mode: 'none', note: 'Ready-up is unscored.', individual: 'No individual points during check-in.' },
  { mode: 'none', note: 'The welcome is unscored.', individual: 'No individual points during the intro.' },
  { mode: 'individual', note: 'GeoGuessr, Wordle, and Connections are individual challenges. Team totals do not change in this phase.', individual: 'For each 5-round GeoGuessr game award 5–3–1 to the top three. Puzzle results record automatically.' },
  { mode: 'none', note: 'Dinner is a true scoring break.', individual: 'No individual points during dinner.' },
  { mode: 'circuit', award: 10, note: 'Each starting station is worth 10 team points; a split is 5–5.', individual: 'Use the game guide for podiums, clean pulls, and winning pairs.' },
  { mode: 'circuit', award: 10, note: 'Each second-rotation station is worth 10 team points; a split is 5–5.', individual: 'Award the game-specific result plus any listed bonus.' },
  { mode: 'circuit', award: 10, note: 'Each third-rotation station is worth 10 team points; a split is 5–5.', individual: 'Award +3 for a standout performance.' },
  { mode: 'circuit', award: 10, note: 'Each final-rotation station is worth 10 team points; a split is 5–5.', individual: 'Award the final game-specific result and any listed bonus.' },
  { mode: 'none', note: 'Dessert and optional puzzles do not change the championship.', individual: 'No individual points during the chill block.' },
  { mode: 'group', award: 10, note: 'If played and teams are balanced, the winning side contributes 10 house points.', individual: 'Optional: +3 for the best deduction or bluff.' },
  { mode: 'none', note: 'The closeout reveals points; it does not add new ones.', individual: 'Awards are labels only unless the host explicitly adds a bonus.' },
]

const gridGroups = activeConnections.groups
const gridWords = connectionWords

const sprintPrompts = [
  'Terrible names for a new board game',
  'Things you should never yell during Hot Streak',
  'Excuses for knocking over the Jenga tower',
  'Video-game power-ups that would be useless in real life',
  'Things more stressful than the final Yahtzee roll',
  'Secret talents a meeple might have',
]

function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value])
  return [value, setValue]
}

function useRouter() {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const navigate = to => {
    if (to === path) return
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return { path, navigate }
}

function Avatar({ name, team, size = 'md' }) {
  const rosterTeam = team || defaultPlayers.find(player => player.name === name)?.team
  const ghostTone = rosterTeam ? `ghost-team-${teamInfo[rosterTeam].color}` : `ghost-${name.charCodeAt(0) % 4}`
  return <span className={`avatar ghost-avatar ${ghostTone} avatar-${size}`} aria-label={`${name}${rosterTeam ? `, ${teamInfo[rosterTeam].name}` : ''}`}>{name.slice(0, 1).toUpperCase()}</span>
}

function TeamPill({ team }) {
  const info = teamInfo[team]
  return <span className={`team-pill ${info.color}`}>{info.mascot} {info.short}</span>
}

function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark"><i className="pac-eye" /></span>
      <span className="brand-copy"><strong>GAME NIGHT</strong><small>HIGH SCORE CLUB</small></span>
    </div>
  )
}

function Nav({ path, navigate }) {
  const items = [
    ['/', House, 'Start'],
    ['/group-games', Gamepad2, 'Group Games'],
    ['/circuit', Shuffle, 'Circuit'],
    ['/scores', Trophy, 'Scores'],
  ]
  return (
    <nav className="nav-shell" aria-label="Main navigation">
      {items.map(([href, Icon, label]) => {
        const active = href === '/'
          ? path === '/'
          : href === '/group-games'
            ? path.startsWith(href) || path === '/play/wordle' || path === '/play/connections'
            : href === '/scores'
              ? path.startsWith(href) || path === '/host'
              : path.startsWith(href)
        return (
        <button key={href} className={active ? 'active' : ''} onClick={() => navigate(href)}>
          <Icon size={19} /> <span>{label}</span>
        </button>
      )})}
    </nav>
  )
}

function TeamScores({ scores, onChange, compact = false }) {
  return (
    <div className={`team-scores ${compact ? 'compact' : ''}`}>
      {Object.keys(teamInfo).map(team => {
        const info = teamInfo[team]
        const other = team === 'meeple' ? 'mayhem' : 'meeple'
        const leading = scores[team] > scores[other]
        return (
          <div className={`team-score-card ${info.color}`} key={team}>
            <div>
              <span className="score-mascot">{info.mascot}</span>
              <p>{info.name}</p>
              {leading && <span className="leading"><Crown size={12} /> Leading</span>}
            </div>
            <strong>{scores[team]}</strong>
            {!compact && <div className="score-controls">
              <button onClick={() => onChange(team, -1)} aria-label={`Remove one point from ${info.name}`}><Minus size={16} /></button>
              <button onClick={() => onChange(team, 1)} aria-label={`Add one point to ${info.name}`}><Plus size={16} /></button>
            </div>}
          </div>
        )
      })}
    </div>
  )
}

function MiniGameCard({ game, navigate, featured = false }) {
  return (
    <button className={`mini-game-card ${game.color} ${featured ? 'featured' : ''}`} onClick={() => navigate(`/games/${game.slug}`)}>
      <span className="mini-game-icon">{game.icon}</span>
      <span className="mini-game-copy"><small>{game.status}</small><strong>{game.name}</strong><em>{game.players} · {game.duration}</em></span>
      <ChevronRight size={17} />
    </button>
  )
}

function LegacyTonight({ scores, changeScore, players, navigate, currentEvent, setCurrentEvent }) {
  const event = itinerary[currentEvent]
  const activePlayers = players.filter(player => player.checkedIn)
  const leaders = [...activePlayers].sort((a, b) => b.points - a.points).slice(0, 3)
  const featuredGames = tonightSlugs.slice(0, 4).map(getGame)
  return (
    <main>
      <section className="live-command-hero">
        <div className="live-command-copy">
          <div className="eyebrow"><span className="live-dot" /> LIVE • SATURDAY, AUGUST 1</div>
          <span className="event-emoji">{event.icon}</span>
          <div><small>NOW PLAYING</small><h1>{event.title}</h1><p>{event.detail}</p></div>
          <div className="hero-meta compact-meta"><span><Clock3 size={16} /> {event.time} {event.period}</span><span><Users size={16} /> {activePlayers.length} checked in</span></div>
          <div className="live-actions"><button className="primary" onClick={() => navigate(event.type === 'app' ? '/play/grid' : '/run-of-show')}>Open activity <ArrowRight size={16} /></button><button className="secondary dark-secondary" onClick={() => setCurrentEvent((currentEvent + 1) % itinerary.length)}>Advance agenda <ChevronRight size={16} /></button></div>
        </div>
        <div className="command-score">
          <div className="section-heading"><div><span className="kicker">LIVE SCORE</span><h2>Team championship</h2></div><button className="text-button light-text" onClick={() => navigate('/scores')}>Details</button></div>
          <TeamScores scores={scores} onChange={changeScore} />
          <div className="score-meter"><span style={{ width: `${(scores.meeple / Math.max(scores.meeple + scores.mayhem, 1)) * 100}%` }} /></div>
          <p className="tiny-note"><Sparkles size={14} /> {Math.abs(scores.meeple - scores.mayhem)} points separate the teams</p>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card team-overview-card">
          <div className="section-heading"><div><span className="kicker">TEAMS AT A GLANCE</span><h2>Everyone is in the game</h2></div><button className="text-button" onClick={() => navigate('/teams')}>Manage</button></div>
          {Object.keys(teamInfo).map(team => {
            const members = activePlayers.filter(player => player.team === team)
            return <div className={`team-overview-row ${teamInfo[team].color}`} key={team}><span className="team-symbol">{teamInfo[team].mascot}</span><div><strong>{teamInfo[team].name}</strong><small>{members.length} players</small></div><div className="avatar-stack">{members.slice(0, 5).map(member => <Avatar name={member.name} size="sm" key={member.id} />)}</div><b>{scores[team]}</b></div>
          })}
          <div className="leaders-strip"><Medal size={18} /><span><small>TOP PLAYERS</small>{leaders.map((leader, index) => <strong key={leader.id}>{index + 1}. {leader.name} <em>{leader.points}</em></strong>)}</span></div>
        </div>
        <div className="card up-next-card">
          <div className="section-heading"><div><span className="kicker">RUN OF SHOW</span><h2>Up next</h2></div><button className="text-button" onClick={() => navigate('/run-of-show')}>Full lineup</button></div>
          <div className="vertical-mini-agenda">
            {itinerary.slice(currentEvent, currentEvent + 3).map((item, index) => <button key={item.title} onClick={() => setCurrentEvent(itinerary.indexOf(item))} className={index === 0 ? 'active' : ''}><span>{item.time}<small>{item.period}</small></span><i>{item.icon}</i><div><strong>{item.title}</strong><small>{item.duration}{item.points ? ` · ${item.points}` : ''}</small></div>{index === 0 && <em>LIVE</em>}</button>)}
          </div>
        </div>
      </section>

      <section className="section-block featured-game-section">
        <div className="section-heading"><div><span className="kicker">TONIGHT’S GAMES</span><h2>Know what’s hitting the table</h2></div><button className="text-button" onClick={() => navigate('/games')}>Browse every game <ArrowRight size={15} /></button></div>
        <div className="home-game-grid">{featuredGames.map((game, index) => <MiniGameCard game={game} navigate={navigate} featured={index === 0} key={game.slug} />)}</div>
      </section>

      <section className="callout-row">
        <div className="callout dark"><span><Zap /></span><div><small>QUICK PLAY</small><h3>Party Grid is ready</h3><p>Four groups are hiding in the word wall.</p></div><button onClick={() => navigate('/play/grid')}>Play now</button></div>
        <div className="callout cream"><span><Award /></span><div><small>PRIZE CABINET</small><h3>Five ways to win</h3><p>Team champs, MVP, comeback, chaos, and sportsmanship.</p></div><button onClick={() => navigate('/scores')}>View prizes</button></div>
      </section>
    </main>
  )
}

function NightOrganizer({ currentEvent, setCurrentEvent, navigate }) {
  const current = itinerary[currentEvent] || itinerary[0]
  const guidance = phaseGuidance[currentEvent] || phaseGuidance[0]
  const next = itinerary[currentEvent + 1]

  return (
    <aside className="night-organizer" aria-label="Night organizer">
      <div className="organizer-heading">
        <span className="kicker"><ListChecks size={14} /> NIGHT NAVIGATOR</span>
        <h2>Run of show</h2>
        <p>Follow the maze from check-in to after hours.</p>
      </div>
      <div className="organizer-now">
        <small>HAPPENING NOW</small>
        <strong>{current.title}</strong>
        <span><Clock3 size={13} /> {current.time} {current.period} · {current.duration}</span>
        <p><b>Do this:</b> {guidance.everyone}</p>
      </div>
      <nav className="night-phase-list" aria-label="Game night phases">
        {itinerary.map((item, index) => (
          <button key={item.title} className={index === currentEvent ? 'active' : index < currentEvent ? 'complete' : ''} onClick={() => setCurrentEvent(index)} aria-current={index === currentEvent ? 'step' : undefined}>
            <span className="phase-marker">{index < currentEvent ? <Check size={13} /> : index + 1}</span>
            <span className="phase-copy"><small>{item.time} {item.period}</small><strong>{item.title}</strong></span>
            {index === currentEvent && <em>NOW</em>}
          </button>
        ))}
      </nav>
      <section className="phase-brief" aria-live="polite">
        <div><small>PHASE {String(currentEvent + 1).padStart(2, '0')}</small><h3>{guidance.phase}</h3></div>
        <p className="phase-objective">{guidance.objective}</p>
        <dl>
          <div><dt>Everyone</dt><dd>{guidance.everyone}</dd></div>
          <div className="blinky-task"><dt>Team Blinky</dt><dd>{guidance.blinky}</dd></div>
          <div className="inky-task"><dt>Team Inky</dt><dd>{guidance.inky}</dd></div>
          <div><dt>Host cue</dt><dd>{guidance.host}</dd></div>
        </dl>
        <button className="organizer-link" onClick={() => navigate(guidance.path)}>{guidance.cta} <ChevronRight size={14} /></button>
      </section>
      <div className="organizer-controls">
        <button disabled={currentEvent === 0} onClick={() => setCurrentEvent(Math.max(0, currentEvent - 1))}>Previous</button>
        <button disabled={!next} onClick={() => setCurrentEvent(Math.min(itinerary.length - 1, currentEvent + 1))}>{next ? 'Advance phase' : 'Night complete'} <ChevronRight size={14} /></button>
      </div>
      {next && <p className="organizer-next"><strong>Up next:</strong> {next.title} at {next.time} {next.period}</p>}
    </aside>
  )
}

function RosterNamePicker({ players, value, onChange, describedBy }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const labelId = useId()
  const listId = useId()
  const selected = players.find(player => player.id === Number(value))

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeWithEscape = event => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [open])

  const choose = player => {
    if (player.checkedIn) return
    onChange(String(player.id))
    setOpen(false)
    triggerRef.current?.focus()
  }

  return <div className={`roster-name-picker ${open ? 'is-open' : ''}`} ref={rootRef}>
    <span className="roster-field-label" id={labelId}>Your name</span>
    <button className="roster-picker-trigger" type="button" ref={triggerRef} aria-expanded={open} aria-haspopup="listbox" aria-controls={listId} aria-describedby={describedBy} onClick={() => setOpen(current => !current)}>
      <span>{selected ? selected.name : 'Choose your name'}</span>
      {selected && <small>{teamInfo[selected.team].name}</small>}
      <ChevronDown size={18} />
    </button>
    {open && <div className="roster-picker-popover" id={listId} role="listbox" aria-labelledby={labelId}>
      <header><span className="picker-pac">●</span><div><strong>Pick your player</strong><small>Your team is already locked in.</small></div></header>
      <div className="roster-picker-groups">{Object.keys(teamInfo).map(team => <section key={team}>
        <div className={`picker-team-label ${teamInfo[team].color}`}><span className="team-ghost"><i /><i /></span><strong>{teamInfo[team].name}</strong></div>
        <div>{players.filter(player => player.team === team).map(player => <button type="button" role="option" aria-selected={player.id === selected?.id} disabled={player.checkedIn} onClick={() => choose(player)} key={player.id}>
          <Avatar name={player.name} size="sm" />
          <span><strong>{player.name}</strong><small>{player.checkedIn ? 'Already claimed' : 'Tap to choose'}</small></span>
          <em>{player.checkedIn ? 'TAKEN' : 'READY'}</em>
        </button>)}</div>
      </section>)}</div>
    </div>}
  </div>
}

function GuestJoin({ players, playerIdentity, joinPlayer }) {
  const player = players.find(item => item.checkedIn && item.id === playerIdentity?.id && item.name.toLocaleLowerCase() === playerIdentity.name.toLocaleLowerCase())
  const [playerId, setPlayerId] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  if (player) {
    return <section className="player-pass card" aria-label="Your game-night player">
      <Avatar name={player.name} />
      <div><span className="kicker">YOU’RE IN</span><strong>{player.name}</strong><small>{teamInfo[player.team].name} · this device owns your game entry.</small></div>
      <TeamPill team={player.team} />
    </section>
  }

  const submit = async event => {
    event.preventDefault()
    if (!playerId || joining) return
    setJoining(true)
    setError('')
    try {
      await joinPlayer(Number(playerId))
      setPlayerId('')
    } catch (joinError) {
      setError(joinError.message || 'Could not join the game night')
    } finally {
      setJoining(false)
    }
  }

  return <section className="guest-join card">
    <div className="guest-join-copy"><span className="join-ghost"><i /><i /></span><div><span className="kicker">READY PLAYER?</span><h2>Claim your name</h2><p>No account or password. Choose your pre-listed name once; the app keeps anyone else from playing as you.</p></div></div>
    <form className={playerId ? 'has-roster-player' : ''} onSubmit={submit}>
      <RosterNamePicker players={players} value={playerId} onChange={value => { setPlayerId(value); setError('') }} describedBy={error ? 'join-error' : undefined} />
      {playerId && <div className="selected-roster-team"><span className={`team-ghost ${teamInfo[players.find(item => item.id === Number(playerId))?.team].color}`}><i /><i /></span><div><small>YOUR TEAM</small><strong>{teamInfo[players.find(item => item.id === Number(playerId))?.team].name}</strong></div></div>}
      {error && <p className="join-error" id="join-error" role="alert">{error}</p>}
      <button className="primary join-button" disabled={!playerId || joining}>{joining ? 'Claiming…' : 'Claim this name'} <ArrowRight size={16} /></button>
    </form>
  </section>
}

function Tonight({ players, guestPlayerIdentity, joinPlayer, releasePlayer }) {
  const activePlayers = players.filter(player => player.checkedIn)
  const [managingPlayers, setManagingPlayers] = useState(false)
  const [confirmingPlayer, setConfirmingPlayer] = useState(null)
  const removeFromRoster = playerId => {
    if (confirmingPlayer !== playerId) {
      setConfirmingPlayer(playerId)
      return
    }
    releasePlayer(playerId)
    setConfirmingPlayer(null)
  }
  return (
    <main className="live-hub">
      <GuestJoin players={players} playerIdentity={guestPlayerIdentity} joinPlayer={joinPlayer} />
      <section className="pac-section teams-zone">
        <div className="pac-section-head"><div><span className="kicker">PRESET TEAMS · {eventDetails.date.toUpperCase()}</span><h1>Teams are locked in</h1><p>{activePlayers.length} of {players.length} players have claimed their name. Jessa is the host and scorekeeper, not a player.</p></div><button className={`pixel-button ${managingPlayers ? 'active' : ''}`} aria-pressed={managingPlayers} onClick={() => { setManagingPlayers(value => !value); setConfirmingPlayer(null) }}>{managingPlayers ? 'DONE' : 'MANAGE CLAIMS'}</button></div>
        {managingPlayers && <div className="roster-manage-note"><CircleHelp size={17} /><span><strong>Release a claimed name</strong> Use this only if someone chose the wrong person or changed devices.</span></div>}
        <div className="ghost-team-grid">
          {Object.keys(teamInfo).map(team => {
            const info = teamInfo[team]
            const members = players.filter(player => player.team === team)
            return <article className={`ghost-team-card ${info.color}`} key={team}>
              <header><span className="team-ghost"><i /><i /></span><div><small>{team === 'meeple' ? 'PINK TEAM' : 'CYAN TEAM'}</small><h3>{info.name}</h3></div><strong>{members.length}</strong></header>
              <div className="ghost-player-list">{members.map(member => <div className={`ghost-player ${member.checkedIn ? 'is-claimed' : 'is-available'} ${managingPlayers ? 'is-managing' : ''}`} key={member.id}><Avatar name={member.name} /><span><strong>{member.name}</strong><small>{member.checkedIn ? 'CLAIMED' : 'AVAILABLE'}</small></span>{managingPlayers && member.checkedIn && <button className={`remove-player-button ${confirmingPlayer === member.id ? 'confirming' : ''}`} onClick={() => removeFromRoster(member.id)} aria-label={`${confirmingPlayer === member.id ? 'Confirm release of' : 'Release'} ${member.name}`}>{confirmingPlayer === member.id ? 'CONFIRM' : 'RELEASE'}</button>}</div>)}</div>
            </article>
          })}
        </div>
      </section>

    </main>
  )
}

function GameDiagram({ slug }) {
  if (slug === 'geoguessr') return <div className="how-diagram geo-diagram" role="img" aria-label="Three GeoGuessr games with five rounds in each game">{[1, 2, 3].map(game => <div key={game}><strong>GAME {game}</strong><span>{[1, 2, 3, 4, 5].map(round => <i key={round}>{round}</i>)}</span></div>)}</div>
  if (slug === 'wordle') return <div className="how-diagram wordle-how-diagram" role="img" aria-label="Wordle feedback example showing correct, present, and absent letters"><div>{[['C', 'hit'], ['R', 'near'], ['A', 'miss'], ['N', 'hit'], ['E', 'miss']].map(([letter, state]) => <span className={state} key={letter}>{letter}</span>)}</div><small><b className="hit" /> correct <b className="near" /> elsewhere <b className="miss" /> absent</small></div>
  if (slug === 'connections') return <div className="how-diagram connections-how-diagram" role="img" aria-label="Sixteen words sorted into four groups of four"><div>{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div><span>4 WORDS × 4 GROUPS</span><section>{['yellow', 'green', 'blue', 'purple'].map(color => <b className={color} key={color} />)}</section></div>
  if (slug === 'mario-strikers-gc') return <div className="how-diagram strikers-diagram" role="img" aria-label="Mario Strikers field showing two pink players against two cyan players, with goals at each end and the ball in midfield"><span className="strikers-goal left" /><span className="strikers-goal right" /><i className="strikers-player pink forward">P1</i><i className="strikers-player pink support">P2</i><i className="strikers-player cyan forward">P1</i><i className="strikers-player cyan support">P2</i><b className="strikers-ball">⚽</b><small>PASS · TACKLE · SHOOT</small></div>
  if (slug === 'jenga') return <div className="how-diagram jenga-diagram" role="img" aria-label="Jenga tower showing a block moving from the tower to the top"><span className="move-block">↑</span><div>{Array.from({ length: 15 }, (_, index) => <i key={index} />)}</div><small>PULL ONE · STACK ON TOP</small></div>
  if (slug === 'blokus') return <div className="how-diagram blokus-diagram" role="img" aria-label="Blokus board showing pieces beginning in corners and touching only corner to corner"><div>{Array.from({ length: 64 }, (_, index) => <i className={[0, 7, 56, 63].includes(index) ? 'corner' : [9, 18, 27, 36].includes(index) ? 'path' : ''} key={index} />)}</div><small>START IN A CORNER · TOUCH YOUR COLOR AT CORNERS ONLY</small></div>
  if (slug === 'flip-7') return <div className="how-diagram flip-diagram" role="img" aria-label="Flip 7 cards showing a repeated number causing a bust"><div><i>2</i><i>5</i><i>7</i><i className="duplicate">5</i></div><strong>DUPLICATE = BUST</strong><small>HIT for another card · STAY to bank points</small></div>
  if (slug === 'magical-athlete') return <div className="how-diagram athlete-diagram" role="img" aria-label="Magical Athlete race track showing racers moving by a die roll"><div className="track"><i className="racer one">★</i><i className="racer two">●</i><i className="finish">FINISH</i></div><strong>ROLL → MOVE → USE YOUR POWER</strong></div>
  if (slug === 'secret-hitler') return <div className="how-diagram secret-hitler-diagram" role="img" aria-label="Secret Hitler turn flow from president and chancellor nomination through vote, policy, and discussion"><div><span>PRESIDENT</span><i>→</i><span>CHANCELLOR</span><i>→</i><span>VOTE</span><i>→</i><span>POLICY</span></div><small>PRIVATE ROLE · PUBLIC DEBATE</small></div>
  const fallbackGame = getGame(slug)
  return <div className="how-diagram turn-flow-diagram" role="img" aria-label={`${fallbackGame?.name || 'Game'} four-step turn flow`}>{(fallbackGame?.rules || []).slice(0, 4).map((rule, index) => <span key={rule}><b>{index + 1}</b><small>{rule}</small></span>)}</div>
}

const strikersControls = [
  { button: 'STICK', offense: 'Move / aim', defense: 'Move' },
  { button: 'A', offense: 'Pass', defense: 'Switch player' },
  { button: 'B', offense: 'Shoot · hold for Super Strike', defense: 'Slide tackle / clear' },
  { button: 'Y', offense: 'Deke', defense: 'Big hit' },
  { button: 'X', offense: 'Use item', defense: 'Use item' },
  { button: 'R', offense: 'Turbo run', defense: 'Turbo run' },
  { button: 'L + A/B', offense: 'Lob pass / lob shot', defense: '—' },
  { button: 'Z', offense: 'Swap item', defense: 'Swap item' },
  { button: 'C-STICK', offense: 'Deke', defense: 'Disrupt a Super Strike' },
]

function StrikersControllerMap() {
  return <section className="controller-map-card">
    <div className="controller-map-heading"><div><span className="kicker">ORIGINAL GAMECUBE CONTROLS</span><h2>Know the buttons before kickoff</h2></div><p>Start with A, B, Y, and R. Add items and lob passes once everyone is moving comfortably.</p></div>
    <div className="controller-map-layout">
      <div className="gamecube-controller" role="img" aria-label="GameCube controller with the Control Stick and D-pad on the left, Start in the center, A B X Y and C Stick on the right, L and R shoulders, and Z above the right side">
        <span className="gc-shoulder gc-l">L</span><span className="gc-shoulder gc-r">R</span><span className="gc-z">Z</span>
        <span className="gc-stick main-stick">STICK</span><span className="gc-dpad">+</span><span className="gc-start">START</span>
        <span className="gc-button gc-a">A</span><span className="gc-button gc-b">B</span><span className="gc-button gc-x">X</span><span className="gc-button gc-y">Y</span><span className="gc-stick c-stick">C</span>
      </div>
      <div className="controller-legend" role="table" aria-label="Mario Strikers button actions">
        <div className="controller-legend-head" role="row"><strong role="columnheader">Button</strong><strong role="columnheader">With ball</strong><strong role="columnheader">Without ball</strong></div>
        {strikersControls.map(control => <div role="row" key={control.button}><b role="cell">{control.button}</b><span role="cell">{control.offense}</span><span role="cell">{control.defense}</span></div>)}
      </div>
    </div>
    <div className="controller-quick-tip"><strong>Fast teach:</strong> A passes or switches players. B shoots or slide tackles. Y dekes or delivers a big hit. R is turbo.</div>
  </section>
}

function GameHowTo({ game, navigate }) {
  return <button className="guide-page-link" onClick={() => navigate(`/games/${game.slug}`)}><span><strong>How to play</strong><small>Open the full rules and visual play map</small></span><ArrowRight size={15} /></button>
}

function WinnerSelector({ label, winnerKey, options, winnerId, recordGameWinner }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const winner = options.find(player => player.id === winnerId)

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeWithEscape = event => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [open])

  const choose = playerId => {
    recordGameWinner(winnerKey, playerId)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return <div className={`winner-selector ${open ? 'is-open' : ''} ${winner ? `has-winner ${teamInfo[winner.team].color}` : ''}`} ref={rootRef}>
    <button className="winner-picker-trigger" type="button" ref={triggerRef} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(current => !current)}>
      <Trophy size={15} />
      <span><small>{label}</small><strong>{winner ? winner.name : 'Choose winner'}</strong>{winner && <em>{teamInfo[winner.team].name}</em>}</span>
      <ChevronDown size={15} />
    </button>
    {open && <div className="winner-picker-popover" role="listbox" aria-label={`${label} winner`}>
      <header><Trophy size={17} /><span><strong>Who won?</strong><small>{label}</small></span></header>
      <div>{options.map(player => <button type="button" role="option" aria-selected={player.id === winner?.id} onClick={() => choose(player.id)} key={player.id}>
        <Avatar name={player.name} team={player.team} size="sm" />
        <span><strong>{player.name}</strong><small className={teamInfo[player.team].color}>{teamInfo[player.team].name}</small></span>
        {player.id === winner?.id ? <Trophy size={14} /> : <i />}
      </button>)}</div>
      {winner && <button className="clear-winner" type="button" onClick={() => choose(undefined)}>Clear result</button>}
    </div>}
  </div>
}

function TeamWinnerSelector({ label, result, recordResult }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const winner = result ? teamInfo[result] : null

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeWithEscape = event => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [open])

  const choose = team => {
    recordResult(team)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return <div className={`winner-selector team-winner-selector ${open ? 'is-open' : ''} ${winner ? `has-winner ${winner.color}` : ''}`} ref={rootRef}>
    <button className="winner-picker-trigger" type="button" ref={triggerRef} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen(current => !current)}>
      <Trophy size={15} />
      <span><small>{label}</small><strong>{winner ? winner.name : 'Choose winning team'}</strong>{winner && <em>+2 team points</em>}</span>
      <ChevronDown size={15} />
    </button>
    {open && <div className="winner-picker-popover team-winner-popover" role="listbox" aria-label={`${label} team winner`}>
      <header><Trophy size={17} /><span><strong>Which team won?</strong><small>Strikers awards team points only</small></span></header>
      <div>{Object.entries(teamInfo).map(([team, info]) => <button type="button" role="option" aria-selected={team === result} onClick={() => choose(team)} key={team}>
        <span className={`team-choice-ghost ${info.color}`}>{info.mascot}</span>
        <span><strong>{info.name}</strong><small className={info.color}>+2 TEAM POINTS</small></span>
        {team === result ? <Trophy size={14} /> : <i />}
      </button>)}</div>
      {winner && <button className="clear-winner" type="button" onClick={() => choose(undefined)}>Clear result</button>}
    </div>}
  </div>
}

function GroupGames({ navigate, players, gameWinners, recordGameWinner }) {
  const rosterByName = new Map(players.map(player => [player.name, player]))
  return (
    <main className="phase-page group-games-page">
      <section className="phase-page-hero">
        <span className="eyebrow">6:20–8:00 PM · EVERYONE PLAYS</span>
        <h1>Group Games</h1>
        <p>Three personal challenges followed by seven fast Jenga matchups. Start at the top and move on when the host calls time.</p>
        <div className="phase-summary"><span><strong>4</strong> games</span><span><strong>100</strong> minutes</span><span><strong>18</strong> winners</span></div>
      </section>

      <section className="simple-game-flow" aria-label="Group game order">
        {groupGameLineup.map(item => {
          const game = getGame(item.slug)
          const isJenga = item.slug === 'jenga'
          return <article className={`simple-game-step ${game.color}`} key={item.slug}>
            <span className="flow-number">{String(item.order).padStart(2, '0')}</span>
            <span className="flow-icon">{game.icon}</span>
            <div className="flow-copy">
              <small>{item.duration} · {item.location}</small>
              <h2>{game.name}</h2>
              <p>{item.note}</p>
              <div className="flow-score"><Trophy size={15} /><span>{isJenga ? 'Seven match winners · 1 individual + 1 team point each.' : item.slug === 'wordle' ? 'Five word winners · 3 individual + 3 team points each.' : 'Three round winners · 3 individual + 3 team points each.'}</span></div>
              <GameHowTo game={game} navigate={navigate} />
              {!isJenga && <div className="game-winner-panel"><div><span className="kicker">RECORD RESULTS</span><strong>Winner selector</strong><small>Picking a player updates both scoreboards.</small></div><div className="winner-selector-grid">{groupWinnerRounds[item.slug].map(round => <WinnerSelector label={round.label} winnerKey={round.key} options={players} winnerId={gameWinners[round.key]} recordGameWinner={recordGameWinner} key={round.key} />)}</div></div>}
              {isJenga && <section className="jenga-match-block group-jenga-block">
                <div className="circuit-section-heading"><div><span className="kicker">7:30–8:00 PM · ISLAND</span><h2>Seven 1v1 matchups</h2><p>Each match gets four minutes. A fallen tower loses; at the buzzer, tallest stable tower wins.</p></div></div>
                <div className="jenga-match-grid">{jengaMatches.map(([jessaName, willyName], index) => {
                  const options = [rosterByName.get(jessaName), rosterByName.get(willyName)].filter(Boolean)
                  const winnerKey = `jenga:${index + 1}`
                  return <article className="has-winner-control" key={jessaName}><span>{index + 1}</span><div><strong>{jessaName}</strong><small>TEAM JESSA</small></div><b>VS</b><div><strong>{willyName}</strong><small>TEAM WILLY</small></div><WinnerSelector label={`Match ${index + 1}`} winnerKey={winnerKey} options={options} winnerId={gameWinners[winnerKey]} recordGameWinner={recordGameWinner} /></article>
                })}</div>
              </section>}
            </div>
            {game.externalUrl ? <a className="flow-action" href={game.externalUrl} target="_blank" rel="noreferrer">Open GeoGuessr <ArrowRight size={15} /></a> : game.playable ? <button className="flow-action" onClick={() => navigate(`/play/${game.playable}`)}>Play now <ArrowRight size={15} /></button> : null}
          </article>
        })}
      </section>
    </main>
  )
}

function Circuit({ currentEvent, setCurrentEvent, players, gameWinners, recordGameWinner, circuitResults, recordCircuitResult, circuitGameChoices, setCircuitGameChoice, navigate }) {
  const selectedRound = currentEvent >= 4 && currentEvent <= 7 ? currentEvent - 4 : 0
  const round = circuitRounds[selectedRound]
  const rosterByName = new Map(players.map(player => [player.name, player]))

  return (
    <main className="phase-page circuit-page">
      <section className="phase-page-hero circuit-hero">
        <span className="eyebrow">8:00–9:35 PM · FOUR ROUNDS</span>
        <h1>Competition Circuit</h1>
        <p>Choose a round, send everyone to the listed station, then record the winning player or team. Strikers scores the team only; the tabletop games score both.</p>
        <div className="phase-summary"><span><strong>4</strong> rounds</span><span><strong>3</strong> stations</span><span><strong>20</strong> min each</span></div>
      </section>

      <nav className="circuit-round-picker" aria-label="Circuit rounds">
        {circuitRounds.map((item, index) => <button className={selectedRound === index ? 'active' : ''} aria-current={selectedRound === index ? 'step' : undefined} onClick={() => setCurrentEvent(index + 4)} key={item.label}><span>{index + 1}</span><strong>{item.label}</strong><small>{item.time}</small></button>)}
      </nav>

      <section className="circuit-now-bar">
        <div><span className="live-dot" /><small>SELECTED ROUND</small><strong>{round.label}</strong><em>{round.time}</em></div>
        <span className="circuit-switch-note">5-minute switch after this round{selectedRound === 3 ? ': no switch needed' : ''}</span>
      </section>

      <section className="exact-station-grid">
        {round.stations.map(station => {
          const isStrikers = station.slug === 'mario-strikers-gc'
          const isTableChoice = station.slug === 'flip-7'
          const activeSlug = isTableChoice ? (circuitGameChoices[String(selectedRound + 1)] || 'flip-7') : station.slug
          const winnerKey = isTableChoice ? `table-choice:circuit-${selectedRound + 1}` : `${activeSlug}:circuit-${selectedRound + 1}`
          const teamResultKey = `${selectedRound + 4}:${activeSlug}`
          const game = getGame(activeSlug)
          const stationPlayers = station.players.map(name => rosterByName.get(name)).filter(Boolean)
          return <article className="simple-station-card" key={`${selectedRound}-${station.location}`}>
            <header><span className="station-icon">{game.icon}</span><div><small>{station.location}</small><h2>{game.name}</h2></div><span className="pod-badge">{station.players.length} PLAYERS</span></header>
            {isTableChoice && <div className="table-game-switch" role="group" aria-label={`Dinner Table #2 game for ${round.label}`}><span>PLAY THIS ROUND</span><div>{['flip-7', 'magical-athlete'].map(slug => { const option = getGame(slug); return <button type="button" className={activeSlug === slug ? 'active' : ''} aria-pressed={activeSlug === slug} onClick={() => setCircuitGameChoice(selectedRound + 1, slug)} key={slug}><span>{option.icon}</span><strong>{option.name}</strong></button> })}</div></div>}
            <div className="exact-player-list">{station.players.map(name => { const player = rosterByName.get(name); return <div className={player?.team === 'meeple' ? 'jessa-player' : 'willy-player'} key={name}><Avatar name={name} team={player?.team} size="sm" /><span><strong>{name}</strong><small>{player ? teamInfo[player.team].name : ''}</small></span><i>{player?.checkedIn ? 'READY' : 'ROSTER'}</i></div> })}</div>
            <div className="station-guide-links"><button onClick={() => navigate(`/games/${activeSlug}`)}><span>{game.icon}</span><div><strong>{game.name} how-to</strong><small>Rules · play map{isStrikers ? ' · controls' : ''}</small></div><ArrowRight size={14} /></button></div>
            {isStrikers
              ? <div className="station-score team-only-score"><small>TEAM WINNER · +2 TEAM · NO INDIVIDUAL POINTS</small><TeamWinnerSelector label={`${round.label} team winner`} result={circuitResults[teamResultKey]} recordResult={result => recordCircuitResult(selectedRound + 4, activeSlug, result)} /><p>Choose the winning house team. No individual player score changes for Strikers.</p></div>
              : <div className="station-score"><small>WINNER · +2 INDIVIDUAL · +2 TEAM</small><WinnerSelector label={`${round.label} winner`} winnerKey={winnerKey} options={stationPlayers} winnerId={gameWinners[winnerKey]} recordGameWinner={recordGameWinner} /><p>The player and their team are scored together as soon as you select them.</p></div>}
          </article>
        })}
      </section>
    </main>
  )
}

function GameLibrary({ navigate }) {
  const groupGames = ['geoguessr', 'wordle', 'connections'].map(getGame).filter(Boolean)
  const teamLocations = [
    { location: 'Couch', note: '2v2 GameCube soccer', games: ['mario-strikers-gc'] },
    { location: 'Dinner Table #1', note: 'Four-player strategy', games: ['blokus'] },
    { location: 'Dinner Table #2', note: 'Choose one tabletop game', games: ['flip-7', 'magical-athlete'] },
    { location: 'Island', note: 'Dexterity station', games: ['jenga'] },
  ]
  const GameCard = ({ game, compact = false }) => <article className={`library-game-card card ${game.color} ${compact ? 'compact' : ''}`}>
    <div className="library-card-top"><span>{game.icon}</span><em>{game.status}</em></div>
    <div className="library-card-copy"><small>{game.format}</small><h2>{game.name}</h2><p>{game.summary}</p></div>
    <div className="game-specs"><span><Users size={14} /> {game.players}</span><span><Clock3 size={14} /> {game.duration}</span></div>
    <div className="library-card-actions"><button onClick={() => navigate(`/games/${game.slug}`)}>How to play <ArrowRight size={15} /></button>{game.playable && <button className="play-now" onClick={() => navigate(`/play/${game.playable}`)}>Play now <Play size={14} /></button>}</div>
  </article>
  return (
    <main>
      <section className="page-intro games-intro">
        <span className="eyebrow">TONIGHT'S GAME MAP</span>
        <h1>Play together. Then <em>hit the circuit.</em></h1>
        <p>Group games keep all fourteen players together. Team games are organized by the four places you will rotate through later.</p>
      </section>
      <section className="puzzle-launch-panel">
        <div><span className="kicker">READY ON YOUR PHONE</span><h2>Jump into the puzzle arcade</h2><p>Choose a round, submit your run, and see the live individual leaderboard.</p></div>
        <div><button onClick={() => navigate('/play/wordle')}><span>▣</span><strong>Play Wordle</strong><small>5 rounds</small><ChevronRight size={16} /></button><button onClick={() => navigate('/play/connections')}><span>▦</span><strong>Play Connections</strong><small>3 NYC rounds</small><ChevronRight size={16} /></button></div>
      </section>
      <section className="organized-game-section">
        <div className="game-section-heading"><span>01</span><div><small>EVERYONE TOGETHER</small><h2>Group Games</h2><p>Play these in order before dinner and the team circuit.</p></div></div>
        <div className="game-library-grid group-library-grid">{groupGames.map(game => <GameCard game={game} key={game.slug} />)}</div>
      </section>
      <section className="organized-game-section team-game-section">
        <div className="game-section-heading"><span>02</span><div><small>FOUR ROTATION STATIONS</small><h2>Team Games</h2><p>Your pod goes to the named location and stays there for the circuit round.</p></div></div>
        <div className="location-game-grid">{teamLocations.map(location => <section className="location-game-group" key={location.location}>
          <header><span className="location-pin">●</span><div><small>CIRCUIT LOCATION</small><h3>{location.location}</h3><p>{location.note}</p></div></header>
          <div>{location.games.map(slug => <GameCard game={getGame(slug)} compact key={slug} />)}</div>
        </section>)}</div>
      </section>
    </main>
  )
}

function Flip7SpecialCards() {
  const actions = [
    { symbol: '❄', name: 'Freeze', copy: 'Choose any active player, including yourself. They immediately bank their current points and leave the round.' },
    { symbol: '③', name: 'Flip Three', copy: 'Choose any active player, including yourself. They take the next three cards, stopping early only if they bust or complete Flip 7.' },
    { symbol: '♥', name: 'Second Chance', copy: 'Give it to any active player. It cancels one repeated number by discarding the duplicate and this card; each player can hold only one.' },
  ]
  return <section className="flip-special-card-guide">
    <div className="detail-play-map-heading"><div><span className="kicker">SPECIAL CARDS</span><h2>Action and modifier cheat sheet</h2></div><p>Action and Modifier cards never count toward seven unique numbers and cannot make you bust.</p></div>
    <div className="flip-action-grid">{actions.map(card => <article className={card.name.toLowerCase().replaceAll(' ', '-')} key={card.name}><span>{card.symbol}</span><div><strong>{card.name}</strong><p>{card.copy}</p></div></article>)}</div>
    <div className="flip-modifier-row">
      <div><span className="flip-card-stack"><b>+2</b><b>+4</b><b>+6</b><b>+8</b><b>+10</b></span><p><strong>Bonus modifiers</strong>Add the printed bonus after totaling your Number cards.</p></div>
      <div><span className="flip-x2-card">×2</span><p><strong>Double modifier</strong>Double the Number-card subtotal first, then add every + bonus.</p></div>
      <div className="flip-score-example"><small>EXAMPLE</small><strong>(8 + 6 + 3) × 2 + 4 = 38</strong><span>Number total → ×2 → + modifiers</span></div>
    </div>
    <p className="flip-rule-footnote"><strong>Flip Three timing:</strong> all three revealed cards count toward the sequence. Set aside another Freeze or Flip Three and resolve it after the three-card sequence, provided the target has not busted.</p>
  </section>
}

function GameDetail({ game, navigate }) {
  if (!game) return <main><section className="page-intro"><h1>Game not found</h1><button className="primary" onClick={() => navigate('/games')}>Back to games</button></section></main>
  return (
    <main>
      <button className="back-link" onClick={() => navigate('/games')}><ArrowRight size={15} /> All games</button>
      <section className={`game-detail-hero ${game.color}`}>
        <div className="detail-game-icon">{game.icon}</div>
        <div><span className="eyebrow">{game.status}</span><h1>{game.name}</h1><p>{game.summary}</p><div className="detail-specs"><span><Users size={15} /> {game.players}</span><span><Clock3 size={15} /> {game.duration}</span><span><Star size={15} /> {game.difficulty}</span></div></div>
        {game.playable && <button className="primary" onClick={() => navigate(`/play/${game.playable}`)}>Launch game <Play size={16} /></button>}
      </section>
      <section className="detail-play-map card">
        <div className="detail-play-map-heading"><div><span className="kicker">VISUAL QUICK START</span><h2>{game.slug === 'mario-strikers-gc' ? 'Field positioning' : 'How the game flows'}</h2></div><p>Use this picture for the fast explanation, then follow the numbered rules below.</p></div>
        <GameDiagram slug={game.slug} />
      </section>
      {game.slug === 'flip-7' && <Flip7SpecialCards />}
      {game.slug === 'mario-strikers-gc' && <StrikersControllerMap />}
      <section className="guide-grid">
        <div className="card guide-section"><span className="guide-number">01</span><div><span className="kicker">BEFORE YOU START</span><h2>Set it up</h2></div><ol>{game.setup.map(step => <li key={step}>{step}</li>)}</ol></div>
        <div className="card guide-section rules-guide"><span className="guide-number">02</span><div><span className="kicker">THE SHORT VERSION</span><h2>How to play</h2></div><ol>{game.rules.map(step => <li key={step}>{step}</li>)}</ol></div>
        <div className="card guide-section"><span className="guide-number">03</span><div><span className="kicker">HOUSE FORMAT</span><h2>Score the night</h2></div><p>{game.scoring}</p></div>
      </section>
      <div className="detail-footer-actions"><button className="secondary" onClick={() => navigate('/run-of-show')}><ListChecks size={16} /> See where it fits</button><button className="primary" onClick={() => navigate('/games')}>Choose another game <Library size={16} /></button></div>
    </main>
  )
}

function RunOfShow({ currentEvent, setCurrentEvent, players, scores, phaseScores, individualPhaseScores, podAssignments, circuitResults, dinnerOrder, setDinnerOrder, changePhaseScore, changeIndividualPhaseScore, changePlayerTeam, movePlayerToPod, randomizePods, recordCircuitResult, navigate }) {
  const current = itinerary[currentEvent] || itinerary[0]
  const guidance = phaseGuidance[currentEvent] || phaseGuidance[0]
  const logistics = phaseLogistics[currentEvent] || phaseLogistics[0]
  const selectedGames = [...logistics.games, ...(logistics.alternates || [])].map(getGame).filter(Boolean)
  const phaseScore = phaseScores[currentEvent] || { meeple: 0, mayhem: 0 }
  const scoring = phaseScoring[currentEvent] || phaseScoring[0]
  const individualScore = individualPhaseScores[currentEvent] || {}
  const activePhaseRef = useRef(null)
  const pods = useMemo(() => {
    const active = players.filter(player => player.checkedIn)
    const groups = [[], [], [], []]
    active.forEach((player, index) => {
      const pod = podAssignments[player.id] || ['A', 'B', 'C', 'D'][index % 4]
      groups[Math.max(0, ['A', 'B', 'C', 'D'].indexOf(pod))].push(player)
    })
    return groups
  }, [players, podAssignments])
  const phaseRounds = logistics.rotationRange ? rotations.slice(logistics.rotationRange[0], logistics.rotationRange[1] + 1) : []
  useEffect(() => {
    const active = activePhaseRef.current
    const rail = active?.parentElement
    if (active && rail) rail.scrollTo({ left: Math.max(0, active.offsetLeft - (rail.clientWidth - active.clientWidth) / 2), behavior: 'auto' })
  }, [currentEvent])

  return (
    <main className="run-show-page">
      <section className="run-show-intro">
        <div><span className="eyebrow">THE NIGHT NAVIGATOR</span><h1>Run of show</h1><p>Choose a phase to see exactly where to go, what to play, and how to record the result.</p></div>
        <div className="run-show-live"><span className="live-dot" /><small>LIVE PHASE</small><strong>{current.title}</strong><span>{current.time} {current.period}</span></div>
      </section>

      <div className="run-show-layout">
        <aside className="run-show-rail" aria-label="Run of show phases">
          <div className="run-show-rail-head"><ListChecks size={18} /><div><small>NIGHT MAP</small><strong>Choose a phase</strong></div></div>
          <nav>
            {itinerary.map((item, index) => (
              <button ref={index === currentEvent ? activePhaseRef : null} key={item.title} className={index === currentEvent ? 'active' : index < currentEvent ? 'complete' : ''} onClick={() => setCurrentEvent(index)} aria-current={index === currentEvent ? 'step' : undefined}>
                <span className="run-step">{index < currentEvent ? <Check size={14} /> : index + 1}</span>
                <span><small>{item.time} {item.period}</small><strong>{item.title}</strong><em>{item.duration}</em></span>
                <ChevronRight size={15} />
              </button>
            ))}
          </nav>
        </aside>

        <section className="run-show-detail" aria-live="polite">
          <header className="phase-detail-hero">
            <div><span className="kicker"><span className="live-dot" /> PHASE {String(currentEvent + 1).padStart(2, '0')} · {guidance.phase}</span><h2>{current.title}</h2><p>{current.detail}</p></div>
            <div className="phase-detail-meta"><span><Clock3 size={14} /> {current.time} {current.period}</span><span>{current.duration}</span>{current.points && <strong>{current.points} available</strong>}</div>
          </header>

          {currentEvent === 0 ? <section className="ready-up-checkin">
            <div className="ready-snack-note"><PartyPopper size={22} /><div><span className="kicker">SNACK + CHECK-IN</span><h3>Grab something to eat, find your name, and choose a team color.</h3></div></div>
            <div className="ready-team-counts">
              {Object.keys(teamInfo).map(team => <div className={teamInfo[team].color} key={team}><span className="team-ghost"><i /><i /></span><div><small>{team === 'meeple' ? 'PINK TEAM' : 'CYAN TEAM'}</small><strong>{teamInfo[team].name}</strong></div><b>{players.filter(player => player.checkedIn && player.team === team).length}</b></div>)}
            </div>
            <div className="ready-attendee-head"><div><span className="kicker">ATTENDING</span><h2>{players.filter(player => player.checkedIn).length} players checked in</h2></div><p>Each person can pick pink or cyan. Aim for an even split.</p></div>
            <div className="ready-attendee-list" role="list">
              {players.filter(player => player.checkedIn).map((player, index) => <article role="listitem" key={player.id}>
                <span className="ready-player-number">{String(index + 1).padStart(2, '0')}</span><Avatar name={player.name} /><div className="ready-player-name"><strong>{player.name}</strong><small>Checked in</small></div>
                <div className="ready-team-picker" role="group" aria-label={`Choose a team color for ${player.name}`}><button className={`pink ${player.team === 'meeple' ? 'active' : ''}`} onClick={() => changePlayerTeam(player.id, 'meeple')}><span /> Pink</button><button className={`cyan ${player.team === 'mayhem' ? 'active' : ''}`} onClick={() => changePlayerTeam(player.id, 'mayhem')}><span /> Cyan</button></div>
              </article>)}
            </div>
          </section> : currentEvent === 1 ? <section className="simple-intro">
            <div className="simple-intro-heading"><span className="kicker">WELCOME · KEEP IT QUICK</span><h2>Tonight in 60 seconds</h2><p>Grab everyone’s attention, explain the arc of the night, and start playing.</p></div>
            <div className="intro-simple-steps">
              <article><span>01</span><div><strong>Two ghost teams</strong><p>Pink Blinky and Cyan Inky collect team points all night.</p></div></article>
              <article><span>02</span><div><strong>Three individual challenges</strong><p>GeoGuessr, Wordle, and Connections each produce an individual result.</p></div></article>
              <article><span>03</span><div><strong>Four circuits after dinner</strong><p>Pods start at one station, then rotate clockwise until every game is complete.</p></div></article>
            </div>
            <button className="intro-next" onClick={() => setCurrentEvent(2)}>Ready? Start GeoGuessr <ArrowRight size={15} /></button>
          </section> : currentEvent === 3 ? <section className="dinner-order-panel">
            <div className="detail-section-title"><span><PartyPopper size={18} /></span><div><small>DINNER BREAK</small><h3>What did we order?</h3></div></div>
            <p>This block is only for eating and catching up. Add the order here so everyone knows what arrived.</p>
            <label htmlFor="dinner-order">Dinner order</label>
            <textarea id="dinner-order" value={dinnerOrder} onChange={event => setDinnerOrder(event.target.value)} placeholder="Example: 2 pizzas, wings, salad, and one gluten-free order…" />
            <small>Next up: Circuit 1 · Starting stations at 7:30 PM</small>
          </section> : <>
          <div className="phase-command-grid">
            <article className="phase-directions">
              <div className="detail-section-title"><span><Users size={17} /></span><div><small>YOUR INSTRUCTIONS</small><h3>What everyone should do</h3></div></div>
              <p className="phase-goal">{guidance.objective}</p>
              <div className="instruction-list">
                <div><strong>Everyone</strong><p>{guidance.everyone}</p></div>
                <div className="blinky"><strong>Team Blinky</strong><p>{guidance.blinky}</p></div>
                <div className="inky"><strong>Team Inky</strong><p>{guidance.inky}</p></div>
                <div className="host"><strong>Host cue</strong><p>{guidance.host}</p></div>
              </div>
            </article>

            <article className="phase-score-entry">
              <div className="detail-section-title"><span><Trophy size={17} /></span><div><small>TEAM SCORE</small><h3>Phase scoring</h3></div></div>
              <p>{scoring.note} Changes update the Live scoreboard instantly.</p>
              {Object.keys(teamInfo).map(team => (
                <div className={`phase-team-score ${teamInfo[team].color}`} key={team}>
                  <div><small>{teamInfo[team].name}</small><strong>{phaseScore[team]} <em>this phase</em></strong><span>{scores[team]} total</span></div>
                  {scoring.mode === 'group' && <div><button onClick={() => changePhaseScore(currentEvent, team, -1)} aria-label={`Remove one phase point from ${teamInfo[team].name}`}>−1</button><button onClick={() => changePhaseScore(currentEvent, team, 5)} aria-label={`Add five phase points to ${teamInfo[team].name}`}>+5</button><button onClick={() => changePhaseScore(currentEvent, team, scoring.award)} aria-label={`Award ${scoring.award} phase points to ${teamInfo[team].name}`}>+{scoring.award}</button></div>}
                </div>
              ))}
              {scoring.mode === 'circuit' && <div className="station-result-list">
                <small>RECORD EACH STATION · 10 POINTS</small>
                {(logistics.stations || []).map(station => {
                  const key = `${currentEvent}:${station.slug}`
                  const result = circuitResults[key] || ''
                  return <div className="station-result-row" key={station.slug}><span>{station.icon} {station.location}</span><div><button className={result === 'meeple' ? 'active blinky' : ''} onClick={() => recordCircuitResult(currentEvent, station.slug, result === 'meeple' ? '' : 'meeple')}>Blinky</button><button className={result === 'split' ? 'active split' : ''} onClick={() => recordCircuitResult(currentEvent, station.slug, result === 'split' ? '' : 'split')}>Split</button><button className={result === 'mayhem' ? 'active inky' : ''} onClick={() => recordCircuitResult(currentEvent, station.slug, result === 'mayhem' ? '' : 'mayhem')}>Inky</button></div></div>
                })}
              </div>}
              {scoring.mode === 'individual' && <div className="unscored-phase"><Medal size={15} /> Team scores stay put. Record GeoGuessr podium points below; Wordle and Connections update their own leaderboards.</div>}
              {scoring.mode === 'none' && <div className="unscored-phase"><Check size={15} /> No championship points are recorded in this phase.</div>}
              <button className="view-full-score" onClick={() => navigate('/scores')}>Open full scoreboard <ChevronRight size={14} /></button>
            </article>
          </div>

          {currentEvent === 2 && <section className="phase-detail-section geo-group-format">
            <div className="geo-format-heading">
              <div><span className="kicker">INDIVIDUAL GEOGRAPHY FORMAT</span><h2>3 games × 5 GeoGuessr rounds</h2><p>Everyone plays on their own device. Each five-round game produces a separate individual podium.</p></div>
              <span className="muted-chip">15 locations total</span>
            </div>
            <div className="geo-format-steps">
              <article><span>01</span><strong>Join individually</strong><p>Host shares the lobby link or code and every player joins on their own phone.</p></article>
              <article><span>02</span><strong>Play five rounds</strong><p>Scan signs, language, road lines, buildings, and landscape without sharing answers.</p></article>
              <article><span>03</span><strong>Record the podium</strong><p>After round five, award 5–3–1 individual points to first, second, and third.</p></article>
              <article><span>04</span><strong>Repeat three times</strong><p>Start a fresh five-round game and score a new podium each time.</p></article>
            </div>
            <div className="geo-launch"><p><strong>Scoring:</strong> three separate 5–3–1 podiums. GeoGuessr does not add team points during this block.</p><a href="https://www.geoguessr.com/party" target="_blank" rel="noreferrer">Open GeoGuessr Party <ArrowRight size={14} /></a></div>
          </section>}

          {currentEvent === 2 && <section className="phase-detail-section group-game-run">
            <div className="section-heading"><div><span className="kicker">PLAY IN THIS ORDER</span><h2>Three-game individual lineup</h2><p>Everyone plays the same challenge, but each player records their own result.</p></div><span className="muted-chip">50-minute block</span></div>
            <div className="group-game-run-list">{groupGameLineup.map(item => {
              const game = getGame(item.slug)
              return <article key={item.slug}>
                <span className="group-game-order">{String(item.order).padStart(2, '0')}</span>
                <span className="group-game-icon">{game.icon}</span>
                <div><small>{item.duration} · {item.location}</small><h3>{game.name}</h3><p>{item.note}</p></div>
                {game.externalUrl ? <a href={game.externalUrl} target="_blank" rel="noreferrer">Launch <ArrowRight size={14} /></a> : game.playable ? <button onClick={() => navigate(`/play/${game.playable}`)}>Play <ArrowRight size={14} /></button> : <button onClick={() => navigate(`/games/${game.slug}`)}>Guide <ArrowRight size={14} /></button>}
              </article>
            })}</div>
          </section>}

          {phaseRounds.length > 0 && <section className="phase-detail-section pod-manager-section">
            <div className="section-heading"><div><span className="kicker">STATION MANAGER</span><h2>Pods at this rotation</h2><p>{logistics.assignmentMode === 'random' ? 'Shuffle once, then keep these pods together for all four circuits.' : 'Pods stay together and move clockwise to the location shown below.'}</p></div>{logistics.assignmentMode === 'random' ? <button className="pod-randomize" onClick={randomizePods}><Shuffle size={14} /> Randomize pods</button> : <span className="muted-chip">Clockwise rotation</span>}</div>
            <div className="pod-manager-grid">{logistics.stations.map(station => { const podIndex = ['A', 'B', 'C', 'D'].indexOf(station.pod); return <article key={`${station.pod}-${station.location}`}>
              <header><div><small>POD {station.pod} · {station.location}</small><h3>{station.name}</h3></div><strong>{pods[podIndex].length} players</strong></header>
              <div>{pods[podIndex].map(player => <div className="pod-manager-player" key={player.id}><Avatar name={player.name} size="sm" /><span><strong>{player.name}</strong><small>{teamInfo[player.team].name}</small></span><select value={station.pod} onChange={event => movePlayerToPod(player.id, event.target.value)} aria-label={`Move ${player.name} to another pod`}>{['A', 'B', 'C', 'D'].map(option => <option value={option} key={option}>Pod {option}</option>)}</select></div>)}</div>
            </article>})}</div>
          </section>}

          <section className="phase-detail-section individual-score-section">
            <div className="section-heading"><div><span className="kicker">INDIVIDUAL SCORE</span><h2>Player points</h2><p>{scoring.individual}</p></div><button className="text-button" onClick={() => navigate('/scores')}>Individual standings</button></div>
            <div className="individual-score-grid">{players.filter(player => player.checkedIn).map(player => {
              const phasePoints = individualScore[player.id] || 0
              return <article className={teamInfo[player.team].color} key={player.id}><Avatar name={player.name} /><div><strong>{player.name}</strong><small>{teamInfo[player.team].name}</small></div><span><strong>{phasePoints}</strong><small>phase</small></span><span><strong>{player.points}</strong><small>total</small></span><div><button disabled={scoring.mode === 'none'} onClick={() => changeIndividualPhaseScore(currentEvent, player.id, -1)} aria-label={`Remove one individual point from ${player.name}`}>−1</button><button disabled={scoring.mode === 'none'} onClick={() => changeIndividualPhaseScore(currentEvent, player.id, 1)} aria-label={`Add one individual point to ${player.name}`}>+1</button><button disabled={scoring.mode === 'none'} onClick={() => changeIndividualPhaseScore(currentEvent, player.id, 3)} aria-label={`Add three individual points to ${player.name}`}>+3</button></div></article>
            })}</div>
          </section>

          {logistics.places.length > 0 && <section className="phase-detail-section">
            <div className="section-heading"><div><span className="kicker">DESTINATIONS</span><h2>Where to go</h2></div><span className="muted-chip">Move together on the host call</span></div>
            <div className="destination-grid">
              {logistics.places.map((place, index) => {
                const podIndex = place.group.startsWith('Pod ') ? place.group.charCodeAt(4) - 65 : -1
                const game = place.game ? getGame(place.game) : null
                return <article className="destination-card" key={`${place.group}-${place.location}`}>
                  <span className="destination-number">{String(index + 1).padStart(2, '0')}</span>
                  <div><small>{place.group}</small><h3>{place.location}</h3>{game && <strong>{game.icon} {place.detail ? circuitStations.find(station => station.location === place.location)?.name || game.name : game.name}</strong>}<p>{place.detail || (game ? 'Stay here for the full 20-minute circuit.' : '')}</p></div>
                  {podIndex >= 0 && <div className="pod-player-chips">{pods[podIndex].map(player => <span key={player.id}><Avatar name={player.name} size="sm" /> {player.name}</span>)}</div>}
                </article>
              })}
            </div>
          </section>}

          {phaseRounds.length > 0 && <section className="phase-detail-section">
            <div className="section-heading"><div><span className="kicker">CIRCUIT MAP</span><h2>{phaseRounds.length === 1 ? 'This circuit’s four stations' : 'Round-by-round movement'}</h2></div><button className="text-button" onClick={() => navigate('/teams')}>Check teams</button></div>
            <div className="phase-round-grid">{phaseRounds.map(round => <article key={round.round}><header><strong>{round.round}</strong><span>{round.time}</span></header>{round.stations.map(station => <div key={`${round.round}-${station.pod}`}><span>Pod {station.pod}</span><strong>{station.location} · {station.name}</strong></div>)}</article>)}</div>
          </section>}

          {currentEvent !== 2 && <section className="phase-detail-section">
            <div className="section-heading"><div><span className="kicker">GAME PLAN</span><h2>{selectedGames.length ? (logistics.alternates ? 'Scheduled games + smart swaps' : 'Games in this phase') : 'No game setup needed'}</h2></div>{selectedGames.length > 0 && <button className="text-button" onClick={() => navigate('/games')}>Game library</button>}</div>
            {selectedGames.length > 0 ? <div className="phase-game-grid">{selectedGames.map(game => {
              const alternate = (logistics.alternates || []).includes(game.slug)
              return <article className={alternate ? 'alternate-game' : ''} key={game.slug}>
                <div className="phase-game-head"><span>{game.icon}</span><div><small>{alternate ? 'OPTIONAL SWAP' : `${game.players} · ${game.duration}`}</small><h3>{game.name}</h3></div></div>
                <p>{game.summary}</p>
                <ul><li><strong>Setup:</strong> {game.setup[0]}</li><li><strong>Start:</strong> {game.rules[0]}</li><li><strong>Score:</strong> {game.scoring}</li></ul>
                {game.externalUrl ? <a href={game.externalUrl} target="_blank" rel="noreferrer">Open GeoGuessr <ArrowRight size={14} /></a> : <button onClick={() => navigate(game.playable ? `/play/${game.playable}` : `/games/${game.slug}`)}>{game.playable ? 'Launch game' : 'Full instructions'} <ArrowRight size={14} /></button>}
              </article>
            })}</div> : <div className="no-game-phase"><PartyPopper size={24} /><div><strong>Focus on people, not pieces.</strong><p>{guidance.everyone}</p></div></div>}
          </section>}
          </>}

          <div className="phase-detail-controls"><button disabled={currentEvent === 0} onClick={() => setCurrentEvent(Math.max(0, currentEvent - 1))}>Previous phase</button><span>{currentEvent + 1} of {itinerary.length}</span><button disabled={currentEvent === itinerary.length - 1} onClick={() => setCurrentEvent(Math.min(itinerary.length - 1, currentEvent + 1))}>Next phase <ChevronRight size={14} /></button></div>
        </section>
      </div>
    </main>
  )
}

function Schedule({ currentEvent, setCurrentEvent, players, navigate }) {
  const [round, setRound] = useState(0)
  const pods = useMemo(() => {
    const active = players.filter(player => player.checkedIn)
    const groups = [[], [], [], []]
    Object.keys(teamInfo).forEach(team => {
      active.filter(player => player.team === team).forEach((player, index) => groups[index % 4].push(player.name))
    })
    return groups
  }, [players])
  return (
    <main>
      <section className="page-intro">
        <span className="eyebrow">THE GAME PLAN</span>
        <h1>A full night, <em>zero benchwarmers.</em></h1>
        <p>The core schedule keeps all 14 players active. With 10–14 guests, use 3–4 people at each of the four stations.</p>
      </section>

      <section className="schedule-layout">
        <div className="timeline card">
          {itinerary.map((item, index) => (
            <button key={item.title} className={`timeline-row ${currentEvent === index ? 'active' : ''}`} onClick={() => setCurrentEvent(index)}>
              <span className="time-block"><strong>{item.time}</strong><small>{item.period}</small></span>
              <span className="line-node">{currentEvent > index ? <Check size={14} /> : ''}</span>
              <span className="activity-icon">{item.icon}</span>
              <span className="activity-copy"><strong>{item.title}</strong><small>{item.detail}</small><span>{item.duration} {item.points && `• ${item.points}`}</span></span>
              {currentEvent === index && <span className="now-tag">NOW</span>}
            </button>
          ))}
        </div>

        <aside className="card host-note">
          <Lightbulb size={24} />
          <span className="kicker">HOST NOTE</span>
          <h3>Keep the pods moving</h3>
          <p>Use the first shuffle to create balanced pods, then keep them together through all four clockwise rotations.</p>
          <div className="mini-rule"><span>Core-night rule</span><strong>No one sits out longer than 5 min.</strong></div>
        </aside>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="kicker">7:30–8:50 PM</span><h2>Four-game rotation circuit</h2></div><span className="all-active"><Users size={15} /> All players active</span></div>
        <div className="round-tabs">
          {rotations.map((item, i) => <button key={item.round} className={round === i ? 'active' : ''} onClick={() => setRound(i)}>{item.round}<small>{item.time}</small></button>)}
        </div>
        <div className="station-grid">
          {rotations[round].stations.map(station => {
            const podIndex = station.pod.charCodeAt(station.pod.length - 1) - 65
            const stationPlayers = pods[podIndex]
            return (
            <div className="station-card card" key={station.name}>
              <div className="station-top"><span>{station.icon}</span><div><small>Pod {String.fromCharCode(65 + podIndex)}</small><h3>{station.name}</h3></div><strong>10 pts</strong></div>
              <div className="station-players">
                {stationPlayers.map(name => {
                  const playerTeam = players.find(player => player.name === name)?.team || 'meeple'
                  return <span key={name}><Avatar name={name} size="sm" /> {name} <i className={`dot ${teamInfo[playerTeam].color}`} /></span>
                })}
              </div>
              <p>{getGame(station.slug)?.scoring}</p>
              <button className="station-guide" onClick={() => navigate(`/games/${station.slug}`)}>Read the guide <ArrowRight size={13} /></button>
            </div>
          )})}
        </div>
      </section>
      <section className="section-block lineup-games">
        <div className="section-heading"><div><span className="kicker">GAME-BY-GAME</span><h2>Tonight’s complete game lineup</h2></div><button className="text-button" onClick={() => navigate('/games')}>Full library</button></div>
        <div className="lineup-game-list">
          {tonightSlugs.map((slug, index) => { const game = getGame(slug); return <button key={slug} onClick={() => navigate(`/games/${slug}`)}><span>{String(index + 1).padStart(2, '0')}</span><i className={game.color}>{game.icon}</i><div><strong>{game.name}</strong><small>{game.format} · {game.players}</small></div><em>{game.duration}</em><ChevronRight size={16} /></button> })}
        </div>
      </section>
    </main>
  )
}

function Scoreboard({ scores, changeScore, players, changePlayerScore, navigate }) {
  const sorted = [...players].sort((a, b) => b.points - a.points)
  return (
    <main>
      <section className="page-intro score-intro">
        <span className="eyebrow">BRAGGING RIGHTS</span>
        <h1>The scoreboard</h1>
        <p>Most wins score both the player and their team. Mario Strikers is the team-only exception.</p>
        <button className="primary host-plan-link" onClick={() => navigate('/host')}><ListChecks size={16} /> Open Jessa’s host run sheet</button>
      </section>
      <section className="score-board-section team-score-section">
        <div className="score-section-heading"><span className="score-section-number">01</span><div><span className="kicker">TEAM SCORE</span><h2>Team Jessa vs. Team Willy</h2><p>Group-game wins add 3, Jenga wins add 1, and main-circuit wins add 2.</p></div></div>
        <TeamScores scores={scores} onChange={changeScore} />
      </section>

      <section className="score-board-section individual-score-board-section">
        <div className="score-section-heading"><span className="score-section-number">02</span><div><span className="kicker">INDIVIDUAL SCORE</span><h2>Player standings</h2><p>Personal points recognize podiums and standout performances without changing team assignments.</p></div></div>
      <div className="scoreboard-grid single-panel">
        <div className="card standings">
          <div className="section-heading"><div><span className="kicker">LIVE RANKING</span><h2>Player leaderboard</h2></div><span className="muted-chip">Top 8</span></div>
          <div className="standings-list">
            {sorted.slice(0, 8).map((player, index) => (
              <div key={player.id} className={index < 3 ? `podium-row podium-${index + 1}` : ''}>
                <span className={`rank rank-${index + 1}`}>{index === 0 ? <Trophy size={22} /> : index + 1}</span>
                <Avatar name={player.name} />
                <span className="player-name">{index < 3 && <small className="podium-label">{index === 0 ? 'CURRENT CHAMPION' : index === 1 ? 'SECOND PLACE' : 'THIRD PLACE'}</small>}<strong>{player.name}</strong><TeamPill team={player.team} /></span>
                <span className="point-stepper"><button aria-label={`Remove one point from ${player.name}`} onClick={() => changePlayerScore(player.id, -1)}><Minus size={13} /></button><strong>{player.points}</strong><button aria-label={`Add one point to ${player.name}`} onClick={() => changePlayerScore(player.id, 1)}><Plus size={13} /></button><small>pts</small></span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </section>
    </main>
  )
}

function HostPlan({ navigate }) {
  return <main className="host-plan-page">
    <button className="back-link" onClick={() => navigate('/scores')}><ArrowRight size={15} /> Back to scores</button>
    <section className="phase-page-hero host-plan-hero">
      <span className="eyebrow">HOST / SCOREKEEPER · JESSA</span>
      <h1>Game Night Run Sheet</h1>
      <p>{eventDetails.date} · {eventDetails.playerCount} players · three hours and fifty minutes from arrival to final prizes.</p>
      <div className="phase-summary"><span><strong>$70</strong> prize cash</span><span><strong>38</strong> envelopes</span><span><strong>2</strong> scoreboards</span></div>
    </section>

    <section className="host-plan-section cash-plan-section">
      <div className="host-plan-heading"><span>01</span><div><small>BEFORE GUESTS ARRIVE</small><h2>Cash and envelopes</h2></div></div>
      <div className="cash-plan-grid"><article><small>WITHDRAW</small><strong>$70</strong><p>30 one-dollar bills<br />8 five-dollar bills</p></article><article><small>PREPARE</small><strong>38</strong><p>30 red envelopes with $1<br />8 red envelopes with $5</p></article><article><small>LABEL RULE</small><strong>Front only</strong><p>Do not write amounts. Put a tiny private dot or number on the back if useful.</p></article></div>
      <div className="envelope-groups">{envelopeGroups.map(group => <details key={group.title}><summary><span>{group.title}</span><small>{group.labels.length} labels · {group.amount}</small></summary><ol>{group.labels.map(label => <li key={label}>{label}</li>)}</ol></details>)}</div>
    </section>

    <section className="host-plan-section">
      <div className="host-plan-heading"><span>02</span><div><small>6:00–9:50 PM</small><h2>Timeline and host cues</h2></div></div>
      <div className="host-timeline">{eventTimeline.map(item => <article key={item.time}><time>{item.time}</time><div><strong>{item.activity}</strong><p>{item.detail}</p></div></article>)}</div>
    </section>

    <section className="host-plan-section">
      <div className="host-plan-heading"><span>03</span><div><small>RECORD BOTH COLUMNS</small><h2>Point rules</h2></div></div>
      <div className="point-rules-table" role="table" aria-label="Game-night point rules"><div role="row"><strong role="columnheader">Result</strong><strong role="columnheader">Individual</strong><strong role="columnheader">Team</strong></div>{pointRules.map(rule => <div role="row" key={rule.result}><span role="cell">{rule.result}</span><b role="cell">+{rule.individual}</b><b role="cell">+{rule.team}</b></div>)}</div>
      <div className="host-rule-note"><Lightbulb size={18} /><p>After each result, update the winner’s individual score and the matching Team Jessa or Team Willy total. Use one sudden-death tie-breaker only if final team totals are tied.</p></div>
    </section>

    <section className="host-plan-section host-shortcuts">
      <div className="host-plan-heading"><span>04</span><div><small>QUICK LINKS</small><h2>Run the room</h2></div></div>
      <div><button onClick={() => navigate('/group-games')}><Gamepad2 size={18} /><span><strong>Group Games</strong><small>GeoGuessr, Wordle, Connections, Jenga</small></span><ArrowRight size={15} /></button><button onClick={() => navigate('/circuit')}><Shuffle size={18} /><span><strong>Competition Circuit</strong><small>Four rounds and exact assignments</small></span><ArrowRight size={15} /></button><button onClick={() => navigate('/scores')}><Trophy size={18} /><span><strong>Scores</strong><small>Individual and team totals</small></span><ArrowRight size={15} /></button></div>
    </section>
  </main>
}

function PartyGrid({ onWin }) {
  const [selected, setSelected] = useState([])
  const [solved, setSolved] = useState([])
  const [mistakes, setMistakes] = useState(0)
  const [awarded, setAwarded] = useState(false)
  const toggle = word => setSelected(selected.includes(word) ? selected.filter(w => w !== word) : selected.length < 4 ? [...selected, word] : selected)
  const submit = () => {
    const match = gridGroups.find(group => !solved.includes(group.label) && group.words.every(w => selected.includes(w)))
    if (match) {
      const next = [...solved, match.label]
      setSolved(next)
      setSelected([])
    } else {
      setMistakes(m => m + 1)
      setSelected([])
    }
  }
  const reset = () => { setSelected([]); setSolved([]); setMistakes(0); setAwarded(false) }
  const remaining = gridWords.filter(word => !gridGroups.some(group => solved.includes(group.label) && group.words.includes(word)))
  return (
    <div className="party-grid-game">
      <div className="game-head"><div><span className="kicker">IN-APP GAME</span><h2>Party Grid</h2><p>Find four groups of four. Teams may confer—but only the captain can tap.</p></div><button className="icon-button light" aria-label="Start a new Party Grid" onClick={reset}><RotateCcw size={18} /></button></div>
      <div className="solved-groups">
        {solved.map(label => { const group = gridGroups.find(g => g.label === label); return <div className={group.color} key={label}><strong>{label}</strong><span>{group.words.join(' · ')}</span></div> })}
      </div>
      <div className="word-grid">
        {remaining.map(word => <button key={word} aria-pressed={selected.includes(word)} className={`${selected.includes(word) ? 'selected ' : ''}${word.replace(/\s/g, '').length >= 11 ? 'very-long-word' : word.replace(/\s/g, '').length >= 9 ? 'long-word' : ''}`} onClick={() => toggle(word)}>{word}</button>)}
      </div>
      {solved.length === gridGroups.length && !awarded ? <div className="winner-pick"><strong>Puzzle solved! Award 10 points:</strong><button onClick={() => { onWin('meeple'); setAwarded(true) }}>◆ Team Meeple</button><button onClick={() => { onWin('mayhem'); setAwarded(true) }}>✦ Team Mayhem</button></div> : null}
      <div className="game-footer"><span>Mistakes {[0, 1, 2].map(index => <i className={index < mistakes ? 'lost' : ''} key={index} />)}</span><button className="primary" disabled={selected.length !== 4} onClick={submit}>Submit four</button></div>
    </div>
  )
}

const formatPuzzleTime = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function PuzzleLeaderboard({ game, puzzleId, results }) {
  const leaders = results.filter(result => result.game === game && result.puzzleId === puzzleId).sort((a, b) => Number(a.completed === false) - Number(b.completed === false) || a.metric - b.metric || a.playerName.localeCompare(b.playerName))
  const finishers = leaders.filter(result => result.completed !== false)
  return <aside className="puzzle-leaderboard">
    <div><span className="kicker">LIVE LEADERBOARD</span><h3>{game === 'wordle' ? 'Fewest attempts + DNFs' : 'Fastest solves + DNFs'}</h3></div>
    {leaders.length ? <ol>{leaders.map(result => { const completed = result.completed !== false; return <li className={!completed ? 'dnf' : ''} key={`${result.playerId}-${result.puzzleId}`}><span>{completed ? finishers.findIndex(item => item.metric === result.metric) + 1 : '—'}</span><Avatar name={result.playerName} size="sm" /><strong>{result.playerName}</strong><small className={teamInfo[result.team].color}>{teamInfo[result.team].short}</small><b>{completed ? (game === 'wordle' ? `${result.metric}/6` : formatPuzzleTime(result.metric)) : 'DNF'}</b></li> })}</ol> : <div className="empty-leaderboard"><Trophy size={22} /><p>No attempts yet. Be the first name on the board.</p></div>}
  </aside>
}

function PuzzleRoundPicker({ rounds, roundIndex, setRoundIndex }) {
  return <nav className="puzzle-round-picker" aria-label="Puzzle rounds">
    <div><span className="kicker">CHOOSE A CHALLENGE</span><strong>{rounds.length} rounds available</strong></div>
    <div>{rounds.map((round, index) => <button aria-current={roundIndex === index ? 'true' : undefined} className={roundIndex === index ? 'active' : ''} onClick={() => setRoundIndex(index)} key={round.id}><span>{index + 1}</span>{round.label}{round.title && <small>{round.title}</small>}</button>)}</div>
  </nav>
}

function ConnectionsRound({ puzzle, onComplete, results }) {
  const [selected, setSelected] = useState([])
  const [solved, setSolved] = useState([])
  const [mistakes, setMistakes] = useState(0)
  const [lost, setLost] = useState(false)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [resultMetric, setResultMetric] = useState(null)
  useEffect(() => {
    if (resultMetric || lost) return undefined
    const timer = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000)
    return () => clearInterval(timer)
  }, [startedAt, resultMetric, lost])
  const toggle = word => {
    if (resultMetric || lost) return
    setSelected(selected.includes(word) ? selected.filter(item => item !== word) : selected.length < 4 ? [...selected, word] : selected)
  }
  const submit = async () => {
    const match = puzzle.groups.find(group => !solved.includes(group.label) && group.words.every(word => selected.includes(word)))
    if (match) {
      const next = [...solved, match.label]
      setSolved(next)
      if (next.length === puzzle.groups.length) {
        const metric = Math.max(1, Math.ceil((Date.now() - startedAt) / 1000))
        setResultMetric(metric)
        await onComplete(metric)
      }
    } else {
      const nextMistakes = mistakes + 1
      setMistakes(nextMistakes)
      if (nextMistakes >= 4) {
        setLost(true)
        const metric = Math.max(1, Math.ceil((Date.now() - startedAt) / 1000))
        await onComplete(metric, false)
      }
    }
    setSelected([])
  }
  const reset = () => { setSelected([]); setSolved([]); setMistakes(0); setLost(false); setStartedAt(Date.now()); setElapsed(0); setResultMetric(null) }
  const remaining = puzzle.words.filter(word => !puzzle.groups.some(group => solved.includes(group.label) && group.words.includes(word)))
  return <div className="puzzle-with-board"><div className="party-grid-game">
      <div className="game-head"><div><span className="kicker">{puzzle.label.toUpperCase()} · {formatPuzzleTime(resultMetric || elapsed)}</span><h2>Connections: {puzzle.title}</h2><p>Find four groups of four. You have four mistakes; your time records when the last group locks.</p></div><button className="icon-button light" aria-label="Restart Connections puzzle" onClick={reset}><RotateCcw size={18} /></button></div>
      <div className="solved-groups">{solved.map(label => { const group = puzzle.groups.find(item => item.label === label); return <div className={group.color} key={label}><strong>{label}</strong><span>{group.words.join(' · ')}</span></div> })}</div>
      {!lost && <div className="word-grid">{remaining.map(word => <button key={word} aria-pressed={selected.includes(word)} className={`${selected.includes(word) ? 'selected ' : ''}${word.replace(/\s/g, '').length >= 11 ? 'very-long-word' : word.replace(/\s/g, '').length >= 9 ? 'long-word' : ''}`} onClick={() => toggle(word)}>{word}</button>)}</div>}
      {resultMetric && <p className="wordle-result" aria-live="polite">Maze cleared in {formatPuzzleTime(resultMetric)}. Your best time is live.</p>}
      {lost && <section className="connections-reveal" aria-live="polite"><div><strong>Game over</strong><p>Four misses used. Here are the answers:</p></div>{puzzle.groups.map(group => <div className={group.color} key={group.label}><strong>{group.label}</strong><span>{group.words.join(' · ')}</span></div>)}</section>}
      <div className="game-footer"><span>Mistakes {[0, 1, 2, 3].map(index => <i className={index < mistakes ? 'lost' : ''} key={index} />)}</span><button className="primary" disabled={selected.length !== 4 || Boolean(resultMetric) || lost} onClick={submit}>{lost ? 'Round over' : 'Submit four'}</button></div>
    </div><PuzzleLeaderboard game="connections" puzzleId={puzzle.id} results={results} /></div>
}

function ConnectionsGame({ onComplete, results }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const puzzle = connectionsRounds[roundIndex]
  return <><PuzzleRoundPicker rounds={connectionsRounds} roundIndex={roundIndex} setRoundIndex={setRoundIndex} /><ConnectionsRound key={puzzle.id} puzzle={puzzle} results={results} onComplete={(metric, completed = true) => onComplete(puzzle.id, metric, completed)} /></>
}

const wordleAnswers = new Set(wordleRounds.map(round => round.answer))
let wordleDictionaryPromise
const isValidWordleGuess = async word => {
  if (wordleAnswers.has(word)) return true
  wordleDictionaryPromise ??= import('../node_modules/wordle-words/index.mjs').then(({ all }) => new Set(all.map(entry => entry.toUpperCase())))
  return (await wordleDictionaryPromise).has(word)
}

function WordleRound({ puzzle, onComplete, results }) {
  const [entry, setEntry] = useState('')
  const [guesses, setGuesses] = useState([])
  const [winner, setWinner] = useState(false)
  const [validating, setValidating] = useState(false)
  const [wordError, setWordError] = useState('')
  const target = puzzle.answer
  const grade = word => {
    const result = Array(5).fill('miss')
    const counts = {}
    target.split('').forEach((letter, index) => { if (word[index] !== letter) counts[letter] = (counts[letter] || 0) + 1 })
    word.split('').forEach((letter, index) => { if (letter === target[index]) result[index] = 'hit' })
    word.split('').forEach((letter, index) => { if (result[index] === 'miss' && counts[letter]) { result[index] = 'near'; counts[letter] -= 1 } })
    return result
  }
  const submitGuess = async () => {
    const word = entry.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
    if (word.length !== 5 || winner || guesses.length >= 6 || validating) return
    if (guesses.some(guess => guess.word === word)) { setWordError('You already tried that word.'); return }
    setWordError('')
    setValidating(true)
    if (!await isValidWordleGuess(word)) { setWordError(`${word} is not in the Wordle word list.`); setValidating(false); return }
    setValidating(false)
    const solved = word === target
    const nextGuesses = [...guesses, { word, result: grade(word) }]
    setGuesses(nextGuesses)
    setEntry('')
    if (solved) {
      const attempts = nextGuesses.length
      setWinner(true)
      await onComplete(attempts)
    } else if (nextGuesses.length === 6) {
      await onComplete(6, false)
    }
  }
  const submit = event => { event.preventDefault(); submitGuess() }
  const reset = () => { setEntry(''); setGuesses([]); setWinner(false); setWordError(''); setValidating(false) }
  const finished = winner || guesses.length >= 6
  const letterStates = useMemo(() => {
    const priority = { miss: 1, near: 2, hit: 3 }
    return guesses.reduce((states, guess) => {
      guess.word.split('').forEach((letter, index) => { if (!states[letter] || priority[guess.result[index]] > priority[states[letter]]) states[letter] = guess.result[index] })
      return states
    }, {})
  }, [guesses])
  const typeLetter = letter => { if (!finished && !validating && entry.length < 5) { setEntry(`${entry}${letter}`); setWordError('') } }
  const eraseLetter = () => { if (!finished && !validating) { setEntry(entry.slice(0, -1)); setWordError('') } }
  const rows = [...guesses, ...Array(Math.max(0, 6 - guesses.length)).fill(null)]
  return <div className="puzzle-with-board"><div className="wordle-game">
      <div className="game-head"><div><span className="kicker">{puzzle.label.toUpperCase()} · INDIVIDUAL PUZZLE</span><h2>Wordle</h2><p>Green is correct, yellow is in the word, and gray is absent. Every guess is checked against a real Wordle word list.</p></div><button className="icon-button light" aria-label="Restart Wordle puzzle" onClick={reset}><RotateCcw size={18} /></button></div>
      <div className="wordle-board">{rows.map((guess, row) => <div className="wordle-row" key={row}>{Array.from({length: 5}, (_, column) => <span className={guess ? guess.result[column] : ''} key={column}>{guess?.word[column] || ''}</span>)}</div>)}</div>
      <form className="wordle-entry" onSubmit={submit}><input aria-label="Five letter guess" value={entry} maxLength={5} disabled={finished || validating} onChange={event => { setEntry(event.target.value.toUpperCase().replace(/[^A-Z]/g, '')); setWordError('') }} placeholder="ENTER 5 LETTERS" /><button className="primary" disabled={entry.length !== 5 || finished || validating}>{validating ? 'Checking…' : 'Guess'}</button></form>
      {wordError && <p className="wordle-error" role="alert">{wordError}</p>}
      <div className="wordle-keyboard" aria-label="Wordle keyboard">{['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, index) => <div key={row}>{index === 2 && <button className="wide" disabled={entry.length !== 5 || finished || validating} onClick={submitGuess}>Enter</button>}{row.split('').map(letter => <button className={letterStates[letter] || ''} disabled={finished || validating} onClick={() => typeLetter(letter)} key={letter}>{letter}</button>)}{index === 2 && <button className="wide" disabled={!entry.length || finished || validating} aria-label="Backspace" onClick={eraseLetter}>⌫</button>}</div>)}</div>
      {winner && <p className="wordle-result" aria-live="polite">Solved in {guesses.length} {guesses.length === 1 ? 'attempt' : 'attempts'}. Your best run is live.</p>}
      {!winner && guesses.length === 6 && <p className="wordle-result wordle-lost" aria-live="polite"><span>DIDN’T FINISH · DNF RECORDED</span>The solution was <strong>{target}</strong>.</p>}
    </div><PuzzleLeaderboard game="wordle" puzzleId={puzzle.id} results={results} /></div>
}

function WordleGame({ onComplete, results }) {
  const [roundIndex, setRoundIndex] = useState(0)
  const puzzle = wordleRounds[roundIndex]
  return <><PuzzleRoundPicker rounds={wordleRounds} roundIndex={roundIndex} setRoundIndex={setRoundIndex} /><WordleRound key={puzzle.id} puzzle={puzzle} results={results} onComplete={(metric, completed = true) => onComplete(puzzle.id, metric, completed)} /></>
}

function SignalSprint({ onPoint }) {
  const [index, setIndex] = useState(0)
  const [seconds, setSeconds] = useState(45)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!running || seconds === 0) return
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [running, seconds])
  const next = () => { setIndex((index + 1) % sprintPrompts.length); setSeconds(45); setRunning(false) }
  return (
    <div className="sprint-game">
      <div className="sprint-top"><span><Zap size={18} /> TEAM GAUNTLET</span><strong>{seconds}</strong></div>
      <p>Name as many as you can:</p>
      <h2>{sprintPrompts[index]}</h2>
      <div className="sprint-actions"><button className="secondary" onClick={next}>Skip prompt</button><button className="primary" onClick={() => setRunning(!running)}>{running ? 'Pause' : seconds === 45 ? 'Start timer' : 'Resume'} <Play size={16} /></button></div>
      <div className="point-buttons"><span>Award the round</span><button onClick={() => { onPoint('meeple'); next() }}>◆ Meeple +5</button><button onClick={() => { onPoint('mayhem'); next() }}>✦ Mayhem +5</button></div>
    </div>
  )
}

function LegacyPlayroom({ changeScore, mode = 'grid', navigate }) {
  const [game, setGame] = useState(mode)
  return (
    <main>
      <button className="back-link" onClick={() => navigate(`/games/${game === 'grid' ? 'party-grid' : 'signal-sprint'}`)}><ArrowRight size={15} /> Game guide</button>
      <section className="page-intro play-intro">
        <span className="eyebrow">PHONE-DOWN FUN, WITH A LITTLE HELP</span>
        <h1>The playroom</h1>
        <p>Fast original games built for one shared screen. The app supports the room—it doesn’t take it over.</p>
      </section>
      <div className="game-selector">
        <button className={game === 'grid' ? 'active' : ''} onClick={() => setGame('grid')}><span>🧩</span><div><strong>Party Grid</strong><small>Word grouping • 10 min</small></div></button>
        <button className={game === 'sprint' ? 'active' : ''} onClick={() => setGame('sprint')}><span>⚡</span><div><strong>Signal Sprint</strong><small>Lightning lists • 45 sec</small></div></button>
        <button className="soon" disabled><span>🎭</span><div><strong>Hot Take</strong><small>Coming soon</small></div></button>
      </div>
      <section className="game-stage">
        {game === 'grid' ? <PartyGrid onWin={team => changeScore(team, 10)} /> : <SignalSprint onPoint={team => changeScore(team, 5)} />}
      </section>
      <section className="fair-play-note"><CircleHelp size={20} /><div><strong>Suggested Party Grid scoring</strong><p>First team to solve it gets 10 points. Alternate captains after each mistake so both teams stay involved.</p></div></section>
    </main>
  )
}

function Playroom({ mode = 'connections', navigate, players, guestPlayerIdentity, puzzleResults, submitPuzzleResult }) {
  const [gameMode, setGameMode] = useState(mode === 'wordle' ? 'wordle' : 'connections')
  const player = players.find(item => item.checkedIn && item.id === guestPlayerIdentity?.id && item.name.toLocaleLowerCase() === guestPlayerIdentity.name.toLocaleLowerCase())
  const complete = (game, puzzleId, metric, completed = true) => submitPuzzleResult(player.id, game, puzzleId, metric, completed)
  return <main>
    <button className="back-link" onClick={() => navigate(`/games/${gameMode}`)}><ArrowRight size={15} /> Game guide</button>
    <section className="page-intro play-intro"><span className="eyebrow">GROUP SESSION · PERSONAL RUN</span><h1>The puzzle arcade</h1><p>Everyone gets the same challenge. Finish on your own device and watch the leaderboard update live.</p></section>
    <div className="game-selector two-games">
      <button aria-pressed={gameMode === 'wordle'} className={gameMode === 'wordle' ? 'active' : ''} onClick={() => setGameMode('wordle')}><span>▣</span><div><strong>Wordle</strong><small>Five letters · 10 min</small></div></button>
      <button aria-pressed={gameMode === 'connections'} className={gameMode === 'connections' ? 'active' : ''} onClick={() => setGameMode('connections')}><span>▦</span><div><strong>Connections</strong><small>Four groups · 10 min</small></div></button>
    </div>
    {!player ? <section className="puzzle-join-gate"><Users size={24} /><div><strong>Claim your name before you play</strong><p>Choose your pre-listed roster name so every result belongs to exactly one person.</p></div><button onClick={() => navigate('/')}>Claim my name <ArrowRight size={14} /></button></section> : <section className="game-stage"><div className="puzzle-player-strip"><Avatar name={player.name} size="sm" /><span>Playing as <strong>{player.name}</strong></span><small>{teamInfo[player.team].name}</small></div>{gameMode === 'connections' ? <ConnectionsGame results={puzzleResults} onComplete={(puzzleId, metric, completed) => complete('connections', puzzleId, metric, completed)} /> : <WordleGame results={puzzleResults} onComplete={(puzzleId, metric, completed) => complete('wordle', puzzleId, metric, completed)} />}</section>}
    <section className="fair-play-note"><CircleHelp size={20} /><div><strong>One honest run at a time</strong><p>Play quietly on your own device. Replays are allowed, and the board keeps only your best completed result.</p></div></section>
  </main>
}

function Roster({ players, addPlayer, shuffleTeams, toggleCheckIn, movePlayerTeam, removePlayer, onReset }) {
  const [newName, setNewName] = useState('')
  const submitPlayer = e => {
    e.preventDefault()
    if (!newName.trim()) return
    addPlayer(newName.trim())
    setNewName('')
  }
  return (
    <main>
      <section className="page-intro roster-intro">
        <span className="eyebrow">THE CREW</span>
        <h1>Teams & players</h1>
        <p>Guests can join from the home page with only their name. Use this page to check attendance and rebalance the two ghost teams.</p>
      </section>
      <div className="roster-actions card">
        <form onSubmit={submitPlayer}><UserPlus size={18} /><input aria-label="Player name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Add a player" /><button className="primary">Add</button></form>
        <button className="secondary" onClick={shuffleTeams}><Shuffle size={16} /> Shuffle teams</button>
      </div>
      <section className="roster-grid">
        {Object.keys(teamInfo).map(team => {
          const info = teamInfo[team]
          const members = players.filter(p => p.team === team)
          return <div className={`team-roster card ${info.color}`} key={team}>
            <div className="team-roster-head"><span>{info.mascot}</span><div><small>{members.filter(p => p.checkedIn).length} CHECKED IN</small><h2>{info.name}</h2></div></div>
            {members.map(player => <div className={`roster-player ${!player.checkedIn ? 'away' : ''}`} key={player.id}><button className="check-button" aria-label={`${player.checkedIn ? 'Check out' : 'Check in'} ${player.name}`} aria-pressed={player.checkedIn} onClick={() => toggleCheckIn(player.id)}>{player.checkedIn && <Check size={15} />}</button><Avatar name={player.name} /><strong>{player.name}</strong><button className="move-button" aria-label={`Move ${player.name} to ${team === 'meeple' ? teamInfo.mayhem.name : teamInfo.meeple.name}`} onClick={() => movePlayerTeam(player.id, team === 'meeple' ? 'mayhem' : 'meeple')}>Move</button><button className="remove-button" aria-label={`Remove ${player.name}`} onClick={() => removePlayer(player.id)}><X size={15} /></button></div>)}
          </div>
        })}
      </section>
      <button className="reset-demo" onClick={onReset}><RotateCcw size={15} /> Reset game night</button>
    </main>
  )
}

function LocalApp() {
  const guestStorageKey = 'tabletop-v3-local-player'
  const [guestPlayerIdentity, setGuestPlayerIdentity] = useState(() => storedPlayerIdentity(guestStorageKey))
  const [scores, setScores] = useStoredState('tabletop-v3-scores', { meeple: 0, mayhem: 0 })
  const [players, setPlayers] = useStoredState('tabletop-v3-players', defaultPlayers)
  const [currentEvent, setCurrentEvent] = useStoredState('tabletop-v3-current-event', 0)
  const [phaseScores, setPhaseScores] = useStoredState('tabletop-v2-phase-scores', {})
  const [individualPhaseScores, setIndividualPhaseScores] = useStoredState('tabletop-v2-individual-phase-scores', {})
  const [podAssignments, setPodAssignments] = useStoredState('tabletop-pod-assignments', defaultPodAssignments)
  const [circuitResults, setCircuitResults] = useStoredState('tabletop-v2-circuit-results', {})
  const [circuitGameChoices, setCircuitGameChoices] = useStoredState('tabletop-v1-circuit-game-choices', {})
  const [gameWinners, setGameWinners] = useStoredState('tabletop-v1-game-winners', {})
  const [dinnerOrder, setDinnerOrder] = useStoredState('tabletop-dinner-order', '')
  const [puzzleResults, setPuzzleResults] = useStoredState('tabletop-v1-puzzle-results', [])
  const changeScore = (team, delta) => setScores(previous => ({ ...previous, [team]: Math.max(0, previous[team] + delta) }))
  const changePlayerScore = (playerId, delta) => setPlayers(previous => previous.map(player => player.id === playerId ? { ...player, points: Math.max(0, player.points + delta) } : player))
  const changePhaseScore = (phase, team, delta) => {
    const currentPhaseScore = phaseScores[phase] || { meeple: 0, mayhem: 0 }
    const nextValue = Math.max(0, currentPhaseScore[team] + delta)
    const appliedDelta = nextValue - currentPhaseScore[team]
    setPhaseScores({ ...phaseScores, [phase]: { ...currentPhaseScore, [team]: nextValue } })
    if (appliedDelta) changeScore(team, appliedDelta)
  }
  const changeIndividualPhaseScore = (phase, playerId, delta) => {
    const currentPhaseScore = individualPhaseScores[phase] || {}
    const currentValue = currentPhaseScore[playerId] || 0
    const nextValue = Math.max(0, currentValue + delta)
    const appliedDelta = nextValue - currentValue
    setIndividualPhaseScores({ ...individualPhaseScores, [phase]: { ...currentPhaseScore, [playerId]: nextValue } })
    if (appliedDelta) setPlayers(previous => previous.map(player => player.id === playerId ? { ...player, points: Math.max(0, player.points + appliedDelta) } : player))
  }
  const changePlayerTeam = (playerId, team) => setPlayers(previous => previous.map(player => player.id === playerId ? { ...player, team } : player))
  const movePlayerToPod = (playerId, pod) => setPodAssignments(previous => ({ ...previous, [playerId]: pod }))
  const randomizePods = () => {
    const shuffled = [...players.filter(player => player.checkedIn)]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }
    const next = { ...podAssignments }
    shuffled.forEach((player, index) => { next[player.id] = ['A', 'B', 'C', 'D'][index % 4] })
    setPodAssignments(next)
  }
  const recordCircuitResult = (phase, slug, result) => {
    const key = `${phase}:${slug}`
    const allocation = value => value === 'meeple' ? { meeple: 2, mayhem: 0 } : value === 'mayhem' ? { meeple: 0, mayhem: 2 } : value === 'split' ? { meeple: 1, mayhem: 1 } : { meeple: 0, mayhem: 0 }
    const before = allocation(circuitResults[key])
    const after = allocation(result)
    const delta = { meeple: after.meeple - before.meeple, mayhem: after.mayhem - before.mayhem }
    setCircuitResults({ ...circuitResults, [key]: result })
    setPhaseScores(previous => {
      const phaseTotal = previous[phase] || { meeple: 0, mayhem: 0 }
      return { ...previous, [phase]: { meeple: Math.max(0, phaseTotal.meeple + delta.meeple), mayhem: Math.max(0, phaseTotal.mayhem + delta.mayhem) } }
    })
    setScores(previous => ({ meeple: Math.max(0, previous.meeple + delta.meeple), mayhem: Math.max(0, previous.mayhem + delta.mayhem) }))
  }
  const setCircuitGameChoice = (round, choice) => setCircuitGameChoices(previous => ({ ...previous, [String(round)]: choice }))
  const recordGameWinner = (winnerKey, playerId) => {
    const slug = winnerKey.slice(0, winnerKey.indexOf(':'))
    const points = gamePointValues[slug]
    const previousPlayer = players.find(player => player.id === gameWinners[winnerKey])
    const nextPlayer = players.find(player => player.id === playerId)
    if (!points || previousPlayer?.id === nextPlayer?.id) return
    setGameWinners(previous => {
      const next = { ...previous }
      if (nextPlayer) next[winnerKey] = nextPlayer.id
      else delete next[winnerKey]
      return next
    })
    setPlayers(previous => previous.map(player => {
      const delta = (player.id === nextPlayer?.id ? points : 0) - (player.id === previousPlayer?.id ? points : 0)
      return delta ? { ...player, points: Math.max(0, player.points + delta) } : player
    }))
    setScores(previous => ({
      meeple: Math.max(0, previous.meeple + (nextPlayer?.team === 'meeple' ? points : 0) - (previousPlayer?.team === 'meeple' ? points : 0)),
      mayhem: Math.max(0, previous.mayhem + (nextPlayer?.team === 'mayhem' ? points : 0) - (previousPlayer?.team === 'mayhem' ? points : 0)),
    }))
  }
  const checkedIn = useMemo(() => players.filter(p => p.checkedIn).length, [players])
  const resetDemo = () => { setPlayers(defaultPlayers); setScores({ meeple: 0, mayhem: 0 }); setPhaseScores({}); setIndividualPhaseScores({}); setPodAssignments(defaultPodAssignments); setCircuitResults({}); setCircuitGameChoices({}); setGameWinners({}); setDinnerOrder(''); setPuzzleResults([]); setCurrentEvent(0) }
  const addPlayer = name => {
    const team = players.filter(player => player.team === 'meeple').length <= players.filter(player => player.team === 'mayhem').length ? 'meeple' : 'mayhem'
    const id = Math.max(0, ...players.map(player => player.id)) + 1
    setPlayers([...players, { id, name, team, points: 0, checkedIn: true }])
  }
  const shuffleTeams = () => {
    const mixed = [...players]
    for (let index = mixed.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[mixed[index], mixed[swapIndex]] = [mixed[swapIndex], mixed[index]]
    }
    setPlayers(mixed.map((player, index) => ({ ...player, team: index % 2 === 0 ? 'meeple' : 'mayhem' })))
  }
  const toggleCheckIn = playerId => setPlayers(previous => previous.map(player => player.id === playerId ? { ...player, checkedIn: !player.checkedIn } : player))
  const movePlayerTeam = (playerId, team) => setPlayers(previous => previous.map(player => player.id === playerId ? { ...player, team } : player))
  const removePlayer = playerId => setPlayers(previous => previous.filter(player => player.id !== playerId))
  const releasePlayer = playerId => setPlayers(previous => previous.map(player => player.id === playerId ? { ...player, checkedIn: false } : player))
  const joinPlayer = async playerId => {
    const player = players.find(item => item.id === playerId)
    if (!player) throw new Error('Choose your name from the roster')
    if (player.checkedIn) throw new Error(`${player.name} is already claimed on this device`)
    const claimToken = crypto.randomUUID()
    setPlayers(previous => previous.map(item => item.id === playerId ? { ...item, checkedIn: true } : item))
    const identity = { id: player.id, name: player.name, claimToken }
    setGuestPlayerIdentity(identity)
    rememberPlayerIdentity(guestStorageKey, identity)
    return player.id
  }
  const submitPuzzleResult = async (playerId, game, puzzleId, metric, completed = true) => {
    const player = players.find(item => item.id === playerId)
    if (!player) throw new Error('Join the game night before submitting a result')
    setPuzzleResults(previous => {
      const existing = previous.find(result => result.playerId === playerId && result.game === game && result.puzzleId === puzzleId)
      const existingCompleted = existing?.completed !== false
      const keepExistingFinish = existing && existingCompleted && !completed
      const value = { playerId, playerName: player.name, team: player.team, game, puzzleId, metric: keepExistingFinish ? existing.metric : existing && existingCompleted === completed && completed ? Math.min(existing.metric, metric) : metric, completed: keepExistingFinish ? true : completed }
      return existing ? previous.map(result => result === existing ? value : result) : [...previous, value]
    })
  }

  return <GameNightShell syncMode="local" state={{ scores, players, currentEvent, phaseScores, individualPhaseScores, podAssignments, circuitResults, circuitGameChoices, gameWinners, dinnerOrder, puzzleResults }} actions={{ changeScore, changePlayerScore, setCurrentEvent, setDinnerOrder, changePhaseScore, changeIndividualPhaseScore, changePlayerTeam, movePlayerToPod, randomizePods, recordCircuitResult, setCircuitGameChoice, recordGameWinner, addPlayer, joinPlayer, submitPuzzleResult, shuffleTeams, toggleCheckIn, movePlayerTeam, removePlayer, releasePlayer, resetDemo }} checkedIn={checkedIn} guestPlayerIdentity={guestPlayerIdentity} />
}

function RealtimeApp() {
  const eventKey = import.meta.env.VITE_GAME_NIGHT_KEY || 'tabletop-tonight'
  const guestStorageKey = `tabletop-player-${eventKey}`
  const [guestPlayerIdentity, setGuestPlayerIdentity] = useState(() => storedPlayerIdentity(guestStorageKey))
  const queryArgs = { eventKey }
  const connectionState = useConvexConnectionState()
  const state = useQuery(api.sharedState.get, queryArgs)
  const puzzleResults = useQuery(api.puzzleResults.list, queryArgs) || []
  const ensureState = useMutation(api.sharedState.ensure)
  const [syncError, setSyncError] = useState('')

  const adjustTeamScore = useMutation(api.sharedState.adjustTeamScore).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.sharedState.get, { eventKey: args.eventKey })
    if (current) store.setQuery(api.sharedState.get, { eventKey: args.eventKey }, { ...current, scores: { ...current.scores, [args.team]: Math.max(0, current.scores[args.team] + args.delta) } })
  })
  const adjustPlayerScore = useMutation(api.sharedState.adjustPlayerScore).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.sharedState.get, { eventKey: args.eventKey })
    if (current) store.setQuery(api.sharedState.get, { eventKey: args.eventKey }, { ...current, players: current.players.map(player => player.id === args.playerId ? { ...player, points: Math.max(0, player.points + args.delta) } : player) })
  })
  const setCurrentEventMutation = useMutation(api.sharedState.setCurrentEvent).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.sharedState.get, { eventKey: args.eventKey })
    if (current) store.setQuery(api.sharedState.get, { eventKey: args.eventKey }, { ...current, currentEvent: args.currentEvent })
  })
  const setDinnerOrderMutation = useMutation(api.sharedState.setDinnerOrder).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.sharedState.get, { eventKey: args.eventKey })
    if (current) store.setQuery(api.sharedState.get, { eventKey: args.eventKey }, { ...current, dinnerOrder: args.dinnerOrder })
  })
  const adjustPhaseScore = useMutation(api.sharedState.adjustPhaseScore)
  const adjustIndividualPhaseScore = useMutation(api.sharedState.adjustIndividualPhaseScore)
  const setPlayerTeamMutation = useMutation(api.sharedState.setPlayerTeam)
  const setPlayerPodMutation = useMutation(api.sharedState.setPlayerPod)
  const setPodsMutation = useMutation(api.sharedState.setPods)
  const recordCircuitResultMutation = useMutation(api.sharedState.recordCircuitResult)
  const setCircuitGameChoiceMutation = useMutation(api.sharedState.setCircuitGameChoice).withOptimisticUpdate((store, args) => {
    const current = store.getQuery(api.sharedState.get, { eventKey: args.eventKey })
    if (current) store.setQuery(api.sharedState.get, { eventKey: args.eventKey }, { ...current, circuitGameChoices: { ...(current.circuitGameChoices || {}), [String(args.round)]: args.choice } })
  })
  const recordGameWinnerMutation = useMutation(api.sharedState.recordGameWinner)
  const addPlayerMutation = useMutation(api.sharedState.addPlayer)
  const joinPlayerMutation = useMutation(api.sharedState.joinPlayer)
  const toggleCheckInMutation = useMutation(api.sharedState.toggleCheckIn)
  const removePlayerMutation = useMutation(api.sharedState.removePlayer)
  const releasePlayerMutation = useMutation(api.sharedState.releasePlayer)
  const setTeamAssignmentsMutation = useMutation(api.sharedState.setTeamAssignments)
  const resetMutation = useMutation(api.sharedState.reset)
  const submitPuzzleResultMutation = useMutation(api.puzzleResults.submit)

  useEffect(() => {
    if (state === null) ensureState(queryArgs).catch(error => setSyncError(error.message))
  }, [state, ensureState, eventKey])

  const commit = promise => {
    setSyncError('')
    promise.catch(error => setSyncError(error.message || 'Live sync failed'))
  }

  if (state === undefined || state === null) return <main className="sync-loading"><span className="live-dot" /><h1>Connecting the game room…</h1><p>Loading the shared scoreboard and roster.</p>{syncError && <strong>{syncError}</strong>}</main>

  const changeScore = (team, delta) => commit(adjustTeamScore({ eventKey, team, delta }))
  const changePlayerScore = (playerId, delta) => commit(adjustPlayerScore({ eventKey, playerId, delta }))
  const setCurrentEvent = currentEvent => commit(setCurrentEventMutation({ eventKey, currentEvent }))
  const setDinnerOrder = dinnerOrder => commit(setDinnerOrderMutation({ eventKey, dinnerOrder }))
  const changePhaseScore = (phase, team, delta) => commit(adjustPhaseScore({ eventKey, phase, team, delta }))
  const changeIndividualPhaseScore = (phase, playerId, delta) => commit(adjustIndividualPhaseScore({ eventKey, phase, playerId, delta }))
  const changePlayerTeam = (playerId, team) => commit(setPlayerTeamMutation({ eventKey, playerId, team }))
  const movePlayerToPod = (playerId, podValue) => commit(setPlayerPodMutation({ eventKey, playerId, pod: podValue }))
  const randomizePods = () => {
    const shuffled = [...state.players.filter(player => player.checkedIn)]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }
    commit(setPodsMutation({ eventKey, assignments: shuffled.map((player, index) => ({ playerId: player.id, pod: ['A', 'B', 'C', 'D'][index % 4] })) }))
  }
  const recordCircuitResult = (phase, slug, result) => commit(recordCircuitResultMutation({ eventKey, phase, slug, result: result || undefined }))
  const setCircuitGameChoice = (round, choice) => commit(setCircuitGameChoiceMutation({ eventKey, round, choice }))
  const recordGameWinner = (winnerKey, playerId) => commit(recordGameWinnerMutation({ eventKey, winnerKey, playerId }))
  const addPlayer = name => commit(addPlayerMutation({ eventKey, name }))
  const joinPlayer = async playerId => {
    setSyncError('')
    try {
      const player = state.players.find(item => item.id === playerId)
      if (!player) throw new Error('Choose your name from the roster')
      const claimToken = crypto.randomUUID()
      await joinPlayerMutation({ eventKey, playerId, claimToken })
      const identity = { id: playerId, name: player.name, claimToken }
      setGuestPlayerIdentity(identity)
      rememberPlayerIdentity(guestStorageKey, identity)
      return playerId
    } catch (error) {
      setSyncError(error.message || 'Could not join the game night')
      throw error
    }
  }
  const submitPuzzleResult = async (playerId, game, puzzleId, metric, completed = true) => {
    setSyncError('')
    try {
      if (!guestPlayerIdentity?.claimToken || guestPlayerIdentity.id !== playerId) throw new Error('Claim your roster name before submitting a result')
      return await submitPuzzleResultMutation({ eventKey, playerId, claimToken: guestPlayerIdentity.claimToken, game, puzzleId, metric, completed })
    } catch (error) {
      setSyncError(error.message || 'Could not save the puzzle result')
      throw error
    }
  }
  const shuffleTeams = () => {
    const shuffled = [...state.players]
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }
    commit(setTeamAssignmentsMutation({ eventKey, assignments: shuffled.map((player, index) => ({ playerId: player.id, team: index % 2 === 0 ? 'meeple' : 'mayhem' })) }))
  }
  const toggleCheckIn = playerId => commit(toggleCheckInMutation({ eventKey, playerId }))
  const movePlayerTeam = (playerId, team) => commit(setPlayerTeamMutation({ eventKey, playerId, team }))
  const removePlayer = playerId => commit(removePlayerMutation({ eventKey, playerId }))
  const releasePlayer = playerId => commit(releasePlayerMutation({ eventKey, playerId }))
  const resetDemo = () => commit(resetMutation({ eventKey }))
  const checkedIn = state.players.filter(player => player.checkedIn).length

  return <GameNightShell syncMode={connectionState.isWebSocketConnected ? 'realtime' : 'connecting'} syncError={syncError} state={{ ...state, circuitGameChoices: state.circuitGameChoices || {}, gameWinners: state.gameWinners || {}, puzzleResults }} actions={{ changeScore, changePlayerScore, setCurrentEvent, setDinnerOrder, changePhaseScore, changeIndividualPhaseScore, changePlayerTeam, movePlayerToPod, randomizePods, recordCircuitResult, setCircuitGameChoice, recordGameWinner, addPlayer, joinPlayer, submitPuzzleResult, shuffleTeams, toggleCheckIn, movePlayerTeam, removePlayer, releasePlayer, resetDemo }} checkedIn={checkedIn} guestPlayerIdentity={guestPlayerIdentity} />
}

function GameNightShell({ state, actions, checkedIn, guestPlayerIdentity, syncMode, syncError = '' }) {
  const { path, navigate } = useRouter()
  const { scores, players, currentEvent, phaseScores, individualPhaseScores, podAssignments, circuitResults, circuitGameChoices = {}, gameWinners = {}, dinnerOrder, puzzleResults } = state
  const { changeScore, changePlayerScore, setCurrentEvent, setDinnerOrder, changePhaseScore, changeIndividualPhaseScore, changePlayerTeam, movePlayerToPod, randomizePods, recordCircuitResult, setCircuitGameChoice, recordGameWinner, addPlayer, joinPlayer, submitPuzzleResult, shuffleTeams, toggleCheckIn, movePlayerTeam, removePlayer, releasePlayer, resetDemo } = actions
  const gameSlug = path.startsWith('/games/') ? decodeURIComponent(path.slice('/games/'.length)) : null
  const playMode = path.startsWith('/play/') ? path.slice('/play/'.length) : null

  return (
    <div className="app-shell">
      <header>
        <button className="logo-button" onClick={() => navigate('/')}><Logo /></button>
        <div className="desktop-nav"><Nav path={path} navigate={navigate} /></div>
        <div className={`header-status ${syncMode === 'realtime' ? 'is-synced' : syncMode === 'connecting' ? 'is-connecting' : ''}`} title={syncMode === 'realtime' ? 'Updates sync live across devices' : syncMode === 'connecting' ? 'Reconnecting to live sync' : 'Stored on this device'}><span className="live-dot" /><strong>{checkedIn}</strong> checked in {syncMode !== 'local' && <small>{syncMode === 'realtime' ? 'LIVE SYNC' : 'CONNECTING'}</small>}</div>
      </header>
      {syncError && <div className="sync-error" role="status">Live sync issue: {syncError}</div>}
      {path === '/' && <Tonight {...{ players, guestPlayerIdentity, joinPlayer, releasePlayer }} />}
      {(path === '/group-games' || path === '/games' || path === '/run-of-show' || path === '/lineup') && <GroupGames {...{ navigate, players, gameWinners, recordGameWinner }} />}
      {path === '/circuit' && <Circuit {...{ currentEvent, setCurrentEvent, players, gameWinners, recordGameWinner, circuitResults, recordCircuitResult, circuitGameChoices, setCircuitGameChoice, navigate }} />}
      {gameSlug && <GameDetail game={getGame(gameSlug)} navigate={navigate} />}
      {path === '/scores' && <Scoreboard {...{ scores, changeScore, players, changePlayerScore, navigate }} />}
      {path === '/host' && <HostPlan navigate={navigate} />}
      {path === '/teams' && <Tonight {...{ players, guestPlayerIdentity, joinPlayer, releasePlayer }} />}
      {playMode && <Playroom {...{ navigate, players, guestPlayerIdentity, puzzleResults, submitPuzzleResult }} mode={playMode} />}
      <footer><Logo /><p>Made for snacks, friendly rivalries, and questionable strategy.</p><span>Game night, organized.</span></footer>
      <div className="mobile-nav"><Nav path={path} navigate={navigate} /></div>
    </div>
  )
}

export default function App({ realtime = false }) {
  return realtime ? <RealtimeApp /> : <LocalApp />
}
