"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MoodGaugeProps {
  zScore: number
  rawScore: number
  volume: number
}

export function MoodGauge({ zScore, rawScore, volume }: MoodGaugeProps) {
  const getMoodLabel = (z: number) => {
    if (z >= 1.5) return "Extreme FOMO"
    if (z >= 1.0) return "High FOMO"
    if (z >= 0.5) return "Bullish"
    if (z >= -0.5) return "Neutral"
    if (z >= -1.0) return "Bearish"
    if (z >= -1.5) return "High FUD"
    return "Extreme FUD"
  }

  const getMoodColor = (z: number) => {
    if (z >= 1.5) return "text-green-600"
    if (z >= 1.0) return "text-green-500"
    if (z >= 0.5) return "text-blue-500"
    if (z >= -0.5) return "text-muted-foreground"
    if (z >= -1.0) return "text-orange-500"
    if (z >= -1.5) return "text-red-500"
    return "text-red-600"
  }

  const getGaugeRotation = (z: number) => {
    // Map z-score (-3 to +3) to rotation (-90 to +90 degrees)
    const clampedZ = Math.max(-3, Math.min(3, z))
    return (clampedZ / 3) * 90
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Mood</CardTitle>
        <CardDescription>Real-time sentiment analysis</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6">
          {/* Gauge visualization */}
          <div className="relative w-48 h-24">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              {/* Background arc */}
              <path
                d="M 20 90 A 80 80 0 0 1 180 90"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-muted"
              />
              {/* Colored segments */}
              <path d="M 20 90 A 80 80 0 0 1 60 30" fill="none" stroke="#ef4444" strokeWidth="12" />
              <path d="M 60 30 A 80 80 0 0 1 100 10" fill="none" stroke="#f97316" strokeWidth="12" />
              <path d="M 100 10 A 80 80 0 0 1 140 30" fill="none" stroke="#3b82f6" strokeWidth="12" />
              <path d="M 140 30 A 80 80 0 0 1 180 90" fill="none" stroke="#22c55e" strokeWidth="12" />
              {/* Needle */}
              <line
                x1="100"
                y1="90"
                x2="100"
                y2="20"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-foreground"
                style={{
                  transformOrigin: "100px 90px",
                  transform: `rotate(${getGaugeRotation(zScore)}deg)`,
                  transition: "transform 0.5s ease-out",
                }}
              />
              {/* Center dot */}
              <circle cx="100" cy="90" r="6" fill="currentColor" className="text-foreground" />
            </svg>
          </div>

          {/* Mood label */}
          <div className="text-center">
            <div className={`text-3xl font-bold ${getMoodColor(zScore)}`}>{getMoodLabel(zScore)}</div>
            <div className="text-sm text-muted-foreground mt-2">Z-Score: {zScore.toFixed(2)}</div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="text-center">
              <div className="text-2xl font-bold">{rawScore.toFixed(3)}</div>
              <div className="text-xs text-muted-foreground">Raw Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{volume}</div>
              <div className="text-xs text-muted-foreground">Tweets Analyzed</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
