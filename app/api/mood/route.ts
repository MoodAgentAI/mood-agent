import { NextResponse } from "next/server"
import Redis from "ioredis"

const redis = new Redis()

export async function GET() {
  try {
    const moodData = await redis.get("mood:latest")

    if (!moodData) {
      return NextResponse.json({ error: "No mood data available" }, { status: 404 })
    }

    return NextResponse.json(JSON.parse(moodData))
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
