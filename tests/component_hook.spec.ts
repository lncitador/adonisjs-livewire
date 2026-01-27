import { test } from '@japa/runner'
import ComponentHook from '../src/component_hook.js'
import { BaseComponent } from '../src/base_component.js'
import ComponentContext from '../src/component_context.js'
import { setupApp } from './helpers.js'
import { DataStore, livewireContext } from '../src/store.js'

// Test class that extends ComponentHook
class TestHook extends ComponentHook {
  bootCalled = false
  mountCalled = false
  hydrateCalled = false
  updateCalled = false
  callCalled = false
  renderCalled = false
  dehydrateCalled = false
  destroyCalled = false
  exceptionCalled = false

  bootParams: any[] = []
  mountParams: any[] = []
  hydrateParams: any[] = []
  updateParams: any[] = []
  callParams: any[] = []
  renderParams: any[] = []
  dehydrateParams: any[] = []
  destroyParams: any[] = []
  exceptionParams: any[] = []

  async boot(...params: any[]) {
    this.bootCalled = true
    this.bootParams = params
  }

  async mount(...params: any[]) {
    this.mountCalled = true
    this.mountParams = params
  }

  async hydrate(...params: any[]) {
    this.hydrateCalled = true
    this.hydrateParams = params
  }

  async update(propertyName: string, fullPath: string, newValue: any) {
    this.updateCalled = true
    this.updateParams = [propertyName, fullPath, newValue]
    return async () => {
      // Callback function
    }
  }

  async call(
    method: string,
    params: any[],
    returnEarly: any,
    metadata?: any,
    componentContext?: ComponentContext
  ) {
    this.callCalled = true
    this.callParams = [method, params, returnEarly, metadata, componentContext]
    return async () => {
      // Callback function
    }
  }

  async render(...params: any[]) {
    this.renderCalled = true
    this.renderParams = params
    return async () => {
      // Callback function
    }
  }

  async dehydrate(...params: any[]) {
    this.dehydrateCalled = true
    this.dehydrateParams = params
  }

  async destroy(...params: any[]) {
    this.destroyCalled = true
    this.destroyParams = params
  }

  async exception(...params: any[]) {
    this.exceptionCalled = true
    this.exceptionParams = params
  }
}

// Test class without hooks
class EmptyHook extends ComponentHook {}

test.group('ComponentHook', () => {
  test('should set component', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'

    hook.setComponent(component)

    assert.equal(hook.component, component)
  })

  test('should set app', async ({ assert }) => {
    const { app } = await setupApp()
    const hook = new TestHook()

    hook.setApp(app)

    assert.equal(hook.app, app)
  })

  test('should call boot hook if exists', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await hook.callBoot('param1', 'param2')

    assert.isTrue(hook.bootCalled)
    assert.deepEqual(hook.bootParams, ['param1', 'param2'])
  })

  test('should not throw when boot hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await assert.doesNotReject(async () => {
      await hook.callBoot()
    })
  })

  test('should call mount hook if exists', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await hook.callMount('param1', 'param2')

    assert.isTrue(hook.mountCalled)
    assert.deepEqual(hook.mountParams, ['param1', 'param2'])
  })

  test('should not throw when mount hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await assert.doesNotReject(async () => {
      await hook.callMount()
    })
  })

  test('should call hydrate hook if exists', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await hook.callHydrate('param1', 'param2')

    assert.isTrue(hook.hydrateCalled)
    assert.deepEqual(hook.hydrateParams, ['param1', 'param2'])
  })

  test('should not throw when hydrate hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await assert.doesNotReject(async () => {
      await hook.callHydrate()
    })
  })

  test('should call update hook and return callback executor', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    const callbackExecutor = await hook.callUpdate('count', 'count', 5)

    assert.isTrue(hook.updateCalled)
    assert.deepEqual(hook.updateParams, ['count', 'count', 5])
    assert.isFunction(callbackExecutor)

    // Execute callbacks
    await callbackExecutor()
    // Should not throw
  })

  test('should not throw when update hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    const callbackExecutor = await hook.callUpdate('count', 'count', 5)

    assert.isFunction(callbackExecutor)
    await assert.doesNotReject(async () => {
      await callbackExecutor()
    })
  })

  test('should call call hook and return callback executor', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)
    const context = new ComponentContext(component, false)

    const returnEarly = () => {}
    const callbackExecutor = await hook.callCall(
      'increment',
      [1, 2],
      returnEarly,
      { meta: 'data' },
      context
    )

    assert.isTrue(hook.callCalled)
    assert.equal(hook.callParams[0], 'increment')
    assert.deepEqual(hook.callParams[1], [1, 2])
    assert.equal(hook.callParams[2], returnEarly)
    assert.deepEqual(hook.callParams[3], { meta: 'data' })
    assert.equal(hook.callParams[4], context)
    assert.isFunction(callbackExecutor)

    // Execute callbacks
    await callbackExecutor()
    // Should not throw
  })

  test('should not throw when call hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    const callbackExecutor = await hook.callCall('increment', [1], () => {})

    assert.isFunction(callbackExecutor)
    await assert.doesNotReject(async () => {
      await callbackExecutor()
    })
  })

  test('should call render hook and return callback executor', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    const callbackExecutor = await hook.callRender('param1', 'param2')

    assert.isTrue(hook.renderCalled)
    assert.deepEqual(hook.renderParams, ['param1', 'param2'])
    assert.isFunction(callbackExecutor)

    // Execute callbacks
    await callbackExecutor()
    // Should not throw
  })

  test('should not throw when render hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    const callbackExecutor = await hook.callRender()

    assert.isFunction(callbackExecutor)
    await assert.doesNotReject(async () => {
      await callbackExecutor()
    })
  })

  test('should call dehydrate hook if exists', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await hook.callDehydrate('param1', 'param2')

    assert.isTrue(hook.dehydrateCalled)
    assert.deepEqual(hook.dehydrateParams, ['param1', 'param2'])
  })

  test('should not throw when dehydrate hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await assert.doesNotReject(async () => {
      await hook.callDehydrate()
    })
  })

  test('should call destroy hook if exists', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await hook.callDestroy('param1', 'param2')

    assert.isTrue(hook.destroyCalled)
    assert.deepEqual(hook.destroyParams, ['param1', 'param2'])
  })

  test('should not throw when destroy hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await assert.doesNotReject(async () => {
      await hook.callDestroy()
    })
  })

  test('should call exception hook if exists', async ({ assert }) => {
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await hook.callException('param1', 'param2')

    assert.isTrue(hook.exceptionCalled)
    assert.deepEqual(hook.exceptionParams, ['param1', 'param2'])
  })

  test('should not throw when exception hook does not exist', async ({ assert }) => {
    const hook = new EmptyHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)

    await assert.doesNotReject(async () => {
      await hook.callException()
    })
  })

  test('should execute multiple callbacks from update hook', async ({ assert }) => {
    const hook1 = new TestHook()
    const hook2 = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook1.setComponent(component)
    hook2.setComponent(component)

    const callbackExecutor1 = await hook1.callUpdate('count', 'count', 5)
    const callbackExecutor2 = await hook2.callUpdate('count', 'count', 6)

    // Both should return callback executors
    assert.isFunction(callbackExecutor1)
    assert.isFunction(callbackExecutor2)

    await assert.doesNotReject(async () => {
      await callbackExecutor1()
      await callbackExecutor2()
    })
  })

  test('should use store methods', async ({ assert }) => {
    const { app } = await setupApp()
    const hook = new TestHook()
    const component = new BaseComponent()
    component.__id = 'comp-1'
    component.__name = 'TestComponent'
    hook.setComponent(component)
    hook.setApp(app)

    const dataStore = new DataStore('test-id')
    const context = new ComponentContext(component, false)

    await livewireContext.run({ dataStore, context, features: [], ctx: {} as any }, async () => {
      hook.storeSet('key1', 'value1')
      hook.storePush('items', 'item1')
      hook.storePush('items2', 'item2', 'key2')

      assert.equal(hook.storeGet('key1'), 'value1')
      assert.isTrue(hook.storeHas('key1'))
      assert.deepEqual(hook.storeGet('items'), ['item1'])
      assert.deepEqual(hook.storeGet('items2'), { key2: 'item2' })
    })
  })

  test('getProperties should return undefined by default', async ({ assert }) => {
    const hook = new EmptyHook()

    const result = hook.getProperties()

    assert.isUndefined(result)
  })

  test('getProperty should return undefined when properties are undefined', async ({ assert }) => {
    const hook = new EmptyHook()

    const result = hook.getProperty('someKey')

    assert.isUndefined(result)
  })
})
