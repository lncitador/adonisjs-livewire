import type { HttpContext } from '@adonisjs/core/http'
import type { ApplicationService, HttpRouterService } from '@adonisjs/core/types'
import type { Component } from '../../component.js'
import type { ComponentSnapshot, ComponentEffects, ComponentConstructor } from '../../types.js'
import { ComponentState } from './component_state.js'
import { MakesAssertions } from './makes_assertions.js'
import { livewireContext, DataStore } from '../../store.js'
import ComponentContext from '../../component_context.js'
import Livewire from '../../livewire.js'
import { HttpContextFactory } from '@adonisjs/http-server/factories'

/**
 * Type helper to convert MakesAssertions methods to return ChainableTest
 */
type ChainableAssertions<T> = {
  [K in keyof T]: T[K] extends (...args: infer Args) => any
    ? (...args: Args) => ChainableTest
    : T[K]
}

/**
 * Chainable promise wrapper for fluent testing API
 * Allows method chaining on asynchronous test operations
 */
class ChainableTest implements PromiseLike<ComponentTest> {
  constructor(private promise: Promise<ComponentTest>) {
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver)

        // If the property exists on ChainableTest, return it
        if (value !== undefined) {
          return value
        }

        // List of assertion methods that should be chainable
        const assertionMethods = [
          'assertSet',
          'assertNotSet',
          'assertCount',
          'assertSee',
          'assertDontSee',
          'assertSeeHtml',
          'assertDontSeeHtml',
          'assertDispatched',
          'assertNotDispatched',
        ]

        const isAssertionMethod = assertionMethods.includes(prop as string)

        // For unknown methods, assume they exist on ComponentTest
        // and wrap them to maintain the chain
        return (...args: any[]) => {
          return new ChainableTest(
            target.promise.then((test) => {
              const method = (test as any)[prop]

              if (typeof method !== 'function') {
                throw new Error(`Method '${String(prop)}' does not exist on ComponentTest`)
              }

              const result = method.apply(test, args)

              // For assertion methods, they return 'this' synchronously when in context
              if (isAssertionMethod) {
                return test
              }

              // If the result is a Promise, wait for it and return the test
              if (result && typeof result.then === 'function') {
                return result.then(() => test)
              }

              // Otherwise just return the test for chaining
              return test
            })
          )
        }
      },
    }) as ChainableTest & ChainableAssertions<MakesAssertions>
  }

  then<TResult1 = ComponentTest, TResult2 = never>(
    onfulfilled?: ((value: ComponentTest) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): PromiseLike<ComponentTest | TResult> {
    return this.promise.catch(onrejected)
  }

  finally(onfinally?: (() => void) | undefined | null): PromiseLike<ComponentTest> {
    return this.promise.finally(onfinally)
  }

  // Chainable mutation methods - these just pass through to the test methods
  mount(...params: any[]): ChainableTest {
    return new ChainableTest(
      this.promise.then(async (test) => {
        const chainable = test.mount(...params)
        await chainable
        return test
      })
    )
  }

  set(propertyName: string, value: any): ChainableTest {
    return new ChainableTest(
      this.promise.then(async (test) => {
        const chainable = test.set(propertyName, value)
        await chainable
        return test
      })
    )
  }

  call(method: string, ...params: any[]): ChainableTest {
    return new ChainableTest(
      this.promise.then(async (test) => {
        const chainable = test.call(method, ...params)
        await chainable
        return test
      })
    )
  }

  toggle(propertyName: string): ChainableTest {
    return new ChainableTest(
      this.promise.then(async (test) => {
        const chainable = test.toggle(propertyName)
        await chainable
        return test
      })
    )
  }

  // Terminal methods that return values (wrapped in promises)
  get(propertyName: string): Promise<any> {
    return this.promise.then((test) => test.get(propertyName))
  }

  snapshot(): Promise<ComponentSnapshot> {
    return this.promise.then((test) => test.snapshot())
  }

  effects(): Promise<ComponentEffects> {
    return this.promise.then((test) => test.effects())
  }

  html(): Promise<string> {
    return this.promise.then((test) => test.html())
  }

  instance(): Promise<Component> {
    return this.promise.then((test) => test.instance())
  }
}

// Add interface declaration to extend ChainableTest with MakesAssertions methods
interface ChainableTest extends ChainableAssertions<MakesAssertions> {}

/**
 * Main testing interface for Livewire components
 * Provides fluent API for testing component behavior
 */
export class ComponentTest extends MakesAssertions {
  private readonly componentClass: ComponentConstructor
  private readonly ctx: HttpContext
  private readonly app: ApplicationService
  private readonly router: HttpRouterService
  private mountParams: any[] = []
  private readonly dataStore: DataStore
  private readonly componentContext: ComponentContext
  private readonly features: any[]

  constructor(
    componentClass: ComponentConstructor,
    app: ApplicationService,
    router: HttpRouterService,
    ctx: HttpContext
  ) {
    const initialComponent = new componentClass({
      ctx,
      app,
      router,
      id: ComponentTest.generateId(),
      name: 'test-component',
    })

    const initialSnapshot: ComponentSnapshot = {
      data: {},
      memo: {
        id: initialComponent.__id,
        name: initialComponent.__name,
      },
      checksum: '',
    }

    super(new ComponentState(initialComponent, initialSnapshot))

    this.componentClass = componentClass
    this.app = app
    this.router = router
    this.ctx = ctx
    this.dataStore = new DataStore('test-store')
    this.componentContext = new ComponentContext(initialComponent)
    this.features = this.createFeatures(initialComponent)

    // Return proxied version
    return this.createProxy()
  }

  static async create(
    componentClass: ComponentConstructor,
    app: ApplicationService,
    router?: HttpRouterService,
    ctx?: HttpContext
  ) {
    if (!router) router = await app.container.make('router')
    if (!ctx) {
      ctx = new HttpContextFactory().create()
    }

    return new ComponentTest(componentClass, app, router, ctx)
  }

  /**
   * Creates a proxy that wraps all methods with livewireContext.run
   */
  private createProxy(): this & ChainableAssertions<MakesAssertions> {
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const value = Reflect.get(target, prop, receiver)

        // Skip non-function properties and special properties
        if (
          typeof value !== 'function' ||
          prop === 'constructor' ||
          prop === 'then' ||
          prop === 'catch' ||
          prop === 'finally'
        ) {
          return value
        }

        // These methods already handle context internally, don't wrap them
        const methodsWithInternalContext = ['mount', 'set', 'call', 'toggle', 'instance']

        // Synchronous getter methods that just read state
        const synchronousMethods = ['get', 'html', 'snapshot', 'effects', 'getState']

        if (
          methodsWithInternalContext.includes(prop as string) ||
          synchronousMethods.includes(prop as string)
        ) {
          return value.bind(target)
        }

        // Methods from MakesAssertions (these should be chainable)
        const assertionMethods = [
          'assertSet',
          'assertNotSet',
          'assertCount',
          'assertSee',
          'assertDontSee',
          'assertSeeHtml',
          'assertDontSeeHtml',
          'assertDispatched',
          'assertNotDispatched',
        ]

        const isAssertionMethod = assertionMethods.includes(prop as string)

        // Wrap the method with livewireContext.run
        return (...args: any[]) => {
          if (isAssertionMethod) {
            // For assertion methods, execute synchronously within context
            // This allows them to throw errors immediately for assert.throws() to work
            livewireContext.run(
              {
                dataStore: this.dataStore,
                context: this.componentContext,
                features: this.features,
                ctx: this.ctx,
              },
              () => {
                value.apply(target, args)
              }
            )
            // Return target to allow chaining
            return target
          } else {
            // For other methods, return promise
            return livewireContext.run(
              {
                dataStore: this.dataStore,
                context: this.componentContext,
                features: this.features,
                ctx: this.ctx,
              },
              async () => {
                return await value.apply(target, args)
              }
            )
          }
        }
      },
    }) as this & ChainableAssertions<MakesAssertions>
  }

  /**
   * Initialize the component with mount lifecycle
   */
  mount(...params: any[]): ChainableTest {
    const promise = livewireContext.run(
      {
        dataStore: this.dataStore,
        context: this.componentContext,
        features: this.features,
        ctx: this.ctx,
      },
      () => this.executeMount(...params)
    )
    return new ChainableTest(promise)
  }

  /**
   * Set a component property value
   */
  set(propertyName: string, value: any): ChainableTest {
    const promise = livewireContext.run(
      {
        dataStore: this.dataStore,
        context: this.componentContext,
        features: this.features,
        ctx: this.ctx,
      },
      () => this.executeSet(propertyName, value)
    )
    return new ChainableTest(promise)
  }

  /**
   * Call a component method
   */
  call(method: string, ...params: any[]): ChainableTest {
    const promise = livewireContext.run(
      {
        dataStore: this.dataStore,
        context: this.componentContext,
        features: this.features,
        ctx: this.ctx,
      },
      () => this.executeCall(method, ...params)
    )
    return new ChainableTest(promise)
  }

  /**
   * Toggle a boolean property
   */
  toggle(propertyName: string): ChainableTest {
    const promise = livewireContext.run(
      {
        dataStore: this.dataStore,
        context: this.componentContext,
        features: this.features,
        ctx: this.ctx,
      },
      () => this.executeToggle(propertyName)
    )
    return new ChainableTest(promise)
  }

  /**
   * Get a component property value
   */
  get(propertyName: string): any {
    return this.state.get(propertyName)
  }

  /**
   * Get the current component snapshot
   */
  snapshot(): ComponentSnapshot {
    return this.state.getSnapshot()
  }

  /**
   * Get the current component effects
   */
  effects(): ComponentEffects {
    return this.state.getEffects()
  }

  /**
   * Get the rendered HTML
   */
  html(): string {
    return this.state.getHtml()
  }

  /**
   * Get the component instance
   */
  instance(): Component {
    return this.state.getComponent()
  }

  /**
   * Get the component state
   */
  getState(): ComponentState {
    return this.state
  }

  // Private execution methods

  private async executeMount(...params: any[]): Promise<this> {
    this.mountParams = params

    const component = this.state.getComponent()
    this.componentContext.mounting = true

    if (this.hasMethod(component, 'mount')) {
      await (component as any).mount(...params)
    }

    await this.updateComponentState(component, this.componentContext)

    return this
  }

  private async executeSet(propertyName: string, value: any): Promise<this> {
    const component = this.state.getComponent() as any
    component[propertyName] = value
    await this.updateComponentState(component, this.componentContext)
    return this
  }

  private async executeCall(method: string, ...params: any[]): Promise<this> {
    const component = this.state.getComponent() as any

    if (!this.hasMethod(component, method)) {
      throw new Error(`Method '${method}' does not exist on component`)
    }

    await component[method](...params)
    await this.updateComponentState(component, this.componentContext)

    return this
  }

  private async executeToggle(propertyName: string): Promise<this> {
    const currentValue = this.get(propertyName)
    return this.executeSet(propertyName, !currentValue)
  }

  // Helper methods

  private createFeatures(component: Component) {
    return Livewire.FEATURES.map((Feature) => {
      const feature = new Feature()
      feature.setComponent(component)
      feature.setApp(this.app)
      return feature
    })
  }

  private async updateComponentState(
    component: Component,
    componentContext: ComponentContext
  ): Promise<void> {
    const html = await component.render()
    const livewire = await component.app.container.make('livewire')
    const snapshot = await livewire.snapshot(component, componentContext)
    const effects = componentContext.effects

    this.state.update(snapshot, effects, html)
  }

  private hasMethod(obj: any, methodName: string): boolean {
    return typeof obj[methodName] === 'function'
  }

  private static generateId(): string {
    return 'test-' + Math.random().toString(36).substring(2, 11)
  }
}

// Maintain backward compatibility
export { ComponentTest as Testable }
