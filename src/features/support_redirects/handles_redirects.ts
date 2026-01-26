import { BaseComponent } from '../../base_component.js'
import { Config } from '../../define_config.js'
import { store } from '../../store.js'
import { Constructor } from '../../types.js'

export function HandlesRedirects<T extends Constructor<BaseComponent>>(Base: T) {
  return class extends Base {
    redirect(url: string, navigate: boolean = false) {
      store(this).push('redirect', url)

      if (navigate) store(this).push('redirectUsingNavigate', true)

      const livewireConfig = this.app.config.get<Config>('livewire', {})

      !livewireConfig.renderOnRedirect && this.skipRender()
    }
  }
}
