/**
 * Solana client for treasury operations
 */

import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { getAssociatedTokenAddress, createBurnInstruction } from "@solana/spl-token"
import { config } from "@/lib/config"
import { logger } from "@/lib/logger"

export class SolanaClient {
  private connection: Connection
  private treasuryPubkey: PublicKey | null = null

  constructor() {
    if (!config.solana.rpcUrl) {
      throw new Error("Solana RPC URL not configured")
    }

    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: "confirmed",
      wsEndpoint: config.solana.wsUrl,
    })

    if (config.solana.treasuryAddress) {
      this.treasuryPubkey = new PublicKey(config.solana.treasuryAddress)
    }
  }

  /**
   * Get treasury balance
   */
  async getTreasuryBalance(): Promise<number> {
    if (!this.treasuryPubkey) {
      throw new Error("Treasury address not configured")
    }

    try {
      const balance = await this.connection.getBalance(this.treasuryPubkey)
      return balance / LAMPORTS_PER_SOL
    } catch (error: any) {
      logger.error("Failed to get treasury balance", { error: error.message })
      throw error
    }
  }

  /**
   * Get token balance for treasury
   */
  async getTokenBalance(tokenMint: string): Promise<number> {
    if (!this.treasuryPubkey) {
      throw new Error("Treasury address not configured")
    }

    try {
      const mintPubkey = new PublicKey(tokenMint)
      const tokenAccount = await getAssociatedTokenAddress(mintPubkey, this.treasuryPubkey)

      const balance = await this.connection.getTokenAccountBalance(tokenAccount)
      return Number.parseFloat(balance.value.uiAmount?.toString() || "0")
    } catch (error: any) {
      logger.error("Failed to get token balance", { error: error.message })
      throw error
    }
  }

  /**
   * Execute Jupiter swap (buyback)
   */
  async executeSwap(inputMint: string, outputMint: string, amount: number, slippageBps: number): Promise<string> {
    try {
      // Get quote from Jupiter
      const quoteResponse = await fetch(
        `${config.market.jupiterApiUrl}/quote?` +
          new URLSearchParams({
            inputMint,
            outputMint,
            amount: Math.floor(amount * 1e9).toString(),
            slippageBps: slippageBps.toString(),
          }),
      )

      const quoteData = await quoteResponse.json()

      // Get swap transaction
      const swapResponse = await fetch(`${config.market.jupiterApiUrl}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.treasuryPubkey?.toString(),
          wrapAndUnwrapSol: true,
        }),
      })

      const { swapTransaction } = await swapResponse.json()

      // Deserialize transaction
      const transactionBuf = Buffer.from(swapTransaction, "base64")
      const transaction = Transaction.from(transactionBuf)

      // In production, this would be signed by the treasury keypair or multisig
      // For now, we return the transaction signature placeholder
      logger.info("Swap transaction prepared", {
        inputMint,
        outputMint,
        amount,
      })

      return "PLACEHOLDER_TX_SIGNATURE"
    } catch (error: any) {
      logger.error("Swap execution failed", { error: error.message })
      throw error
    }
  }

  /**
   * Burn tokens
   */
  async burnTokens(tokenMint: string, amount: number): Promise<string> {
    if (!this.treasuryPubkey) {
      throw new Error("Treasury address not configured")
    }

    try {
      const mintPubkey = new PublicKey(tokenMint)
      const tokenAccount = await getAssociatedTokenAddress(mintPubkey, this.treasuryPubkey)

      // Create burn instruction
      const burnInstruction = createBurnInstruction(
        tokenAccount,
        mintPubkey,
        this.treasuryPubkey,
        Math.floor(amount * 1e9), // Convert to smallest unit
      )

      const transaction = new Transaction().add(burnInstruction)

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = this.treasuryPubkey

      // In production, sign with treasury keypair or multisig
      logger.info("Burn transaction prepared", {
        tokenMint,
        amount,
      })

      return "PLACEHOLDER_BURN_TX_SIGNATURE"
    } catch (error: any) {
      logger.error("Burn execution failed", { error: error.message })
      throw error
    }
  }

  /**
   * Check transaction status
   */
  async getTransactionStatus(signature: string): Promise<"confirmed" | "failed" | "pending"> {
    try {
      const status = await this.connection.getSignatureStatus(signature)

      if (!status.value) {
        return "pending"
      }

      if (status.value.err) {
        return "failed"
      }

      return "confirmed"
    } catch (error: any) {
      logger.error("Failed to get transaction status", { error: error.message })
      return "pending"
    }
  }

  /**
   * Monitor account for changes
   */
  subscribeToAccount(address: string, callback: (accountInfo: any) => void): number {
    const pubkey = new PublicKey(address)

    return this.connection.onAccountChange(
      pubkey,
      (accountInfo) => {
        callback(accountInfo)
      },
      "confirmed",
    )
  }

  /**
   * Unsubscribe from account monitoring
   */
  async unsubscribe(subscriptionId: number): Promise<void> {
    await this.connection.removeAccountChangeListener(subscriptionId)
  }
}
