import { dispatchPending } from '../functions/_shared/stockSync.js';
export default {
  async scheduled(_event, env) { await dispatchPending(env.DB); },
  fetch() { return new Response('Not found', {status:404}); },
};
