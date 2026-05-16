export type AiFetchError = {
  message: string
  code?: string
  status?: number
}

export type AiFetchOptions = {
  maxRetries?: number
  retryDelayMs?: number
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function shouldRetry(status: number, attempt: number, max: number) {
  if (attempt >= max) return false
  return status === 429 || status >= 500
}

export async function fetchAiEndpoint<T>(
  url: string,
  options: AiFetchOptions = {}
): Promise<{ data: T } | { error: AiFetchError }> {
  const maxRetries = options.maxRetries ?? 2
  const retryDelayMs = options.retryDelayMs ?? 800

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })

      const body = (await res.json()) as T & {
        success?: boolean
        error?: string
        code?: string
      }

      if (!res.ok) {
        const err: AiFetchError = {
          message: (body as { error?: string }).error ?? `Request failed (${res.status})`,
          code: (body as { code?: string }).code,
          status: res.status,
        }
        if (shouldRetry(res.status, attempt, maxRetries)) {
          await sleep(retryDelayMs * (attempt + 1))
          continue
        }
        return { error: err }
      }

      return { data: body }
    } catch (e) {
      if (attempt >= maxRetries) {
        return {
          error: {
            message:
              e instanceof Error ? e.message : "Network error while contacting AI service",
          },
        }
      }
      await sleep(retryDelayMs * (attempt + 1))
    }
  }

  return { error: { message: "Request failed after retries" } }
}
