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
  } else {
    // Demo build configuration (default)
    return {
      root: '.',
      build: {
        outDir: 'demo-dist',
        rollupOptions: {
          input: {
            main: './index.html'
          }
        }
      },
      server: {
        port: 3000,
        open: true
      }
    }
  }
})
