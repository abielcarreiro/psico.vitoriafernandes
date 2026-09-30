import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  // Caminhos relativos + tudo embutido em um único HTML:
  // o dist/index.html funciona até com duplo clique (file://), sem servidor.
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
})
