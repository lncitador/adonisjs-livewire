import 'reflect-metadata'
import { FORM_METHODS, registerFormClass } from './features/support_form_objects/constants.js'
import type { BaseComponent } from './base_component.js'
import { Decorator } from './features/support_decorators/decorator.js'
import { InferValidationReturnType } from './features/support_validation/types.js'

/**
 * Error bag for storing validation errors
 * Key: field name, Value: array of error messages
 */
export type ErrorBag = Record<string, string[]>

/**
 * Symbol to store decorators on Form prototype
 */
const DECORATORS_KEY = Symbol.for('livewire:form:decorators')

/**
 * Form base class for Form Objects
 * PHP parity: Livewire\Form
 *
 * Form Objects encapsulate form properties and lifecycle hooks.
 * Uses Proxy to delegate validation to the parent Component.
 *
 * Uses the same @validator decorator as Component.
 *
 * @example
 * ```typescript
 * import { Form, validator } from 'adonisjs-livewire'
 * import vine from '@vinejs/vine'
 *
 * export class PostForm extends Form {
 *   @validator(() => vine.string().minLength(3))
 *   declare title: HasValidate<string>
 *
 *   @validator(() => vine.string().minLength(10))
 *   declare content: HasValidate<string>
 * }
 * ```
 */
export abstract class Form {
  /**
   * Reference to the parent component
   * Set during initialization by SupportFormObjects
   */
  #component?: BaseComponent

  /**
   * Property name on the component
   * Set during initialization by SupportFormObjects
   */
  #propertyName?: string

  /**
   * Initial property values for reset functionality
   */
  #initialValues: Record<string, any> = {}

  /**
   * Get all decorators from prototype chain
   * Used by @validator decorator
   */
  getDecorators(): Decorator[] {
    const decorators: Decorator[] = Object.hasOwn(this.constructor.prototype, DECORATORS_KEY)
      ? (this.constructor.prototype as any)[DECORATORS_KEY]
      : []
    return [...decorators]
  }

  /**
   * Add a decorator - called by @validator
   */
  addDecorator(decorator: Decorator): void {
    const proto = this.constructor.prototype as any
    if (!Object.hasOwn(proto, DECORATORS_KEY)) {
      proto[DECORATORS_KEY] = []
    }
    proto[DECORATORS_KEY].push(decorator)
  }

  /**
   * Boot the form object (called once per class)
   */
  boot?(): void | Promise<void>

  /**
   * Mount the form object (called when component mounts)
   */
  mount?(): void | Promise<void>

  /**
   * Called before form is dehydrated for client
   */
  dehydrate?(): void | Promise<void>

  /**
   * Called after form is hydrated from client
   */
  hydrate?(): void | Promise<void>

  /**
   * Called before a property is updated
   */
  updating?(property: string, value: any): void | boolean | Promise<void | boolean>

  /**
   * Called after a property is updated
   */
  updated?(property: string, value: any): void | Promise<void>

  /**
   * Set the component reference and return a proxied Form
   */
  setComponent(component: BaseComponent, propertyName: string): Form {
    this.#component = component
    this.#propertyName = propertyName
    this.#storeInitialValues()
    this.#registerDecoratorsOnComponent()

    return this.#createProxy()
  }

  /**
   * Create a Proxy that delegates to the Component for validation methods
   */
  #createProxy(): Form {
    const component = this.#component
    const propertyName = this.#propertyName

    return new Proxy(this, {
      get(proxyTarget: Form, prop: string | symbol) {
        // Handle symbols
        if (typeof prop === 'symbol') {
          const value = (proxyTarget as any)[prop]
          if (value !== undefined) {
            return typeof value === 'function' ? value.bind(proxyTarget) : value
          }
          if (component) {
            const componentValue = (component as any)[prop]
            return typeof componentValue === 'function'
              ? componentValue.bind(component)
              : componentValue
          }
          return undefined
        }

        // Special properties
        if (prop === 'component') {
          return component
        }
        if (prop === 'propertyName') {
          return propertyName
        }
        if (prop === 'constructor') {
          return proxyTarget.constructor
        }

        // Check own properties first
        if (Object.prototype.hasOwnProperty.call(proxyTarget, prop)) {
          const value = (proxyTarget as any)[prop]
          if (value !== undefined) {
            return typeof value === 'function' ? value.bind(proxyTarget) : value
          }
        }

        // Check prototype chain
        if (prop in proxyTarget) {
          const value = (proxyTarget as any)[prop]
          if (value !== undefined) {
            return typeof value === 'function' ? value.bind(proxyTarget) : value
          }
        }

        // Check for form methods
        if (FORM_METHODS.has(prop)) {
          const value = (proxyTarget as any)[prop]
          if (typeof value === 'function') {
            return value.bind(proxyTarget)
          }
          return value
        }

        // Walk prototype chain
        if (proxyTarget.constructor && typeof proxyTarget.constructor === 'function') {
          let prototype = proxyTarget.constructor.prototype
          while (prototype && prototype !== Object.prototype) {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, prop)
            if (descriptor) {
              if (descriptor.get || descriptor.set) {
                const value = descriptor.get ? descriptor.get.call(proxyTarget) : undefined
                return typeof value === 'function' ? value.bind(proxyTarget) : value
              }
              if (typeof descriptor.value === 'function') {
                return descriptor.value.bind(proxyTarget)
              }
              return descriptor.value
            }
            prototype = Object.getPrototypeOf(prototype)
          }
        }

        // Delegate to component for validation methods
        if (component) {
          const componentValue = (component as any)[prop]
          if (componentValue !== undefined && typeof componentValue === 'function') {
            return componentValue.bind(component)
          }
        }

        return undefined
      },

      set(proxyTarget: Form, prop: string | symbol, value: any) {
        if (prop === 'component' || prop === 'propertyName') {
          return false
        }
        if (typeof prop === 'symbol') {
          ;(proxyTarget as any)[prop] = value
          return true
        }
        if (FORM_METHODS.has(prop)) {
          return false
        }

        // Set on form if property exists
        const existsInForm = Object.prototype.hasOwnProperty.call(proxyTarget, prop)
        if (existsInForm) {
          ;(proxyTarget as any)[prop] = value
          return true
        }

        // Otherwise set on component
        if (component) {
          ;(component as any)[prop] = value
          return true
        }

        return false
      },

      has(proxyTarget: Form, prop: string | symbol) {
        if (prop === 'component' || prop === 'propertyName') {
          return true
        }
        return prop in proxyTarget
      },

      ownKeys(proxyTarget: Form) {
        const keys: string[] = []
        for (const key of Object.keys(proxyTarget)) {
          if (key.startsWith('_') || key.startsWith('#')) continue
          if (typeof (proxyTarget as any)[key] === 'function') continue
          if (FORM_METHODS.has(key)) continue
          keys.push(key)
        }
        return keys
      },

      getOwnPropertyDescriptor(proxyTarget: Form, prop: string | symbol) {
        if (prop === 'component' || prop === 'propertyName') {
          return {
            enumerable: false,
            configurable: true,
            value: prop === 'component' ? component : propertyName,
          }
        }
        if (Object.prototype.hasOwnProperty.call(proxyTarget, prop)) {
          return Object.getOwnPropertyDescriptor(proxyTarget, prop)
        }
        if (prop in proxyTarget) {
          const value = (proxyTarget as any)[prop]
          if (value !== undefined) {
            return {
              enumerable: true,
              configurable: true,
              writable: true,
              value,
            }
          }
        }
        return undefined
      },

      getPrototypeOf(proxyTarget: Form) {
        return Object.getPrototypeOf(proxyTarget)
      },
    })
  }

  /**
   * Register form's @validator decorators on the parent component
   * This allows the Component's validation system to validate form properties
   */
  #registerDecoratorsOnComponent(): void {
    if (!this.#component || !this.#propertyName) return

    const formDecorators = this.getDecorators()
    const component = this.#component as any
    const prefix = this.#propertyName

    for (const decorator of formDecorators) {
      // Clone decorator with prefixed property name for component
      const cloned = Object.create(Object.getPrototypeOf(decorator))
      Object.assign(cloned, decorator)

      // Prefix the property name: "title" -> "form.title"
      if ('propertyName' in cloned) {
        cloned.propertyName = `${prefix}.${cloned.propertyName}`
      }

      // Add to component's decorators
      if (typeof component.addDecorator === 'function') {
        component.addDecorator(cloned)
      }
    }
  }

  /**
   * Get the parent component
   */
  getComponent(): BaseComponent | undefined {
    return this.#component
  }

  /**
   * Get the property name on the component
   */
  getPropertyName(): string | undefined {
    return this.#propertyName
  }

  /**
   * Store initial values for reset functionality
   */
  #storeInitialValues(): void {
    for (const key of this.getPropertyNames()) {
      this.#initialValues[key] = (this as any)[key]
    }
  }

  /**
   * Get all form property names
   */
  getPropertyNames(): string[] {
    const props: string[] = []
    for (const key of Object.keys(this)) {
      if (key.startsWith('_') || key.startsWith('#')) continue
      if (FORM_METHODS.has(key)) continue
      if (typeof (this as any)[key] === 'function') continue
      props.push(key)
    }
    return props
  }

  /**
   * Check if form has a property
   */
  hasProperty(name: string): boolean {
    return this.getPropertyNames().includes(name)
  }

  /**
   * Get a property value
   */
  getPropertyValue(name: string): any {
    return (this as any)[name]
  }

  /**
   * Set a property value
   */
  setPropertyValue(name: string, value: any): void {
    ;(this as any)[name] = value
  }

  /**
   * Validate form - delegates to component's validation
   * Errors are stored in component's error bag with "formName.field" keys
   */
  async validate(): Promise<InferValidationReturnType<this>> {
    const component = this.#component as any
    const prefix = this.#propertyName

    if (!component || !prefix) {
      throw new Error('Form must be attached to a component before validation')
    }

    // Get form's validator decorators
    const formDecorators = this.getDecorators()
    const validatorDecorators = formDecorators.filter(
      (d: any) => d.constructor.name === 'Validator'
    )

    if (validatorDecorators.length === 0) {
      return this.all()
    }

    const { default: vine } = await import('@vinejs/vine')
    const schemaFields: Record<string, any> = {}

    for (const decorator of validatorDecorators) {
      const validator = decorator as any
      if (validator.schemaFactory) {
        schemaFields[validator.propertyName] = validator.schemaFactory()
      }
    }

    const schema = vine.object(schemaFields)
    const data = this.all()

    try {
      const validated = await vine.create(schema).validate(data)

      // Clear errors for form fields via component
      if (typeof component.resetErrorBag === 'function') {
        for (const key of Object.keys(schemaFields)) {
          component.resetErrorBag(`${prefix}.${key}`)
        }
      }

      return validated as InferValidationReturnType<this>
    } catch (error: any) {
      // Set errors with prefixed keys on component
      const currentErrors = component.getErrorBag?.() || {}

      // Handle Vine.js error format (messages is an array of objects with path and message)
      if (error.messages && Array.isArray(error.messages)) {
        for (const msg of error.messages) {
          if (msg && typeof msg === 'object') {
            // Vine.js messages have { path: ['field'], message: 'error text' }
            const field =
              msg.path && Array.isArray(msg.path) ? msg.path.join('.') : msg.field || 'unknown'
            const prefixedField = `${prefix}.${field}`
            const message =
              typeof msg.message === 'string' ? msg.message : String(msg.message || msg)

            if (!currentErrors[prefixedField]) {
              currentErrors[prefixedField] = []
            }
            currentErrors[prefixedField].push(message)
          }
        }
      }
      // Handle alternative format (issues array)
      else if (error.issues && Array.isArray(error.issues)) {
        for (const issue of error.issues) {
          const field = issue.path?.join('.') || 'unknown'
          const prefixedField = `${prefix}.${field}`
          const message = typeof issue.message === 'string' ? issue.message : String(issue.message)

          if (!currentErrors[prefixedField]) {
            currentErrors[prefixedField] = []
          }
          currentErrors[prefixedField].push(message)
        }
      }
      // Fallback: messages as key-value object
      else if (error.messages && typeof error.messages === 'object') {
        for (const [field, messageOrArray] of Object.entries(error.messages)) {
          const prefixedField = `${prefix}.${field}`
          const messages = Array.isArray(messageOrArray)
            ? messageOrArray.map(String)
            : [String(messageOrArray)]

          if (!currentErrors[prefixedField]) {
            currentErrors[prefixedField] = []
          }
          currentErrors[prefixedField].push(...messages)
        }
      }

      if (typeof component.setErrorBag === 'function' && Object.keys(currentErrors).length > 0) {
        component.setErrorBag(currentErrors)
      }

      throw error
    }
  }

  /**
   * Get errors for form fields from component's error bag
   */
  getErrorBag(): ErrorBag {
    const component = this.#component as any
    const prefix = this.#propertyName

    if (!component || !prefix || typeof component.getErrorBag !== 'function') {
      return {}
    }

    const componentErrors = component.getErrorBag()
    const formErrors: ErrorBag = {}

    for (const [key, messages] of Object.entries(componentErrors)) {
      if (key.startsWith(`${prefix}.`)) {
        const formKey = key.slice(prefix.length + 1)
        formErrors[formKey] = messages as string[]
      }
    }

    return formErrors
  }

  /**
   * Reset error bag for form fields
   */
  resetErrorBag(fields?: string | string[]): void {
    const component = this.#component as any
    const prefix = this.#propertyName

    if (!component || !prefix || typeof component.resetErrorBag !== 'function') {
      return
    }

    if (!fields) {
      for (const key of this.getPropertyNames()) {
        component.resetErrorBag(`${prefix}.${key}`)
      }
    } else {
      const fieldArray = Array.isArray(fields) ? fields : [fields]
      for (const field of fieldArray) {
        component.resetErrorBag(`${prefix}.${field}`)
      }
    }
  }

  /**
   * Add error for a form field
   */
  addError(field: string, message: string): void {
    const component = this.#component as any
    const prefix = this.#propertyName

    if (!component || !prefix || typeof component.addError !== 'function') {
      return
    }

    component.addError(`${prefix}.${field}`, message)
  }

  /**
   * Check if a field has errors
   */
  hasError(field: string): boolean {
    const errors = this.getErrorBag()
    return (errors[field]?.length ?? 0) > 0
  }

  /**
   * Get errors for a specific field
   */
  getError(field: string): string[] {
    const errors = this.getErrorBag()
    return errors[field] || []
  }

  /**
   * Get all form data
   */
  all(): InferValidationReturnType<this> {
    const data = {}
    for (const key of this.getPropertyNames()) {
      data[key] = (this as any)[key]
    }
    return data as InferValidationReturnType<this>
  }

  /**
   * Get only specified fields
   */
  only<K extends keyof InferValidationReturnType<this>>(
    keys: K[]
  ): Pick<InferValidationReturnType<this>, K> {
    const data = {} as Pick<InferValidationReturnType<this>, K>
    for (const key of keys) {
      if (this.hasProperty(key as string)) {
        ;(data as any)[key] = (this as any)[key]
      }
    }
    return data
  }

  /**
   * Get all fields except specified ones
   */
  except(keys: string[]): Record<string, any> {
    const data: Record<string, any> = {}
    const excludeSet = new Set(keys)
    for (const key of this.getPropertyNames()) {
      if (!excludeSet.has(key)) {
        data[key] = (this as any)[key]
      }
    }
    return data
  }

  /**
   * Fill form with data
   */
  fill(data: Record<string, any>): this {
    for (const [key, value] of Object.entries(data)) {
      if (this.hasProperty(key)) {
        ;(this as any)[key] = value
      }
    }
    return this
  }

  /**
   * Reset form to initial values
   */
  reset(fields?: string | string[]): this {
    if (!fields) {
      for (const key of this.getPropertyNames()) {
        if (key in this.#initialValues) {
          ;(this as any)[key] = this.#initialValues[key]
        }
      }
    } else {
      const fieldArray = Array.isArray(fields) ? fields : [fields]
      for (const key of fieldArray) {
        if (key in this.#initialValues) {
          ;(this as any)[key] = this.#initialValues[key]
        }
      }
    }
    return this
  }

  /**
   * Reset all fields except specified ones
   */
  resetExcept(keys: string[]): this {
    const excludeSet = new Set(keys)
    for (const key of this.getPropertyNames()) {
      if (!excludeSet.has(key) && key in this.#initialValues) {
        ;(this as any)[key] = this.#initialValues[key]
      }
    }
    return this
  }

  /**
   * Get value and reset field
   */
  pull(key: string): any {
    const value = (this as any)[key]
    if (key in this.#initialValues) {
      ;(this as any)[key] = this.#initialValues[key]
    }
    return value
  }

  /**
   * Convert form to array
   */
  toArray(): Record<string, any> {
    return this.all()
  }

  /**
   * Register form class for hydration
   */
  static register(constructor: new () => Form): void {
    registerFormClass(constructor.name, constructor)
  }
}
