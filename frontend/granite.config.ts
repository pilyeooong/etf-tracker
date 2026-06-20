import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'etf-insight',
  brand: {
    displayName: 'ETF 인사이트',
    primaryColor: '#3182F6',
    icon: 'https://static.toss.im/appsintoss/5045/6bbe3f8b-fa6d-4a7e-a163-e20fc327d3ac.png',
  },
  web: {
    host: '192.168.0.5',
    port: 5173,
    commands: {
      dev: 'vite --host',
      build: 'tsc -b && vite build',
    },
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  webViewProps: {
    type: 'partner',
    bounces: true,
    pullToRefreshEnabled: false,
    allowsInlineMediaPlayback: true,
    overScrollMode: 'never',
  },
  outdir: 'dist',
  permissions: [],
});
