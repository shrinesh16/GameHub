"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { motion, useMotionValue, useSpring, useTransform, animate, MotionValue } from "framer-motion"
import { useShortcuts } from "@/hooks/use-shortcut"
import { useScrollSound } from "@/hooks/use-scroll-sound"
import { GAMES } from "@/lib/game-registry"

const IMAGES = [
  "https://cdn.cosmos.so/5689a5cd-92a5-4cb1-b014-263da4f55731?format=jpeg",
  "https://cdn.cosmos.so/c4588488-0021-4804-9c29-a43059378bfe?format=jpeg",
  "https://cdn.cosmos.so/de8c561b-e4e4-48f3-9068-30d63b92c43e?format=jpeg",
  "https://cdn.cosmos.so/207b3ba7-13ef-496b-a9cb-2a718e14a24e?format=jpeg",
  "https://cdn.cosmos.so/6c41e632-d300-4516-a7af-9a1f7c0aef94?format=jpeg",
  "https://cdn.cosmos.so/e552eaac-8251-4890-b954-e988fc4bf2e0?format=jpeg",
  "https://cdn.cosmos.so/5689a5cd-92a5-4cb1-b014-263da4f55731?format=jpeg",
]

const FRAME_OFFSET = -30
const FRAMES_VISIBLE_LENGTH = 3
const BUFFER_SIZE = 8 // Render 8 cards before and after visible range (increased for fast scrolling)

interface Card {
  index: number
  imageIndex: number
  gameIndex: number
}

import Link from "next/link"

function TimeMachineCard({
  card,
  smoothIndex,
  shouldImplementPreloading,
  currentIndex,
}: {
  card: Card
  smoothIndex: MotionValue<number>
  shouldImplementPreloading: boolean
  currentIndex: number
}) {
  const offsetIndex = useTransform(smoothIndex, (val) => card.index - val)
  const y = useTransform(offsetIndex, (offset) => 
    Math.max(FRAME_OFFSET * FRAMES_VISIBLE_LENGTH, offset * FRAME_OFFSET)
  )
  const scale = useTransform(offsetIndex, (offset) => 
    Math.min(2, Math.max(0.08, 1 - offset * 0.08))
  )
  const opacity = useTransform(offsetIndex, (offset) => 
    offset < 0 ? Math.max(0, 1 + offset) : 1
  )
  const blur = useTransform(offsetIndex, (offset) => 
    offset < 0 ? Math.min(10, -offset * 4) : 0
  )
  const filter = useTransform(blur, (b) => (b > 0 ? `blur(${b}px)` : "none"))

  const game = GAMES[card.gameIndex]
  const src = `/thumbnails/${game.id}.png`
  const image = <img alt="" src={src} className="w-full h-full object-contain" />

  const isActive = card.index === currentIndex

  return (
    <Link href={`/game/${game.id}`} passHref legacyBehavior>
      <motion.div
        className="absolute w-[85%] max-w-[480px] aspect-square bg-black shadow-2xl cursor-pointer"
        style={{
          willChange: "opacity, filter, transform",
          y, scale, opacity, filter,
          pointerEvents: isActive ? "auto" : "none",
          zIndex: 1000 - Math.abs(card.index - currentIndex),
        }}
      >
        {shouldImplementPreloading ? (
          <>{card.index - currentIndex < FRAMES_VISIBLE_LENGTH ? image : null}</>
        ) : ( image )}
      </motion.div>
    </Link>
  )
}

export default function TimeMachine({
  shouldImplementPreloading = false,
}: {
  shouldImplementPreloading?: boolean
}) {
  const router = useRouter()
  // Use continuous index that can go infinite in both directions
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const touchStartY = React.useRef(0)
  const snapTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const playTick = useScrollSound()

  const handlePlay = React.useCallback((gameId: string) => {
    router.push(`/game/${gameId}`)
  }, [router])

  const targetIndex = useMotionValue(0)
  const smoothIndex = useSpring(targetIndex, {
    stiffness: 120,
    damping: 25,
    mass: 0.5,
  })

  // Calculate which cards should be rendered (visible + buffer)
  const getVisibleCards = React.useCallback(() => {
    const start = currentIndex - BUFFER_SIZE
    const end = currentIndex + FRAMES_VISIBLE_LENGTH + BUFFER_SIZE
    const cards: Card[] = []

    for (let i = start; i <= end; i++) {
      cards.push({
        index: i,
        imageIndex: ((i % IMAGES.length) + IMAGES.length) % IMAGES.length,
        gameIndex: ((i % GAMES.length) + GAMES.length) % GAMES.length,
      })
    }

    return cards
  }, [currentIndex])

  const handleScroll = React.useCallback((deltaY: number) => {
    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current)
    }

    const sensitivity = 0.0035
    const newTarget = targetIndex.get() + deltaY * sensitivity
    targetIndex.set(newTarget)

    const newCenter = Math.round(newTarget)
    if (newCenter !== currentIndex) {
      setCurrentIndex(newCenter)
      playTick()
    }

    snapTimeoutRef.current = setTimeout(() => {
      const snapped = Math.round(targetIndex.get())
      animate(targetIndex, snapped, {
        type: "spring",
        stiffness: 180,
        damping: 25,
      })
      setCurrentIndex(snapped)
    }, 150)
  }, [currentIndex, targetIndex])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      handleScroll(e.deltaY)
    }

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touchY = e.touches[0].clientY
      const deltaY = touchStartY.current - touchY
      touchStartY.current = touchY

      handleScroll(deltaY * 1.5)
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    })
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    })

    return () => {
      container.removeEventListener("wheel", handleWheel)
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current)
      }
    }
  }, [handleScroll])

  useShortcuts({
    ArrowDown: () => {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
      
      const nextIndex = Math.round(targetIndex.get()) + 1
      animate(targetIndex, nextIndex, {
        type: "spring",
        stiffness: 180,
        damping: 25,
      })
      setCurrentIndex(nextIndex)
      playTick()
    },
    ArrowRight: () => {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
      
      const nextIndex = Math.round(targetIndex.get()) + 1
      animate(targetIndex, nextIndex, {
        type: "spring",
        stiffness: 180,
        damping: 25,
      })
      setCurrentIndex(nextIndex)
      playTick()
    },
    ArrowUp: () => {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
      
      const prevIndex = Math.round(targetIndex.get()) - 1
      animate(targetIndex, prevIndex, {
        type: "spring",
        stiffness: 180,
        damping: 25,
      })
      setCurrentIndex(prevIndex)
      playTick()
    },
    ArrowLeft: () => {
      if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
      
      const prevIndex = Math.round(targetIndex.get()) - 1
      animate(targetIndex, prevIndex, {
        type: "spring",
        stiffness: 180,
        damping: 25,
      })
      setCurrentIndex(prevIndex)
      playTick()
    },
    Enter: () => {
      const gameIdx = ((currentIndex % GAMES.length) + GAMES.length) % GAMES.length
      handlePlay(GAMES[gameIdx].id)
    },
  })

  const visibleCards = getVisibleCards()

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center">
        {visibleCards.map((card) => (
          <TimeMachineCard
            key={card.index}
            card={card}
            smoothIndex={smoothIndex}
            shouldImplementPreloading={shouldImplementPreloading}
            currentIndex={currentIndex}
          />
        ))}
      </div>
    </div>
  )
}
