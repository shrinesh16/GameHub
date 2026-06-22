"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 480, H = 480, CELL = 20, COLS = W/CELL, ROWS = H/CELL

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const sfx = useRetroSound()
  const g = useRef({
    snake: [{x:12,y:12}], dir: {x:1,y:0}, nextDir: {x:1,y:0},
    apple: {x:5,y:5}, speed: 120, tick: 0, lastMove: 0
  })

  const spawnApple = useCallback(() => {
    let x: number, y: number
    do { x = Math.floor(Math.random()*COLS); y = Math.floor(Math.random()*ROWS) }
    while (g.current.snake.some(s => s.x===x && s.y===y))
    g.current.apple = {x, y}
  }, [])

  const startGame = useCallback(() => {
    g.current = { snake: [{x:12,y:12}], dir:{x:1,y:0}, nextDir:{x:1,y:0}, apple:{x:5,y:5}, speed:120, tick:0, lastMove:0, canChangeDir:true }
    spawnApple(); setScore(0); setState("play")
  }, [spawnApple])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key==="Enter" && state!=="play") { startGame(); return }
      if (state!=="play") return
      const gs = g.current
      if (!gs.canChangeDir) return
      const d = gs.dir
      if (e.key==="ArrowUp" && d.y===0) { gs.nextDir = {x:0,y:-1}; gs.canChangeDir = false }
      if (e.key==="ArrowDown" && d.y===0) { gs.nextDir = {x:0,y:1}; gs.canChangeDir = false }
      if (e.key==="ArrowLeft" && d.x===0) { gs.nextDir = {x:-1,y:0}; gs.canChangeDir = false }
      if (e.key==="ArrowRight" && d.x===0) { gs.nextDir = {x:1,y:0}; gs.canChangeDir = false }
    }
    window.addEventListener("keydown", down)
    return () => window.removeEventListener("keydown", down)
  }, [state, startGame])

  useEffect(() => {
    if (state !== "play") return
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!
    let anim: number
    const loop = (time: number) => {
      const gs = g.current
      if (gs.lastMove === 0) gs.lastMove = time
      if (time - gs.lastMove > gs.speed) {
        gs.lastMove = time; gs.dir = gs.nextDir; gs.canChangeDir = true
        const head = gs.snake[0]
        const nh = {x: head.x + gs.dir.x, y: head.y + gs.dir.y}
        // Wall collision
        if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) { setState("over"); sfx.die(); return }
        // Self collision
        if (gs.snake.some(s => s.x===nh.x && s.y===nh.y)) { setState("over"); sfx.die(); return }
        gs.snake.unshift(nh)
        if (nh.x === gs.apple.x && nh.y === gs.apple.y) {
          sfx.score(); spawnApple()
          setScore(s => s + 10)
          if (gs.speed > 50) gs.speed -= 3 // Speeds up!
        } else {
          gs.snake.pop()
        }
      }
      // Render
      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0,0,W,H)
      // Grid
      ctx.strokeStyle = "#111"; ctx.lineWidth = 0.5
      for (let x = 0; x < W; x += CELL) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for (let y = 0; y < H; y += CELL) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }
      // Apple
      ctx.fillStyle = "#ff0000"
      ctx.fillRect(gs.apple.x*CELL+2, gs.apple.y*CELL+2, CELL-4, CELL-4)
      ctx.fillStyle = "#00ff00"
      ctx.fillRect(gs.apple.x*CELL+8, gs.apple.y*CELL-2, 4, 4)
      // Snake
      gs.snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? "#39ff14" : `rgb(0, ${200 - i*2}, 0)`
        ctx.fillRect(s.x*CELL+1, s.y*CELL+1, CELL-2, CELL-2)
      })
      // Eyes on head
      const head = gs.snake[0]
      ctx.fillStyle = "#000"
      ctx.fillRect(head.x*CELL+5, head.y*CELL+5, 3, 3)
      ctx.fillRect(head.x*CELL+12, head.y*CELL+5, 3, 3)
      // HUD
      ctx.fillStyle = "#39ff14"; ctx.font = "12px 'Press Start 2P', monospace"
      ctx.fillText(`SCORE ${score}`, 10, 18)
      ctx.fillText(`LEN ${g.current.snake.length}`, W-140, 18)
      anim = requestAnimationFrame(loop)
    }
    anim = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(anim)
  }, [state, score, sfx, spawnApple])

  return (
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}} />
      {state==="menu" && <div className="game-overlay"><p className="game-overlay-icon">🐍</p><h2>SNAKE</h2><p>Press ENTER to start</p></div>}
      {state==="over" && <div className="game-overlay"><h2 style={{color:"#ff0000"}}>GAME OVER</h2><p>SCORE: {score} | LENGTH: {g.current.snake.length}</p><p>Press ENTER to retry</p></div>}
    </div>
  )
}
