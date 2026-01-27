import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'

/**
 * Test component for events
 */
class EventsTestComponent extends Component {
  eventCalled = false
  eventParams: any = null

  getListeners() {
    return {
      'test-event': 'handleTestEvent',
    }
  }

  handleTestEvent(params: any) {
    this.eventCalled = true
    this.eventParams = params
  }

  async render() {
    return Promise.resolve('<div>Events Test</div>')
  }
}

test.group('Support Events Feature', () => {
  test('should dispatch events and store them', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.dispatch('user-created', { id: 123, name: 'John' })

        const dispatched = store(component).get('dispatched')
        assert.isArray(dispatched)
        assert.lengthOf(dispatched, 1)
        assert.deepEqual(dispatched[0], {
          name: 'user-created',
          params: { id: 123, name: 'John' },
          to: undefined,
          self: undefined,
        })
      }
    )
  })

  test('should dispatch events with to parameter', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.dispatch('user-updated', { id: 456 }, 'other-component')

        const dispatched = store(component).get('dispatched')
        assert.deepEqual(dispatched[0].to, 'other-component')
      }
    )
  })

  test('should dispatch events with self parameter', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.dispatch('user-deleted', { id: 789 }, undefined, true)

        const dispatched = store(component).get('dispatched')
        assert.isTrue(dispatched[0].self)
      }
    )
  })

  test('should dispatch multiple events', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.dispatch('event1', { data: 1 })
        component.dispatch('event2', { data: 2 })
        component.dispatch('event3', { data: 3 })

        const dispatched = store(component).get('dispatched')
        assert.lengthOf(dispatched, 3)
      }
    )
  })

  test('should return empty listeners object by default', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new EventsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const listeners = component.getListeners()
    assert.deepEqual(listeners, { 'test-event': 'handleTestEvent' })
  })

  test('should handle component without getListeners override', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    class SimpleComponent extends Component {
      async render() {
        return Promise.resolve('<div>Simple</div>')
      }
    }
    const component = new SimpleComponent({ ctx, app, id: 'test-id', name: 'test' })

    const listeners = component.getListeners()
    assert.deepEqual(listeners, {})
  })
})
