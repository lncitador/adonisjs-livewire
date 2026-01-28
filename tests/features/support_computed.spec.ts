import { test } from '@japa/runner'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { setupApp } from '../helpers.js'
import { Component } from '../../src/component.js'
import Computed from '../../src/features/support_computed/computed.js'
import { Edge } from 'edge.js'

class ComputedTestComponent extends Component {
  firstName = 'John'
  lastName = 'Doe'

  async fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  async total() {
    return 100
  }

  async render() {
    return Promise.resolve('<div>Computed Test</div>')
  }
}

test.group('Computed Decorator', () => {
  test('should create Computed decorator with name and method', async ({ assert }) => {
    const decorator = new Computed('fullName', 'fullName')

    assert.equal(decorator.name, 'fullName')
    assert.equal(decorator.method, 'fullName')
  })

  test('should share computed value with view on render', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ComputedTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    const decorator = new Computed('fullName', 'fullName')
    decorator.boot(component)

    let sharedData: Record<string, any> = {}
    renderer.share = (data: Record<string, any>) => {
      sharedData = { ...sharedData, ...data }
      return renderer
    }

    await decorator.render()

    assert.equal(sharedData.fullName, 'John Doe')
  })

  test('should not share if method does not exist', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ComputedTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    const decorator = new Computed('nonExistent', 'nonExistentMethod')
    decorator.boot(component)

    let shareCalled = false
    renderer.share = () => {
      shareCalled = true
      return renderer
    }

    await decorator.render()

    assert.isFalse(shareCalled)
  })

  test('should handle async computed methods', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    const ctx = new HttpContextFactory().create()
    const component = new ComputedTestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    const decorator = new Computed('total', 'total')
    decorator.boot(component)

    let sharedData: Record<string, any> = {}
    renderer.share = (data: Record<string, any>) => {
      sharedData = { ...sharedData, ...data }
      return renderer
    }

    await decorator.render()

    assert.equal(sharedData.total, 100)
  })

  test('should handle different value types', async ({ assert, cleanup }) => {
    const { app } = await setupApp()
    cleanup(() => app.terminate())

    class TestComponent extends Component {
      async stringValue() {
        return 'string'
      }

      async numberValue() {
        return 42
      }

      async booleanValue() {
        return true
      }

      async objectValue() {
        return { nested: 'value' }
      }

      async arrayValue() {
        return [1, 2, 3]
      }

      async render() {
        return Promise.resolve('<div>Test</div>')
      }
    }

    const ctx = new HttpContextFactory().create()
    const component = new TestComponent({ ctx, app, id: 'test-id', name: 'test' })

    const edge = Edge.create()
    const renderer = edge.createRenderer()
    component.view = renderer

    const decorator1 = new Computed('stringValue', 'stringValue')
    const decorator2 = new Computed('numberValue', 'numberValue')
    const decorator3 = new Computed('booleanValue', 'booleanValue')
    const decorator4 = new Computed('objectValue', 'objectValue')
    const decorator5 = new Computed('arrayValue', 'arrayValue')

    decorator1.boot(component)
    decorator2.boot(component)
    decorator3.boot(component)
    decorator4.boot(component)
    decorator5.boot(component)

    const sharedData: Record<string, any> = {}
    renderer.share = (data: Record<string, any>) => {
      Object.assign(sharedData, data)
      return renderer
    }

    await decorator1.render()
    await decorator2.render()
    await decorator3.render()
    await decorator4.render()
    await decorator5.render()

    assert.equal(sharedData.stringValue, 'string')
    assert.equal(sharedData.numberValue, 42)
    assert.isTrue(sharedData.booleanValue)
    assert.deepEqual(sharedData.objectValue, { nested: 'value' })
    assert.deepEqual(sharedData.arrayValue, [1, 2, 3])
  })
})
