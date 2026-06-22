"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 480, H = 480, CELL = 32, COLS = 15, ROWS = 15
const ROAD_ROWS = [2,3,4,5,6]
const WATER_ROWS = [8,9,10,11,12]
const SAFE_ROWS = [0,7,14]

export default function Frogger() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const sfx = useRetroSound()
  const g = useRef({
    fx: 7, fy: 14,
    lanes: [] as {row:number,items:{x:number,w:number}[],speed:number,type:string}[],
    frame: 0, moveCD: 0
  })

  const initLevel = useCallback((lvl: number) => {
    const lanes: typeof g.current.lanes = []
    const sp = 0.5 + lvl * 0.2
    // Roads
    ROAD_ROWS.forEach((r,i)=>{
      const dir = i%2===0?1:-1; const speed = (1+i*0.3)*sp*dir
      const items: {x:number,w:number}[] = []
      for(let j=0;j<3+Math.floor(lvl/2);j++) items.push({x:j*(W/(2+Math.floor(lvl/2)))+Math.random()*40,w:40+Math.random()*30})
      lanes.push({row:r,items,speed,type:"road"})
    })
    // Water (logs)
    WATER_ROWS.forEach((r,i)=>{
      const dir = i%2===0?-1:1; const speed = (0.6+i*0.2)*sp*dir
      const items: {x:number,w:number}[] = []
      for(let j=0;j<2+Math.floor(lvl/3);j++) items.push({x:j*(W/(1+Math.floor(lvl/3)))+Math.random()*60,w:64+Math.random()*40})
      lanes.push({row:r,items,speed,type:"water"})
    })
    g.current = {
      ...g.current,
      fx: 7,
      fy: 14,
      lanes,
      frame: 0
    }
    // Set pixel positions (stores actual float positions to prevent precision loss)
    g.current.fpx = 7 * CELL
    g.current.fpy = 14 * CELL
  },[])

  const startGame = useCallback(() => {
    setScore(0);setLevel(1);setLives(3);initLevel(1);setState("play")
  },[initLevel])

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(e.key==="Enter"&&state!=="play"){startGame();return}
      if(state!=="play"||g.current.moveCD>0)return
      const gs=g.current
      if(e.key==="ArrowUp"&&gs.fpy>0){gs.fpy-=CELL;gs.moveCD=6;sfx.move();setScore(s=>s+10)}
      if(e.key==="ArrowDown"&&gs.fpy<14*CELL){gs.fpy+=CELL;gs.moveCD=6;sfx.move()}
      if(e.key==="ArrowLeft"&&gs.fpx>0){gs.fpx-=CELL;gs.moveCD=6;sfx.move()}
      if(e.key==="ArrowRight"&&gs.fpx<W-CELL){gs.fpx+=CELL;gs.moveCD=6;sfx.move()}
    }
    window.addEventListener("keydown",down)
    return()=>window.removeEventListener("keydown",down)
  },[state,startGame,sfx])

  useEffect(()=>{
    if(state!=="play")return
    const canvas=canvasRef.current!;const ctx=canvas.getContext("2d")!
    let anim:number
    const loop=()=>{
      const gs=g.current;gs.frame++
      if(gs.moveCD>0)gs.moveCD--
      let frogPixelX=gs.fpx
      // Move items
      gs.lanes.forEach(lane=>{
        lane.items.forEach(item=>{
          item.x+=lane.speed
          if(item.x>W+20)item.x=-item.w-20
          if(item.x<-item.w-20)item.x=W+20
        })
      })
      // Check collisions
      let dead=false
      const frogCX=frogPixelX+CELL/2, frogCY=gs.fpy+CELL/2
      // Road lanes
      gs.lanes.filter(l=>l.type==="road").forEach(lane=>{
        if(lane.row * CELL===gs.fpy){
          lane.items.forEach(item=>{
            if(frogCX>item.x-4&&frogCX<item.x+item.w+4) dead=true
          })
        }
      })
      // Water lanes
      gs.lanes.filter(l=>l.type==="water").forEach(lane=>{
        if(lane.row * CELL===gs.fpy){
          let onLog=false
          lane.items.forEach(item=>{
            if(frogCX>item.x&&frogCX<item.x+item.w){onLog=true;frogPixelX+=lane.speed}
          })
          if(!onLog) dead=true
        }
      })
      if(frogPixelX<0||frogPixelX>W-CELL) dead=true
      gs.fpx=frogPixelX
      gs.fx=Math.round(frogPixelX/CELL)
      gs.fy=Math.round(gs.fpy/CELL)
      if(dead){
        sfx.die()
        setLives(l=>{
          if(l<=1){setState("over");return 0}
          gs.fpx=7*CELL;gs.fpy=14*CELL;gs.fx=7;gs.fy=14
          return l-1
        })
      }
      // Reached top
      if(gs.fpy===0){sfx.levelUp();setScore(s=>s+100);setLevel(l=>{const nl=l+1;initLevel(nl);return nl})}
      // Render
      ctx.fillStyle="#1a1a2e";ctx.fillRect(0,0,W,H)
      // Safe zones
      SAFE_ROWS.forEach(r=>{ctx.fillStyle="#2d5a27";ctx.fillRect(0,r*CELL,W,CELL)})
      // Road
      ROAD_ROWS.forEach(r=>{ctx.fillStyle="#333";ctx.fillRect(0,r*CELL,W,CELL);ctx.strokeStyle="#555";ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(0,r*CELL+CELL/2);ctx.lineTo(W,r*CELL+CELL/2);ctx.stroke();ctx.setLineDash([])})
      // Water
      WATER_ROWS.forEach(r=>{ctx.fillStyle="#0a3d6b";ctx.fillRect(0,r*CELL,W,CELL)})
      // Items
      gs.lanes.forEach(lane=>{
        lane.items.forEach(item=>{
          if(lane.type==="road"){
            ctx.fillStyle=["#ff0000","#ffff00","#0088ff","#ff6600","#ffffff"][lane.row%5]
            ctx.fillRect(item.x,lane.row*CELL+4,item.w,CELL-8)
            ctx.fillStyle="#111";ctx.fillRect(item.x+4,lane.row*CELL+8,item.w-8,CELL-16)
          }else{
            ctx.fillStyle="#8B4513";ctx.fillRect(item.x,lane.row*CELL+4,item.w,CELL-8)
            ctx.fillStyle="#A0522D";ctx.fillRect(item.x+2,lane.row*CELL+6,item.w-4,CELL-12)
          }
        })
      })
      // Frog
      ctx.fillStyle="#2dc653"
      ctx.fillRect(gs.fx*CELL+4,gs.fy*CELL+4,CELL-8,CELL-8)
      ctx.fillStyle="#1a8a3a"
      ctx.fillRect(gs.fx*CELL+8,gs.fy*CELL+6,4,3);ctx.fillRect(gs.fx*CELL+CELL-14,gs.fy*CELL+6,4,3)
      // HUD
      ctx.fillStyle="#2dc653";ctx.font="11px 'Press Start 2P',monospace"
      ctx.fillText(`SCORE ${score}`,10,H-6);ctx.fillText(`LVL ${level}`,W/2-30,H-6);ctx.fillText(`♥`.repeat(lives),W-80,H-6)
      anim=requestAnimationFrame(loop)
    }
    anim=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(anim)
  },[state,score,level,lives,sfx,initLevel])

  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}}/>
      {state==="menu"&&<div className="game-overlay"><p className="game-overlay-icon">🐸</p><h2>FROGGER</h2><p>Press ENTER to start</p></div>}
      {state==="over"&&<div className="game-overlay"><h2 style={{color:"#ff0000"}}>GAME OVER</h2><p>SCORE: {score} | LEVEL: {level}</p><p>Press ENTER to retry</p></div>}
    </div>
  )
}
