"use client"
import useSWR from "swr"
import { MoodGauge } from "@/components/mood-gauge"
import { MarketSignals } from "@/components/market-signals"
import { DecisionPanel } from "@/components/decision-panel"
import { RiskMetrics } from "@/components/risk-metrics"
import { branding } from "@/lib/config"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function Dashboard() {
  const { data: mood } = useSWR("/api/mood", fetcher, { refreshInterval: 5000 })
  const { data: market } = useSWR("/api/market", fetcher, { refreshInterval: 5000 })
  const { data: decision } = useSWR("/api/decision", fetcher, { refreshInterval: 5000 })
  const { data: risk } = useSWR("/api/risk", fetcher, { refreshInterval: 5000 })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{branding.name}</h1>
              <p className="text-sm text-muted-foreground">{branding.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={branding.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {branding.twitterHandle}
              </a>
              <a
                href={branding.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                moodagent.dev
              </a>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mood Gauge */}
          {mood && <MoodGauge zScore={mood.zScore} rawScore={mood.rawScore} volume={mood.volume} />}

          {/* Market Signals */}
          {market && (
            <MarketSignals
              price={market.price}
              priceChange24h={market.priceChange24h}
              volume24h={market.volume24h}
              liquidity={market.liquidity}
              momentum={market.momentum}
            />
          )}

          {/* Decision Panel */}
          {decision && (
            <DecisionPanel
              action={decision.action}
              reason={decision.reason}
              timestamp={decision.timestamp}
              signals={decision.signals}
              executionParams={decision.executionParams}
            />
          )}

          {/* Risk Metrics */}
          {risk && (
            <RiskMetrics
              dailySpent={risk.dailySpent}
              treasuryBalance={risk.treasuryBalance}
              consecutiveLosses={risk.consecutiveLosses}
              killSwitchActive={risk.killSwitchActive}
            />
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 border border-orange-500 rounded-lg bg-orange-500/10">
          <div className="flex items-start gap-3">
            <div className="text-orange-500 mt-0.5">⚠️</div>
            <div className="text-sm">
              <div className="font-bold text-orange-500 mb-1">Risk Disclosure</div>
              <p className="text-muted-foreground">
                This is an autonomous AI trading system. All operations are automated based on sentiment analysis and
                market signals. Past performance does not guarantee future results. Use at your own risk.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
