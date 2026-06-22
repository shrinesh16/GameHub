export interface GameConfig {
  id: string
  name: string
  description: string
  type: 'infinite' | 'levels'
  icon: string
  color: string
  controls: string[]
}

export const GAMES: GameConfig[] = [
  {
    id: 'space-invaders',
    name: 'SPACE INVADERS',
    description: 'Defend Earth from alien invasion',
    type: 'levels',
    icon: '👾',
    color: '#00ff41',
    controls: ['← → Move', 'SPACE Shoot'],
  },
  {
    id: 'pac-man',
    name: 'PAC-MAN',
    description: 'Eat dots and avoid ghosts',
    type: 'levels',
    icon: '🟡',
    color: '#ffff00',
    controls: ['← → ↑ ↓ Move'],
  },
  {
    id: 'breakout',
    name: 'BREAKOUT',
    description: 'Smash all the bricks',
    type: 'levels',
    icon: '🧱',
    color: '#ff6b35',
    controls: ['← → Move', 'SPACE Launch'],
  },
  {
    id: 'snake',
    name: 'SNAKE',
    description: 'Eat apples and grow longer',
    type: 'infinite',
    icon: '🐍',
    color: '#39ff14',
    controls: ['← → ↑ ↓ Move'],
  },
  {
    id: 'tetris',
    name: 'TETRIS',
    description: 'Stack and clear falling blocks',
    type: 'levels',
    icon: '🟦',
    color: '#00b4d8',
    controls: ['← → Move', '↑ Rotate', '↓ Fast Drop'],
  },
  {
    id: 'flappy-bird',
    name: 'FLAPPY BIRD',
    description: 'Flap through the pipes',
    type: 'infinite',
    icon: '🐦',
    color: '#ffe66d',
    controls: ['SPACE Flap'],
  },
  {
    id: 'dino-run',
    name: 'DINO RUN',
    description: 'Jump over obstacles endlessly',
    type: 'infinite',
    icon: '🦖',
    color: '#535353',
    controls: ['SPACE Jump', '↓ Duck'],
  },
  {
    id: 'asteroids',
    name: 'ASTEROIDS',
    description: 'Blast rocks in deep space',
    type: 'levels',
    icon: '☄️',
    color: '#e0e0e0',
    controls: ['← → Rotate', '↑ Thrust', 'SPACE Shoot'],
  },
  {
    id: 'frogger',
    name: 'FROGGER',
    description: 'Cross the road safely',
    type: 'levels',
    icon: '🐸',
    color: '#2dc653',
    controls: ['← → ↑ ↓ Move'],
  },
  {
    id: 'minesweeper',
    name: 'MINESWEEPER',
    description: 'Sweep the mines carefully',
    type: 'levels',
    icon: '💣',
    color: '#c0c0c0',
    controls: ['CLICK Reveal', 'RIGHT-CLICK Flag'],
  },
]
