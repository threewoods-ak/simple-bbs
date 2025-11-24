import { Hono } from 'hono';
import { cors } from 'hono/cors';
import moderationRules from '../moderation-rules.md';

const app = new Hono();


app.use('/api/*', cors());

app.get('/api/comments', async (c) => {
  const { DB, KV } = c.env;
  const cacheKey = 'comment_cache';

  // Try to get from KV
  let comments = await KV.get(cacheKey, 'json');

  if (!comments) {
    // Fallback to D1
    const { results } = await DB.prepare(
      'SELECT * FROM comments ORDER BY created_at DESC LIMIT 100'
    ).all();
    comments = results;

    // Cache in KV for 60 seconds
    await KV.put(cacheKey, JSON.stringify(comments), { expirationTtl: 60 });
  }

  return c.json(comments);
});

app.post('/api/comments', async (c) => {
  const { DB, KV, GEMINI_API_KEY } = c.env;
  const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
  const ipHash = await hashIp(ip);

  // 1. Rate Limiting (1 minute)
  const limitKey = `ip_limit:${ipHash}`;
  const lastPost = await KV.get(limitKey);
  if (lastPost) {
    return c.json({ error: '投稿頻度が高すぎます。1分待ってから再度お試しください。' }, 429);
  }

  const body = await c.req.json();
  const message = body.message;

  // 2. Validation
  if (!message || message.length > 100) {
    return c.json({ error: 'メッセージは1文字以上100文字以内で入力してください。' }, 400);
  }

  // 3. Moderation (Gemini API)
  // Default to gemini-pro if not set, but user requested error if specified model fails.
  // Actually, let's pass the model from env.
  const modelName = c.env.GEMINI_MODEL || 'gemini-pro';
  
  try {
    const moderationResult = await moderateContent(message, GEMINI_API_KEY, modelName);
    if (moderationResult.level === 3) {
      return c.json({ error: '不適切な内容が含まれているため投稿できませんでした。' }, 400);
    }

    let finalMessage = message;
    if (moderationResult.level === 2) {
      // Store with prefix to allow frontend to hide/show
      finalMessage = `__HIDDEN__:${message}`;
    }

    // 4. Insert into D1
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    await DB.prepare(
      'INSERT INTO comments (id, message, created_at, ip_hash) VALUES (?, ?, ?, ?)'
    ).bind(id, finalMessage, createdAt, ipHash).run();

    // 5. Invalidate Cache
    await KV.delete('comment_cache');

    // 6. Set Rate Limit
    await KV.put(limitKey, Date.now().toString(), { expirationTtl: 60 });

    return c.json({ success: true });
  } catch (error) {
    console.error('Moderation failed:', error);
    return c.json({ error: 'コンテンツの確認中にエラーが発生しました。しばらくしてから再度お試しください。' }, 500);
  }
});

app.get('*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

async function hashIp(ip) {
  const myText = new TextEncoder().encode(ip);
  const myDigest = await crypto.subtle.digest(
    { name: 'SHA-256' },
    myText
  );
  const hashArray = Array.from(new Uint8Array(myDigest));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function moderateContent(text, apiKey, model) {
  if (!apiKey) return { level: 1 }; // Dev mode or no key

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  // Use the loaded rules and replace the placeholder
  const prompt = moderationRules.replace('{TEXT_TO_CHECK}', text);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
     throw new Error('No candidates returned from Gemini API');
  }

  const resultText = data.candidates[0].content.parts[0].text.trim();
  console.log('Gemini Raw Response:', resultText);

  // The rules ask for a single number: 1, 2, or 3.
  // We need to parse this.
  const level = parseInt(resultText, 10);
  
  if (!isNaN(level) && [1, 2, 3].includes(level)) {
      return { level: level };
  }

  // Fallback: try to find a number in the text if it was chatty
  const match = resultText.match(/[1-3]/);
  if (match) {
      return { level: parseInt(match[0], 10) };
  }

  console.warn('Failed to parse moderation level from:', resultText);
  return { level: 1 }; // Default to safe
}

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    const { DB } = env;
    // Keep latest 100 comments, delete others
    // SQLite doesn't support DELETE ... LIMIT/OFFSET directly in all versions, but we can use subquery.
    // DELETE FROM comments WHERE id NOT IN (SELECT id FROM comments ORDER BY created_at DESC LIMIT 100);
    await DB.prepare(
      'DELETE FROM comments WHERE id NOT IN (SELECT id FROM comments ORDER BY created_at DESC LIMIT 100)'
    ).run();
    console.log('Cleanup completed');
  }
};
