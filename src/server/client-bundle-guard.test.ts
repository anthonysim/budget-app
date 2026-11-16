import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Server-fn modules are imported by client code. If they mention `typeof db` (even in a type)
// the bundler keeps the `db` import and ships the Postgres driver to the browser, which crashes
// with "Buffer is not defined". Use '#/server/db-types' instead.
describe('server function modules', () => {
  const dir = join(process.cwd(), 'src/server')
  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
  )

  for (const file of files) {
    const source = readFileSync(join(dir, file), 'utf8')
    if (!source.includes('createServerFn')) continue
    it(`${file} does not reference typeof db`, () => {
      expect(source).not.toMatch(/typeof db\b/)
    })
  }
})
