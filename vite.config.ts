import { resolve } from 'path';
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), dts({ tsconfigPath: './tsconfig.app.json', rollupTypes: true })],
  build: {
    lib: {
      name: 'vue3-native-decorators',
      entry: resolve(__dirname, 'src/index.ts'),
      fileName: (format) => `vue3-native-decorators.${format}.js`,
    },
    emptyOutDir: true,
    rollupOptions: {
      external: ['vue', '@vue/reactivity'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
})
