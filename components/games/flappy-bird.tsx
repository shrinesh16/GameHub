"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 400, H = 500, GRAVITY = 0.35, FLAP = -6.5, PIPE_W = 52, GAP_H = 130, PIPE_SPEED = 2.5
const BIRD_X = 80, BIRD_SIZE = 18

export default function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const sfx = useRetroSound()
  const g = useRef({ by: H/2, bv: 0, pipes: [] as {x:number,gapY:number,scored:boolean}[], frame: 0 })

  const startGame = useCallback(() => {
    g.current = { by: H/2, bv: 0, pipes: [], frame: 0 }
    setScore(0); setState("play")
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key==="Enter" && state!=="play") startGame()
      if ((e.key===" "||e.key==="ArrowUp") && state==="play") { g.current.bv = FLAP; sfx.move() }
    }
    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [state, startGame, sfx])

  useEffect(() => {
    if (state !== "play") return
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!
    let anim: number
    const loop = () => {
      const gs = g.current; gs.frame++
      // Bird physics
      gs.bv += GRAVITY; gs.by += gs.bv
      // Spawn pipes
      if (gs.frame % 90 === 0) {
        const minGap = Math.max(90, GAP_H - Math.floor(score/5)*3)
        const gapY = 80 + Math.random() * (H - 180 - minGap)
        gs.pipes.push({ x: W + 20, gapY, scored: false })
      }
      // Move pipes & check collisions
      const speed = PIPE_SPEED + score * 0.015
      let dead = false
      gs.pipes = gs.pipes.filter(p => {
        p.x -= speed
        // Score
        if (!p.scored && p.x + PIPE_W < BIRD_X) {
          p.scored = true; sfx.score()
          setScore(s => { const ns = s+1; if(ns>best) setBest(ns); return ns })
        }
        // Collision
        if (BIRD_X + BIRD_SIZE > p.x && BIRD_X - BIRD_SIZE < p.x + PIPE_W) {
          const gapH = Math.max(95, GAP_H - Math.floor(score/8)*3)
          if (gs.by - BIRD_SIZE < p.gapY || gs.by + BIRD_SIZE > p.gapY + gapH) dead = true
        }
        return p.x > -PIPE_W - 10
      })
      if (gs.by > H - 20 || gs.by < 0) dead = true
      if (dead) { setState("over"); sfx.die(); return }
      // Render - sky gradient
      const grad = ctx.createLinearGradient(0,0,0,H)
      grad.addColorStop(0,"#1a1a40"); grad.addColorStop(1,"#0a0a20")
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H)
      // Ground
      ctx.fillStyle="#1a3a1a"; ctx.fillRect(0,H-20,W,20)
      ctx.fillStyle="#2a5a2a"; ctx.fillRect(0,H-22,W,3)
      // Pipes
      gs.pipes.forEach(p => {
        const gapH = Math.max(95, GAP_H - Math.floor(score/8)*3)
        ctx.fillStyle="#39ff14"
        ctx.fillRect(p.x,0,PIPE_W,p.gapY)
        ctx.fillRect(p.x,p.gapY+gapH,PIPE_W,H-p.gapY-gapH-20)
        ctx.fillStyle="#2ad12a"
        ctx.fillRect(p.x-3,p.gapY-12,PIPE_W+6,12)
        ctx.fillRect(p.x-3,p.gapY+gapH,PIPE_W+6,12)
      })
      // Bird
      ctx.fillStyle = "#ffe66d"
      ctx.fillRect(BIRD_X-BIRD_SIZE, gs.by-BIRD_SIZE, BIRD_SIZE*2, BIRD_SIZE*2)
      // Wing
      ctx.fillStyle = "#ffcc00"
      const wingY = Math.sin(gs.frame*0.3)*3
      ctx.fillRect(BIRD_X-BIRD_SIZE-6, gs.by-2+wingY, 8, 8)
      // Eye
      ctx.fillStyle="#000"; ctx.fillRect(BIRD_X+6,gs.by-8,5,5)
      ctx.fillStyle="#fff"; ctx.fillRect(BIRD_X+7,gs.by-7,2,2)
      // Beak
      ctx.fillStyle="#ff6600"; ctx.fillRect(BIRD_X+BIRD_SIZE,gs.by-2,8,4)
      // HUD
      ctx.fillStyle="#fff"; ctx.font="16px 'Press Start 2P',monospace"; ctx.textAlign="center"
      ctx.fillText(`${score}`,W/2,40); ctx.textAlign="left"
      anim = requestAnimationFrame(loop)
    }
    anim = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(anim)
  }, [state, score, best, sfx])

  return (
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}} />
      {state==="menu"&&<div className="game-overlay"><p className="game-overlay-icon">🐦</p><h2>FLAPPY BIRD</h2><p>Press ENTER to start</p></div>}
      {state==="over"&&<div className="game-overlay"><h2 style={{color:"#ff0000"}}>GAME OVER</h2><p>SCORE: {score} | BEST: {best}</p><p>Press ENTER to retry</p></div>}
    </div>
  )
}
