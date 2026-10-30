import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The client talks to the API on the same origin it is served from.
 *
 * In development the proxy below forwards `/api`, `/health` and `/openapi` to the local Kestrel host, so
 * the browser makes same-origin requests and the platform does not need a permissive CORS policy opened
 * up for development. In production the client is served behind the same reverse proxy as the API; setting
 * `VITE_API_BASE_URL` points it at a different origin instead, which requires the API host to allow that
 * origin explicitly.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_DEV_API_PROXY ?? 'http://127.0.0.1:5000';
  const port = Number(env.VITE_DEV_PORT ?? 5173);

  /**
   * Hosts the dev server answers to.
   *
   * Vite rejects a request whose `Host` header it does not recognise, which is what stops a DNS-rebinding
   * page on the developer's machine from reaching the dev server. A forwarded port breaks that assumption:
   * the browser sends the forwarding domain as `Host`, and the dev server answers 403 for a host that is
   * genuinely the operator's own tunnel. The default therefore admits the port-forwarding domains used by
   * remote development environments, and `VITE_DEV_ALLOWED_HOSTS` replaces the list when a deployment needs
   * exactly one name. Keep this list as narrow as the deployment allows: everything added here becomes
   * reachable by a browser on the network the dev server sits on.
   */
  const configuredHosts = (env.VITE_DEV_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const allowedHosts =
    configuredHosts.length > 0
      ? configuredHosts
      : ['localhost', '127.0.0.1', '[::1]', '.app.github.dev', '.github.dev', '.gitpod.io'];

  return {
    plugins: [react()],
    server: {
      // Bind to every interface so the dev server is reachable from outside the container, which is what a
      // forwarded Codespaces port needs.
      host: true,
      port,
      strictPort: true,
      allowedHosts,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/health': { target, changeOrigin: true },
        '/openapi': { target, changeOrigin: true },
      },
    },
    preview: {
      host: true,
      port,
      strictPort: true,
      allowedHosts,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
    },
  };
});
