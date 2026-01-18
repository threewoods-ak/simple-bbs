import { getComments, postComment } from './api';

export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  
  // Get origin for CORS
  const origin = request.headers.get('Origin');
  const allowedOrigins = [
    'https://simple-bbs.pages.dev',
    'https://02772bfc.simple-bbs.pages.dev',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ];
  
  // Check if origin is allowed
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    origin && (origin === allowed || origin.endsWith('.simple-bbs.pages.dev'))
  );
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
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
