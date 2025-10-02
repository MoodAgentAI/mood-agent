/**
 * Crypto-specific sentiment lexicon with pattern matching
 */

export interface LexiconEntry {
  term: string
  sentiment: number // -1 to +1
  weight: number // importance multiplier
  category: "fomo" | "fud" | "neutral" | "bullish" | "bearish"
}

export class CryptoLexicon {
  private entries: Map<string, LexiconEntry>
  private patterns: Array<{ regex: RegExp; entry: LexiconEntry }>

  constructor() {
    this.entries = new Map()
    this.patterns = []
    this.initializeLexicon()
  }

  private initializeLexicon(): void {
    const lexiconData: LexiconEntry[] = [
      // Bullish/FOMO terms
      { term: "moon", sentiment: 0.8, weight: 1.5, category: "fomo" },
      { term: "pump", sentiment: 0.7, weight: 1.3, category: "bullish" },
      { term: "bullish", sentiment: 0.8, weight: 1.4, category: "bullish" },
      { term: "gem", sentiment: 0.9, weight: 1.6, category: "fomo" },
      { term: "alpha", sentiment: 0.7, weight: 1.3, category: "fomo" },
      { term: "wagmi", sentiment: 0.8, weight: 1.2, category: "fomo" },
      { term: "lfg", sentiment: 0.9, weight: 1.4, category: "fomo" },
      { term: "rocket", sentiment: 0.8, weight: 1.3, category: "bullish" },
      { term: "chart_up", sentiment: 0.7, weight: 1.2, category: "bullish" },
      { term: "diamond", sentiment: 0.6, weight: 1.1, category: "bullish" },
      { term: "hands", sentiment: 0.6, weight: 1.1, category: "bullish" },
      { term: "hodl", sentiment: 0.5, weight: 1.0, category: "bullish" },
      { term: "buy", sentiment: 0.6, weight: 1.2, category: "bullish" },
      { term: "accumulate", sentiment: 0.7, weight: 1.3, category: "bullish" },
      { term: "breakout", sentiment: 0.8, weight: 1.4, category: "bullish" },

      // Bearish/FUD terms
      { term: "dump", sentiment: -0.8, weight: 1.5, category: "fud" },
      { term: "crash", sentiment: -0.9, weight: 1.6, category: "fud" },
      { term: "rekt", sentiment: -0.8, weight: 1.4, category: "fud" },
      { term: "ngmi", sentiment: -0.7, weight: 1.3, category: "fud" },
      { term: "rug", sentiment: -0.9, weight: 1.7, category: "fud" },
      { term: "scam", sentiment: -0.9, weight: 1.8, category: "fud" },
      { term: "bearish", sentiment: -0.7, weight: 1.3, category: "bearish" },
      { term: "dip", sentiment: -0.5, weight: 1.0, category: "bearish" },
      { term: "fud", sentiment: -0.6, weight: 1.2, category: "fud" },
      { term: "sell", sentiment: -0.6, weight: 1.2, category: "bearish" },
      { term: "exit liquidity", sentiment: -0.8, weight: 1.5, category: "fud" },
      { term: "chart_down", sentiment: -0.7, weight: 1.2, category: "bearish" },
      { term: "warning", sentiment: -0.5, weight: 1.1, category: "fud" },
      { term: "bear", sentiment: -0.6, weight: 1.1, category: "bearish" },
      { term: "breakdown", sentiment: -0.7, weight: 1.3, category: "bearish" },

      // Neutral but relevant
      { term: "ape", sentiment: 0.3, weight: 1.0, category: "neutral" },
      { term: "degen", sentiment: 0.2, weight: 0.9, category: "neutral" },
      { term: "gm", sentiment: 0.1, weight: 0.5, category: "neutral" },
      { term: "ser", sentiment: 0.0, weight: 0.5, category: "neutral" },
      { term: "anon", sentiment: 0.0, weight: 0.5, category: "neutral" },
    ]

    // Add to map
    for (const entry of lexiconData) {
      this.entries.set(entry.term.toLowerCase(), entry)
    }

    // Add pattern-based rules
    this.patterns = [
      {
        regex: /to\s+the\s+moon/i,
        entry: { term: "to the moon", sentiment: 0.9, weight: 1.5, category: "fomo" },
      },
      {
        regex: /all\s+in/i,
        entry: { term: "all in", sentiment: 0.7, weight: 1.3, category: "fomo" },
      },
      {
        regex: /buy\s+the\s+dip/i,
        entry: { term: "buy the dip", sentiment: 0.6, weight: 1.2, category: "bullish" },
      },
      {
        regex: /rug\s+pull/i,
        entry: { term: "rug pull", sentiment: -0.9, weight: 1.7, category: "fud" },
      },
      {
        regex: /exit\s+scam/i,
        entry: { term: "exit scam", sentiment: -0.9, weight: 1.8, category: "fud" },
      },
    ]
  }

  /**
   * Analyze text and return sentiment scores
   */
  analyze(text: string): {
    sentiment: number
    confidence: number
    fomo: number
    fud: number
    neutral: number
  } {
    const lowerText = text.toLowerCase()
    const matches: LexiconEntry[] = []

    // Check exact matches
    for (const [term, entry] of this.entries) {
      if (lowerText.includes(term)) {
        matches.push(entry)
      }
    }

    // Check pattern matches
    for (const { regex, entry } of this.patterns) {
      if (regex.test(text)) {
        matches.push(entry)
      }
    }

    if (matches.length === 0) {
      return {
        sentiment: 0,
        confidence: 0,
        fomo: 0,
        fud: 0,
        neutral: 1,
      }
    }

    // Calculate weighted sentiment
    let totalSentiment = 0
    let totalWeight = 0
    let fomoScore = 0
    let fudScore = 0
    let neutralScore = 0

    for (const match of matches) {
      totalSentiment += match.sentiment * match.weight
      totalWeight += match.weight

      if (match.category === "fomo") fomoScore += 1
      else if (match.category === "fud") fudScore += 1
      else neutralScore += 1
    }

    const sentiment = totalWeight > 0 ? totalSentiment / totalWeight : 0
    const confidence = Math.min(matches.length / 5, 1.0) // More matches = higher confidence

    // Normalize category scores
    const total = fomoScore + fudScore + neutralScore
    return {
      sentiment,
      confidence,
      fomo: total > 0 ? fomoScore / total : 0,
      fud: total > 0 ? fudScore / total : 0,
      neutral: total > 0 ? neutralScore / total : 0,
    }
  }

  /**
   * Add new term to lexicon (for active learning)
   */
  addTerm(entry: LexiconEntry): void {
    this.entries.set(entry.term.toLowerCase(), entry)
  }

  /**
   * Get all terms in a category
   */
  getTermsByCategory(category: LexiconEntry["category"]): LexiconEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.category === category)
  }
}
