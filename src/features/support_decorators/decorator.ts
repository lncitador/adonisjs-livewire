import { Component } from '../../component.js'

export abstract class Decorator {
  declare component: Component

  boot(component: Component): void {
    this.component = component
  }
}
