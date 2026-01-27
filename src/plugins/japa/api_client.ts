import type { PluginFn } from '@japa/runner/types'
import { ApiRequest, ApiResponse } from '@japa/api-client'
import type { ApplicationService } from '@adonisjs/core/types'

import { LivewireHeaders } from '../../headers.js'
import type { ComponentSnapshot, ComponentEffects } from '../../types.js'

/**
 * Parsed Livewire components with snapshot already parsed
 */
type ParsedLivewireComponents = Array<{
  snapshot: ComponentSnapshot
  effects: ComponentEffects
}>

declare module '@japa/api-client' {
  /**
   * Extended ApiRequest interface with Livewire specific methods
   *
   * Adds methods to configure requests for testing Livewire applications,
   * including setting required headers for Livewire requests.
   */
  export interface ApiRequest {
    /**
     * Set `X-Livewire` header on the request to mark it as a Livewire request
     *
     * This method configures the request to be treated as a Livewire AJAX request
     * by setting the required headers that Livewire uses for identification.
     *
     * @returns The ApiRequest instance for method chaining
     *
     * @example
     * ```js
     * const response = await client
     *   .post('/livewire/update')
     *   .withLivewire()
     * ```
     */
    withLivewire(this: ApiRequest): this

    /**
     * Set header for Livewire navigation requests
     *
     * Configures the request to be treated as a Livewire navigation request,
     * which enables features like progress bar and optimized navigation.
     *
     * @returns The ApiRequest instance for method chaining
     *
     * @example
     * ```js
     * const response = await client
     *   .get('/dashboard')
     *   .withLivewireNavigate()
     * ```
     */
    withLivewireNavigate(this: ApiRequest): this
  }

  /**
   * Extended ApiResponse interface with Livewire specific properties and assertions
   *
   * Provides getters for accessing Livewire response data and assertion methods
   * for validating Livewire responses in tests.
   */
  export interface ApiResponse {
    /**
     * The array of components returned in the Livewire response
     *
     * @example
     * ```js
     * console.log(response.livewireComponents) // [{ snapshot: {...}, effects: {...} }]
     * ```
     */
    livewireComponents?: ParsedLivewireComponents

    /**
     * The snapshot of the first component in the response
     *
     * @example
     * ```js
     * console.log(response.livewireSnapshot.memo.name) // 'Users/Index'
     * ```
     */
    livewireSnapshot?: ComponentSnapshot

    /**
     * The effects of the first component in the response
     *
     * @example
     * ```js
     * console.log(response.livewireEffects.html) // '<div>...</div>'
     * ```
     */
    livewireEffects?: ComponentEffects

    /**
     * The name of the first Livewire component returned in the response
     *
     * @example
     * ```js
     * console.log(response.livewireComponent) // 'Users/Index'
     * ```
     */
    livewireComponent?: string

    /**
     * Assert that the response contains the expected Livewire component
     *
     * @param component - Expected component name
     * @returns The ApiResponse instance for method chaining
     *
     * @throws AssertionError when component names don't match
     *
     * @example
     * ```js
     * response.assertLivewireComponent('Users/Index')
     * ```
     */
    assertLivewireComponent(this: ApiResponse, component: string): this

    /**
     * Assert that the response snapshot exactly matches the provided snapshot
     *
     * @param snapshot - Expected snapshot object to match exactly
     * @returns The ApiResponse instance for method chaining
     *
     * @throws AssertionError when snapshots don't match exactly
     *
     * @example
     * ```js
     * response.assertLivewireSnapshot({
     *   data: { users: [] },
     *   memo: { name: 'Users/Index', id: 'abc123' },
     *   checksum: '...'
     * })
     * ```
     */
    assertLivewireSnapshot(this: ApiResponse, snapshot: ComponentSnapshot): this

    /**
     * Assert that the response snapshot contains a subset of the provided properties
     *
     * @param partial - Expected subset of snapshot properties to be present
     * @returns The ApiResponse instance for method chaining
     *
     * @throws AssertionError when expected properties are not found
     *
     * @example
     * ```js
     * response.assertLivewireSnapshotContains({
     *   memo: { name: 'Users/Index' }
     * })
     * ```
     */
    assertLivewireSnapshotContains(this: ApiResponse, partial: Partial<ComponentSnapshot>): this

    /**
     * Assert that the response effects exactly match the provided effects
     *
     * @param effects - Expected effects object to match exactly
     * @returns The ApiResponse instance for method chaining
     *
     * @throws AssertionError when effects don't match exactly
     *
     * @example
     * ```js
     * response.assertLivewireEffects({
     *   html: '<div>Updated</div>',
     *   dispatches: ['user-updated']
     * })
     * ```
     */
    assertLivewireEffects(this: ApiResponse, effects: ComponentEffects): this

    /**
     * Assert that the response effects contain a subset of the provided properties
     *
     * @param partial - Expected subset of effects properties to be present
     * @returns The ApiResponse instance for method chaining
     *
     * @throws AssertionError when expected properties are not found
     *
     * @example
     * ```js
     * response.assertLivewireEffectsContains({
     *   redirect: '/dashboard'
     * })
     * ```
     */
    assertLivewireEffectsContains(this: ApiResponse, partial: Partial<ComponentEffects>): this
  }
}

/**
 * Ensure the response is a Livewire response, otherwise throw an error
 *
 * @throws Error when the response is not a Livewire response
 */
function ensureIsLivewireResponse(this: ApiResponse) {
  const body = this.body()
  const hasLivewireHeader = this.header('x-livewire')
  const hasLivewireStructure =
    body && typeof body === 'object' && 'components' in body && Array.isArray(body.components)

  if (!hasLivewireHeader && !hasLivewireStructure) {
    throw new Error(
      'Not a Livewire response. Make sure to use "withLivewire()" method when making the request'
    )
  }
}

function ensureHasAssert(assertLib: unknown): asserts assertLib {
  if (!assertLib) {
    throw new Error(
      'Response assertions are not available. Make sure to install the @japa/assert plugin'
    )
  }
}

/**
 * Parse the Livewire response body and extract components
 */
function parseLivewireResponse(body: any): ParsedLivewireComponents | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  // Check if it's a Livewire update response structure
  if ('components' in body && Array.isArray(body.components)) {
    return body.components.map((component: any) => {
      let snapshot: ComponentSnapshot
      try {
        snapshot =
          typeof component.snapshot === 'string'
            ? JSON.parse(component.snapshot)
            : component.snapshot
      } catch {
        snapshot = component.snapshot
      }

      return {
        snapshot,
        effects: component.effects || {},
      }
    })
  }

  return null
}

/**
 * Japa plugin that extends the API client with Livewire testing capabilities
 *
 * This plugin adds methods to ApiRequest and ApiResponse classes to support
 * testing Livewire applications, including snapshot and effects assertions.
 *
 * @param app - The AdonisJS application service instance
 * @returns Japa plugin function
 *
 * @example
 * ```js
 * // Configure in tests/bootstrap.ts
 * import { livewireApiClient } from '@adonisjs/livewire/plugins/japa/api_client'
 *
 * export const plugins: Config['plugins'] = [
 *   assert(),
 *   apiClient(app),
 *   livewireApiClient(app)
 * ]
 * ```
 *
 * @example
 * ```js
 * // Use in tests
 * test('updates user component', async ({ client }) => {
 *   const response = await client
 *     .post('/livewire/update')
 *     .withLivewire()
 *
 *   response.assertLivewireComponent('Users/Index')
 *   response.assertLivewireEffectsContains({
 *     html: expect.stringContaining('Updated')
 *   })
 * })
 * ```
 */
export function livewireApiClient(app: ApplicationService): PluginFn {
  return async () => {
    ApiRequest.macro('withLivewire', function () {
      this.header(LivewireHeaders.Livewire, '1')
      return this
    })

    ApiRequest.macro('withLivewireNavigate', function () {
      this.header(LivewireHeaders.Navigate, '1')
      return this
    })

    /**
     * Response getters
     */
    ApiResponse.getter('livewireComponents', function (this: ApiResponse) {
      ensureIsLivewireResponse.call(this)
      const parsed = parseLivewireResponse(this.body())
      return parsed || undefined
    })

    ApiResponse.getter('livewireSnapshot', function (this: ApiResponse) {
      ensureIsLivewireResponse.call(this)
      const components = this.livewireComponents
      if (!components || components.length === 0) {
        return undefined
      }
      return components[0].snapshot
    })

    ApiResponse.getter('livewireEffects', function (this: ApiResponse) {
      ensureIsLivewireResponse.call(this)
      const components = this.livewireComponents
      if (!components || components.length === 0) {
        return undefined
      }
      return components[0].effects
    })

    ApiResponse.getter('livewireComponent', function (this: ApiResponse) {
      ensureIsLivewireResponse.call(this)
      const snapshot = this.livewireSnapshot
      return snapshot?.memo?.name
    })

    /**
     * Response assertions
     */
    ApiResponse.macro('assertLivewireComponent', function (component) {
      ensureIsLivewireResponse.call(this)
      ensureHasAssert(this.assert)
      const actualComponent = this.livewireComponent
      this.assert.equal(actualComponent, component)
      return this
    })

    ApiResponse.macro('assertLivewireSnapshot', function (snapshot) {
      ensureIsLivewireResponse.call(this)
      ensureHasAssert(this.assert)
      const actualSnapshot = this.livewireSnapshot
      this.assert.deepEqual(actualSnapshot, snapshot)
      return this
    })

    ApiResponse.macro('assertLivewireSnapshotContains', function (partial) {
      ensureIsLivewireResponse.call(this)
      ensureHasAssert(this.assert)
      const actualSnapshot = this.livewireSnapshot
      this.assert.containSubset(actualSnapshot, partial)
      return this
    })

    ApiResponse.macro('assertLivewireEffects', function (effects) {
      ensureIsLivewireResponse.call(this)
      ensureHasAssert(this.assert)
      const actualEffects = this.livewireEffects
      this.assert.deepEqual(actualEffects, effects)
      return this
    })

    ApiResponse.macro('assertLivewireEffectsContains', function (partial) {
      ensureIsLivewireResponse.call(this)
      ensureHasAssert(this.assert)
      const actualEffects = this.livewireEffects
      this.assert.containSubset(actualEffects, partial)
      return this
    })
  }
}
