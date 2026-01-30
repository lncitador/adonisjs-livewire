import { compose } from '@poppinss/utils'
import { BaseTestable } from './base_testable.js'
import { MakesAssertions } from './makes_assertions.js'

export class Testable extends compose(BaseTestable, MakesAssertions) {}
