import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rotara.app',
  appName: 'ROTARA',
  webDir: '../client/dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
