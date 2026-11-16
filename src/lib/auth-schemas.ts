import { z } from 'zod'

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email'))

export const credentialsSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const magicLinkSchema = z.object({
  email: emailField,
})

/** Only allow same-origin relative paths to prevent open redirects. */
export function safeRedirect(path: unknown, fallback = '/budget'): string {
  if (typeof path !== 'string') return fallback
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return fallback
  }
  return path
}
