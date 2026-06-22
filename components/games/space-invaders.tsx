"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 480, H = 480, COLS = 8, ROWS = 5, AW = 28, AH = 20, GAP = 8

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const keys = useRef<Set<string>>(new Set())
  const sfx = useRetroSound()
  const g = useRef({
    px: W/2, bullets: [] as {x:number,y:number}[],
    aliens: [] as {x:number,y:number,alive:boolean,row:number}[],
    aBullets: [] as {x:number,y:number}[],
    dir: 1, speed: 0.8, dropNext: false, shootTimer: 0,
    lastShot: 0,
  })

  const initLevel = useCallback((lvl: number) => {
    // Level 1: 3 rows, 6 cols. Ramps up smoothly.
    const rows = Math.min(3 + Math.floor((lvl-1)/2), 7)
    const cols = Math.min(6 + Math.floor(lvl/2), 9)
    const aliens: typeof g.current.aliens = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        aliens.push({ x: 40 + c*(AW+GAP), y: 40 + r*(AH+GAP), alive: true, row: r })
    g.current = { 
      ...g.current, 
      aliens, 
      aBullets: [], 
      bullets: [], 
      dir: 1, 
      speed: 0.4 + lvl*0.15, 
      dropNext: false, 
      shootTimer: 0, 
      px: W/2 
    }
  }, [])

  const startGame = useCallback(() => {
    setScore(0); setLevel(1); setLives(3); initLevel(1); setState("play")
  }, [initLevel])

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current.add(e.key); if(e.key==="Enter"&&state!=="play") startGame() }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key)
    window.addEventListener("keydown", down); window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up) }
  }, [state, startGame])

  useEffect(() => {
    if (state !== "play") return
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!
    let anim: number
    const loop = () => {
      const gs = g.current
      // Input
      if (keys.current.has("ArrowLeft")) gs.px = Math.max(20, gs.px - 4)
      if (keys.current.has("ArrowRight")) gs.px = Math.min(W-20, gs.px + 4)
      if ((keys.current.has(" ")||keys.current.has("ArrowUp")) && Date.now()-gs.lastShot>250) {
        gs.bullets.push({x:gs.px,y:H-40}); gs.lastShot=Date.now(); sfx.shoot()
      }
      // Bullets
      gs.bullets = gs.bullets.filter(b => { b.y -= 6; return b.y > 0 })
      gs.aBullets = gs.aBullets.filter(b => { b.y += 3 + level*0.3; return b.y < H })
      // Alien movement
      let hitEdge = false
      gs.aliens.forEach(a => { if(a.alive) { a.x += gs.speed*gs.dir; if(a.x<10||a.x>W-AW-10) hitEdge=true }})
      if (hitEdge) { gs.dir *= -1; gs.aliens.forEach(a => { if(a.alive) a.y += 12 }) }
      // Alien shoot
      gs.shootTimer++
      if (gs.shootTimer > Math.max(30, 90 - level*8)) {
        const alive = gs.aliens.filter(a=>a.alive)
        if (alive.length) { const a = alive[Math.floor(Math.random()*alive.length)]; gs.aBullets.push({x:a.x+AW/2,y:a.y+AH}) }
        gs.shootTimer = 0
      }
      // Collisions: player bullets vs aliens
      const bulletsToRemove = new Set<number>()
      gs.bullets.forEach((b, bi) => {
        gs.aliens.forEach(a => {
          if (a.alive && b.x>a.x && b.x<a.x+AW && b.y>a.y && b.y<a.y+AH) {
            a.alive = false; 
            bulletsToRemove.add(bi); 
            sfx.hit()
            setScore(s => s + (ROWS - a.row) * 10)
          }
        })
      })
      gs.bullets = gs.bullets.filter((_, bi) => !bulletsToRemove.has(bi))

      // Collisions: alien bullets vs player
      const aBulletsToRemove = new Set<number>()
      gs.aBullets.forEach((b, bi) => {
        if (b.x>gs.px-15 && b.x<gs.px+15 && b.y>H-45 && b.y<H-20) {
          aBulletsToRemove.add(bi); 
          sfx.die()
          setLives(l => {
            if (l <= 1) { setState("over"); return 0 }
            return l - 1
          })
        }
      })
      gs.aBullets = gs.aBullets.filter((_, bi) => !aBulletsToRemove.has(bi))

      // Check aliens reached bottom
      if (gs.aliens.some(a => a.alive && a.y + AH > H - 60)) { setState("over"); sfx.die() }
      // Level complete
      if (gs.aliens.every(a => !a.alive)) {
        sfx.levelUp()
        setLevel(l => { const nl = l+1; initLevel(nl); return nl })
      }
      // Render
      ctx.fillStyle = "#000"; ctx.fillRect(0,0,W,H)
      // Stars
      ctx.fillStyle = "#333"
      for (let i = 0; i < 30; i++) ctx.fillRect((i*73+level*17)%W, (i*137)%H, 2, 2)
      // Aliens
      gs.aliens.forEach(a => {
        if (!a.alive) return
        const colors = ["#ff0000","#ff6600","#ffff00","#00ff00","#00ffff","#ff00ff","#ffffff","#ff6699"]
        ctx.fillStyle = colors[a.row % colors.length]
        // Pixel alien shape
        const px = 4
        const shape = [
          [0,0,1,0,0,0,1,0,0],
          [0,0,0,1,1,1,0,0,0],
          [0,0,1,1,1,1,1,0,0],
          [0,1,1,0,1,0,1,1,0],
          [1,1,1,1,1,1,1,1,1],
        ]
        shape.forEach((row, ry) => row.forEach((v, rx) => {
          if (v) ctx.fillRect(a.x + rx*px - 4, a.y + ry*px, px-1, px-1)
        }))
      })
      // Player ship
      ctx.fillStyle = "#00ff41"
      ctx.fillRect(gs.px-15, H-35, 30, 8)
      ctx.fillRect(gs.px-4, H-42, 8, 7)
      ctx.fillRect(gs.px-1, H-46, 2, 4)
      // Bullets
      ctx.fillStyle = "#00ff41"
      gs.bullets.forEach(b => ctx.fillRect(b.x-1, b.y, 2, 8))
      ctx.fillStyle = "#ff0000"
      gs.aBullets.forEach(b => ctx.fillRect(b.x-1, b.y, 2, 8))
      // HUD
      ctx.fillStyle = "#00ff41"; ctx.font = "14px 'Press Start 2P', monospace"
      ctx.fillText(`SCORE ${score}`, 10, 20)
      ctx.fillText(`LVL ${level}`, W/2-30, 20)
      ctx.fillText(`♥`.repeat(lives), W-80, 20)
      anim = requestAnimationFrame(loop)
    }
    anim = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(anim)
  }, [state, level, lives, score, sfx, initLevel])

  return (
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}} />
      {state==="menu" && (
        <div className="game-overlay">
          <p className="game-overlay-icon">👾</p>
          <h2>SPACE INVADERS</h2>
          <p>Press ENTER to start</p>
        </div>
      )}
      {state==="over" && (
        <div className="game-overlay">
          <h2 style={{color:"#ff0000"}}>GAME OVER</h2>
          <p>SCORE: {score} | LEVEL: {level}</p>
          <p>Press ENTER to retry</p>
        </div>
      )}
    </div>
  )
}
