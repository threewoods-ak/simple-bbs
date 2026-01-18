import { handleRequest } from './handler';
import { handleCron } from './cron';

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },

  async scheduled(event, env, ctx) {
    return handleCron(event, env, ctx);
  }
};
