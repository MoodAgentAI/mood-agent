import { NextResponse } from "next/server"
import { RiskManager } from "@/services/policy/risk-manager"

const riskManager = new RiskManager()

export async function GET() {
  try {
    const metrics = await riskManager.getRiskMetrics()
    return NextResponse.json(metrics)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
