import OpenAI from 'openai'

// Default configuration values
export const DEFAULT_MODEL = 'gpt-4o-mini'
export const DEFAULT_MAX_TOKENS = 400
export const DEFAULT_TEMPERATURE = 0.2

let openaiClient: OpenAI | null = null

function isBuildTime() {
  // Heuristic: Netlify/Next build has no VERCEL/NETLIFY env for runtime functions and NODE_ENV === 'production'
  // but lacks our OPENAI_API_KEY. We treat absence of the key during a build as "AI disabled" rather than fatal.
  return process.env.BUILD_ID || process.env.NETLIFY === 'true'
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    if (isBuildTime()) {
      // Return a proxy that will throw only if actually used at runtime
      return new Proxy({} as OpenAI, {
        get() {
          throw new Error('AI disabled at build time (OPENAI_API_KEY missing).')
        }
      })
    }
    throw new Error('AI is not configured. OPENAI_API_KEY environment variable is missing.')
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

export function getAIConfig() {
  return {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    maxTokens: parseInt(process.env.AI_SUMMARY_MAX_TOKENS || DEFAULT_MAX_TOKENS.toString()),
    temperature: parseFloat(process.env.AI_TEMPERATURE || DEFAULT_TEMPERATURE.toString()),
  }
}

export function anonymizeEmail(email: string): string {
  const [username, domain] = email.split('@')
  if (username.length <= 2) {
    return `${username[0]}***@${domain}`
  }
  return `${username.substring(0, 2)}***@${domain}`
}