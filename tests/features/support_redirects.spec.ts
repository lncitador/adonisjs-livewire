import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import { livewireContext, DataStore } from '../../src/store.js'
import ComponentContext from '../../src/component_context.js'
import { store } from '../../src/store.js'
import { SupportRedirects } from '../../src/features/support_redirects/support_redirects.js'

class RedirectsTestComponent extends Component {
  async render() {
    return Promise.resolve('<div>Redirects Test</div>')
  }
}

test.group('HandlesRedirects', () => {
  test('should add redirect URL to store', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard')

        const redirects = store(component).get('redirect')
        assert.isArray(redirects)
        assert.lengthOf(redirects, 1)
        assert.equal(redirects[0], '/dashboard')
      }
    )
  })

  test('should add redirect with navigate flag', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard', true)

        const redirects = store(component).get('redirect')
        assert.equal(redirects[0], '/dashboard')
        assert.isTrue(store(component).has('redirectUsingNavigate'))
      }
    )
  })

  test('should not add navigate flag when navigate is false', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard', false)

        const redirects = store(component).get('redirect')
        assert.equal(redirects[0], '/dashboard')
        assert.isFalse(store(component).has('redirectUsingNavigate'))
      }
    )
  })

  test('should skip render when renderOnRedirect is false', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    // Set renderOnRedirect to false
    app.config.set('livewire.renderOnRedirect', false)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard')

        assert.isTrue(store(component).has('skipRender'))
      }
    )
  })

  test('should not skip render when renderOnRedirect is true', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    // Set renderOnRedirect to true
    app.config.set('livewire.renderOnRedirect', true)

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard')

        assert.isFalse(store(component).has('skipRender'))
      }
    )
  })

  test('should handle multiple redirects', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/first')
        component.redirect('/second')

        const redirects = store(component).get('redirect')
        assert.lengthOf(redirects, 2)
        assert.equal(redirects[0], '/first')
        assert.equal(redirects[1], '/second')
      }
    )
  })
})

test.group('SupportRedirects', () => {
  test('should add redirect effect when redirect exists in store', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard')

        const hook = new SupportRedirects()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.equal(componentContext.effects.redirect, '/dashboard')
      }
    )
  })

  test('should add redirectUsingNavigate effect when flag is set', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/dashboard', true)

        const hook = new SupportRedirects()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.equal(componentContext.effects.redirect, '/dashboard')
        assert.isTrue(componentContext.effects.redirectUsingNavigate)
      }
    )
  })

  test('should not add effects when no redirect in store', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        const hook = new SupportRedirects()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        assert.isUndefined(componentContext.effects.redirect)
        assert.isUndefined(componentContext.effects.redirectUsingNavigate)
      }
    )
  })

  test('should use first redirect URL when multiple redirects exist', async ({
    assert,
    cleanup,
  }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new RedirectsTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const dataStore = new DataStore('test-store')
    const componentContext = new ComponentContext(component, false)

    await livewireContext.run(
      { dataStore, context: componentContext, features: [], ctx },
      async () => {
        component.redirect('/first')
        component.redirect('/second')

        const hook = new SupportRedirects()
        hook.setComponent(component)
        hook.setApp(app)

        await hook.dehydrate(componentContext)

        // Should use first redirect
        assert.equal(componentContext.effects.redirect, '/first')
      }
    )
  })
})
