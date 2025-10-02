/**
 * Mathematical utilities for signal processing
 */

export class MovingAverage {
  private values: number[] = []
  private window: number

  constructor(window: number) {
    this.window = window
  }

  add(value: number): number {
    this.values.push(value)
    if (this.values.length > this.window) {
      this.values.shift()
    }
    return this.calculate()
  }

  calculate(): number {
    if (this.values.length === 0) return 0
    const sum = this.values.reduce((acc, val) => acc + val, 0)
    return sum / this.values.length
  }

  reset(): void {
    this.values = []
  }
}

export class ExponentialMovingAverage {
  private ema: number | null = null
  private alpha: number

  constructor(window: number) {
    // Standard EMA smoothing factor
    this.alpha = 2 / (window + 1)
  }

  add(value: number): number {
    if (this.ema === null) {
      this.ema = value
    } else {
      this.ema = this.alpha * value + (1 - this.alpha) * this.ema
    }
    return this.ema
  }

  get value(): number {
    return this.ema ?? 0
  }

  reset(): void {
    this.ema = null
  }
}

export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0
  return (value - mean) / stdDev
}

export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((acc, val) => acc + val, 0) / values.length
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2))
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
  return Math.sqrt(variance)
}

export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((acc, val) => acc + val, 0) / values.length
}

export function detectCrossover(fastValues: number[], slowValues: number[]): "up" | "down" | "none" {
  if (fastValues.length < 2 || slowValues.length < 2) return "none"

  const fastPrev = fastValues[fastValues.length - 2]
  const fastCurr = fastValues[fastValues.length - 1]
  const slowPrev = slowValues[slowValues.length - 2]
  const slowCurr = slowValues[slowValues.length - 1]

  const wasBelowNowAbove = fastPrev <= slowPrev && fastCurr > slowCurr
  const wasAboveNowBelow = fastPrev >= slowPrev && fastCurr < slowCurr

  if (wasBelowNowAbove) return "up"
  if (wasAboveNowBelow) return "down"
  return "none"
}
