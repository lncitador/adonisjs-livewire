import { Decorator } from '../support_decorators/decorator.js'

export default class Defer extends Decorator {
  constructor(
    public isolate: boolean | undefined = undefined,
    public bundle: boolean | undefined = undefined
  ) {
    super()
  }
}
