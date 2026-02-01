import ComponentHook from '../../component_hook.js'
import { Form } from './form.js'
import { beforeFirstDot, afterFirstDot, ucfirst } from './utils.js'

/**
 * SupportFormObjects - Component hook for Form Objects
 * PHP parity: SupportFormObjects
 *
 * This hook manages Form object lifecycle on components:
 * - Auto-initializes Form properties on mount
 * - Handles property update lifecycle (updating/updated hooks on forms)
 * - Sets component reference on form objects
 */
export class SupportFormObjects extends ComponentHook {
  /**
   * Called during component initialization (mount)
   * Initializes all Form properties on the component
   */
  async mount(params: any): Promise<void> {
    await this.initializeFormObjects()
  }

  /**
   * Called during hydration (subsequent requests)
   */
  async hydrate(): Promise<void> {
    await this.initializeFormObjects()
  }

  /**
   * Initialize all Form object properties on the component
   * PHP parity: initializeFormObjects
   */
  private async initializeFormObjects(): Promise<void> {
    const component = this.component as any

    for (const propertyName of this.getFormPropertyNames(component)) {
      const form = component[propertyName]

      if (form instanceof Form) {
        // Set component reference
        form.setComponent(component, propertyName)

        // Call boot hook if this is first time seeing this form class
        if (typeof form.boot === 'function') {
          await form.boot()
        }

        // Call mount hook
        if (typeof form.mount === 'function') {
          await form.mount()
        }
      }
    }
  }

  /**
   * Get all property names that are Form instances
   */
  private getFormPropertyNames(component: any): string[] {
    const formProps: string[] = []

    for (const key of Object.keys(component)) {
      if (key.startsWith('_') || key.startsWith('#')) continue

      try {
        const value = component[key]
        if (value instanceof Form) {
          formProps.push(key)
        }
      } catch {
        // Skip properties that throw when accessed
      }
    }

    return formProps
  }

  /**
   * Called when a property is being updated
   * Handles form.property updates with lifecycle hooks
   * PHP parity: update hook
   */
  async update(
    propertyName: string,
    fullPath: string,
    value: any
  ): Promise<(() => Promise<void>) | void> {
    const component = this.component as any

    // Check if this is a form property update (e.g., "form.title")
    const formPropertyName = beforeFirstDot(fullPath)
    const nestedPath = afterFirstDot(fullPath)

    if (!nestedPath) {
      // Not a nested property, nothing to do
      return
    }

    const form = component[formPropertyName]

    if (!(form instanceof Form)) {
      // Not a Form object
      return
    }

    // Get the immediate property being updated on the form
    const formProperty = beforeFirstDot(nestedPath)

    // Call form's updating hooks
    if (typeof form.updating === 'function') {
      const result = await form.updating(formProperty, value)
      if (result === false) {
        // Prevent update if hook returns false
        return
      }
    }

    // Call property-specific updating hook (e.g., updatingTitle)
    const specificUpdatingHook = `updating${ucfirst(formProperty)}`
    if (typeof (form as any)[specificUpdatingHook] === 'function') {
      const result = await (form as any)[specificUpdatingHook](value)
      if (result === false) {
        return
      }
    }

    // Return callback for after update
    return async () => {
      // Call form's updated hooks
      if (typeof form.updated === 'function') {
        await form.updated(formProperty, value)
      }

      // Call property-specific updated hook (e.g., updatedTitle)
      const specificUpdatedHook = `updated${ucfirst(formProperty)}`
      if (typeof (form as any)[specificUpdatedHook] === 'function') {
        await (form as any)[specificUpdatedHook](value)
      }
    }
  }

  /**
   * Called before component is dehydrated
   * Calls dehydrate hook on all form objects
   */
  async dehydrate(): Promise<void> {
    const component = this.component as any

    for (const propertyName of this.getFormPropertyNames(component)) {
      const form = component[propertyName]

      if (form instanceof Form && typeof form.dehydrate === 'function') {
        await form.dehydrate()
      }
    }
  }
}
