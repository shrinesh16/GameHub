"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { GAMES } from "@/lib/game-registry"
import GameWrapper from "@/components/game-wrapper"
import dynamic from "next/dynamic"

const GAME_COMPONENTS: Record<string, React.ComponentType> = {
  "space-invaders": dynamic(() => import("@/components/games/space-invaders"), { ssr: false }),
  "pac-man": dynamic(() => import("@/components/games/pac-man"), { ssr: false }),
  "breakout": dynamic(() => import("@/components/games/breakout"), { ssr: false }),
  "snake": dynamic(() => import("@/components/games/snake"), { ssr: false }),
  "tetris": dynamic(() => import("@/components/games/tetris"), { ssr: false }),
  "flappy-bird": dynamic(() => import("@/components/games/flappy-bird"), { ssr: false }),
  "dino-run": dynamic(() => import("@/components/games/dino-run"), { ssr: false }),
  "asteroids": dynamic(() => import("@/components/games/asteroids"), { ssr: false }),
  "frogger": dynamic(() => import("@/components/games/frogger"), { ssr: false }),
  "minesweeper": dynamic(() => import("@/components/games/minesweeper"), { ssr: false }),
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const game = GAMES.find((g) => g.id === id)
  const GameComponent = GAME_COMPONENTS[id]

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push("/")
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [router])

  if (!game || !GameComponent) {
    return (
      <div className="game-cabinet" style={{ justifyContent: "center" }}>
        <h1 style={{ color: "#ff0000", fontFamily: "'Press Start 2P'" }}>GAME NOT FOUND</h1>
        <button onClick={() => router.push("/")} style={{ color: "#fff", marginTop: 20, cursor: "pointer", background: "none", border: "1px solid #fff", padding: "8px 16px", fontFamily: "'Press Start 2P'", fontSize: 10 }}>
          ← BACK TO HUB
        </button>
      </div>
    )
  }

  return (
    <GameWrapper game={game}>
      <GameComponent />
    </GameWrapper>
  )
}
