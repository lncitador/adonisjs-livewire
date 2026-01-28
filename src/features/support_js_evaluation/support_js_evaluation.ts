import ComponentHook from '../../component_hook.js'
import { store } from '../../store.js'

export class SupportJsEvaluation extends ComponentHook {
  async dehydrate(context: { addEffect: (k: string, v: unknown) => void }) {
    if (!store(this.component).has('js')) return

    context.addEffect('xjs', store(this.component).get('js'))
  }
}
