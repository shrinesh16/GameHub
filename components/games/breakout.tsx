"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 480, H = 480, PADDLE_W = 70, PADDLE_H = 12, BALL_R = 5
const BRICK_ROWS = 6, BRICK_COLS = 10, BRICK_W = 42, BRICK_H = 14, BRICK_GAP = 4

export default function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const keys = useRef<Set<string>>(new Set())
  const sfx = useRetroSound()
  const g = useRef({ px: W/2, bx: W/2, by: H-60, bdx: 3, bdy: -3, launched: false,
    bricks: [] as {x:number,y:number,hp:number,color:string}[] })

  const initLevel = useCallback((lvl: number) => {
    const bricks: typeof g.current.bricks = []
    const colors = ["#ff0000","#ff6600","#ffff00","#00ff00","#00bfff","#9b59b6"]
    // Level 1: 3 rows, ramping up smoothly.
    const rows = Math.min(2 + lvl, 8)
    const startX = (W - BRICK_COLS*(BRICK_W+BRICK_GAP))/2
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < BRICK_COLS; c++) {
        const hp = r < 2 && lvl > 2 ? 2 : 1
        bricks.push({x: startX+c*(BRICK_W+BRICK_GAP), y: 40+r*(BRICK_H+BRICK_GAP), hp, color: colors[r%colors.length]})
      }
    const speed = 2.2 + lvl * 0.4
    g.current = { px: W/2, bx: W/2, by: H-60, bdx: speed*(Math.random()>0.5?1:-1), bdy: -speed, launched: false, bricks }
  }, [])

  const startGame = useCallback(() => {
    setScore(0); setLevel(1); setLives(3); initLevel(1); setState("play")
  }, [initLevel])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.key)
      if (e.key==="Enter" && state!=="play") startGame()
      if (e.key===" " && !g.current.launched) g.current.launched = true
    }
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
      if (keys.current.has("ArrowLeft")) gs.px = Math.max(PADDLE_W/2, gs.px - 5)
      if (keys.current.has("ArrowRight")) gs.px = Math.min(W-PADDLE_W/2, gs.px + 5)
      if (!gs.launched) { gs.bx = gs.px; gs.by = H-60 }
      else {
        gs.bx += gs.bdx; gs.by += gs.bdy
        if (gs.bx < BALL_R || gs.bx > W-BALL_R) { gs.bdx *= -1; sfx.tick() }
        if (gs.by < BALL_R) { gs.bdy *= -1; sfx.tick() }
        // Paddle collision
        if (gs.by > H-35-BALL_R && gs.by < H-25 && gs.bx > gs.px-PADDLE_W/2-BALL_R && gs.bx < gs.px+PADDLE_W/2+BALL_R) {
          gs.bdy = -Math.abs(gs.bdy); gs.bdx += (gs.bx-gs.px)*0.05; sfx.tick()
        }
        // Brick collision (fixed to prevent double-negate direction cancel)
        let hitBrick = false
        for (let i = 0; i < gs.bricks.length; i++) {
          const b = gs.bricks[i]
          if (b.hp <= 0) continue
          if (gs.bx > b.x-BALL_R && gs.bx < b.x+BRICK_W+BALL_R && gs.by > b.y-BALL_R && gs.by < b.y+BRICK_H+BALL_R) {
            b.hp--;
            hitBrick = true;
            sfx.hit()
            setScore(s => s + 10 * level)
            break // bounce off the first brick we hit in this frame
          }
        }
        if (hitBrick) gs.bdy *= -1
        // Ball lost
        if (gs.by > H) {
          sfx.die(); gs.launched = false
          setLives(l => { if(l<=1){setState("over");return 0} return l-1 })
        }
      }
      // Level complete
      if (gs.bricks.every(b => b.hp <= 0)) {
        sfx.levelUp()
        setLevel(l => { const nl=l+1; initLevel(nl); return nl })
      }
      // Render
      ctx.fillStyle = "#0a0a2e"; ctx.fillRect(0,0,W,H)
      gs.bricks.forEach(b => {
        if (b.hp <= 0) return
        ctx.fillStyle = b.hp > 1 ? "#ffffff" : b.color
        ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H)
        if (b.hp > 1) { ctx.fillStyle = b.color; ctx.fillRect(b.x+2,b.y+2,BRICK_W-4,BRICK_H-4) }
      })
      ctx.fillStyle = "#00ff41"
      ctx.fillRect(gs.px-PADDLE_W/2, H-30, PADDLE_W, PADDLE_H)
      ctx.beginPath(); ctx.arc(gs.bx, gs.by, BALL_R, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill()
      ctx.fillStyle = "#00ff41"; ctx.font = "12px 'Press Start 2P', monospace"
      ctx.fillText(`SCORE ${score}`, 10, 25); ctx.fillText(`LVL ${level}`, W/2-30, 25); ctx.fillText(`♥`.repeat(lives), W-80, 25)
      anim = requestAnimationFrame(loop)
    }
    anim = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(anim)
  }, [state, level, lives, score, sfx, initLevel])

  return (
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}} />
      {state==="menu" && <div className="game-overlay"><p className="game-overlay-icon">🧱</p><h2>BREAKOUT</h2><p>Press ENTER to start</p></div>}
      {state==="over" && <div className="game-overlay"><h2 style={{color:"#ff0000"}}>GAME OVER</h2><p>SCORE: {score} | LEVEL: {level}</p><p>Press ENTER to retry</p></div>}
    </div>
  )
}
