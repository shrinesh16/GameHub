"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 480, H = 480

export default function Asteroids() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const keys = useRef<Set<string>>(new Set())
  const sfx = useRetroSound()
  const g = useRef({
    sx:W/2,sy:H/2,sa:0,svx:0,svy:0,
    bullets:[] as {x:number,y:number,dx:number,dy:number,life:number}[],
    asteroids:[] as {x:number,y:number,dx:number,dy:number,size:number}[],
    lastShot:0, invincible:0
  })

  const spawnAsteroids = useCallback((count: number) => {
    for(let i=0;i<count;i++){
      const angle=Math.random()*Math.PI*2
      // Speed scales nicely with level, starting slower at Level 1
      const speed=(0.3+Math.random()*0.9)*(0.8+level*0.2)
      let x:number,y:number
      do{x=Math.random()*W;y=Math.random()*H}while(Math.abs(x-g.current.sx)<80&&Math.abs(y-g.current.sy)<80)
      g.current.asteroids.push({x,y,dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,size:3})
    }
  },[level])

  const initLevel = useCallback((lvl: number) => {
    g.current.asteroids = []; g.current.bullets = []
    g.current.sx=W/2;g.current.sy=H/2;g.current.sa=0;g.current.svx=0;g.current.svy=0;g.current.invincible=120
    // Level 1 starts with 2 large asteroids instead of 4
    spawnAsteroids(Math.max(1, lvl + 1))
  },[spawnAsteroids])

  const startGame = useCallback(() => {
    g.current = {sx:W/2,sy:H/2,sa:0,svx:0,svy:0,bullets:[],asteroids:[],lastShot:0,invincible:120}
    setScore(0);setLevel(1);setLives(3);initLevel(1);setState("play")
  },[initLevel])

  useEffect(() => {
    const down=(e:KeyboardEvent)=>{keys.current.add(e.key);if(e.key==="Enter"&&state!=="play")startGame()}
    const up=(e:KeyboardEvent)=>keys.current.delete(e.key)
    window.addEventListener("keydown",down);window.addEventListener("keyup",up)
    return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)}
  },[state,startGame])

  useEffect(()=>{
    if(state!=="play")return
    const canvas=canvasRef.current!;const ctx=canvas.getContext("2d")!
    let anim:number
    const loop=()=>{
      const gs=g.current
      // Input
      if(keys.current.has("ArrowLeft"))gs.sa-=0.06
      if(keys.current.has("ArrowRight"))gs.sa+=0.06
      if(keys.current.has("ArrowUp")){gs.svx+=Math.cos(gs.sa)*0.12;gs.svy+=Math.sin(gs.sa)*0.12}
      if((keys.current.has(" "))&&Date.now()-gs.lastShot>200){
        gs.bullets.push({x:gs.sx+Math.cos(gs.sa)*16,y:gs.sy+Math.sin(gs.sa)*16,dx:Math.cos(gs.sa)*6,dy:Math.sin(gs.sa)*6,life:60})
        gs.lastShot=Date.now();sfx.shoot()
      }
      // Ship movement
      gs.sx+=gs.svx;gs.sy+=gs.svy;gs.svx*=0.99;gs.svy*=0.99
      gs.sx=((gs.sx%W)+W)%W;gs.sy=((gs.sy%H)+H)%H
      if(gs.invincible>0)gs.invincible--
      // Bullets
      gs.bullets=gs.bullets.filter(b=>{b.x+=b.dx;b.y+=b.dy;b.life--;b.x=((b.x%W)+W)%W;b.y=((b.y%H)+H)%H;return b.life>0})
      // Asteroids movement
      gs.asteroids.forEach(a=>{a.x+=a.dx;a.y+=a.dy;a.x=((a.x%W)+W)%W;a.y=((a.y%H)+H)%H})
      // Bullet-asteroid collisions (fixed to prevent slice array mutation bug)
      const bulletsToRemove = new Set<number>()
      const asteroidsToRemove = new Set<number>()
      gs.bullets.forEach((b,bi)=>{
        gs.asteroids.forEach((a,ai)=>{
          if (bulletsToRemove.has(bi) || asteroidsToRemove.has(ai)) return
          const r=a.size*12;const dx=b.x-a.x,dy=b.y-a.y
          if(dx*dx+dy*dy<r*r){
            bulletsToRemove.add(bi);
            asteroidsToRemove.add(ai);
            sfx.hit()
            setScore(s=>s+(4-a.size)*20)
            if(a.size>1){
              const ns=a.size-1
              gs.asteroids.push({x:a.x,y:a.y,dx:a.dy*1.2,dy:-a.dx*1.2,size:ns})
              gs.asteroids.push({x:a.x,y:a.y,dx:-a.dy*1.2,dy:a.dx*1.2,size:ns})
            }
          }
        })
      })
      gs.bullets = gs.bullets.filter((_, bi) => !bulletsToRemove.has(bi))
      gs.asteroids = gs.asteroids.filter((_, ai) => !asteroidsToRemove.has(ai))

      // Ship-asteroid collision
      if(gs.invincible<=0){
        gs.asteroids.forEach(a=>{
          const r=a.size*12+10;const dx=gs.sx-a.x,dy=gs.sy-a.y
          if(dx*dx+dy*dy<r*r){
            sfx.die();gs.invincible=120;gs.sx=W/2;gs.sy=H/2;gs.svx=0;gs.svy=0
            setLives(l=>{if(l<=1){setState("over");return 0}return l-1})
          }
        })
      }
      // Level complete
      if(gs.asteroids.length===0){sfx.levelUp();setLevel(l=>{const nl=l+1;initLevel(nl);return nl})}
      // Render
      ctx.fillStyle="#000";ctx.fillRect(0,0,W,H)
      // Stars
      for(let i=0;i<40;i++){ctx.fillStyle=`rgba(255,255,255,${0.3+Math.random()*0.3})`;ctx.fillRect((i*97)%W,(i*163)%H,1,1)}
      // Ship
      if(gs.invincible<=0||Math.floor(gs.invincible/4)%2===0){
        ctx.save();ctx.translate(gs.sx,gs.sy);ctx.rotate(gs.sa)
        ctx.strokeStyle="#e0e0e0";ctx.lineWidth=2;ctx.beginPath()
        ctx.moveTo(16,0);ctx.lineTo(-10,-10);ctx.lineTo(-6,0);ctx.lineTo(-10,10);ctx.closePath();ctx.stroke()
        if(keys.current.has("ArrowUp")){ctx.strokeStyle="#ff6600";ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(-16,0);ctx.lineTo(-8,4);ctx.stroke()}
        ctx.restore()
      }
      // Asteroids
      gs.asteroids.forEach(a=>{
        ctx.strokeStyle="#e0e0e0";ctx.lineWidth=1.5;const r=a.size*12
        ctx.beginPath();for(let i=0;i<8;i++){const ang=i*Math.PI/4;const rr=r*(0.8+((i*3+a.size)%3)*0.15);ctx.lineTo(a.x+Math.cos(ang)*rr,a.y+Math.sin(ang)*rr)};ctx.closePath();ctx.stroke()
      })
      // Bullets
      ctx.fillStyle="#fff";gs.bullets.forEach(b=>ctx.fillRect(b.x-1,b.y-1,3,3))
      // HUD
      ctx.fillStyle="#e0e0e0";ctx.font="11px 'Press Start 2P',monospace"
      ctx.fillText(`SCORE ${score}`,10,20);ctx.fillText(`LVL ${level}`,W/2-30,20);ctx.fillText(`♥`.repeat(lives),W-80,20)
      anim=requestAnimationFrame(loop)
    }
    anim=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(anim)
  },[state,score,level,lives,sfx,initLevel])

  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}}/>
      {state==="menu"&&<div className="game-overlay"><p className="game-overlay-icon">☄️</p><h2>ASTEROIDS</h2><p>Press ENTER to start</p></div>}
      {state==="over"&&<div className="game-overlay"><h2 style={{color:"#ff0000"}}>GAME OVER</h2><p>SCORE: {score} | WAVE: {level}</p><p>Press ENTER to retry</p></div>}
    </div>
  )
}
