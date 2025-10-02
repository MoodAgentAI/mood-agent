/**
 * Tweet preprocessing and language detection
 */

import type { Tweet } from "@/lib/types"

export class TweetPreprocessor {
  private cryptoKeywords: Set<string>
  private emojiPattern: RegExp

  constructor() {
    this.cryptoKeywords = new Set([
      "pump",
      "dump",
      "dip",
      "burn",
      "ape",
      "exit liquidity",
      "ngmi",
      "wagmi",
      "rekt",
      "moon",
      "fud",
      "fomo",
      "hodl",
      "bullish",
      "bearish",
      "whale",
      "rug",
      "gem",
      "alpha",
      "gm",
      "ser",
      "anon",
      "degen",
      "based",
      "cope",
      "shill",
    ])

    // Emoji pattern for normalization
    this.emojiPattern =
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
  }

  /**
   * Clean and normalize tweet text
   */
  cleanText(text: string): string {
    let cleaned = text

    // Remove URLs
    cleaned = cleaned.replace(/https?:\/\/\S+/g, "")

    // Normalize mentions
    cleaned = cleaned.replace(/@\w+/g, "@USER")

    // Normalize hashtags (keep the word, remove #)
    cleaned = cleaned.replace(/#(\w+)/g, "$1")

    // Normalize emojis (replace with text representation)
    cleaned = this.normalizeEmojis(cleaned)

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, " ").trim()

    return cleaned
  }

  /**
   * Detect language (simple heuristic, can be replaced with fastText)
   */
  detectLanguage(text: string): string {
    // Simple heuristic: check for Turkish characters
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/
    if (turkishChars.test(text)) {
      return "tr"
    }

    // Default to English
    return "en"
  }

  /**
   * Extract crypto-specific features
   */
  extractCryptoFeatures(text: string): {
    hasCryptoKeywords: boolean
    keywordCount: number
    keywords: string[]
  } {
    const lowerText = text.toLowerCase()
    const foundKeywords: string[] = []

    for (const keyword of this.cryptoKeywords) {
      if (lowerText.includes(keyword)) {
        foundKeywords.push(keyword)
      }
    }

    return {
      hasCryptoKeywords: foundKeywords.length > 0,
      keywordCount: foundKeywords.length,
      keywords: foundKeywords,
    }
  }

  /**
   * Tokenize text for model input
   */
  tokenize(text: string): string[] {
    // Simple whitespace tokenization
    // In production, use SentencePiece or HuggingFace tokenizers
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((token) => token.length > 0)
  }

  /**
   * Normalize emojis to text
   */
  private normalizeEmojis(text: string): string {
    const emojiMap: { [key: string]: string } = {
      "🚀": "rocket",
      "📈": "chart_up",
      "📉": "chart_down",
      "💎": "diamond",
      "🙌": "hands",
      "🔥": "fire",
      "💰": "money",
      "🌙": "moon",
      "🐻": "bear",
      "🐂": "bull",
      "⚠️": "warning",
      "❌": "cross",
      "✅": "check",
    }

    return text.replace(this.emojiPattern, (emoji) => {
      return emojiMap[emoji] || ""
    })
  }

  /**
   * Detect potential bot accounts
   */
  detectBot(tweet: Tweet): boolean {
    // Simple heuristics for bot detection
    const text = tweet.text.toLowerCase()

    // Check for excessive hashtags
    const hashtagCount = tweet.entities?.hashtags?.length || 0
    if (hashtagCount > 5) return true

    // Check for spam patterns
    const spamPatterns = [/follow.*back/i, /dm.*for/i, /check.*bio/i, /link.*in.*bio/i, /giveaway/i]

    for (const pattern of spamPatterns) {
      if (pattern.test(text)) return true
    }

    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length
    if (capsRatio > 0.5 && text.length > 20) return true

    return false
  }

  /**
   * Calculate author weight based on metrics
   */
  calculateAuthorWeight(tweet: Tweet, userInfo?: any): number {
    let weight = 1.0

    // Verified users get higher weight
    if (userInfo?.verified) {
      weight *= 2.0
    }

    // Follower count influence (logarithmic scale)
    const followers = userInfo?.public_metrics?.followers_count || 0
    if (followers > 10000) {
      weight *= 1.5
    } else if (followers > 1000) {
      weight *= 1.2
    }

    // Engagement influence
    const engagement = tweet.metrics.likes + tweet.metrics.retweets
    if (engagement > 100) {
      weight *= 1.3
    } else if (engagement > 10) {
      weight *= 1.1
    }

    // Cap maximum weight
    return Math.min(weight, 5.0)
  }
}
