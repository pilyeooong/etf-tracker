import { defineConfig } from '@apps-in-toss/web-framework/config';
export default defineConfig({
    appName: 'etf-tracker',
    brand: {
        displayName: 'ETF 돋보기',
        primaryColor: '#3182F6',
        icon: '',
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
