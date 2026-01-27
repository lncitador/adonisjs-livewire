import type { Constructor } from '../../types.js'
import type { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'

/**
 * Error bag for storing validation errors
 * Key: field name, Value: array of error messages
 */
export type ErrorBag = Record<string, string[]>

/**
 * Trait/mixin for handling validation errors on components
 *
 * Provides methods to manage validation errors (error bag) on components.
 * Uses the component's data store to persist error state.
 *
 * @example
 * ```typescript
 * class FormComponent extends Component {
 *   async submit() {
 *     try {
 *       await validator.validate(...)
 *     } catch (error) {
 *       if (error instanceof ValidationException) {
 *         this.setErrorBag(error.messages)
 *       }
 *     }
 *   }
 * }
 * ```
 */
export function HandlesValidation<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    /**
     * Get the error bag for this component
     * Returns an empty error bag if none exists
     *
     * @returns Error bag object with field names as keys and error messages as arrays
     *
     * @example
     * ```typescript
     * const errors = component.getErrorBag()
     * if (errors.email) {
     *   console.log('Email errors:', errors.email)
     * }
     * ```
     */
    getErrorBag(): ErrorBag {
      const s = store(this as any)
      const errorBag = s.get('errorBag')
      if (!errorBag) {
        return {}
      }
      const formatted: ErrorBag = {}
      for (const [key, value] of Object.entries(errorBag)) {
        formatted[key] = Array.isArray(value) ? value : [String(value)]
      }
      return formatted
    }

    /**
     * Set the error bag for this component
     * Accepts either an ErrorBag object or a plain object
     *
     * @param bag - Error bag object or plain object with error messages
     *
     * @example
     * ```typescript
     * component.setErrorBag({
     *   email: ['Email is required'],
     *   password: ['Password must be at least 8 characters']
     * })
     *
     * component.setErrorBag({ email: 'Invalid email' })
     * ```
     */
    setErrorBag(bag: ErrorBag | Record<string, string | string[]>): void {
      const s = store(this as any)
      const normalized: ErrorBag = {}
      for (const [key, value] of Object.entries(bag)) {
        normalized[key] = Array.isArray(value) ? value : [String(value)]
      }
      s.set('errorBag', normalized)
    }

    /**
     * Add an error to a specific field
     *
     * @param field - Field name
     * @param message - Error message
     *
     * @example
     * ```typescript
     * component.addError('email', 'Email is required')
     * component.addError('email', 'Email must be valid')
     * ```
     */
    addError(field: string, message: string): void {
      const s = store(this as any)
      const currentBag = this.getErrorBag()
      if (!currentBag[field]) {
        currentBag[field] = []
      }
      currentBag[field].push(message)
      s.set('errorBag', currentBag)
    }

    /**
     * Reset error bag, optionally for specific fields only
     *
     * @param fields - Optional field names to reset. If not provided, resets all errors
     *
     * @example
     * ```typescript
     * component.resetErrorBag()
     *
     * component.resetErrorBag(['email', 'password'])
     *
     * component.resetErrorBag('email')
     * ```
     */
    resetErrorBag(fields?: string | string[]): void {
      const s = store(this as any)
      if (!fields) {
        s.set('errorBag', {})
        return
      }
      const fieldArray = Array.isArray(fields) ? fields : [fields]
      const currentBag = this.getErrorBag()
      for (const field of fieldArray) {
        delete currentBag[field]
      }
      s.set('errorBag', currentBag)
    }

    /**
     * Check if a specific field has errors
     *
     * @param field - Field name to check
     * @returns True if the field has errors, false otherwise
     *
     * @example
     * ```typescript
     * if (component.hasError('email')) {
     *   console.log('Email field has errors')
     * }
     * ```
     */
    hasError(field: string): boolean {
      const errorBag = this.getErrorBag()
      const errors = errorBag[field]
      return errors !== undefined && errors.length > 0
    }

    /**
     * Get error messages for a specific field
     *
     * @param field - Field name
     * @returns Array of error messages for the field, or empty array if no errors
     *
     * @example
     * ```typescript
     * const emailErrors = component.getError('email')
     * ```
     */
    getError(field: string): string[] {
      const errorBag = this.getErrorBag()
      return errorBag[field] || []
    }

    /**
     * Get the first error message for a specific field
     *
     * @param field - Field name
     * @returns First error message, or undefined if no errors
     *
     * @example
     * ```typescript
     * const firstError = component.getFirstError('email')
     * ```
     */
    getFirstError(field: string): string | undefined {
      const errors = this.getError(field)
      return errors.length > 0 ? errors[0] : undefined
    }
  }
}
