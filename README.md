# MoodAgent

> Autonomous crypto sentiment analysis and treasury management system for Solana

[![Website](https://img.shields.io/badge/Website-moodagent.dev-blue)](https://moodagent.dev)
[![Twitter](https://img.shields.io/badge/Twitter-@MoonAgentAI-1DA1F2)](https://x.com/MoonAgentAI)

## Overview

MoodAgent collects real-time social sentiment from Twitter/X, performs crypto-specific sentiment analysis, and executes automated buyback/burn strategies on Solana based on market mood and technical signals.

## Architecture

### Core Components

1. **Data Ingestion Pipeline** - Collects tweets via Twitter API with rate limiting
2. **Sentiment Analysis Engine** - Crypto-tuned NLP model for FOMO/FUD detection
3. **Market Signal Processor** - Price, liquidity, and on-chain metrics
4. **Decision Engine** - Rule-based policy with z-score aggregation
5. **Solana Execution Layer** - Secure treasury operations with multisig
6. **Monitoring Dashboard** - Real-time mood visualization and transparency

## Features

- **Crypto-Specific Sentiment**: Fine-tuned on crypto Twitter corpus with specialized lexicon
- **Multi-Signal Aggregation**: Combines sentiment, price momentum, and liquidity
- **Risk Management**: Daily spend limits, slippage protection, kill-switch
- **Transparency**: Live mood scores, decision explanations, on-chain audit trail
- **Security**: Multisig treasury, timelock, guardian controls

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies: `npm install`
4. Set up database: `npm run db:migrate`
5. Start the system: `npm run dev`

## Configuration

Edit `lib/config.ts` to adjust:
- Sentiment thresholds (z-score levels)
- Risk limits (max daily spend, slippage)
- EMA windows for signal smoothing
- Feature flags for auto-execution

## Safety Features

- **Kill Switch**: Guardian multisig can instantly halt operations
- **Timelock**: Large transactions have mandatory delay
- **Rate Limits**: Prevents excessive trading
- **Consecutive Loss Protection**: Pauses after N losses
- **Minimum Treasury Reserve**: Never depletes below threshold

## Decision Logic (V0)

\`\`\`
if mood_z >= +1.5 and price_momentum >= 0:
    action = HODL_TREASURY  # Wait during hype

elif mood_z <= -1.0 and price_momentum <= 0:
    action = BUYBACK  # Buy during FUD dips
    size = k1 * |mood_z| * treasury * DCA_factor

elif crossover(mood_ema_15, mood_ema_60) down and liquidity_ok:
    action = BURN  # Burn after buyback batch

else:
    action = NOOP  # Wait for clear signal
\`\`\`

## Monitoring

- Prometheus metrics on port 9090
- Grafana dashboards for visualization
- Sentry for error tracking
- Real-time logs with structured JSON

## Links

- **Website**: [moodagent.dev](https://moodagent.dev)
- **Twitter**: [@MoonAgentAI](https://x.com/MoonAgentAI)
- **Documentation**: [docs.moodagent.dev](https://docs.moodagent.dev)

## License

MIT

## Disclaimer

This is an autonomous trading system. Use at your own risk. Always test thoroughly on devnet before mainnet deployment.
