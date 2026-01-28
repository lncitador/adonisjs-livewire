import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import { SupportJsEvaluation } from '../../src/features/support_js_valuation/support_js_evaluation.js'

class JsEvaluationTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>JS Evaluation Test</div>')
  }
}

test.group('HandlesJsEvaluation', () => {
  test('should add js expression to store', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.js('console.log("test")')

        const jsExpressions = store(component).get('js')
        assert.isArray(jsExpressions)
        assert.lengthOf(jsExpressions, 1)
        assert.equal(jsExpressions[0], 'console.log("test")')
      }
    )
  })

  test('should add multiple js expressions to store', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.js('console.log("first")')
        component.js('console.log("second")')
        component.js('alert("third")')

        const jsExpressions = store(component).get('js')
        assert.isArray(jsExpressions)
        assert.lengthOf(jsExpressions, 3)
        assert.equal(jsExpressions[0], 'console.log("first")')
        assert.equal(jsExpressions[1], 'console.log("second")')
        assert.equal(jsExpressions[2], 'alert("third")')
      }
    )
  })

  test('should handle different types of js expressions', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.js('$wire.set("count", 5)')
        component.js('window.location.reload()')
        component.js('$dispatch("event", { data: 123 })')

        const jsExpressions = store(component).get('js')
        assert.lengthOf(jsExpressions, 3)
        assert.include(jsExpressions, '$wire.set("count", 5)')
        assert.include(jsExpressions, 'window.location.reload()')
        assert.include(jsExpressions, '$dispatch("event", { data: 123 })')
      }
    )
  })
})

test.group('SupportJsEvaluation', () => {
  test('should add xjs effect when js expressions exist in store', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.js('console.log("test")')

        const hook = new SupportJsEvaluation()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.deepEqual(componentContext.effects.xjs, ['console.log("test")'])
      }
    )
  })

  test('should not add xjs effect when no js expressions in store', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportJsEvaluation()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.isUndefined(componentContext.effects.xjs)
      }
    )
  })

  test('should add all js expressions to xjs effect', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new JsEvaluationTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.js('console.log("first")')
        component.js('console.log("second")')
        component.js('alert("third")')

        const hook = new SupportJsEvaluation()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.deepEqual(componentContext.effects.xjs, [
          'console.log("first")',
          'console.log("second")',
          'alert("third")',
        ])
      }
    )
  })
})
