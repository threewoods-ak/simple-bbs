import { getComments, postComment } from './api';

export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Route handling
  if (url.pathname === '/api/comments' || url.pathname === '/api/comments/') {
    if (request.method === 'GET') {
      return await getComments(env, corsHeaders);
    } else if (request.method === 'POST') {
      return await postComment(request, env, corsHeaders);
    }
  }

  // Return 404 for other paths
  return new Response('Not Found', { 
    status: 404, 
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
  });
}
