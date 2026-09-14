import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('alpha config, local proxy and deployment target alpha only', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const config = read('wrangler.toml');
  assert.match(config, /database_id = "2cef820f-583b-4e9a-9a2c-c2b72f0a48a7"/);
  assert.match(config, /name = "aiconclave-dashboard-alpha"/);
  assert.match(read('vite.config.js'), /https:\/\/aiconclave-dashboard-alpha\.pages\.dev/);
  const workflow = read('.github/workflows/deploy-dashboard.yml');
  assert.match(workflow, /--project-name=aiconclave-dashboard-alpha --branch=dashboard-dev-alpha/);
  assert.doesNotMatch(workflow, /d1 migrations apply/);
  assert.doesNotMatch(config, /cfc0669f-3de7-4429-ab54-686e966bb56b/);
});


test('all alpha portals retain isolated database bindings and alpha navigation',()=>{
 for(const path of ['wrangler.toml','judging/wrangler.toml','room-finder/wrangler.toml']) {
  const content=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.match(content,/2cef820f-583b-4e9a-9a2c-c2b72f0a48a7/);
  assert.doesNotMatch(content,/cfc0669f-3de7-4429-ab54-686e966bb56b/);
 }
 for(const path of ['src/features/landing/LandingPage.jsx','judging/src/main.jsx','judging/src/JudgeApp.jsx','room-finder/public/index.html']) {
  assert.doesNotMatch(readFileSync(new URL('../'+path,import.meta.url),'utf8'),/https:\/\/aiconclave-(?:dashboard|judging|room-finder)\.pages\.dev/);
 }
});
