"use client"

import React, { useRef, useCallback } from "react"

/** Retro sound generator using Web Audio API */
export function useRetroSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    return ctxRef.current
  }, [])

  const play = useCallback((freq: number, duration: number, type: OscillatorType = "square", vol = 0.08) => {
    try {
      const ctx = getCtx()
      const t = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = type
      osc.frequency.setValueAtTime(freq, t)
      gain.gain.setValueAtTime(vol, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
      osc.start(t)
      osc.stop(t + duration)
    } catch {}
  }, [getCtx])

  return {
    shoot: () => play(880, 0.1, "square"),
    hit: () => play(220, 0.15, "square"),
    score: () => { play(523, 0.08); setTimeout(() => play(659, 0.08), 80); setTimeout(() => play(784, 0.12), 160) },
    die: () => { play(200, 0.3, "sawtooth", 0.1); setTimeout(() => play(150, 0.4, "sawtooth", 0.08), 200) },
    levelUp: () => { play(523, 0.1); setTimeout(() => play(659, 0.1), 100); setTimeout(() => play(784, 0.1), 200); setTimeout(() => play(1047, 0.2), 300) },
    move: () => play(440, 0.03, "sine", 0.03),
    drop: () => play(100, 0.2, "triangle"),
    tick: () => play(1200, 0.02, "sine", 0.04),
  }
}
