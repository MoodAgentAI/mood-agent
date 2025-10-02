import { NextResponse } from "next/server"
import Redis from "ioredis"

const redis = new Redis()

export async function GET() {
  try {
    const marketData = await redis.get("market:latest")

    if (!marketData) {
      return NextResponse.json({ error: "No market data available" }, { status: 404 })
    }

    return NextResponse.json(JSON.parse(marketData))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
