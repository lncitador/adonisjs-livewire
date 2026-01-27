import type { HttpContext } from '@adonisjs/core/http'
import { BaseComponent } from './base_component.js'
import { HandlesJsEvaluation } from './features/support_js_valuation/handles_js_evaluation.js'
import { HandlesPageComponents } from './features/support_page_components/handles_page_components.js'
import { HandlesDecorators } from './features/support_decorators/handles_decorators.js'
import { HandlesRedirects } from './features/support_redirects/handles_redirects.js'
import { HandlesEvents } from './features/support_events/handles_events.js'
import { HandlesValidation } from './features/support_validation/handles_validation.js'
import type { ApplicationService } from '@adonisjs/core/types'
import { compose } from '@poppinss/utils'

interface ComponentOptions {
  ctx: HttpContext
  app: ApplicationService
  id: string
  name: string
}

export class Component extends compose(
  BaseComponent,
  HandlesEvents,
  HandlesRedirects,
  HandlesDecorators,
  HandlesPageComponents,
  HandlesJsEvaluation,
  HandlesValidation
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
