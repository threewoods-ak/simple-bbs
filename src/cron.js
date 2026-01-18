export async function handleCron(event, env, ctx) {
  try {
    console.log('Starting cron job: Cleanup old comments');

    // Keep only the latest 100 comments
    await env.DB.prepare(`
      DELETE FROM comments 
      WHERE id NOT IN (
        SELECT id FROM comments 
        ORDER BY created_at DESC 
        LIMIT 100
      )
    `).run();

    // Clear cache to reflect the cleanup
    await env.CACHE_KV.delete('comment_cache');

    console.log('Cron job completed successfully');
  } catch (error) {
    console.error('Cron job error:', error);
  }
}
