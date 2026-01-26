import { Mixin } from 'ts-mixer'
import type { HttpContext } from '@adonisjs/core/http'
import { BaseComponent } from './base_component.js'
import { HandlesJsEvaluation } from './features/support_js_valuation/handles_js_evaluation.js'
import { HandlesPageComponents } from './features/support_page_components/handles_page_components.js'
import { HandlesDecorators } from './features/support_decorators/handles_decorators.js'
import { HandlesRedirects } from './features/support_redirects/handles_redirects.js'
import { HandlesEvents } from './features/support_events/handles_events.js'
import type { ApplicationService } from '@adonisjs/core/types'

interface ComponentOptions {
  ctx: HttpContext
  app: ApplicationService
  id: string
  name: string
}

// TODO: Migrate to compose from @poppinss/utils in the future
// Currently using ts-mixer as compose requires mixin functions, not classes
export class Component extends Mixin(
  BaseComponent,
  HandlesEvents,
  HandlesRedirects,
  HandlesDecorators,
  HandlesPageComponents,
  HandlesJsEvaluation
) {
  constructor({ ctx, app, id, name }: ComponentOptions) {
    super()

    // Use setters instead of direct property assignment
    this.id = id
    this.name = name
    this.app = app
    this.ctx = ctx
  }
}
