const withTM = require('next-transpile-modules')(['monaco-editor'])

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  experimental: {
    workerThreads: true,
  },
  exportPathMap: async function (defaultPathMap, { dev, dir, outDir, distDir, buildId }) {
    return {
      ...defaultPathMap,
      '/': { page: '/' },
      // '/about': { page: '/about' },
      ...Object.fromEntries(
        Array(8)
          .fill(0)
          .map((_, i) => [`/level/${i + 1}`, { page: '/level/[id]' }])
      ),
    }
  },
  webpack: (config, { isServer }) => {
    config.experiments.asyncWebAssembly = true
    config.experiments.topLevelAwait = true
    config.module.rules.push({
      test: /\.ya?ml$/,
      use: 'yaml-loader',
    })
    return config
  },
}

module.exports = withTM(config)
