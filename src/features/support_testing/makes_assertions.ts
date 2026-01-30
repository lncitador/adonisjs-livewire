import { AssertionError } from 'node:assert'
import type { ComponentState } from './component_state.js'

/**
 * Provides assertion methods for testing components
 */
export class MakesAssertions {
  constructor(readonly state: ComponentState) {}

  /**
   * Assert that the HTML contains a specific string
   */
  assertSee(value: string, escape: boolean = true): this {
    const html = this.state.getHtml()
    const searchValue = escape ? this.escapeHtml(value) : value

    if (!html.includes(searchValue)) {
      throw new AssertionError({
        message: `Failed asserting that '${searchValue}' is found in the component HTML output.`,
        actual: html,
        expected: searchValue,
        operator: 'includes',
      })
    }

    return this
  }

  /**
   * Assert that the HTML does not contain a specific string
   */
  assertDontSee(value: string, escape: boolean = true): this {
    const html = this.state.getHtml()
    const searchValue = escape ? this.escapeHtml(value) : value

    if (html.includes(searchValue)) {
      throw new AssertionError({
        message: `Failed asserting that '${searchValue}' is not found in the component HTML output.`,
        actual: html,
        expected: `not to include ${searchValue}`,
        operator: 'notIncludes',
      })
    }

    return this
  }

  /**
   * Assert that a property has a specific value
   */
  assertSet(propertyName: string, value: any): this {
    const actual = this.state.get(propertyName)

    if (!this.isEqual(actual, value)) {
      throw new AssertionError({
        message: `Failed asserting that property '${propertyName}' is set to ${JSON.stringify(value)}`,
        actual: actual,
        expected: value,
        operator: 'strictEqual',
      })
    }

    return this
  }

  /**
   * Assert that a property is not set to a specific value
   */
  assertNotSet(propertyName: string, value: any): this {
    const actual = this.state.get(propertyName)

    if (this.isEqual(actual, value)) {
      throw new AssertionError({
        message: `Failed asserting that property '${propertyName}' is not set to ${JSON.stringify(value)}`,
        actual: actual,
        expected: `not ${JSON.stringify(value)}`,
        operator: 'notStrictEqual',
      })
    }

    return this
  }

  /**
   * Assert that an array property has a specific count
   */
  assertCount(propertyName: string, count: number): this {
    const actual = this.state.get(propertyName)

    if (!Array.isArray(actual)) {
      throw new AssertionError({
        message: `Failed asserting that property '${propertyName}' is an array`,
        actual: typeof actual,
        expected: 'array',
        operator: 'strictEqual',
      })
    }

    if (actual.length !== count) {
      throw new AssertionError({
        message: `Failed asserting that property '${propertyName}' has ${count} items`,
        actual: actual.length,
        expected: count,
        operator: 'strictEqual',
      })
    }

    return this
  }

  /**
   * Assert that the component dispatched an event
   */
  assertDispatched(eventName: string, data?: any): this {
    const dispatched = this.state.getEffects().dispatched || []
    const event = dispatched.find((d: any) => d.name === eventName || d.event === eventName)

    if (!event) {
      throw new AssertionError({
        message: `Failed asserting that event '${eventName}' was dispatched`,
        actual: dispatched.map((d: any) => d.name || d.event),
        expected: eventName,
        operator: 'includes',
      })
    }

    if (data !== undefined && !this.isEqual(event.data || event.params, data)) {
      throw new AssertionError({
        message: `Failed asserting that event '${eventName}' was dispatched with data ${JSON.stringify(data)}`,
        actual: event.data || event.params,
        expected: data,
        operator: 'deepStrictEqual',
      })
    }

    return this
  }

  /**
   * Assert that the component did not dispatch an event
   */
  assertNotDispatched(eventName: string): this {
    const dispatched = this.state.getEffects().dispatched || []
    const event = dispatched.find((d: any) => d.name === eventName || d.event === eventName)

    if (event) {
      throw new AssertionError({
        message: `Failed asserting that event '${eventName}' was not dispatched`,
        actual: dispatched.map((d: any) => d.name || d.event),
        expected: `not to include ${eventName}`,
        operator: 'notIncludes',
      })
    }

    return this
  }

  /**
   * Assert that the component has validation errors
   */
  assertHasErrors(field?: string | string[]): this {
    const errors = this.getErrors()

    if (Object.keys(errors).length === 0) {
      throw new AssertionError({
        message: 'Failed asserting that the component has validation errors',
        actual: errors,
        expected: 'non-empty error bag',
        operator: 'notDeepStrictEqual',
      })
    }

    if (field) {
      const fields = Array.isArray(field) ? field : [field]

      for (const f of fields) {
        if (!errors[f] || errors[f].length === 0) {
          throw new AssertionError({
            message: `Failed asserting that field '${f}' has validation errors`,
            actual: errors[f] || [],
            expected: 'non-empty error array',
            operator: 'notDeepStrictEqual',
          })
        }
      }
    }

    return this
  }

  /**
   * Assert that the component has no validation errors
   */
  assertHasNoErrors(field?: string | string[]): this {
    const errors = this.getErrors()

    if (field) {
      const fields = Array.isArray(field) ? field : [field]

      for (const f of fields) {
        if (errors[f] && errors[f].length > 0) {
          throw new AssertionError({
            message: `Failed asserting that field '${f}' has no validation errors`,
            actual: errors[f],
            expected: [],
            operator: 'deepStrictEqual',
          })
        }
      }
    } else {
      if (Object.keys(errors).length > 0) {
        throw new AssertionError({
          message: 'Failed asserting that the component has no validation errors',
          actual: errors,
          expected: {},
          operator: 'deepStrictEqual',
        })
      }
    }

    return this
  }

  /**
   * Assert that a redirect occurred
   */
  assertRedirect(url?: string): this {
    const redirect = this.state.getEffects().redirect

    if (!redirect) {
      throw new AssertionError({
        message: 'Failed asserting that a redirect occurred',
        actual: redirect,
        expected: 'a redirect URL',
        operator: 'strictEqual',
      })
    }

    if (url !== undefined && redirect !== url) {
      throw new AssertionError({
        message: `Failed asserting that redirect to '${url}' occurred`,
        actual: redirect,
        expected: url,
        operator: 'strictEqual',
      })
    }

    return this
  }

  /**
   * Assert that no redirect occurred
   */
  assertNoRedirect(): this {
    const redirect = this.state.getEffects().redirect

    if (redirect) {
      throw new AssertionError({
        message: 'Failed asserting that no redirect occurred',
        actual: redirect,
        expected: undefined,
        operator: 'strictEqual',
      })
    }

    return this
  }

  /**
   * Get validation errors from component
   */
  protected getErrors(): Record<string, string[]> {
    const component = this.state.getComponent() as any

    if (typeof component.getErrorBag === 'function') {
      return component.getErrorBag()
    }

    return this.state.getMemo('errors') || {}
  }

  /**
   * Escape HTML special characters
   */
  protected escapeHtml(value: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }

    return value.replace(/[&<>"']/g, (char) => map[char])
  }

  /**
   * Deep equality check
   */
  protected isEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (a === null || b === null) return false
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
      return JSON.stringify(a) === JSON.stringify(b)
    }

    return false
  }
}
