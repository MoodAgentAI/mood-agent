/**
 * Token bucket rate limiter
 */

export class RateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number // tokens per second
  private lastRefill: number

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens
    this.tokens = maxTokens
    this.refillRate = refillRate
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000 // seconds
    const tokensToAdd = timePassed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  async acquire(tokens = 1): Promise<boolean> {
    this.refill()

    if (this.tokens >= tokens) {
      this.tokens -= tokens
      return true
    }

    return false
  }

  async waitForToken(tokens = 1): Promise<void> {
    while (!(await this.acquire(tokens))) {
      // Calculate wait time
      const tokensNeeded = tokens - this.tokens
      const waitMs = (tokensNeeded / this.refillRate) * 1000
      await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 1000)))
    }
  }

  getAvailableTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }
}
