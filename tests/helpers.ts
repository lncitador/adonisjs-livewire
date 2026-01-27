import { IgnitorFactory } from '@adonisjs/core/factories'
import { ProviderNode } from '@adonisjs/core/types/app'
import { test } from '@japa/runner'
import { ApiClient, apiClient } from '@japa/api-client'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { runner, syncReporter } from '@japa/runner/factories'
import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig } from '../src/define_config.js'
import { ApplicationService } from '@adonisjs/core/types'
import { NamedReporterContract } from '@japa/runner/types'
import { Test } from '@japa/runner/core'
import { livewireApiClient } from '../src/plugins/japa/api_client.js'

export const BASE_URL = new URL('./tmp/', import.meta.url)

/**
 * Create a http server that will be closed automatically
 * when the test ends
 */
export const httpServer = {
  create: test.macro(($test, callback: (req: IncomingMessage, res: ServerResponse) => any) => {
    const server = createServer(callback)
    $test.cleanup(async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    })
    return server
  }),
}
/**
 * Runs a japa test in isolation
 */
export async function runJapaTest(app: ApplicationService, callback: Parameters<Test['run']>[0]) {
  ApiClient.clearSetupHooks()
  ApiClient.clearTeardownHooks()
  ApiClient.clearRequestHandlers()

  await runner()
    .configure({
      reporters: {
        activated: [syncReporter.name],
        list: [syncReporter as NamedReporterContract],
      },
      plugins: [apiClient(), pluginAdonisJS(app), livewireApiClient(app)],
      files: [],
    })
    .runTest('testing japa integration', callback)
}

/**
 * Setup an AdonisJS app for testing
 */
export async function setupApp(providers: ProviderNode[] = []) {
  const ignitor = new IgnitorFactory()
    .withCoreProviders()
    .withCoreConfig()
    .merge({
      config: {
        livewire: defineConfig({}),
      },
      rcFileContents: {
        providers: providers.concat([
          {
            file: () => import('@adonisjs/core/providers/edge_provider'),
            environment: ['test', 'web'],
          },
        ]),
      },
    })
    .preload((app) => {
      app.config.set('app.appKey', 'teste-live')
    })
    .create(BASE_URL, {
      importer: (filePath) => {
        if (filePath.startsWith('./') || filePath.startsWith('../')) {
          return import(new URL(filePath, BASE_URL).href)
        }
        return import(filePath)
      },
    })

  const app = ignitor.createApp('web')
  await app.init().then(() => app.boot())

  const ace = await app.container.make('ace')
  ace.ui.switchMode('raw')

  return { ace, app, ignitor }
}

export const setupFakeAdonisProject = test.macro(async ($test) => {
  await Promise.all([
    $test.context.fs.create('.env', ''),
    $test.context.fs.createJson('tsconfig.json', {}),
    $test.context.fs.create('adonisrc.ts', `export default defineConfig({})`),
    $test.context.fs.create('vite.config.ts', `export default { plugins: [] }`),
    $test.context.fs.create(
      'start/kernel.ts',
      `
        import router from '@adonisjs/core/services/router'
        import server from '@adonisjs/core/services/server'
  
        router.use([
          () => import('@adonisjs/core/bodyparser_middleware'),
        ])
  
        server.use([])
      `
    ),
  ])
})
