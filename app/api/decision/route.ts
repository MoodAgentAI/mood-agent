import { NextResponse } from "next/server"
import Redis from "ioredis"

const redis = new Redis()

export async function GET() {
  try {
    const decisionData = await redis.get("policy:latest")

    if (!decisionData) {
      return NextResponse.json({ error: "No decision data available" }, { status: 404 })
    }

    return NextResponse.json(JSON.parse(decisionData))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
