export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);

    // Route: /regtest/... → api-regtest.peachbitcoin.com/...
    // Route: everything else → api.peachbitcoin.com/v1/...
    let targetUrl;
    if (url.pathname.startsWith('/regtest/')) {
      const regtestPath = url.pathname.replace(/^\/regtest/, '');
      targetUrl = 'https://api-regtest.peachbitcoin.com' + regtestPath + url.search;
    } else {
      targetUrl = 'https://api.peachbitcoin.com/v1' + url.pathname + url.search;
    }

    const fwdHeaders = { 'Content-Type': request.headers.get('Content-Type') || 'application/json' };
    const authHeader = request.headers.get('Authorization');
    if (authHeader) fwdHeaders['Authorization'] = authHeader;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: fwdHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
