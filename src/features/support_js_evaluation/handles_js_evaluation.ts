import { BaseComponent } from '../../base_component.js'
import { store } from '../../store.js'
import { Constructor } from '../../types.js'

/** PHP parity: js($expression, ...$params) stores { expression, params } */
export function HandlesJsEvaluation<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    js(expression: string, ...params: unknown[]) {
      store(this).push('js', { expression, params })
    }
  }
}
