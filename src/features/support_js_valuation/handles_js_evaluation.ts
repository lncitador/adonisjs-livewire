import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'
import { Constructor } from '../../types.js'

export function HandlesJsEvaluation<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    js(expression: string) {
      store(this).push('js', expression)
    }
  }
}
