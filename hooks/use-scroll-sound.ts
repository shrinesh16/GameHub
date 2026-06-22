"use client"

import { useRef, useCallback } from "react"

/**
 * Generates a subtle, satisfying tick/click sound using the Web Audio API.
 * No external audio files needed.
 */
export function useScrollSound() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastPlayTime = useRef(0)

  const playTick = useCallback(() => {
    const now = Date.now()
    // Throttle: don't play more than ~15 sounds per second
    if (now - lastPlayTime.current < 65) return
    lastPlayTime.current = now

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const ctx = audioContextRef.current
      const currentTime = ctx.currentTime

      // Create a short, crisp tick sound
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Use a high-frequency sine wave for a clean tick
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(1800, currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(800, currentTime + 0.03)

      // Very short envelope for a snappy click
      gainNode.gain.setValueAtTime(0.08, currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.06)

      oscillator.start(currentTime)
      oscillator.stop(currentTime + 0.06)
    } catch {
      // Silently fail if audio is not supported
    }
  }, [])

  return playTick
}
