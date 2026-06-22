"use client"
import React, { useRef, useEffect, useState, useCallback } from "react"
import { useRetroSound } from "@/hooks/use-game-engine"

const W = 360, H = 480, CELL = 24, COLS = 10, ROWS = 20
const SHAPES = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]],
]
const COLORS = ["#00ffff","#ffff00","#aa00ff","#0000ff","#ff8800","#00ff00","#ff0000"]

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<"menu"|"play"|"over">("menu")
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const keys = useRef<Set<string>>(new Set())
  const sfx = useRetroSound()
  const g = useRef({
    board: Array.from({length:ROWS},()=>Array(COLS).fill(0)) as number[][],
    piece: null as null|{shape:number[][],x:number,y:number,color:string},
    lastDrop: 0, dropSpeed: 800, lastInput: 0
  })

  const rotate = (shape: number[][]) => {
    const rows = shape.length, cols = shape[0].length
    return Array.from({length:cols},(_,c) => Array.from({length:rows},(_,r) => shape[rows-1-r][c]))
  }

  const fits = useCallback((shape: number[][], x: number, y: number) => {
    return shape.every((row, ry) => row.every((v, rx) => {
      if (!v) return true
      const bx = x+rx, by = y+ry
      return bx>=0 && bx<COLS && by<ROWS && (by<0||g.current.board[by][bx]===0)
    }))
  }, [])

  const spawnPiece = useCallback(() => {
    const i = Math.floor(Math.random()*SHAPES.length)
    const piece = {shape:SHAPES[i],x:Math.floor(COLS/2)-1,y:-1,color:COLORS[i]}
    if (!fits(piece.shape, piece.x, piece.y+1)) { setState("over"); sfx.die(); return }
    g.current.piece = piece
  }, [fits, sfx])

  const lockPiece = useCallback(() => {
    const p = g.current.piece; if(!p) return
    p.shape.forEach((row,ry) => row.forEach((v,rx) => {
      if(v && p.y+ry>=0) g.current.board[p.y+ry][p.x+rx] = p.color
    }))
    // Clear lines
    let cleared = 0
    g.current.board = g.current.board.filter(row => { if(row.every(v=>v!==0)){cleared++;return false} return true })
    while(g.current.board.length<ROWS) g.current.board.unshift(Array(COLS).fill(0))
    if(cleared) { sfx.score(); const pts = [0,100,300,500,800]; setScore(s=>s+pts[cleared]*level); setLines(l=>{const nl=l+cleared; if(Math.floor(nl/10)>Math.floor(l/10)){setLevel(lv=>{g.current.dropSpeed=Math.max(100,800-lv*80);return lv+1});sfx.levelUp()};return nl}) }
    spawnPiece()
  }, [spawnPiece, sfx, level])

  const startGame = useCallback(() => {
    g.current = { board:Array.from({length:ROWS},()=>Array(COLS).fill(0)), piece:null, lastDrop:0, dropSpeed:800, lastInput:0 }
    setScore(0); setLevel(1); setLines(0); spawnPiece(); setState("play")
  }, [spawnPiece])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.key)
      if(e.key==="Enter"&&state!=="play") startGame()
      if(state==="play"&&g.current.piece) {
        const p = g.current.piece
        if(e.key==="ArrowUp") { const r=rotate(p.shape); if(fits(r,p.x,p.y)){p.shape=r;sfx.move()} }
      }
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key)
    window.addEventListener("keydown", down); window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up) }
  }, [state, startGame, fits, sfx])

  useEffect(() => {
    if (state !== "play") return
    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!
    let anim: number
    const loop = (time: number) => {
      const gs = g.current; const p = gs.piece; if(!p){anim=requestAnimationFrame(loop);return}
      if(gs.lastDrop===0) gs.lastDrop=time
      if(gs.lastInput===0) gs.lastInput=time
      // Input
      if(time-gs.lastInput>80) {
        if(keys.current.has("ArrowLeft")&&fits(p.shape,p.x-1,p.y)){p.x--;gs.lastInput=time;sfx.move()}
        if(keys.current.has("ArrowRight")&&fits(p.shape,p.x+1,p.y)){p.x++;gs.lastInput=time;sfx.move()}
        if(keys.current.has("ArrowDown")&&fits(p.shape,p.x,p.y+1)){p.y++;gs.lastInput=time;setScore(s=>s+1)}
      }
      // Drop
      if(time-gs.lastDrop>gs.dropSpeed){gs.lastDrop=time;if(fits(p.shape,p.x,p.y+1))p.y++;else lockPiece()}
      // Render
      const ox=(W-COLS*CELL)/2
      ctx.fillStyle="#0a0a1a";ctx.fillRect(0,0,W,H)
      ctx.strokeStyle="#222";ctx.lineWidth=0.5
      for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(ox+x*CELL,0);ctx.lineTo(ox+x*CELL,H);ctx.stroke()}
      for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(ox,y*CELL);ctx.lineTo(ox+COLS*CELL,y*CELL);ctx.stroke()}
      // Board (rendered in original block colors)
      gs.board.forEach((row,ry)=>row.forEach((v,rx)=>{if(v !== 0){ctx.fillStyle=v.toString();ctx.fillRect(ox+rx*CELL+1,ry*CELL+1,CELL-2,CELL-2)}}))
      // Active piece
      p.shape.forEach((row,ry)=>row.forEach((v,rx)=>{if(v&&p.y+ry>=0){ctx.fillStyle=p.color;ctx.fillRect(ox+(p.x+rx)*CELL+1,(p.y+ry)*CELL+1,CELL-2,CELL-2)}}))
      // HUD
      ctx.fillStyle="#00b4d8";ctx.font="11px 'Press Start 2P',monospace"
      ctx.fillText(`SCORE ${score}`,10,18);ctx.fillText(`LVL ${level}`,W/2-30,18);ctx.fillText(`LINES ${lines}`,W-130,18)
      anim=requestAnimationFrame(loop)
    }
    anim=requestAnimationFrame(loop)
    return ()=>cancelAnimationFrame(anim)
  }, [state, score, level, lines, sfx, lockPiece, fits])

  return (
    <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",width:"100%",height:"100%"}}>
      <canvas ref={canvasRef} width={W} height={H} style={{imageRendering:"pixelated",maxWidth:"100%",maxHeight:"100%"}} />
      {state==="menu"&&<div className="game-overlay"><p className="game-overlay-icon">🟦</p><h2>TETRIS</h2><p>Press ENTER to start</p></div>}
      {state==="over"&&<div className="game-overlay"><h2 style={{color:"#ff0000"}}>GAME OVER</h2><p>SCORE: {score} | LINES: {lines}</p><p>Press ENTER to retry</p></div>}
    </div>
  )
}
