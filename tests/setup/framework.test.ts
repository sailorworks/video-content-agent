import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

describe('Testing Framework Setup', () => {
  it('should have Vitest working correctly', () => {
    expect(true).toBe(true)
  })

  it('should have TypeScript support', () => {
    const testValue: string = 'TypeScript is working'
    expect(typeof testValue).toBe('string')
  })

  it('should have fast-check property testing available', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n // Identity property
      })
    )
  })

  it('should have environment variables set up for testing', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(process.env.COMPOSIO_API_KEY).toBeDefined()
    expect(process.env.OPENAI_API_KEY).toBeDefined()
  })
})