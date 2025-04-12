import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// Ensure environment variables are loaded
	envPrefix: 'VITE_',
	// Load .env files
	envDir: '.'
});
