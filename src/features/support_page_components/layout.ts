import { Component } from '../../component.js'
import { store } from '../../store.js'
import { Decorator } from '../support_decorators/decorator.js'

export default class Layout extends Decorator {
  constructor(
    public name: string = 'components/layouts/main',
    public props: Record<string, any> = {}
  ) {
    super()
  }

  boot(component?: Component) {
    if (component) {
      super.boot(component)
      return
    }
    store(this.component).push('layout', {
      name: this.name,
      props: this.props,
    })
  }
}
