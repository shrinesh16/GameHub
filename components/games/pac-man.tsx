"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 480, H = 480, CELL = 24, COLS = 20, ROWS = 20

// Simple maze layout: 0=path, 1=wall
const BASE_MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,1,1,0,0,1,1,0,1,0,1,1,1,1],
  [0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,0,0,0,0,0,0,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,1,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

export default function PacMan() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const sfx = useRetroSound()
  const g = useRef({
    px:1,py:1,dir:{x:0,y:0},nextDir:{x:0,y:0},
    dots:[] as {x:number,y:number,power:boolean}[],
    ghosts:[] as {x:number,y:number,dx:number,dy:number,color:string,scared:boolean}[],
    scaredTimer:0, moveTimer:0, ghostSpeed:12, mouthOpen:true, mouthTimer:0,
    maze: BASE_MAZE.map(r=>[...r])
  })

  const initLevel = useCallback((lvl: number) => {
    const dots: typeof g.current.dots = []
    const maze = BASE_MAZE.map(r=>[...r])
    for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++) {
      if(maze[y][x]===0) {
        const power = (x===1&&y===1)||(x===18&&y===1)||(x===1&&y===18)||(x===18&&y===18)
        dots.push({x,y,power})
      }
    }
    const colors=["#ff0000","#ffb8ff","#00ffff","#ffb852"]
    const ghosts = colors.map((color,i)=>({x:8+i,y:9,dx:0,dy:0,color,scared:false}))
    g.current = {...g.current, px:1,py:3,dir:{x:0,y:0},nextDir:{x:0,y:0},dots,ghosts,
      scaredTimer:0,moveTimer:0,ghostSpeed:Math.max(4,12-lvl*2),maze}
  }, [])

  const startGame = useCallback(() => {
    setScore(0);setLevel(1);setLives(3);initLevel(1);setState("play")
  },[initLevel])

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(e.key==="Enter"&&state!=="play"){startGame();return}
      const d=g.current
      if(e.key==="ArrowUp")d.nextDir={x:0,y:-1}
      if(e.key==="ArrowDown")d.nextDir={x:0,y:1}
      if(e.key==="ArrowLeft")d.nextDir={x:-1,y:0}
      if(e.key==="ArrowRight")d.nextDir={x:1,y:0}
    }
    window.addEventListener("keydown",down)
    return()=>window.removeEventListener("keydown",down)
  },[state,startGame])

  useEffect(()=>{
    if(state!=="play")return
    const canvas=canvasRef.current!;const ctx=canvas.getContext("2d")!
    let anim:number
    const loop=()=>{
      const gs=g.current;gs.moveTimer++;gs.mouthTimer++
      if(gs.mouthTimer>6){gs.mouthOpen=!gs.mouthOpen;gs.mouthTimer=0}
      if(gs.moveTimer>6){
        gs.moveTimer=0
        // Try next dir
        const nd=gs.nextDir,nx=gs.px+nd.x,ny=gs.py+nd.y
        if(nd.x!==0||nd.y!==0){
          const wnx=((nx%COLS)+COLS)%COLS,wny=((ny%ROWS)+ROWS)%ROWS
          if(gs.maze[wny][wnx]===0){gs.dir=nd}
        }
        const cd=gs.dir,cx=gs.px+cd.x,cy=gs.py+cd.y
        const wcx=((cx%COLS)+COLS)%COLS,wcy=((cy%ROWS)+ROWS)%ROWS
        if(cd.x!==0||cd.y!==0){if(gs.maze[wcy][wcx]===0){gs.px=wcx;gs.py=wcy}}
        // Eat dots
        const di=gs.dots.findIndex(d=>d.x===gs.px&&d.y===gs.py)
        if(di>=0){
          const dot=gs.dots[di];gs.dots.splice(di,1)
          if(dot.power){gs.scaredTimer=200;gs.ghosts.forEach(gh=>gh.scared=true);sfx.score();setScore(s=>s+50)}
          else{sfx.tick();setScore(s=>s+10)}
        }
        // Scared timer
        if(gs.scaredTimer>0){gs.scaredTimer--;if(gs.scaredTimer===0)gs.ghosts.forEach(gh=>gh.scared=false)}
      }
      // Move ghosts: speed scales nicely with level, slower at L1 (moves every 8 frames instead of 6)
      if(!gs.gMoveTimer) gs.gMoveTimer = 0
      gs.gMoveTimer++
      const gSpeed = Math.max(5, 9 - level)
      if(gs.gMoveTimer >= gSpeed){
        gs.gMoveTimer = 0
        gs.ghosts.forEach(gh=>{
          const dirs=[{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}]
          let valid=dirs.filter(d=>{const nx=((gh.x+d.x)%COLS+COLS)%COLS,ny=((gh.y+d.y)%ROWS+ROWS)%ROWS;return gs.maze[ny][nx]===0&&!(d.x===-gh.dx&&d.y===-gh.dy)})
          if(valid.length===0){
            // Allow going backward if in a dead end/corridor and no other choice
            valid=dirs.filter(d=>{const nx=((gh.x+d.x)%COLS+COLS)%COLS,ny=((gh.y+d.y)%ROWS+ROWS)%ROWS;return gs.maze[ny][nx]===0})
          }
          if(valid.length){
            let chosen:typeof dirs[0]
            if(gh.scared){chosen=valid[Math.floor(Math.random()*valid.length)]}
            else{chosen=valid.reduce((best,d)=>{const nx=gh.x+d.x,ny=gh.y+d.y;const dist=Math.abs(nx-gs.px)+Math.abs(ny-gs.py);const bd=Math.abs(gh.x+best.x-gs.px)+Math.abs(gh.y+best.y-gs.py);return dist<bd?d:best})}
            gh.dx=chosen.x;gh.dy=chosen.y
            gh.x=((gh.x+chosen.x)%COLS+COLS)%COLS;gh.y=((gh.y+chosen.y)%ROWS+ROWS)%ROWS
          }
          // Collision with pacman
          if(gh.x===gs.px&&gh.y===gs.py){
            if(gh.scared){gh.x=9;gh.y=9;gh.scared=false;sfx.hit();setScore(s=>s+200)}
            else{
              sfx.die()
              setLives(l=>{
                if(l<=1){setState("over");return 0}
                gs.px=1;gs.py=3;gs.dir={x:0,y:0};gs.nextDir={x:0,y:0}
                // Reset ghosts to prevent instant-spawn trap death
                const colors=["#ff0000","#ffb8ff","#00ffff","#ffb852"]
                gs.ghosts = colors.map((color,i)=>({x:8+i,y:9,dx:0,dy:0,color,scared:false}))
                return l-1
              })
            }
          }
        })
      }
      // Level complete
      if(gs.dots.length===0){sfx.levelUp();setLevel(l=>{const nl=l+1;initLevel(nl);return nl})}
      // Render
      ctx.fillStyle="#000";ctx.fillRect(0,0,W,H)
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        if(gs.maze[y][x]===1){ctx.fillStyle="#1919a6";ctx.fillRect(x*CELL,y*CELL,CELL,CELL)
          ctx.fillStyle="#2929d6";ctx.fillRect(x*CELL+2,y*CELL+2,CELL-4,CELL-4)}
      }
      gs.dots.forEach(d=>{
        if(d.power){ctx.fillStyle="#ffb8ff";ctx.beginPath();ctx.arc(d.x*CELL+CELL/2,d.y*CELL+CELL/2,5,0,Math.PI*2);ctx.fill()}
        else{ctx.fillStyle="#ffb852";ctx.fillRect(d.x*CELL+10,d.y*CELL+10,4,4)}
      })
      // Pacman
      ctx.fillStyle="#ffff00";ctx.beginPath()
      const pcx=gs.px*CELL+CELL/2,pcy=gs.py*CELL+CELL/2
      if(gs.mouthOpen){
        let angle=0;if(gs.dir.x===1)angle=0;if(gs.dir.x===-1)angle=Math.PI;if(gs.dir.y===-1)angle=-Math.PI/2;if(gs.dir.y===1)angle=Math.PI/2
        ctx.arc(pcx,pcy,10,angle+0.3,angle+Math.PI*2-0.3);ctx.lineTo(pcx,pcy)
      }else{ctx.arc(pcx,pcy,10,0,Math.PI*2)}
      ctx.fill()
      // Ghosts
      gs.ghosts.forEach(gh=>{
        ctx.fillStyle=gh.scared?"#2121de":gh.color
        ctx.fillRect(gh.x*CELL+2,gh.y*CELL+2,CELL-4,CELL-6)
        ctx.beginPath();ctx.arc(gh.x*CELL+CELL/2,gh.y*CELL+6,9,Math.PI,0);ctx.fill()
        // Eyes
        ctx.fillStyle="#fff";ctx.fillRect(gh.x*CELL+7,gh.y*CELL+6,5,5);ctx.fillRect(gh.x*CELL+14,gh.y*CELL+6,5,5)
        ctx.fillStyle="#00f";ctx.fillRect(gh.x*CELL+9,gh.y*CELL+8,2,2);ctx.fillRect(gh.x*CELL+16,gh.y*CELL+8,2,2)
      })
      // HUD
      ctx.fillStyle="#fff";ctx.font="11px 'Press Start 2P',monospace"
      ctx.fillText(`SCORE ${score}`,10,H-6);ctx.fillText(`LVL ${level}`,W/2-30,H-6);ctx.fillText(`♥`.repeat(lives),W-80,H-6)
      anim=requestAnimationFrame(loop)
    }
    anim=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(anim)
  },[state,score,level,lives,sfx,initLevel])

  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}}/>
      {state==="menu"&&<div className="game-overlay"><p className="game-overlay-icon">🟡</p><h2>PAC-MAN</h2><p>Press ENTER to start</p></div>}
      {state==="over"&&<div className="game-overlay"><h2 style={{color:"#ff0000"}}>GAME OVER</h2><p>SCORE: {score} | LEVEL: {level}</p><p>Press ENTER to retry</p></div>}
    </div>
  )
}
