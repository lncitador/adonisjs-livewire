import type { PluginFn } from 'edge.js/types'
import type { ApplicationService } from '@adonisjs/core/types'
import { livewireTag, livewireStylesTag, livewireScriptsTag, scriptTag, assetsTag } from './tags.js'
import { processLivewireComponents } from './processor.js'
import Livewire from '../../livewire.js'

type LivewireInstance = InstanceType<typeof Livewire>

/**
 * Edge.js plugin that registers Livewire tags and global functions
 *
 * This plugin adds the @livewire, @livewireStyles, @livewireScripts, @script, and @assets tags
 * to Edge templates, along with global helper functions for rendering components.
 *
 * @param app - The AdonisJS application service
 * @param livewire - The Livewire instance
 * @param version - Package version for asset URLs
 * @returns Edge plugin function that registers Livewire functionality
 *
 * @example
 * ```js
 * // Configure in providers/livewire_provider.ts
 * import { edgePluginLivewire } from '@adonisjs/livewire/plugins/edge'
 *
 * edge.use(edgePluginLivewire(app, livewire, packageJson.version))
 * ```
 *
 * @example
 * ```edge
 * {{-- Use in Edge templates --}}
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   @livewireStyles()
 * </head>
 * <body>
 *   @livewire('counter', { count: 0 })
 *   @livewireScripts()
 * </body>
 * </html>
 * ```
 */
export const edgePluginLivewire = (
  app: ApplicationService,
  livewire: LivewireInstance,
  version: string
): PluginFn<undefined> => {
  return (edge) => {
    /**
     * Register the `livewire` global used by the `@livewire` tag
     * This function renders a Livewire component
     */
    edge.global('livewire', livewire)

    /**
     * Register tags
     */
    edge.registerTag(livewireTag)
    edge.registerTag(livewireStylesTag(version))
    edge.registerTag(livewireScriptsTag(version))
    edge.registerTag(scriptTag)
    edge.registerTag(assetsTag)

    /**
     * Register processor for <livewire:.../> syntax
     */
    edge.processor.process('raw', (value) => {
      const processed = processLivewireComponents(value.raw)
      if (processed !== value.raw) {
        value.raw = processed
      }
    })
  }
}
