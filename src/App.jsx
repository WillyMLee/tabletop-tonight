import { useEffect, useMemo, useRef, useState } from 'react'
import { useConvexConnectionState, useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api.js'
import {
  ArrowRight,
  Award,
  CalendarDays,
  Check,
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
import { games, getGame, partySlugs, tonightSlugs } from './data/games.js'
import { activeConnections, activeWordle, connectionWords } from './data/puzzles.js'

const defaultPlayers = []

const defaultPodAssignments = {}

const storedPlayerIdentity = storageKey => {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey))
    return Number.isInteger(value?.id) && value.id > 0 && typeof value.name === 'string' ? value : null
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
  meeple: { name: 'Team Blinky', short: 'Blinky', color: 'coral', mascot: '●' },
  mayhem: { name: 'Team Inky', short: 'Inky', color: 'lime', mascot: '●' },
}

const itinerary = [
  { time: '6:30', period: 'PM', title: 'Players ready up', detail: 'Snacks, check-in, teams, and ghost colors.', duration: '20 min', type: 'welcome', icon: '●' },
  { time: '6:50', period: 'PM', title: 'Welcome + quick intro', detail: 'A short explanation of teams, group games, scoring, and the four circuit stations.', duration: '10 min', type: 'welcome', icon: '◌' },
  { time: '7:00', period: 'PM', title: 'Full-group game session', detail: 'GeoGuessr, Wordle, Connections, Hot Streak, then Flip 7—with the entire room playing.', duration: '90 min', points: 'Group points', type: 'group', icon: '◎' },
  { time: '8:30', period: 'PM', title: 'Dinner', detail: 'Eat what was ordered, relax, and reset the four stations.', duration: '45 min', type: 'break', icon: '☕' },
  { time: '9:15', period: 'PM', title: 'Group Circuit 1 · Random', detail: 'Shuffle everyone across Couch, Island, and the two dinner tables.', duration: '25 min', points: '40 pts', type: 'circuit', icon: 'Ⅰ' },
  { time: '9:45', period: 'PM', title: 'Group Circuit 2 · Choice', detail: 'Players choose one of the four stations based on the game they want.', duration: '25 min', points: '40 pts', type: 'circuit', icon: 'Ⅱ' },
  { time: '10:15', period: 'PM', title: 'Group Circuit 3 · Rival choice', detail: 'The opposing team assigns each player’s final station.', duration: '25 min', points: '40 pts', type: 'circuit', icon: 'Ⅲ' },
  { time: '10:40', period: 'PM', title: 'Dessert + chill', detail: 'Dessert, leaderboard reveal, and a breather.', duration: '25 min', type: 'break', icon: '▣' },
  { time: '11:05', period: 'PM', title: 'Optional Secret Hitler', detail: 'One last social-deduction game for anyone who wants in.', duration: '45 min', points: '10 pts', type: 'group', icon: '◉' },
  { time: '11:50', period: 'PM', title: 'Homeee', detail: 'Final scores, leftovers, rides, cleanup, and victory laps.', duration: '10 min', type: 'finale', icon: '⌂' },
]

const phaseGuidance = [
  { phase: 'Ready room', objective: 'Get everyone checked in, snacking, and clear on their house team.', everyone: 'Grab food, find your ghost team, and confirm your name on the roster.', blinky: 'Meet the pink captain and help welcome late arrivals.', inky: 'Meet the cyan captain and help welcome late arrivals.', host: 'Balance the teams and explain team points versus individual points.', cta: 'Manage teams', path: '/teams' },
  { phase: 'Two-minute welcome', objective: 'Explain only what people need before the first game.', everyone: 'Listen for the two teams, the five-game group session, and the four circuit locations.', blinky: 'Confirm the pink captain.', inky: 'Confirm the cyan captain.', host: 'Keep it short: group session, dinner, then Random → Choice → Rival Choice across four stations.', cta: 'Continue to group games', path: '/run-of-show' },
  { phase: 'Full-group arcade', objective: 'Move the whole room through GeoGuessr, Wordle, Connections, Hot Streak, and Flip 7 in order.', everyone: 'Stay together for physical games; use your own device for Wordle and Connections.', blinky: 'Choose the GeoGuessr captain device and help record the team total.', inky: 'Choose the GeoGuessr captain device and help record the team total.', host: 'Launch each game from the lineup below and keep transitions under two minutes.', cta: 'Open group game lineup', path: '/run-of-show' },
  { phase: 'Dinner', objective: 'Eat the food that was ordered. Nothing else is scheduled.', everyone: 'Grab dinner and take a real break.', blinky: 'No team task during dinner.', inky: 'No team task during dinner.', host: 'Put the order on screen and quietly reset all four circuit stations.', cta: 'Continue to circuits', path: '/run-of-show' },
  { phase: 'Random circuit', objective: 'Start the circuit with a fair four-way shuffle and zero negotiation.', everyone: 'Go to the location shown beside your name and stay for the full round.', blinky: 'Record pink individual awards before leaving.', inky: 'Verify the station result before leaving.', host: 'Shuffle once, reveal Couch, Island, Dinner Table #1, and Dinner Table #2, then start one 25-minute clock.', cta: 'Shuffle stations', path: '/run-of-show' },
  { phase: 'Player-choice circuit', objective: 'Let guests prioritize the game they most want to play.', everyone: 'Choose an open station; aim for three or four players at each location.', blinky: 'Pink players choose first in alternating order.', inky: 'Cyan players choose second in alternating order.', host: 'Close stations at four and rebalance only if a station drops below three players.', cta: 'Choose stations', path: '/run-of-show' },
  { phase: 'Rival-choice circuit', objective: 'Finish with playful counter-picks while keeping assignments fair.', everyone: 'Wait for the opposing captain to assign your pod, then report there.', blinky: 'Blinky captain assigns Inky players across the four stations.', inky: 'Inky captain assigns Blinky players across the four stations.', host: 'Reject any assignment that creates a station outside the three-to-four target.', cta: 'Assign rivals', path: '/run-of-show' },
  { phase: 'Dessert reset', objective: 'Give the room a real breather before the optional finale.', everyone: 'Grab dessert and check the Wordle and Connections leaderboards.', blinky: 'Nominate an MVP and sportsmanship pick.', inky: 'Nominate an MVP and sportsmanship pick.', host: 'Project the live puzzle standings and the team scoreboard.', cta: 'Open Wordle leaderboard', path: '/play/wordle' },
  { phase: 'Optional social deduction', objective: 'Offer one final high-energy game without trapping tired guests.', everyone: 'Opt in before roles are dealt; everyone else can chill or head out.', blinky: 'House teams pause—Secret Hitler uses its own hidden sides.', inky: 'House teams pause—Secret Hitler uses its own hidden sides.', host: 'Only award house points if both teams have similar representation.', cta: 'Open game guide', path: '/games/secret-hitler' },
  { phase: 'Closeout', objective: 'End on time with clear winners and an easy exit.', everyone: 'Collect belongings, leftovers, and rides; help with one cleanup task.', blinky: 'Captain confirms the final team score.', inky: 'Captain confirms the final team score.', host: 'Announce champions and individual awards, then close the scoreboard.', cta: 'Open scoreboard', path: '/scores' },
]

const circuitStations = [
  { pod: 'A', location: 'Couch', name: 'Mario Power Tennis', slug: 'mario-tennis-gc', icon: '🎾' },
  { pod: 'B', location: 'Island', name: 'Jenga', slug: 'jenga', icon: '▥' },
  { pod: 'C', location: 'Dinner Table #1', name: 'Blokus', slug: 'blokus', icon: '▦' },
  { pod: 'D', location: 'Dinner Table #2', name: 'Tabletop choice', slug: 'dinner-table-2', icon: '★', options: ['magical-athlete', 'yahtzee', 'scout'] },
]

const groupGameLineup = [
  { order: 1, slug: 'geoguessr', duration: '25 min', location: 'Couch + main screen', note: 'Play 3–5 locations as two house teams.' },
  { order: 2, slug: 'wordle', duration: '8 min', location: 'Everyone’s phone', note: 'Each player gets one run; fewest attempts leads.' },
  { order: 3, slug: 'connections', duration: '10 min', location: 'Everyone’s phone', note: 'The timer starts on launch; fastest solve leads.' },
  { order: 4, slug: 'hot-streak', duration: '20 min', location: 'Island', note: 'Bring the room together around the race.' },
  { order: 5, slug: 'flip-7', duration: '20 min', location: 'Dinner tables combined', note: 'Finish with one quick full-room card session.' },
]

const phaseLogistics = [
  { games: [], places: [{ group: 'Everyone', location: 'Entry + kitchen', detail: 'Check in, grab snacks and a team color, then meet your captain.' }] },
  { games: [], places: [] },
  { games: ['geoguessr', 'wordle', 'connections', 'hot-streak', 'flip-7'], places: [] },
  { games: [], places: [] },
  ...['random', 'choice', 'rival'].map((assignmentMode, index) => ({
    assignmentMode,
    games: ['mario-tennis-gc', 'jenga', 'blokus', 'magical-athlete'],
    alternates: ['yahtzee', 'scout'],
    stations: circuitStations,
    places: circuitStations.map(station => ({ group: `Pod ${station.pod}`, location: station.location, game: station.slug === 'dinner-table-2' ? 'magical-athlete' : station.slug, detail: station.options ? 'Choose Magical Athlete, Yahtzee Relay, or SCOUT before the timer starts.' : `Play ${station.name} here for the full circuit.` })),
    rotationRange: [index, index],
  })),
  { games: [], places: [{ group: 'Everyone', location: 'Dessert table + living room', detail: 'Chill, check scores, and reveal the live Wordle and Connections leaders.' }] },
  { games: ['secret-hitler'], places: [{ group: 'Opt-in players', location: 'Dining table', game: 'secret-hitler' }, { group: 'Chill group', location: 'Living room', detail: 'Dessert, conversation, or an early exit—no pressure to join.' }] },
  { games: [], places: [{ group: 'Everyone', location: 'Entry + living room', detail: 'Final awards, leftovers, rides, cleanup, and home.' }] },
]

const phaseScoring = [
  { mode: 'none', note: 'Ready-up is unscored.', individual: 'No individual points during check-in.' },
  { mode: 'none', note: 'The welcome is unscored.', individual: 'No individual points during the intro.' },
  { mode: 'group', award: 10, note: 'Use the five game cards below for scoring. Wordle and Connections also maintain individual live leaderboards.', individual: 'Puzzle results are recorded automatically; use +3 only for physical-game MVPs.' },
  { mode: 'none', note: 'Dinner is a true scoring break.', individual: 'No individual points during dinner.' },
  { mode: 'circuit', award: 10, note: 'Each of the four random circuit stations is worth 10 team points; a split is 5–5.', individual: 'Use the game guide for podiums, clean pulls, and winning pairs.' },
  { mode: 'circuit', award: 10, note: 'Each player-choice station is worth 10 team points; a split is 5–5.', individual: 'Award the game-specific result plus any listed bonus.' },
  { mode: 'circuit', award: 10, note: 'Each rival-choice station is worth 10 team points; a split is 5–5.', individual: 'Award +3 for a standout performance under the counter-pick.' },
  { mode: 'none', note: 'Dessert and optional puzzles do not change the championship.', individual: 'No individual points during the chill block.' },
  { mode: 'group', award: 10, note: 'If played and teams are balanced, the winning side contributes 10 house points.', individual: 'Optional: +3 for the best deduction or bluff.' },
  { mode: 'none', note: 'The closeout reveals points; it does not add new ones.', individual: 'Awards are labels only unless the host explicitly adds a bonus.' },
]

const rotations = [
  { round: 'Circuit 1 · Random', time: '9:15–9:40', stations: circuitStations },
  { round: 'Circuit 2 · Choice', time: '9:45–10:10', stations: circuitStations },
  { round: 'Circuit 3 · Rival choice', time: '10:15–10:40', stations: circuitStations },
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

function Avatar({ name, size = 'md' }) {
  const ghostTone = name.charCodeAt(0) % 4
  return <span className={`avatar ghost-avatar ghost-${ghostTone} avatar-${size}`} aria-label={name}>{name.slice(0, 1).toUpperCase()}</span>
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
    ['/', House, 'Live'],
    ['/games', Library, 'Games'],
    ['/run-of-show', ListChecks, 'Run Show'],
    ['/scores', Trophy, 'Scores'],
    ['/teams', Users, 'Teams'],
  ]
  return (
    <nav className="nav-shell" aria-label="Main navigation">
      {items.map(([href, Icon, label]) => {
        const active = href === '/' ? path === '/' : path.startsWith(href)
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
              <button onClick={() => onChange(team, -5)} aria-label={`Remove points from ${info.name}`}><Minus size={16} /></button>
              <button onClick={() => onChange(team, 5)} aria-label={`Add points to ${info.name}`}><Plus size={16} /></button>
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

function GuestJoin({ players, playerIdentity, joinPlayer, changePlayerTeam }) {
  const player = players.find(item => item.id === playerIdentity?.id && item.name.toLocaleLowerCase() === playerIdentity.name.toLocaleLowerCase())
  const [name, setName] = useState('')
  const [team, setTeam] = useState('meeple')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  if (player) {
    return <section className="player-pass card" aria-label="Your game-night player">
      <Avatar name={player.name} />
      <div><span className="kicker">YOU’RE IN</span><strong>{player.name}</strong><small>Choose your ghost team anytime.</small></div>
      <div className="join-team-picker compact">
        {Object.keys(teamInfo).map(teamKey => <button type="button" aria-pressed={player.team === teamKey} className={`${teamInfo[teamKey].color} ${player.team === teamKey ? 'selected' : ''}`} onClick={() => changePlayerTeam(player.id, teamKey)} key={teamKey}><span className="team-ghost"><i /><i /></span>{teamInfo[teamKey].name}</button>)}
      </div>
    </section>
  }

  const submit = async event => {
    event.preventDefault()
    if (!name.trim() || joining) return
    setJoining(true)
    setError('')
    try {
      await joinPlayer(name.trim(), team)
      setName('')
    } catch (joinError) {
      setError(joinError.message || 'Could not join the game night')
    } finally {
      setJoining(false)
    }
  }

  return <section className="guest-join card">
    <div className="guest-join-copy"><span className="join-ghost"><i /><i /></span><div><span className="kicker">READY PLAYER?</span><h2>Join game night</h2><p>No account or password. Add your name, pick a ghost team, and you’re on the live roster.</p></div></div>
    <form onSubmit={submit}>
      <label><span>Your name</span><input value={name} onChange={event => setName(event.target.value)} maxLength={40} autoComplete="name" placeholder="Enter your name" aria-describedby={error ? 'join-error' : undefined} /></label>
      <fieldset><legend>Choose a team</legend><div className="join-team-picker">{Object.keys(teamInfo).map(teamKey => {
        const teamCount = players.filter(item => item.team === teamKey).length
        return <button type="button" aria-pressed={team === teamKey} className={`${teamInfo[teamKey].color} ${team === teamKey ? 'selected' : ''}`} onClick={() => setTeam(teamKey)} key={teamKey}><span className="team-ghost"><i /><i /></span><span><strong>{teamInfo[teamKey].name}</strong><small>{teamCount} {teamCount === 1 ? 'player' : 'players'}</small></span></button>
      })}</div></fieldset>
      {error && <p className="join-error" id="join-error" role="alert">{error}</p>}
      <button className="primary join-button" disabled={!name.trim() || joining}>{joining ? 'Joining…' : 'Join the game'} <ArrowRight size={16} /></button>
    </form>
  </section>
}

function Tonight({ scores, changeScore, players, navigate, currentEvent, setCurrentEvent, guestPlayerIdentity, joinPlayer, changePlayerTeam }) {
  const activePlayers = players.filter(player => player.checkedIn)
  const current = itinerary[currentEvent] || itinerary[0]
  return (
    <main className="live-hub">
      <GuestJoin players={players} playerIdentity={guestPlayerIdentity} joinPlayer={joinPlayer} changePlayerTeam={changePlayerTeam} />
      <section className="pac-section score-zone">
        <div className="pac-section-head">
          <div><span className="kicker"><span className="live-dot" /> LIVE SCORE</span><h1>Team championship</h1><p>{current.title} is live · {current.time} {current.period}</p></div>
          <button className="pixel-button" onClick={() => navigate('/scores')}>FULL SCOREBOARD <ChevronRight size={15} /></button>
        </div>
        <TeamScores scores={scores} onChange={changeScore} />
        <div className="score-meter"><span style={{ width: `${(scores.meeple / Math.max(scores.meeple + scores.mayhem, 1)) * 100}%` }} /></div>
        <p className="score-status"><span>••••••••</span> {Math.abs(scores.meeple - scores.mayhem)} POINTS BETWEEN THE TEAMS <span>••••••••</span></p>
      </section>

      <section className="pac-section teams-zone">
        <div className="pac-section-head"><div><span className="kicker">GHOST ROSTER</span><h2>Teams</h2><p>{activePlayers.length} {activePlayers.length === 1 ? 'player is' : 'players are'} ready to chase the high score.</p></div><button className="pixel-button" onClick={() => navigate('/teams')}>MANAGE TEAMS <ChevronRight size={15} /></button></div>
        <div className="ghost-team-grid">
          {Object.keys(teamInfo).map(team => {
            const info = teamInfo[team]
            const members = activePlayers.filter(player => player.team === team)
            return <article className={`ghost-team-card ${info.color}`} key={team}>
              <header><span className="team-ghost"><i /><i /></span><div><small>PLAYER {team === 'meeple' ? 'ONE' : 'TWO'}</small><h3>{info.name}</h3></div><strong>{scores[team]}</strong></header>
              <div className="ghost-player-list">{members.map(member => <button key={member.id} onClick={() => navigate('/teams')}><Avatar name={member.name} /><span><strong>{member.name}</strong><small>{member.points} PTS</small></span></button>)}</div>
            </article>
          })}
        </div>
      </section>

    </main>
  )
}

function GameLibrary({ navigate }) {
  const [filter, setFilter] = useState('Tonight')
  const filters = ['Tonight', 'Party games', 'All games', 'Tabletop', 'GameCube', 'In-app']
  const visibleGames = games.filter(game => {
    if (filter === 'All games') return true
    if (filter === 'Tonight') return tonightSlugs.includes(game.slug)
    if (filter === 'Party games') return partySlugs.includes(game.slug)
    return game.category === filter
  })
  return (
    <main>
      <section className="page-intro games-intro">
        <span className="eyebrow">THE GAME SHELF</span>
        <h1>Pick it. Learn it. <em>Play it.</em></h1>
        <p>Every game has a quick guide, timing notes, player fit, and a scoring format designed for your two-team night.</p>
      </section>
      <div className="game-filter-bar">
        {filters.map(item => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}
      </div>
      <section className="game-library-grid">
        {visibleGames.map(game => (
          <article className={`library-game-card card ${game.color}`} key={game.slug}>
            <div className="library-card-top"><span>{game.icon}</span><em>{game.status}</em></div>
            <div><small>{game.format}</small><h2>{game.name}</h2><p>{game.summary}</p></div>
            <div className="game-specs"><span><Users size={14} /> {game.players}</span><span><Clock3 size={14} /> {game.duration}</span><span><Star size={14} /> {game.difficulty}</span></div>
            <button onClick={() => navigate(`/games/${game.slug}`)}>How to play <ArrowRight size={15} /></button>
          </article>
        ))}
      </section>
    </main>
  )
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
      <section className="why-card card"><Lightbulb /><div><span className="kicker">WHY IT FITS THIS NIGHT</span><p>{game.why}</p></div></section>
      <section className="guide-grid">
        <div className="card guide-section"><span className="guide-number">01</span><div><span className="kicker">BEFORE YOU START</span><h2>Set it up</h2></div><ol>{game.setup.map(step => <li key={step}>{step}</li>)}</ol></div>
        <div className="card guide-section rules-guide"><span className="guide-number">02</span><div><span className="kicker">THE SHORT VERSION</span><h2>How to play</h2></div><ol>{game.rules.map(step => <li key={step}>{step}</li>)}</ol></div>
        <div className="card guide-section"><span className="guide-number">03</span><div><span className="kicker">HOUSE FORMAT</span><h2>Score the night</h2></div><p>{game.scoring}</p></div>
      </section>
      <section className="host-tip-banner"><span>💡</span><div><small>HOST TIP</small><strong>{game.hostTip}</strong></div></section>
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
  const [geoRounds, setGeoRounds] = useState(5)
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
              <article><span>02</span><div><strong>GeoGuessr starts us together</strong><p>Everyone helps read the clues; each team captain locks the final guess.</p></div></article>
              <article><span>03</span><div><strong>Three circuits after dinner</strong><p>Random pods, then player choice, then your rivals choose the final station.</p></div></article>
            </div>
            <button className="intro-next" onClick={() => setCurrentEvent(2)}>Ready? Start GeoGuessr <ArrowRight size={15} /></button>
          </section> : currentEvent === 3 ? <section className="dinner-order-panel">
            <div className="detail-section-title"><span><PartyPopper size={18} /></span><div><small>DINNER BREAK</small><h3>What did we order?</h3></div></div>
            <p>This block is only for eating and catching up. Add the order here so everyone knows what arrived.</p>
            <label htmlFor="dinner-order">Dinner order</label>
            <textarea id="dinner-order" value={dinnerOrder} onChange={event => setDinnerOrder(event.target.value)} placeholder="Example: 2 pizzas, wings, salad, and one gluten-free order…" />
            <small>Next up: Circuit 1 · Random at 8:35 PM</small>
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
              {scoring.mode === 'none' && <div className="unscored-phase"><Check size={15} /> No championship points are recorded in this phase.</div>}
              <button className="view-full-score" onClick={() => navigate('/scores')}>Open full scoreboard <ChevronRight size={14} /></button>
            </article>
          </div>

          {currentEvent === 2 && <section className="phase-detail-section geo-group-format">
            <div className="geo-format-heading">
              <div><span className="kicker">FULL-GROUP FORMAT</span><h2>Play {geoRounds} GeoGuessr locations</h2><p>Both teams investigate the same place at the same time. Every voice has a useful clue to contribute.</p></div>
              <div className="geo-round-picker" role="group" aria-label="Number of GeoGuessr locations"><small>LOCATIONS</small><div>{[3, 4, 5].map(rounds => <button className={geoRounds === rounds ? 'active' : ''} onClick={() => setGeoRounds(rounds)} key={rounds}>{rounds}</button>)}</div></div>
            </div>
            <div className="geo-format-steps">
              <article><span>01</span><strong>Join the Party</strong><p>Host shares the room link or code. Put both captain devices where teammates can see them.</p></article>
              <article><span>02</span><strong>Explore together</strong><p>Take 60–90 seconds to scan signs, language, road lines, buildings, and landscape.</p></article>
              <article><span>03</span><strong>Lock the guesses</strong><p>Each captain listens to the team and places one marker before the timer ends.</p></article>
              <article><span>04</span><strong>Reveal + record</strong><p>Add each displayed score. After {geoRounds} locations, the highest total wins the phase.</p></article>
            </div>
            <div className="geo-captains"><div className="coral"><span className="team-ghost"><i /><i /></span><div><small>PINK TEAM</small><strong>Blinky captain device</strong></div></div><div className="lime"><span className="team-ghost"><i /><i /></span><div><small>CYAN TEAM</small><strong>Inky captain device</strong></div></div></div>
            <div className="geo-launch"><p><strong>House points:</strong> 15 to the higher GeoGuessr total, 5 to the runner-up, and +3 individual points for each team’s navigator MVP.</p><a href="https://www.geoguessr.com/party" target="_blank" rel="noreferrer">Open GeoGuessr Party <ArrowRight size={14} /></a></div>
          </section>}

          {currentEvent === 2 && <section className="phase-detail-section group-game-run">
            <div className="section-heading"><div><span className="kicker">PLAY IN THIS ORDER</span><h2>Five-game full-room lineup</h2><p>Keep everyone together and move straight down this list.</p></div><span className="muted-chip">90-minute block</span></div>
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
            <div className="section-heading"><div><span className="kicker">STATION MANAGER</span><h2>Move players between locations</h2><p>{logistics.assignmentMode === 'random' ? 'Shuffle once, then reveal the assignments.' : logistics.assignmentMode === 'choice' ? 'Players choose an open station; aim for 3–4 at each location.' : 'Each captain assigns players from the opposing team.'}</p></div>{logistics.assignmentMode === 'random' ? <button className="pod-randomize" onClick={randomizePods}><Shuffle size={14} /> Randomize stations</button> : <span className="muted-chip">{logistics.assignmentMode === 'choice' ? 'Player choice' : 'Opponent choice'}</span>}</div>
            <div className="pod-manager-grid">{circuitStations.map((station, podIndex) => <article key={station.pod}>
              <header><div><small>POD {station.pod} · {station.location}</small><h3>{station.name}</h3></div><strong>{pods[podIndex].length} players</strong></header>
              <div>{pods[podIndex].map(player => <div className="pod-manager-player" key={player.id}><Avatar name={player.name} size="sm" /><span><strong>{player.name}</strong><small>{teamInfo[player.team].name}</small></span><select value={station.pod} onChange={event => movePlayerToPod(player.id, event.target.value)} aria-label={`Move ${player.name} to another station`}>{circuitStations.map(option => <option value={option.pod} key={option.pod}>{option.pod} · {option.location}</option>)}</select></div>)}</div>
            </article>)}</div>
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
                  <div><small>{place.group}</small><h3>{place.location}</h3>{game && <strong>{game.icon} {game.name}</strong>}<p>{place.detail || (game ? (phaseRounds.length === 1 ? 'Stay here for the full 25-minute circuit.' : 'Start here, then rotate when the host calls time.') : '')}</p></div>
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
          <h3>Race at the right scale</h3>
          <p>Hot Streak works as the loud full-room race. Magical Athlete stays in a 4–6-player pod where every power remains readable.</p>
          <div className="mini-rule"><span>Core-night rule</span><strong>No one sits out longer than 5 min.</strong></div>
        </aside>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="kicker">7:10–9:15 PM</span><h2>Two-part rotation circuit</h2></div><span className="all-active"><Users size={15} /> All players active</span></div>
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

function Scoreboard({ scores, changeScore, players, changePlayerScore }) {
  const sorted = [...players].sort((a, b) => b.points - a.points)
  return (
    <main>
      <section className="page-intro score-intro">
        <span className="eyebrow">BRAGGING RIGHTS</span>
        <h1>The scoreboard</h1>
        <p>Team victories matter most. Individual points recognize standout performances along the way.</p>
      </section>
      <TeamScores scores={scores} onChange={changeScore} />

      <section className="scoreboard-grid">
        <div className="card standings">
          <div className="section-heading"><div><span className="kicker">INDIVIDUAL POINTS</span><h2>Player leaderboard</h2></div><span className="muted-chip">Top 8</span></div>
          <div className="standings-list">
            {sorted.slice(0, 8).map((player, index) => (
              <div key={player.id} className={index < 3 ? 'podium-row' : ''}>
                <span className={`rank rank-${index + 1}`}>{index === 0 ? <Crown size={16} /> : index + 1}</span>
                <Avatar name={player.name} />
                <span className="player-name"><strong>{player.name}</strong><TeamPill team={player.team} /></span>
                <span className="point-stepper"><button aria-label={`Remove one point from ${player.name}`} onClick={() => changePlayerScore(player.id, -1)}><Minus size={13} /></button><strong>{player.points}</strong><button aria-label={`Add one point to ${player.name}`} onClick={() => changePlayerScore(player.id, 1)}><Plus size={13} /></button><small>pts</small></span>
              </div>
            ))}
          </div>
        </div>

        <div className="card prizes">
          <div className="section-heading"><div><span className="kicker">END-OF-NIGHT</span><h2>Prize cabinet</h2></div><PartyPopper /></div>
          {[
            ['🏆', 'Team Champions', 'Highest combined score', 'The big prize'],
            ['👑', 'Game Night MVP', 'Most individual points', 'First pick'],
            ['🔥', 'Comeback Kid', 'Best turnaround', 'Host’s choice'],
            ['🌀', 'Chaos Agent', 'Funniest moment', 'Group vote'],
            ['🤝', 'Golden Ghost', 'Best sport', 'Group vote'],
          ].map(([icon, title, detail, badge]) => <div className="prize-row" key={title}><span>{icon}</span><div><strong>{title}</strong><small>{detail}</small></div><em>{badge}</em></div>)}
          <div className="prize-tip"><Lightbulb size={17} /><p><strong>Prize idea:</strong> winning team gets first pick from a $25 snack-and-silly-trophy table.</p></div>
        </div>
      </section>
    </main>
  )
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
        {remaining.map(word => <button key={word} aria-pressed={selected.includes(word)} className={selected.includes(word) ? 'selected' : ''} onClick={() => toggle(word)}>{word}</button>)}
      </div>
      {solved.length === gridGroups.length && !awarded ? <div className="winner-pick"><strong>Puzzle solved! Award 10 points:</strong><button onClick={() => { onWin('meeple'); setAwarded(true) }}>◆ Team Meeple</button><button onClick={() => { onWin('mayhem'); setAwarded(true) }}>✦ Team Mayhem</button></div> : null}
      <div className="game-footer"><span>Mistakes {[0, 1, 2].map(index => <i className={index < mistakes ? 'lost' : ''} key={index} />)}</span><button className="primary" disabled={selected.length !== 4} onClick={submit}>Submit four</button></div>
    </div>
  )
}

const formatPuzzleTime = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function PuzzleLeaderboard({ game, puzzleId, results }) {
  const leaders = results.filter(result => result.game === game && result.puzzleId === puzzleId).sort((a, b) => a.metric - b.metric || a.playerName.localeCompare(b.playerName))
  return <aside className="puzzle-leaderboard">
    <div><span className="kicker">LIVE LEADERBOARD</span><h3>{game === 'wordle' ? 'Fewest attempts' : 'Fastest solves'}</h3></div>
    {leaders.length ? <ol>{leaders.map(result => <li key={`${result.playerId}-${result.puzzleId}`}><span>{leaders.findIndex(item => item.metric === result.metric) + 1}</span><Avatar name={result.playerName} size="sm" /><strong>{result.playerName}</strong><small className={teamInfo[result.team].color}>{teamInfo[result.team].short}</small><b>{game === 'wordle' ? `${result.metric}/6` : formatPuzzleTime(result.metric)}</b></li>)}</ol> : <div className="empty-leaderboard"><Trophy size={22} /><p>No finishes yet. Be the first name on the board.</p></div>}
  </aside>
}

function ConnectionsGame({ onComplete, results }) {
  const [selected, setSelected] = useState([])
  const [solved, setSolved] = useState([])
  const [mistakes, setMistakes] = useState(0)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [resultMetric, setResultMetric] = useState(null)
  useEffect(() => {
    if (resultMetric) return undefined
    const timer = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000)
    return () => clearInterval(timer)
  }, [startedAt, resultMetric])
  const toggle = word => {
    if (resultMetric) return
    setSelected(selected.includes(word) ? selected.filter(item => item !== word) : selected.length < 4 ? [...selected, word] : selected)
  }
  const submit = async () => {
    const match = gridGroups.find(group => !solved.includes(group.label) && group.words.every(word => selected.includes(word)))
    if (match) {
      const next = [...solved, match.label]
      setSolved(next)
      if (next.length === gridGroups.length) {
        const metric = Math.max(1, Math.ceil((Date.now() - startedAt) / 1000))
        setResultMetric(metric)
        await onComplete(metric)
      }
    } else setMistakes(value => value + 1)
    setSelected([])
  }
  const reset = () => { setSelected([]); setSolved([]); setMistakes(0); setStartedAt(Date.now()); setElapsed(0); setResultMetric(null) }
  const remaining = gridWords.filter(word => !gridGroups.some(group => solved.includes(group.label) && group.words.includes(word)))
  return <div className="puzzle-with-board"><div className="party-grid-game">
      <div className="game-head"><div><span className="kicker">INDIVIDUAL PUZZLE · {formatPuzzleTime(resultMetric || elapsed)}</span><h2>Connections</h2><p>Find four groups of four. Your time is recorded automatically when the last group locks.</p></div><button className="icon-button light" aria-label="Restart Connections puzzle" onClick={reset}><RotateCcw size={18} /></button></div>
      <div className="solved-groups">{solved.map(label => { const group = gridGroups.find(item => item.label === label); return <div className={group.color} key={label}><strong>{label}</strong><span>{group.words.join(' · ')}</span></div> })}</div>
      <div className="word-grid">{remaining.map(word => <button key={word} aria-pressed={selected.includes(word)} className={selected.includes(word) ? 'selected' : ''} onClick={() => toggle(word)}>{word}</button>)}</div>
      {resultMetric && <p className="wordle-result" aria-live="polite">Maze cleared in {formatPuzzleTime(resultMetric)}. Your best time is live.</p>}
      <div className="game-footer"><span>Mistakes {[0, 1, 2, 3].map(index => <i className={index < mistakes ? 'lost' : ''} key={index} />)}</span><button className="primary" disabled={selected.length !== 4 || Boolean(resultMetric)} onClick={submit}>Submit four</button></div>
    </div><PuzzleLeaderboard game="connections" puzzleId={activeConnections.id} results={results} /></div>
}

function WordleGame({ onComplete, results }) {
  const [entry, setEntry] = useState('')
  const [guesses, setGuesses] = useState([])
  const [winner, setWinner] = useState(false)
  const target = activeWordle.answer
  const grade = word => {
    const result = Array(5).fill('miss')
    const counts = {}
    target.split('').forEach((letter, index) => { if (word[index] !== letter) counts[letter] = (counts[letter] || 0) + 1 })
    word.split('').forEach((letter, index) => { if (letter === target[index]) result[index] = 'hit' })
    word.split('').forEach((letter, index) => { if (result[index] === 'miss' && counts[letter]) { result[index] = 'near'; counts[letter] -= 1 } })
    return result
  }
  const submit = async event => {
    event.preventDefault()
    const word = entry.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
    if (word.length !== 5 || winner || guesses.length >= 6) return
    const solved = word === target
    setGuesses([...guesses, { word, result: grade(word) }])
    setEntry('')
    if (solved) {
      const attempts = guesses.length + 1
      setWinner(true)
      await onComplete(attempts)
    }
  }
  const reset = () => { setEntry(''); setGuesses([]); setWinner(false) }
  const rows = [...guesses, ...Array(Math.max(0, 6 - guesses.length)).fill(null)]
  return <div className="puzzle-with-board"><div className="wordle-game">
      <div className="game-head"><div><span className="kicker">INDIVIDUAL PUZZLE</span><h2>Wordle</h2><p>Solve the same five-letter word as everyone else. Your attempt count records automatically.</p></div><button className="icon-button light" aria-label="Restart Wordle puzzle" onClick={reset}><RotateCcw size={18} /></button></div>
      <div className="wordle-board">{rows.map((guess, row) => <div className="wordle-row" key={row}>{Array.from({length: 5}, (_, column) => <span className={guess ? guess.result[column] : ''} key={column}>{guess?.word[column] || ''}</span>)}</div>)}</div>
      <form className="wordle-entry" onSubmit={submit}><input aria-label="Five letter guess" value={entry} maxLength={5} onChange={event => setEntry(event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} placeholder="ENTER 5 LETTERS" /><button className="primary" disabled={entry.length !== 5 || Boolean(winner)}>Guess</button></form>
      {winner && <p className="wordle-result" aria-live="polite">Solved in {guesses.length} {guesses.length === 1 ? 'attempt' : 'attempts'}. Your best run is live.</p>}
      {!winner && guesses.length === 6 && <p className="wordle-result" aria-live="polite">Not solved this run. Tap restart and try again.</p>}
    </div><PuzzleLeaderboard game="wordle" puzzleId={activeWordle.id} results={results} /></div>
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
  const player = players.find(item => item.id === guestPlayerIdentity?.id && item.name.toLocaleLowerCase() === guestPlayerIdentity.name.toLocaleLowerCase())
  const complete = (game, puzzleId, metric) => submitPuzzleResult(player.id, game, puzzleId, metric)
  return <main>
    <button className="back-link" onClick={() => navigate(`/games/${gameMode}`)}><ArrowRight size={15} /> Game guide</button>
    <section className="page-intro play-intro"><span className="eyebrow">GROUP SESSION · PERSONAL RUN</span><h1>The puzzle arcade</h1><p>Everyone gets the same challenge. Finish on your own device and watch the leaderboard update live.</p></section>
    <div className="game-selector two-games">
      <button aria-pressed={gameMode === 'connections'} className={gameMode === 'connections' ? 'active' : ''} onClick={() => setGameMode('connections')}><span>▦</span><div><strong>Connections</strong><small>Four groups · 10 min</small></div></button>
      <button aria-pressed={gameMode === 'wordle'} className={gameMode === 'wordle' ? 'active' : ''} onClick={() => setGameMode('wordle')}><span>▣</span><div><strong>Wordle</strong><small>Five letters · 10 min</small></div></button>
    </div>
    {!player ? <section className="puzzle-join-gate"><Users size={24} /><div><strong>Join before you play</strong><p>Add your name and team so your result has somewhere to land.</p></div><button onClick={() => navigate('/')}>Join game night <ArrowRight size={14} /></button></section> : <section className="game-stage"><div className="puzzle-player-strip"><Avatar name={player.name} size="sm" /><span>Playing as <strong>{player.name}</strong></span><small>{teamInfo[player.team].name}</small></div>{gameMode === 'connections' ? <ConnectionsGame results={puzzleResults} onComplete={metric => complete('connections', activeConnections.id, metric)} /> : <WordleGame results={puzzleResults} onComplete={metric => complete('wordle', activeWordle.id, metric)} />}</section>}
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
    const allocation = value => value === 'meeple' ? { meeple: 10, mayhem: 0 } : value === 'mayhem' ? { meeple: 0, mayhem: 10 } : value === 'split' ? { meeple: 5, mayhem: 5 } : { meeple: 0, mayhem: 0 }
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
  const checkedIn = useMemo(() => players.filter(p => p.checkedIn).length, [players])
  const resetDemo = () => { setPlayers(defaultPlayers); setScores({ meeple: 0, mayhem: 0 }); setPhaseScores({}); setIndividualPhaseScores({}); setPodAssignments(defaultPodAssignments); setCircuitResults({}); setDinnerOrder(''); setPuzzleResults([]); setCurrentEvent(0) }
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
  const joinPlayer = async (name, team) => {
    const cleanName = name.trim().replace(/\s+/g, ' ').slice(0, 40)
    const existing = players.find(player => player.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())
    const id = existing?.id ?? Math.max(0, ...players.map(player => player.id)) + 1
    setPlayers(previous => existing
      ? previous.map(player => player.id === id ? { ...player, name: cleanName, team, checkedIn: true } : player)
      : [...previous, { id, name: cleanName, team, points: 0, checkedIn: true }])
    const identity = { id, name: cleanName }
    setGuestPlayerIdentity(identity)
    rememberPlayerIdentity(guestStorageKey, identity)
    return id
  }
  const submitPuzzleResult = async (playerId, game, puzzleId, metric) => {
    const player = players.find(item => item.id === playerId)
    if (!player) throw new Error('Join the game night before submitting a result')
    setPuzzleResults(previous => {
      const existing = previous.find(result => result.playerId === playerId && result.game === game && result.puzzleId === puzzleId)
      const value = { playerId, playerName: player.name, team: player.team, game, puzzleId, metric: existing ? Math.min(existing.metric, metric) : metric }
      return existing ? previous.map(result => result === existing ? value : result) : [...previous, value]
    })
  }

  return <GameNightShell syncMode="local" state={{ scores, players, currentEvent, phaseScores, individualPhaseScores, podAssignments, circuitResults, dinnerOrder, puzzleResults }} actions={{ changeScore, changePlayerScore, setCurrentEvent, setDinnerOrder, changePhaseScore, changeIndividualPhaseScore, changePlayerTeam, movePlayerToPod, randomizePods, recordCircuitResult, addPlayer, joinPlayer, submitPuzzleResult, shuffleTeams, toggleCheckIn, movePlayerTeam, removePlayer, resetDemo }} checkedIn={checkedIn} guestPlayerIdentity={guestPlayerIdentity} />
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
  const addPlayerMutation = useMutation(api.sharedState.addPlayer)
  const joinPlayerMutation = useMutation(api.sharedState.joinPlayer)
  const toggleCheckInMutation = useMutation(api.sharedState.toggleCheckIn)
  const removePlayerMutation = useMutation(api.sharedState.removePlayer)
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
  const addPlayer = name => commit(addPlayerMutation({ eventKey, name }))
  const joinPlayer = async (name, team) => {
    setSyncError('')
    try {
      const playerId = await joinPlayerMutation({ eventKey, name, team })
      const identity = { id: playerId, name: name.trim().replace(/\s+/g, ' ').slice(0, 40) }
      setGuestPlayerIdentity(identity)
      rememberPlayerIdentity(guestStorageKey, identity)
      return playerId
    } catch (error) {
      setSyncError(error.message || 'Could not join the game night')
      throw error
    }
  }
  const submitPuzzleResult = async (playerId, game, puzzleId, metric) => {
    setSyncError('')
    try {
      return await submitPuzzleResultMutation({ eventKey, playerId, game, puzzleId, metric })
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
  const resetDemo = () => commit(resetMutation({ eventKey }))
  const checkedIn = state.players.filter(player => player.checkedIn).length

  return <GameNightShell syncMode={connectionState.isWebSocketConnected ? 'realtime' : 'connecting'} syncError={syncError} state={{ ...state, puzzleResults }} actions={{ changeScore, changePlayerScore, setCurrentEvent, setDinnerOrder, changePhaseScore, changeIndividualPhaseScore, changePlayerTeam, movePlayerToPod, randomizePods, recordCircuitResult, addPlayer, joinPlayer, submitPuzzleResult, shuffleTeams, toggleCheckIn, movePlayerTeam, removePlayer, resetDemo }} checkedIn={checkedIn} guestPlayerIdentity={guestPlayerIdentity} />
}

function GameNightShell({ state, actions, checkedIn, guestPlayerIdentity, syncMode, syncError = '' }) {
  const { path, navigate } = useRouter()
  const { scores, players, currentEvent, phaseScores, individualPhaseScores, podAssignments, circuitResults, dinnerOrder, puzzleResults } = state
  const { changeScore, changePlayerScore, setCurrentEvent, setDinnerOrder, changePhaseScore, changeIndividualPhaseScore, changePlayerTeam, movePlayerToPod, randomizePods, recordCircuitResult, addPlayer, joinPlayer, submitPuzzleResult, shuffleTeams, toggleCheckIn, movePlayerTeam, removePlayer, resetDemo } = actions
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
      {path === '/' && <Tonight {...{ scores, changeScore, players, navigate, currentEvent, setCurrentEvent, guestPlayerIdentity, joinPlayer, changePlayerTeam }} />}
      {path === '/games' && <GameLibrary navigate={navigate} />}
      {gameSlug && <GameDetail game={getGame(gameSlug)} navigate={navigate} />}
      {(path === '/run-of-show' || path === '/lineup') && <RunOfShow {...{ currentEvent, setCurrentEvent, players, scores, phaseScores, individualPhaseScores, podAssignments, circuitResults, dinnerOrder, setDinnerOrder, changePhaseScore, changeIndividualPhaseScore, changePlayerTeam, movePlayerToPod, randomizePods, recordCircuitResult, navigate }} />}
      {path === '/scores' && <Scoreboard {...{ scores, changeScore, players, changePlayerScore }} />}
      {path === '/teams' && <Roster {...{ players, addPlayer, shuffleTeams, toggleCheckIn, movePlayerTeam, removePlayer }} onReset={resetDemo} />}
      {playMode && <Playroom {...{ navigate, players, guestPlayerIdentity, puzzleResults, submitPuzzleResult }} mode={playMode} />}
      <footer><Logo /><p>Made for snacks, friendly rivalries, and questionable strategy.</p><span>Game night, organized.</span></footer>
      <div className="mobile-nav"><Nav path={path} navigate={navigate} /></div>
    </div>
  )
}

export default function App({ realtime = false }) {
  return realtime ? <RealtimeApp /> : <LocalApp />
}
