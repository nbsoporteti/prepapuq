import path from 'node:path';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const allDeps = Object.keys(pkg.dependencies || {});

export default defineConfig({
	optimizeDeps: {
		include: allDeps,
	},
	plugins: [react()],
	build: {
		rollupOptions: {
			output: {
				// React + router en su propio chunk: cachea aparte (cambia poco entre
				// deploys) y baja el chunk de entrada bajo el warning de 500 KB. Forma
				// objeto = toca SOLO estos paquetes; los chunks lazy de las rutas
				// (katex, pdfjs) siguen separados.
				manualChunks: {
					react: ['react', 'react-dom', 'react-router-dom'],
					motion: ['framer-motion'],
				},
			},
		},
	},
	server: {
		port: 3000,
		fs: {
			strict: true,
			allow: [
				path.resolve(__dirname),
				path.join(path.resolve(__dirname, '../..'), 'node_modules'),
			],
		},
	},
	resolve: {
		extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
