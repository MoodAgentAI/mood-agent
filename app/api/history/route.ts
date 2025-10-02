import { NextResponse } from "next/server"
import Redis from "ioredis"

const redis = new Redis()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "mood"
    const hours = Number.parseInt(searchParams.get("hours") || "24")

    const endTime = Date.now()
    const startTime = endTime - hours * 60 * 60 * 1000

    const timeline = `${type}:timeline`
    const keys = await redis.zrangebyscore(timeline, startTime, endTime)

    const data = []
    for (const key of keys) {
      const value = await redis.get(key)
      if (value) {
        data.push(JSON.parse(value))
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
