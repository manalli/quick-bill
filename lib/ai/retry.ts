export type RetryOptions = {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryable(error: unknown) {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("rate limit") || msg.includes("429")) return true
    if (msg.includes("timeout") || msg.includes("econnreset")) return true
    if (msg.includes("503") || msg.includes("502") || msg.includes("500")) return true
  }
  return false
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3
  const baseDelayMs = options.baseDelayMs ?? 600
  const maxDelayMs = options.maxDelayMs ?? 5000
  const shouldRetry = options.shouldRetry ?? isRetryable

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error
      }
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
      await sleep(delay)
    }
  }

  throw lastError
}
