"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle, Clock, Flame } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface DecisionPanelProps {
  action: string
  reason: string
  timestamp: string
  signals: {
    moodZScore: number
    priceMomentum: number
    liquidityOk: boolean
  }
  executionParams?: {
    size?: number
    maxSlippage?: number
  }
}

export function DecisionPanel({ action, reason, timestamp, signals, executionParams }: DecisionPanelProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case "BUYBACK":
        return <CheckCircle className="h-5 w-5" />
      case "BURN":
        return <Flame className="h-5 w-5" />
      case "HODL_TREASURY":
        return <Clock className="h-5 w-5" />
      default:
        return <AlertCircle className="h-5 w-5" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "BUYBACK":
        return "bg-green-500"
      case "BURN":
        return "bg-orange-500"
      case "HODL_TREASURY":
        return "bg-blue-500"
      default:
        return "bg-muted"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest Decision</CardTitle>
        <CardDescription>Automated policy engine output</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Action */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getActionColor(action)} text-white`}>{getActionIcon(action)}</div>
            <div>
              <div className="font-bold text-lg">{action.replace("_", " ")}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Reasoning</div>
            <div className="text-sm text-muted-foreground">{reason}</div>
          </div>

          {/* Signals */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Signal Analysis</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Mood Z</div>
                <div className="font-bold">{signals.moodZScore.toFixed(2)}</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Momentum</div>
                <div className="font-bold">{signals.priceMomentum.toFixed(3)}</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Liquidity</div>
                <Badge variant={signals.liquidityOk ? "default" : "destructive"}>
                  {signals.liquidityOk ? "OK" : "Low"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Execution params */}
          {executionParams && executionParams.size && (
            <div className="p-3 border rounded-lg">
              <div className="text-sm font-medium mb-2">Execution Parameters</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-bold">${executionParams.size.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Slippage</span>
                  <span className="font-bold">{executionParams.maxSlippage}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
