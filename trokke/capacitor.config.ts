// capacitor.config.ts

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jllfreshproduce.app',
  appName: 'JLL Fresh Produce',
  
  // This is the critical change.
  // We are telling Capacitor to load your live website.
  server: {
    url: 'https://trok-mvp.vercel.app', 
    cleartext: true
  }
};

export default config;