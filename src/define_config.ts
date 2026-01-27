export const defaultConfig = {
  class_namespace: 'app/livewire',
  layout: 'components.layouts.main',
  injectAssets: true,
  renderOnRedirect: false,
  navigate: {
    showProgressBar: true,
    progressBarColor: '#2299dd',
  },
}

export type Config = typeof defaultConfig

export type PartialConfig = {
  class_namespace?: string
  layout?: string
  injectAssets?: boolean
  renderOnRedirect?: boolean
  navigate?: Partial<Config['navigate']>
}

export function defineConfig(config: PartialConfig): Config {
  return {
    ...defaultConfig,
    ...config,
    navigate: {
      ...defaultConfig.navigate,
      ...(config.navigate || {}),
    },
  }
}
