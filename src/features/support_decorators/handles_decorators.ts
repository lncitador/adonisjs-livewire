import { Decorator } from './decorator.js'
import { BaseComponent } from '../../base_component.js'
import { Constructor } from '../../types.js'

export function HandlesDecorators<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    #decorators: Decorator[] = []

    getDecorators(): Decorator[] {
      return this.#decorators
    }

    addDecorator(decorator: Decorator): void {
      this.#decorators.push(decorator)
    }
  }
}
