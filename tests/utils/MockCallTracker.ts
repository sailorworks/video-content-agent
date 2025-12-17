import type { ApiCall } from '../mocks/MockComposioClient.js'

/**
 * MockCallTracker provides utilities for tracking and inspecting mock API calls
 * during test execution. This enables detailed verification of agent behavior.
 * 
 * Requirements: 6.5 - Mock call tracking and history inspection utilities
 */
export class MockCallTracker {
  private callHistory: ApiCall[] = []
  private expectations: CallExpectation[] = []

  /**
   * Records an API call for tracking
   */
  recordCall(call: ApiCall): void {
    this.callHistory.push({
      ...call,
      timestamp: new Date()
    })
  }

  /**
   * Gets the complete call history
   */
  getCallHistory(): ApiCall[] {
    return [...this.callHistory]
  }

  /**
   * Gets calls filtered by service
   */
  getCallsForService(service: string): ApiCall[] {
    return this.callHistory.filter(call => 
      call.service.toLowerCase() === service.toLowerCase()
    )
  }

  /**
   * Gets calls for a specific endpoint
   */
  getCallsForEndpoint(service: string, endpoint: string): ApiCall[] {
    return this.callHistory.filter(call => 
      call.service.toLowerCase() === service.toLowerCase() &&
      call.endpoint.toLowerCase() === endpoint.toLowerCase()
    )
  }

  /**
   * Checks if a specific API was called
   */
  wasApiCalled(service: string, endpoint?: string): boolean {
    if (endpoint) {
      return this.getCallsForEndpoint(service, endpoint).length > 0
    }
    return this.getCallsForService(service).length > 0
  }

  /**
   * Gets the number of calls to a specific API
   */
  getCallCount(service: string, endpoint?: string): number {
    if (endpoint) {
      return this.getCallsForEndpoint(service, endpoint).length
    }
    return this.getCallsForService(service).length
  }

  /**
   * Gets the parameters from the last call to an endpoint
   */
  getLastCallParams(service: string, endpoint: string): any {
    const calls = this.getCallsForEndpoint(service, endpoint)
    return calls.length > 0 ? calls[calls.length - 1]?.params : null
  }

  /**
   * Gets the response from the last call to an endpoint
   */
  getLastCallResponse(service: string, endpoint: string): any {
    const calls = this.getCallsForEndpoint(service, endpoint)
    return calls.length > 0 ? calls[calls.length - 1]?.response : null
  }

  /**
   * Gets all calls made within a time window
   */
  getCallsInTimeWindow(startTime: Date, endTime: Date): ApiCall[] {
    return this.callHistory.filter(call => 
      call.timestamp >= startTime && call.timestamp <= endTime
    )
  }

  /**
   * Gets calls made in the last N milliseconds
   */
  getRecentCalls(milliseconds: number): ApiCall[] {
    const cutoff = new Date(Date.now() - milliseconds)
    return this.callHistory.filter(call => call.timestamp >= cutoff)
  }

  /**
   * Finds calls that match specific parameter criteria
   */
  findCallsWithParams(service: string, endpoint: string, paramMatcher: (params: any) => boolean): ApiCall[] {
    return this.getCallsForEndpoint(service, endpoint).filter(call => 
      paramMatcher(call.params)
    )
  }

  /**
   * Gets a summary of all API calls grouped by service
   */
  getCallSummary(): CallSummary {
    const summary: CallSummary = {}
    
    for (const call of this.callHistory) {
      if (!summary[call.service]) {
        summary[call.service] = {}
      }
      
      if (!summary[call.service]![call.endpoint]) {
        summary[call.service]![call.endpoint] = {
          count: 0,
          firstCall: call.timestamp,
          lastCall: call.timestamp,
          errors: 0
        }
      }
      
      const endpointSummary = summary[call.service]![call.endpoint]!
      endpointSummary.count++
      
      if (call.timestamp < endpointSummary.firstCall) {
        endpointSummary.firstCall = call.timestamp
      }
      
      if (call.timestamp > endpointSummary.lastCall) {
        endpointSummary.lastCall = call.timestamp
      }
      
      if (call.error) {
        endpointSummary.errors++
      }
    }
    
    return summary
  }

  /**
   * Sets up expectations for API calls that should be made
   */
  expectCall(service: string, endpoint: string, options: ExpectationOptions = {}): void {
    const expectation: CallExpectation = {
      service: service.toLowerCase(),
      endpoint: endpoint.toLowerCase(),
      minCalls: options.minCalls || 1,
      maxCalls: options.maxCalls || Infinity,
      timeout: options.timeout || 5000
    }
    
    if (options.paramMatcher) {
      expectation.paramMatcher = options.paramMatcher
    }
    
    this.expectations.push(expectation)
  }

  /**
   * Verifies that all expectations have been met
   */
  verifyExpectations(): ExpectationResult[] {
    const results: ExpectationResult[] = []
    
    for (const expectation of this.expectations) {
      const calls = this.getCallsForEndpoint(expectation.service, expectation.endpoint)
      const callCount = calls.length
      
      const result: ExpectationResult = {
        service: expectation.service,
        endpoint: expectation.endpoint,
        expectedMin: expectation.minCalls,
        expectedMax: expectation.maxCalls,
        actualCount: callCount,
        satisfied: callCount >= expectation.minCalls && callCount <= expectation.maxCalls
      }
      
      // Check parameter matching if specified
      if (expectation.paramMatcher && calls.length > 0) {
        const matchingCalls = calls.filter(call => expectation.paramMatcher!(call.params))
        result.parameterMatches = matchingCalls.length
        result.satisfied = result.satisfied && matchingCalls.length > 0
      }
      
      results.push(result)
    }
    
    return results
  }

  /**
   * Clears all call history and expectations
   */
  reset(): void {
    this.callHistory = []
    this.expectations = []
  }

  /**
   * Creates a detailed report of all API interactions
   */
  generateReport(): string {
    const summary = this.getCallSummary()
    const lines: string[] = []
    
    lines.push('=== Mock API Call Report ===')
    lines.push(`Total calls: ${this.callHistory.length}`)
    lines.push('')
    
    for (const [service, endpoints] of Object.entries(summary)) {
      lines.push(`Service: ${service}`)
      
      for (const [endpoint, stats] of Object.entries(endpoints)) {
        lines.push(`  ${endpoint}: ${stats.count} calls`)
        if (stats.errors > 0) {
          lines.push(`    Errors: ${stats.errors}`)
        }
        lines.push(`    First: ${stats.firstCall.toISOString()}`)
        lines.push(`    Last: ${stats.lastCall.toISOString()}`)
      }
      lines.push('')
    }
    
    // Add expectation results if any
    if (this.expectations.length > 0) {
      lines.push('=== Expectation Results ===')
      const results = this.verifyExpectations()
      
      for (const result of results) {
        const status = result.satisfied ? '✅' : '❌'
        lines.push(`${status} ${result.service}:${result.endpoint}`)
        lines.push(`    Expected: ${result.expectedMin}-${result.expectedMax} calls`)
        lines.push(`    Actual: ${result.actualCount} calls`)
        
        if (result.parameterMatches !== undefined) {
          lines.push(`    Parameter matches: ${result.parameterMatches}`)
        }
      }
    }
    
    return lines.join('\n')
  }
}

// Type definitions for the tracker
export interface CallExpectation {
  service: string
  endpoint: string
  minCalls: number
  maxCalls: number
  paramMatcher?: (params: any) => boolean
  timeout: number
}

export interface ExpectationOptions {
  minCalls?: number
  maxCalls?: number
  paramMatcher?: (params: any) => boolean
  timeout?: number
}

export interface ExpectationResult {
  service: string
  endpoint: string
  expectedMin: number
  expectedMax: number
  actualCount: number
  satisfied: boolean
  parameterMatches?: number
}

export interface CallSummary {
  [service: string]: {
    [endpoint: string]: {
      count: number
      firstCall: Date
      lastCall: Date
      errors: number
    }
  }
}

// Export a singleton instance for use across tests
export const mockCallTracker = new MockCallTracker()

// Utility functions for common assertions
export function assertApiCalled(service: string, endpoint: string, minTimes: number = 1): void {
  const count = mockCallTracker.getCallCount(service, endpoint)
  if (count < minTimes) {
    throw new Error(
      `Expected ${service}:${endpoint} to be called at least ${minTimes} times, but was called ${count} times`
    )
  }
}

export function assertApiNotCalled(service: string, endpoint: string): void {
  const count = mockCallTracker.getCallCount(service, endpoint)
  if (count > 0) {
    throw new Error(
      `Expected ${service}:${endpoint} to not be called, but was called ${count} times`
    )
  }
}

export function assertApiCalledWith(service: string, endpoint: string, expectedParams: any): void {
  const calls = mockCallTracker.getCallsForEndpoint(service, endpoint)
  const matchingCall = calls.find(call => 
    JSON.stringify(call.params) === JSON.stringify(expectedParams)
  )
  
  if (!matchingCall) {
    throw new Error(
      `Expected ${service}:${endpoint} to be called with params ${JSON.stringify(expectedParams)}, ` +
      `but no matching call was found. Actual calls: ${JSON.stringify(calls.map(c => c.params))}`
    )
  }
}