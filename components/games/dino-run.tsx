"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 600, H = 300, GROUND_Y = 240, DINO_W = 40, DINO_H = 44

export default function DinoRun() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const sfx = useRetroSound()
  const g = useRef({
    dy: GROUND_Y-DINO_H, dv: 0, ducking: false, jumping: false,
    obstacles: [] as {x:number,w:number,h:number,y:number,type:string}[],
    speed: 5, frame: 0, spawnTimer: 0, scoreAcc: 0
  })

  const startGame = useCallback(() => {
    g.current = { dy:GROUND_Y-DINO_H, dv:0, ducking:false, jumping:false,
      obstacles:[], speed:4.5, frame:0, spawnTimer:0, scoreAcc:0 }
    setScore(0); setState("play")
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key==="Enter"&&state!=="play") startGame()
      if (state==="play") {
        if ((e.key===" "||e.key==="ArrowUp")&&!g.current.jumping) {
          g.current.jumping=true; g.current.dv=-11; sfx.move()
        }
        if (e.key==="ArrowDown") g.current.ducking=true
      }
    }
    const up = (e: KeyboardEvent) => { if(e.key==="ArrowDown") g.current.ducking=false }
    window.addEventListener("keydown",down); window.addEventListener("keyup",up)
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)}
  }, [state, startGame, sfx])

  useEffect(() => {
    if (state!=="play") return
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!
    let anim: number
    const loop = () => {
      const gs = g.current; gs.frame++
      // Dino physics: Fast drop when ducking in mid-air
      if (gs.ducking && gs.jumping) {
        gs.dv += 1.2
      } else {
        gs.dv += 0.6
      }
      gs.dy += gs.dv
      const dinoH = gs.ducking ? DINO_H/2 : DINO_H
      // Fix teleportation bug: base ducking offset on actual vertical jump coordinate gs.dy
      const dinoY = gs.ducking ? gs.dy + DINO_H/2 : gs.dy
      if (gs.dy >= GROUND_Y-DINO_H) { gs.dy=GROUND_Y-DINO_H; gs.dv=0; gs.jumping=false }
      // Speed up: gentler scaling curve
      gs.speed = 4.5 + gs.scoreAcc * 0.002
      // Score
      gs.scoreAcc += gs.speed * 0.1
      const newScore = Math.floor(gs.scoreAcc)
      if (newScore !== score) { setScore(newScore); if(newScore%100===0&&newScore>0) sfx.score() }
      // Spawn obstacles
      gs.spawnTimer -= gs.speed
      if (gs.spawnTimer <= 0) {
        const minGap = Math.max(200, 400 - gs.scoreAcc*0.08)
        gs.spawnTimer = minGap + Math.random()*200
        if (gs.scoreAcc > 300 && Math.random()>0.6) {
          // Pterodactyl
          gs.obstacles.push({x:W+20,w:36,h:28,y:GROUND_Y-60-Math.random()*50,type:"bird"})
        } else {
          // Cactus
          const tall = Math.random()>0.5
          const w = 16+Math.random()*20
          const h = tall?40+Math.random()*20:24+Math.random()*16
          gs.obstacles.push({x:W+20,w,h,y:GROUND_Y-h,type:"cactus"})
        }
      }
      // Move and collide
      let dead = false
      gs.obstacles = gs.obstacles.filter(o => {
        o.x -= gs.speed
        // Collision (dino hitbox at x=40)
        if (40+DINO_W-8>o.x && 40+8<o.x+o.w && dinoY+dinoH-4>o.y && dinoY+4<o.y+o.h) dead=true
        return o.x > -60
      })
      if (dead) { setState("over"); sfx.die(); setBest(b=>Math.max(b,newScore)); return }
      // Render
      ctx.fillStyle="#f7f7f7"; ctx.fillRect(0,0,W,H)
      // Ground line
      ctx.fillStyle="#535353"
      ctx.fillRect(0,GROUND_Y,W,1)
      // Ground texture
      for(let i=0;i<30;i++){const gx=(i*47+gs.frame*gs.speed)%(W+100)-50;ctx.fillRect(gx,GROUND_Y+4+Math.random()*6,Math.random()*12+2,1)}
      // Dino
      ctx.fillStyle="#535353"
      if (gs.ducking) {
        ctx.fillRect(40,dinoY,DINO_W+10,dinoH)
        ctx.fillStyle="#f7f7f7";ctx.fillRect(40+DINO_W+2,dinoY+2,4,4) // eye hole
        // Animated legs for running duck dino
        ctx.fillStyle="#535353"
        const legAnim = Math.floor(gs.frame/6)%2
        ctx.fillRect(48,dinoY+dinoH,6, legAnim?4:2)
        ctx.fillRect(60,dinoY+dinoH,6, legAnim?2:4)
      } else {
        // Body
        ctx.fillRect(44,dinoY+8,28,DINO_H-8)
        // Head
        ctx.fillRect(52,dinoY,24,12)
        // Eye
        ctx.fillStyle="#f7f7f7"; ctx.fillRect(68,dinoY+3,4,4)
        ctx.fillStyle="#535353"
        // Legs (animated)
        if (gs.jumping) {
          ctx.fillRect(48,dinoY+DINO_H,6,8); ctx.fillRect(60,dinoY+DINO_H,6,8)
        } else {
          const legAnim = Math.floor(gs.frame/6)%2
          ctx.fillRect(48,dinoY+DINO_H,6, legAnim?8:4)
          ctx.fillRect(60,dinoY+DINO_H,6, legAnim?4:8)
        }
        // Arms
        ctx.fillRect(44,dinoY+16,4,10)
      }
      // Obstacles
      gs.obstacles.forEach(o => {
        if (o.type==="cactus") {
          ctx.fillStyle="#2d5a27"
          ctx.fillRect(o.x,o.y,o.w,o.h)
          ctx.fillRect(o.x-4,o.y+o.h*0.3,4,o.h*0.4)
          ctx.fillRect(o.x+o.w,o.y+o.h*0.2,4,o.h*0.5)
        } else {
          ctx.fillStyle="#535353"
          // Bird body
          ctx.fillRect(o.x+4,o.y+8,28,12)
          // Wings animated
          const wingUp = Math.floor(gs.frame/8)%2
          ctx.fillRect(o.x+10,o.y+(wingUp?0:20),16,8)
          // Beak
          ctx.fillRect(o.x+32,o.y+10,6,4)
        }
      })
      // HUD
      ctx.fillStyle="#535353"; ctx.font="14px 'Press Start 2P',monospace"; ctx.textAlign="right"
      ctx.fillText(`HI ${String(best).padStart(5,"0")}  ${String(newScore).padStart(5,"0")}`,W-20,30)
      ctx.textAlign="left"
      anim = requestAnimationFrame(loop)
    }
    anim = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(anim)
  }, [state, score, best, sfx])

  return (
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}} />
      {state==="menu"&&<div className="game-overlay"><p className="game-overlay-icon">🦖</p><h2>DINO RUN</h2><p>Press ENTER to start</p></div>}
      {state==="over"&&<div className="game-overlay"><h2 style={{color:"#535353"}}>GAME OVER</h2><p>SCORE: {score} | BEST: {best}</p><p>Press ENTER to retry</p></div>}
    </div>
  )
}
