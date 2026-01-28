import { Decorator } from '../support_decorators/decorator.js'
import { CannotUpdateLockedPropertyException } from './cannot_update_locked_property_exception.js'

export default class Locked extends Decorator {
  constructor(public name: string) {
    super()
  }

  update(fullPath: string, _newValue?: unknown) {
    const isExact = fullPath === this.name
    const isDeep = fullPath.startsWith(this.name + '.')
    if (!isExact && !isDeep) {
      return
    }
    throw new CannotUpdateLockedPropertyException(this.name)
  }
}
