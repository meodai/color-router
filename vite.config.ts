import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    // Library build configuration
    return {
      plugins: [
        dts({
          insertTypesEntry: true,
          outDir: 'dist',
          include: ['src/**/*']
        })
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'ColorRouter',
          fileName: (format) => `index.${format === 'es' ? 'js' : format}`,
          formats: ['es']
        },
        rollupOptions: {
          external: ['culori'],
          output: {
            globals: {
              culori: 'culori'
            }
          }
        },
        outDir: 'dist',
        emptyOutDir: true
      }
    }
  } else if (mode === 'demo') {
    // Demo build configuration
    return {
      base: '/color-router/',
      root: './demo',
      build: {
        outDir: '../demo-dist',
        emptyOutDir: true,
        rollupOptions: {
          input: resolve(__dirname, 'demo/index.html')
        }
      }
    }
  } else {
    // Development configuration
    return {
      base: '/',
      root: './demo',
      server: {
        port: 3000,
        open: true
      }
    }
  }
})
