"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield } from "lucide-react"

interface RiskMetricsProps {
  dailySpent: number
  treasuryBalance: number
  consecutiveLosses: number
  killSwitchActive: boolean
}

export function RiskMetrics({ dailySpent, treasuryBalance, consecutiveLosses, killSwitchActive }: RiskMetricsProps) {
  const maxDailySpend = treasuryBalance * 0.05 // 5% limit
  const spendPercentage = maxDailySpend > 0 ? (dailySpent / maxDailySpend) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Management
        </CardTitle>
        <CardDescription>Safety limits and controls</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Kill Switch */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${killSwitchActive ? "text-red-600" : "text-green-600"}`} />
              <span className="text-sm font-medium">Kill Switch</span>
            </div>
            <Badge variant={killSwitchActive ? "destructive" : "default"}>
              {killSwitchActive ? "ACTIVE" : "Inactive"}
            </Badge>
          </div>

          {/* Treasury Balance */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Treasury Balance</span>
              <span className="font-bold">${treasuryBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Daily Spend */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Daily Spend</span>
              <span className="font-bold">
                ${dailySpent.toFixed(2)} / ${maxDailySpend.toFixed(2)}
              </span>
            </div>
            <Progress value={spendPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1">{spendPercentage.toFixed(1)}% of daily limit</div>
          </div>

          {/* Consecutive Losses */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Consecutive Losses</span>
            <Badge variant={consecutiveLosses >= 2 ? "destructive" : "secondary"}>{consecutiveLosses} / 3</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
