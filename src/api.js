import { moderateContent } from './moderation';
import { getIPHash } from './utils';

const CACHE_KEY = 'comment_cache';
const MAX_MESSAGE_LENGTH = 100;
const RATE_LIMIT_SECONDS = 60;

export async function getComments(env, corsHeaders) {
  try {
    // Try to get from KV cache first
    const cached = await env.CACHE_KV.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // If not in cache, get from D1
    const result = await env.DB.prepare(
      'SELECT id, message, original_message, created_at FROM comments ORDER BY created_at DESC LIMIT 100'
    ).all();

    const comments = result.results || [];
    const json = JSON.stringify(comments);

    // Save to cache
    await env.CACHE_KV.put(CACHE_KEY, json);

    return new Response(json, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Log error details server-side only
    console.error('Error getting comments:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to get comments' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function postComment(request, env, corsHeaders) {
  try {
    // Parse request body
    const body = await request.json();
    const message = body.message?.trim();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Validate message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      return new Response(JSON.stringify({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Get IP hash for rate limiting
    const ipHash = await getIPHash(request);

    // Check rate limit
    const limitKey = `ip_limit:${ipHash}`;
    const lastPost = await env.LIMIT_KV.get(limitKey);
    if (lastPost) {
      return new Response(JSON.stringify({ error: 'Please wait before posting again' }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Moderate content
    let moderationResult;
    try {
      moderationResult = await moderateContent(message, env);
    } catch (moderationError) {
      // Log error details server-side only
      console.error('Moderation failed:', moderationError.message);
      return new Response(JSON.stringify({ 
        error: 'Content moderation service is currently unavailable',
      }), {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    
    if (moderationResult.level === 3) {
      return new Response(JSON.stringify({ 
        error: 'This message contains inappropriate content or personal information',
        level: 3
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Generate UUID
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    // Determine final message based on moderation level
    let finalMessage = message;
    let originalMessage = null;
    if (moderationResult.level === 2) {
      finalMessage = '*****';
      originalMessage = message;
    }

    // Insert into D1
    await env.DB.prepare(
      'INSERT INTO comments (id, message, original_message, created_at, ip_hash) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, finalMessage, originalMessage, createdAt, ipHash).run();

    // Set rate limit
    await env.LIMIT_KV.put(limitKey, Date.now().toString(), {
      expirationTtl: RATE_LIMIT_SECONDS,
    });

    // Invalidate cache
    await env.CACHE_KV.delete(CACHE_KEY);

    return new Response(JSON.stringify({ 
      success: true, 
      id,
      level: moderationResult.level,
      originalMessage: moderationResult.level === 2 ? message : undefined
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Log error details server-side only
    console.error('Error posting comment:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to post comment' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}
