"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const LEVEL_CONFIG = [
  { cols: 8, rows: 8, mines: 10 },
  { cols: 10, rows: 10, mines: 15 },
  { cols: 12, rows: 12, mines: 25 },
  { cols: 14, rows: 14, mines: 40 },
  { cols: 16, rows: 16, mines: 55 },
]

export default function Minesweeper() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over"|"win">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [timer, setTimer] = useState(0)
  const [flagMode, setFlagMode] = useState(false)
  const sfx = useRetroSound()
  const g = useRef({
    board: [] as number[][], // -1 = mine, 0-8 = count
    revealed: [] as boolean[][],
    flagged: [] as boolean[][],
    cols: 8, rows: 8, mines: 10, firstClick: true,
    cellSize: 28
  })

  const initLevel = useCallback((lvl: number) => {
    const cfg = LEVEL_CONFIG[Math.min(lvl-1, LEVEL_CONFIG.length-1)]
    const {cols,rows,mines} = cfg
    const cellSize = Math.floor(Math.min(480/cols, 440/rows))
    g.current = {
      board: Array.from({length:rows},()=>Array(cols).fill(0)),
      revealed: Array.from({length:rows},()=>Array(cols).fill(false)),
      flagged: Array.from({length:rows},()=>Array(cols).fill(false)),
      cols,rows,mines,firstClick:true,cellSize
    }
  },[])

  const placeMines = useCallback((safeX: number, safeY: number) => {
    const gs = g.current
    let placed = 0
    while (placed < gs.mines) {
      const x = Math.floor(Math.random()*gs.cols)
      const y = Math.floor(Math.random()*gs.rows)
      if (gs.board[y][x]!==-1 && !(Math.abs(x-safeX)<=1&&Math.abs(y-safeY)<=1)) {
        gs.board[y][x] = -1; placed++
      }
    }
    // Count neighbors
    for(let y=0;y<gs.rows;y++) for(let x=0;x<gs.cols;x++) {
      if(gs.board[y][x]===-1)continue
      let count=0
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy
        if(nx>=0&&nx<gs.cols&&ny>=0&&ny<gs.rows&&gs.board[ny][nx]===-1) count++
      }
      gs.board[y][x]=count
    }
    gs.firstClick=false
  },[])

  const reveal = useCallback((x: number, y: number) => {
    const gs = g.current
    if(x<0||x>=gs.cols||y<0||y>=gs.rows||gs.revealed[y][x]||gs.flagged[y][x]) return
    gs.revealed[y][x]=true
    if(gs.board[y][x]===0){
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) reveal(x+dx,y+dy)
    }
  },[])

  const checkWin = useCallback(() => {
    const gs = g.current
    for(let y=0;y<gs.rows;y++) for(let x=0;x<gs.cols;x++){
      if(gs.board[y][x]!==-1&&!gs.revealed[y][x]) return false
    }
    return true
  },[])

  const startGame = useCallback(() => {
    setScore(0);setLevel(1);setTimer(0);initLevel(1);setState("play");setFlagMode(false)
  },[initLevel])

  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{if(e.key==="Enter"&&(state==="menu"||state==="over"||state==="win"))startGame()}
    window.addEventListener("keydown",down)
    return()=>window.removeEventListener("keydown",down)
  },[state,startGame])

  // Timer
  useEffect(()=>{
    if(state!=="play")return
    const iv=setInterval(()=>setTimer(t=>t+1),1000)
    return()=>clearInterval(iv)
  },[state])

  // Canvas click handling
  useEffect(()=>{
    if(state!=="play")return
    const canvas=canvasRef.current!
    const handleClick=(e: MouseEvent)=>{
      const rect=canvas.getBoundingClientRect()
      const scaleX=480/rect.width, scaleY=480/rect.height
      const gs=g.current
      const ox=(480-gs.cols*gs.cellSize)/2, oy=(480-gs.rows*gs.cellSize)/2+20
      const mx=(e.clientX-rect.left)*scaleX-ox, my=(e.clientY-rect.top)*scaleY-oy
      const cx=Math.floor(mx/gs.cellSize), cy=Math.floor(my/gs.cellSize)
      if(cx<0||cx>=gs.cols||cy<0||cy>=gs.rows)return
      const isFlag = e.button===2||e.ctrlKey||e.metaKey||flagMode
      if(isFlag){
        // Flag
        if(!gs.revealed[cy][cx]){gs.flagged[cy][cx]=!gs.flagged[cy][cx];sfx.tick()}
        return
      }
      if(gs.flagged[cy][cx])return
      if(gs.firstClick) placeMines(cx,cy)
      if(gs.board[cy][cx]===-1){
        // Boom!
        gs.revealed[cy][cx]=true;sfx.die();setState("over")
        // Reveal all mines
        for(let y=0;y<gs.rows;y++) for(let x=0;x<gs.cols;x++) if(gs.board[y][x]===-1) gs.revealed[y][x]=true
        return
      }
      reveal(cx,cy);sfx.move()
      if(checkWin()){
        sfx.levelUp();setScore(s=>s+Math.max(10,500-timer*2))
        setLevel(l=>{const nl=l+1;if(nl>LEVEL_CONFIG.length){setState("win");return l};initLevel(nl);return nl})
      }
    }
    const handleTouch=(e: TouchEvent)=>{
      e.preventDefault()
      const touch=e.touches[0]
      const mockEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        ctrlKey: false,
        metaKey: false,
      } as unknown as MouseEvent
      handleClick(mockEvent)
    }
    const prevent=(e:MouseEvent)=>e.preventDefault()
    canvas.addEventListener("mousedown",handleClick)
    canvas.addEventListener("touchstart",handleTouch,{passive:false})
    canvas.addEventListener("contextmenu",prevent)
    return()=>{
      canvas.removeEventListener("mousedown",handleClick)
      canvas.removeEventListener("touchstart",handleTouch)
      canvas.removeEventListener("contextmenu",prevent)
    }
  },[state,sfx,placeMines,reveal,checkWin,timer,initLevel,flagMode])

  // Render loop
  useEffect(()=>{
    const canvas=canvasRef.current!;const ctx=canvas.getContext("2d")!
    let anim:number
    const render=()=>{
      const gs=g.current
      const ox=(480-gs.cols*gs.cellSize)/2, oy=(480-gs.rows*gs.cellSize)/2+20
      ctx.fillStyle="#c0c0c0";ctx.fillRect(0,0,480,480)
      const numColors=["","#0000ff","#008000","#ff0000","#000080","#800000","#008080","#000","#808080"]
      for(let y=0;y<gs.rows;y++) for(let x=0;x<gs.cols;x++){
        const rx=ox+x*gs.cellSize, ry=oy+y*gs.cellSize, s=gs.cellSize
        if(gs.revealed[y][x]){
          ctx.fillStyle="#d0d0d0";ctx.fillRect(rx,ry,s,s)
          ctx.strokeStyle="#999";ctx.strokeRect(rx,ry,s,s)
          if(gs.board[y][x]===-1){ctx.fillStyle="#ff0000";ctx.beginPath();ctx.arc(rx+s/2,ry+s/2,s/3,0,Math.PI*2);ctx.fill()}
          else if(gs.board[y][x]>0){ctx.fillStyle=numColors[gs.board[y][x]];ctx.font=`${Math.floor(s*0.55)}px 'Press Start 2P',monospace`;ctx.textAlign="center";ctx.fillText(`${gs.board[y][x]}`,rx+s/2,ry+s*0.7);ctx.textAlign="left"}
        }else{
          ctx.fillStyle="#bbb";ctx.fillRect(rx,ry,s,s)
          ctx.fillStyle="#ddd";ctx.fillRect(rx,ry,s-2,s-2)
          ctx.fillStyle="#bbb";ctx.fillRect(rx+2,ry+2,s-4,s-4)
          if(gs.flagged[y][x]){ctx.fillStyle="#ff0000";ctx.font=`${Math.floor(s*0.5)}px serif`;ctx.textAlign="center";ctx.fillText("🚩",rx+s/2,ry+s*0.65);ctx.textAlign="left"}
        }
      }
      // HUD
      ctx.fillStyle="#000";ctx.font="12px 'Press Start 2P',monospace"
      ctx.fillText(`💣 ${gs.mines-gs.flagged.flat().filter(Boolean).length}`,10,18)
      ctx.fillText(`LVL ${level}`,200,18)
      ctx.fillText(`⏱ ${timer}s`,380,18)
      ctx.fillText(`SCORE ${score}`,10,480-6)
      anim=renderAnimationFrame()
    }
    const renderAnimationFrame=()=>{
      return requestAnimationFrame(render)
    }
    anim=renderAnimationFrame()
    return()=>cancelAnimationFrame(anim)
  },[level,timer,score,state])

  return(
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={480} height={480} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%",cursor:"pointer"}}/>
      {state==="play" && (
        <button
          onClick={() => setFlagMode(f=>!f)}
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            background: flagMode ? "#ff0000" : "#2d5a27",
            color: "#fff",
            border: "2px solid #fff",
            padding: "6px 10px",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "9px",
            cursor: "pointer",
            zIndex: 100,
            borderRadius: "4px",
            boxShadow: "0 0 6px rgba(0,0,0,0.5)"
          }}
        >
          {flagMode ? "🚩 MODE" : "⛏️ DIG MODE"}
        </button>
      )}
      {state==="menu"&&<div className="game-overlay"><p className="game-overlay-icon">💣</p><h2>MINESWEEPER</h2><p>Press ENTER to start</p></div>}
      {state==="over"&&<div className="game-overlay"><h2 style={{color:"#ff0000"}}>BOOM!</h2><p>SCORE: {score}</p><p>Press ENTER to retry</p></div>}
      {state==="win"&&<div className="game-overlay"><h2 style={{color:"#00ff00"}}>YOU WIN!</h2><p>SCORE: {score} | TIME: {timer}s</p><p>Press ENTER to play again</p></div>}
    </div>
  )
}
