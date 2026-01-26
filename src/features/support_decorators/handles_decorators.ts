import { Decorator } from './decorator.js'
import { BaseComponent } from '../../base_component.js'

export interface HandlesDecorators extends BaseComponent {}
export class HandlesDecorators {
  #decorators: Decorator[] = []

  getDecorators(): Decorator[] {
    return this.#decorators
  }

  addDecorator(decorator: Decorator): void {
    this.#decorators.push(decorator)
  }
}
