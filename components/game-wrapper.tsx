"use client"

import React from "react"
import Link from "next/link"
import type { GameConfig } from "@/lib/game-registry"

export default function GameWrapper({
  game,
  children,
}: {
  game: GameConfig
  children: React.ReactNode
}) {
  return (
    <div className="game-cabinet">
      <div className="game-cabinet-header">
        <Link href="/" className="game-back-btn">← BACK</Link>
        <h1 className="game-title" style={{ color: game.color }}>
          <span className="game-icon">{game.icon}</span> {game.name}
        </h1>
        <div className="game-type-badge" style={{ borderColor: game.color, color: game.color }}>
          {game.type === 'infinite' ? '∞ ENDLESS' : '📊 LEVELS'}
        </div>
      </div>
      <div className="game-crt-frame">
        <div className="game-crt-screen">
          {children}
          <div className="scanlines" />
        </div>
      </div>
      <div className="game-controls-bar">
        {game.controls.map((c, i) => (
          <span key={i} className="game-control-hint">{c}</span>
        ))}
        <span className="game-control-hint">ENTER Start</span>
        <span className="game-control-hint">ESC Back</span>
      </div>
    </div>
  )
}
