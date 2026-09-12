import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('production dashboard and judging deployments share production D1 and never target alpha', () => {
  const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  for (const [config, workflow, project, branch] of [
    ['wrangler.toml', '.github/workflows/deploy-dashboard.yml', 'aiconclave-dashboard', 'dashboard-dev'],
    ['judging/wrangler.toml', '.github/workflows/deploy-judging.yml', 'aiconclave-judging', 'judging-production'],
  ]) {
    assert.match(read(config), /database_id = "cfc0669f-3de7-4429-ab54-686e966bb56b"/);
    assert.ok(read(config).includes(`name = "${project}"`));
    assert.ok(read(workflow).includes(`--project-name=${project} --branch=${branch} `));
    assert.ok(read(workflow).includes(`if: github.ref == 'refs/heads/${branch}'`));
    const pushTrigger = read(workflow).split('push:')[1].split('workflow_dispatch:')[0];
    assert.ok(pushTrigger.includes(branch));
    assert.ok(!pushTrigger.includes(branch === 'dashboard-dev' ? 'judging-production' : 'dashboard-dev'));
    assert.doesNotMatch(read(config) + read(workflow), /2cef820f-583b-4e9a-9a2c-c2b72f0a48a7|dashboard-dev-alpha|aiconclave-judging-alpha|aiconclave-dashboard-alpha/);
    assert.doesNotMatch(read(workflow), /d1 migrations apply/);
  }
  assert.match(read('vite.config.js'), /https:\/\/aiconclave-dashboard\.pages\.dev/);
});
