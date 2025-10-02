"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

interface MarketSignalsProps {
  price: number
  priceChange24h: number
  volume24h: number
  liquidity: number
  momentum: number
}

export function MarketSignals({ price, priceChange24h, volume24h, liquidity, momentum }: MarketSignalsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  const formatLarge = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return formatCurrency(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Signals</CardTitle>
        <CardDescription>Price and liquidity metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Price</span>
            </div>
            <div className="text-right">
              <div className="font-bold">{formatCurrency(price)}</div>
              <div
                className={`text-xs ${priceChange24h >= 0 ? "text-green-600" : "text-red-600"} flex items-center gap-1 justify-end`}
              >
                {priceChange24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(priceChange24h).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">24h Volume</span>
            <span className="font-bold">{formatLarge(volume24h)}</span>
          </div>

          {/* Liquidity */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Liquidity</span>
            <span className="font-bold">{formatLarge(liquidity)}</span>
          </div>

          {/* Momentum */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Momentum</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${momentum >= 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{
                    width: `${Math.min(Math.abs(momentum) * 1000, 100)}%`,
                  }}
                />
              </div>
              <span className={`text-sm font-bold ${momentum >= 0 ? "text-green-600" : "text-red-600"}`}>
                {momentum.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
