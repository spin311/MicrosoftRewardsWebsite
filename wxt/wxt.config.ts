import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

// PolyForm requires the license terms and Required Notice to ship with every copy,
// so the single repo-root LICENSE is copied into each build and the sources zip.
const LICENSE_PATH = resolve(__dirname, '../LICENSE');
// Sources are zipped from this folder, so the license is staged here for the zip only.
const STAGED_LICENSE_PATH = resolve(__dirname, 'LICENSE');
// The unzipped sources (what Firefox add-on reviewers build from) have no repo
// root above them; there the staged copy is the only license.
const BUILD_LICENSE_PATH = existsSync(STAGED_LICENSE_PATH) ? STAGED_LICENSE_PATH : LICENSE_PATH;

export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:done': (wxt) => copyFileSync(BUILD_LICENSE_PATH, resolve(wxt.config.outDir, 'LICENSE')),
    'zip:sources:start': () => copyFileSync(LICENSE_PATH, STAGED_LICENSE_PATH),
    'zip:sources:done': () => rmSync(STAGED_LICENSE_PATH, { force: true }),
  },
  zip: { includeSources: ['LICENSE'] },
  alias: { '@': '.' },
  manifest: {
    name: 'Search automatic rewards',
    description:
      'Script that gives you maximum amount of microsoft rewards points every day automatically or by a click of a button.',
    permissions: ['storage', 'alarms'],
    icons: { 16: 'imgs/logo.png', 32: 'imgs/logo2.png', 48: 'imgs/logo2.png', 128: 'imgs/logo3.png' },
    action: {
      default_icon: { 16: 'imgs/logo.png', 32: 'imgs/logo2.png', 48: 'imgs/logo2.png', 128: 'imgs/logo3.png' },
      default_title: 'Search automatic rewards',
    },
    browser_specific_settings: {
      gecko: { id: 'microsoft_automatic_rewards@example.com', strict_min_version: '91.0' },
    },
  },
});
