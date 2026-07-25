/**
 * SF Tools — Salesforce API Proxy + AI Proxy Worker
 * Deploy this to Cloudflare Workers
 *
 * REQUIRED bindings (wrangler.toml):
 *   [[kv_namespaces]]
 *   binding = "AI_TOKENS"
 *   id = "<your-kv-namespace-id>"
 *
 *   [vars]
 *   ANTHROPIC_API_KEY = "sk-ant-api03-…"   (or use Secret instead)
 *
 * Routes handled:
 *   POST /          — Salesforce REST API proxy (existing)
 *   POST /ai        — Anthropic Claude proxy with Pro token auth
 *   POST /admin/token — (secured) create / extend Pro tokens
 */

const ALLOWED_ORIGINS = [
  'https://salesforcetools.in',
  'https://www.salesforcetools.in',
  'https://salesforcetools.pages.dev',
  'http://localhost',
  'http://localhost:3000',
  'http://127.0.0.1',
  'http://127.0.0.1:5500',
];

/* 👑 Admin whitelist — unspoofable (server-verifies Google session) */
const ADMIN_EMAILS = ['chsrinadhch@gmail.com'];

/**
 * Resolve session → user profile → check if admin.
 * Returns { isAdmin: boolean, email: string|null, sub: string|null }
 * Cannot be spoofed — email comes from server-side KV lookup of verified Google session.
 */
async function checkAdminFromSession(request, env) {
  try {
    const sessionToken = request.headers.get('x-session-token') || '';
    if (!sessionToken) return { isAdmin: false, email: null, sub: null };
    const sub = await env.AI_TOKENS.get(`session:${sessionToken}`);
    if (!sub) return { isAdmin: false, email: null, sub: null };
    const raw = await env.AI_TOKENS.get(`user:${sub}`);
    if (!raw) return { isAdmin: false, email: null, sub };
    const profile = JSON.parse(raw);
    const email = (profile.email || '').toLowerCase();
    return { isAdmin: ADMIN_EMAILS.includes(email), email, sub };
  } catch { return { isAdmin: false, email: null, sub: null }; }
}

function getCorsHeaders(request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-pro-token, x-admin-key, x-credit-token, x-session-token',
    'Access-Control-Max-Age': '86400',
  };
}

/* ── Per-IP rate limiter ─────────────────────────────────────
   Returns false (→ 429) when the IP exceeds `limit` calls in
   the current time window; otherwise increments and returns true.
   Uses a single KV key per (endpoint × IP × window) with TTL = 2×window
   so stale keys expire automatically without a separate cleanup job.
   ─────────────────────────────────────────────────────────── */
async function checkIPRateLimit(env, ip, endpoint, limit, windowSecs = 3600) {
  const window = Math.floor(Date.now() / (windowSecs * 1000));
  const key    = `ratelimit:${endpoint}:${ip}:${window}`;
  const cur    = parseInt(await env.AI_TOKENS.get(key).catch(() => null) || '0', 10);
  if (cur >= limit) return false;
  // Fire-and-forget increment (non-blocking — small write, safe to skip on error)
  env.AI_TOKENS.put(key, String(cur + 1), { expirationTtl: windowSecs * 2 }).catch(() => {});
  return true;
}

/* ── HTML-escape for safe interpolation into email/HTML strings ─
   Prevents stored-XSS when user-supplied values are embedded in
   the HTML email templates sent via Resend.
   ─────────────────────────────────────────────────────────── */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

/* ── Per-token limits ──────────────────────────────────────── */
const DEFAULT_MONTHLY_LIMIT = 500;   // max AI calls per calendar month per token
const DEFAULT_DAILY_LIMIT   = 50;    // max AI calls per calendar day per token

/* ── Models allowed through the proxy (Anthropic) ─────────── */
const ALLOWED_MODELS = [
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20241022',
  'claude-opus-4-5',
  'claude-3-opus-20240229',
];

/* ── Gemini model to use ───────────────────────────────────── */
const GEMINI_MODEL = 'gemini-2.0-flash';

/* ── Groq model to use ─────────────────────────────────────── */
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export default {
  async fetch(request, env) {
    _currentRequest = request; // set for json() helper

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    const url = new URL(request.url);

    /* ── Top-level try-catch so Worker never throws bare 500 ── */
    try {
      /* ── /ai — Claude proxy with Pro token auth ──────────── */
      if (url.pathname === '/ai') {
        return await handleAI(request, env);
      }

      /* ── /admin/token — create/extend tokens (admin only) ── */
      if (url.pathname === '/admin/token') {
        return await handleAdminToken(request, env);
      }

      /* ── /admin/stats — dashboard stats (admin only) ──────── */
      if (url.pathname === '/admin/stats') {
        return await handleAdminStats(request, env);
      }

      /* ── /payment/create-order — Razorpay order creation ──── */
      if (url.pathname === '/payment/create-order') {
        return await handleCreateOrder(request, env);
      }

      /* ── /payment/verify — Razorpay payment verification ──── */
      if (url.pathname === '/payment/verify') {
        return await handleVerifyPayment(request, env);
      }

      /* ── /credits — GET balance ──────────────────────────── */
      if (url.pathname === '/credits' && request.method === 'GET') {
        return await handleGetCredits(request, env);
      }

      /* ── /credits/deduct — POST deduct 1 credit ─────────── */
      if (url.pathname === '/credits/deduct') {
        return await handleDeductCredit(request, env);
      }

      /* ── /credits/restore — GET by email (send token email) */
      if (url.pathname === '/credits/restore') {
        return await handleRestoreToken(request, env);
      }

      /* ── /credits/free-trial — POST claim 3 free credits ── */
      if (url.pathname === '/credits/free-trial') {
        return await handleFreeTrial(request, env);
      }

      /* ── /feedback — feedback form submission ───────────── */
      if (url.pathname === '/feedback') {
        return await handleFeedback(request, env);
      }

      /* ── /config — public app config (Google Client ID) ─────── */
      if (url.pathname === '/config' && request.method === 'GET') {
        const CORS = getCorsHeaders(request);
        return new Response(
          JSON.stringify({ googleClientId: env.GOOGLE_CLIENT_ID || '' }),
          { headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' } }
        );
      }

      /* ── /auth/google — verify Google JWT, return session ── */
      if (url.pathname === '/auth/google') {
        return await handleGoogleAuth(request, env);
      }

      /* ── /user/profile — GET or POST user profile ────────── */
      if (url.pathname === '/user/profile') {
        return await handleUserProfile(request, env);
      }

      /* ── /user/orgs — GET or POST saved orgs ─────────────── */
      if (url.pathname === '/user/orgs') {
        return await handleUserOrgs(request, env);
      }

      /* ── /user/delete — DELETE account + all data (GDPR) ─── */
      if (url.pathname === '/user/delete') {
        return await handleUserDelete(request, env);
      }

      /* ── / — existing Salesforce proxy ──────────────────── */
      return await handleSalesforce(request, env);

    } catch (err) {
      console.error('Unhandled worker error:', err?.message || String(err));
      return new Response(
        JSON.stringify({ error: 'Worker error: ' + (err?.message || String(err)) }),
        { status: 500, headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' } }
      );
    }
  }
};

/* ════════════════════════════════════════════════════════════
   AI PROXY  — validate Pro token → forward to Anthropic
   ════════════════════════════════════════════════════════════ */
async function handleAI(request, env) {
  // Bind request locally so concurrent calls can't clobber _currentRequest
  const J = (d, s) => json(d, s, request);

  if (request.method !== 'POST') {
    return J({ error: 'Method not allowed' }, 405);
  }

  /* 👑 Admin bypass — server-verified Google session for admin email */
  const admin = await checkAdminFromSession(request, env);
  const isAdmin = admin.isAdmin;

  const proToken = request.headers.get('x-pro-token') || '';
  if (!isAdmin && !proToken.startsWith('sft-pro-')) {
    return J({ error: 'Missing or invalid Pro token' }, 401);
  }

  /* 1. Load token record from KV (skip for admin) */
  const tokenKey = isAdmin ? null : `token:${proToken}`;
  const raw = isAdmin
    ? { plan: 'credits', credits: 99999, email: admin.email, admin: true }
    : (await env.AI_TOKENS.get(tokenKey, { type: 'json' }).catch(() => null));

  if (!raw) {
    return J({ error: 'Pro token not found — please check your token or contact support.' }, 401);
  }

  /* 1b. Per-IP rate limit — safety net for both regular users AND admin
     - Regular: 60/hour (existing)
     - Admin: 500/hour (higher, but still capped — prevents catastrophic bill if session stolen) */
  const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipLimit = isAdmin ? 500 : 60;
  if (!await checkIPRateLimit(env, clientIP, isAdmin ? 'ai-admin' : 'ai', ipLimit, 3600)) {
    return J({ error: `Rate limit exceeded — too many AI requests from your IP address (${ipLimit}/hour cap). Please wait.` }, 429);
  }

  /* 1c. Sharing detection — block if token used from 3+ unique IPs in 24h (skip for admin) */
  if (!isAdmin) {
    const now24 = Date.now();
    const ipLog = raw.ip_log || [];
    const recentIPs = ipLog.filter(e => now24 - e.ts < 86400000);
    const uniqueIPs = new Set(recentIPs.map(e => e.ip));
    uniqueIPs.add(clientIP);
    if (uniqueIPs.size > 3) {
      return J({ error: 'Token used from too many devices. Please contact support if this is a mistake.' }, 429);
    }
    recentIPs.push({ ip: clientIP, ts: now24 });
    raw.ip_log = recentIPs.slice(-50);
    env.AI_TOKENS.put(tokenKey, JSON.stringify(raw)).catch(() => {});
  }

  /* 2. Check expiry (skip for admin) */
  if (!isAdmin && raw.plan !== 'credits' && raw.expiresAt && Date.now() > raw.expiresAt) {
    return J({ error: 'Pro token has expired — please top up credits to continue.' }, 402);
  }

  /* 3. Check limits — credit tokens check balance, time tokens check quota (skip for admin) */
  const now   = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const day   = `${month}-${String(now.getUTCDate()).padStart(2, '0')}`;

  let monthlyUsed  = 0;
  let monthlyLimit = DEFAULT_MONTHLY_LIMIT;

  if (!isAdmin) {
    if (raw.plan === 'credits') {
      if ((raw.credits ?? 0) < 0) {
        return J({ error: 'Insufficient credits. Please buy more to continue.' }, 402);
      }
      monthlyUsed  = 0;
      monthlyLimit = 9999;
    } else {
      const dailyUsed  = raw.usage?.[day]   || 0;
      const dailyLimit = raw.dailyLimit     ?? DEFAULT_DAILY_LIMIT;
      monthlyUsed      = raw.usage?.[month] || 0;
      monthlyLimit     = raw.monthlyLimit   ?? DEFAULT_MONTHLY_LIMIT;

      if (monthlyUsed >= monthlyLimit) {
        return J({ error: `Monthly quota reached (${monthlyLimit} calls). Please buy more credits.` }, 402);
      }
      if (dailyUsed >= dailyLimit) {
        return J({ error: `Daily quota reached (${dailyLimit} calls). Please try again tomorrow.` }, 429);
      }
    }
  }

  /* 4. Parse + validate request body */
  let body;
  try { body = await request.json(); } catch {
    return J({ error: 'Invalid JSON body' }, 400);
  }

  // Reject oversized payloads — guard against prompt-stuffing / KV bloat
  // (50 000 chars ≈ ~12 000 tokens, well above any reasonable single request)
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > 50000) {
    return J({ error: 'Request payload too large. Maximum prompt size is 50 000 characters.' }, 413);
  }

  /* 5. Determine provider: Groq → DeepSeek → Gemini → Anthropic */
  const useGroq      = !!env.GROQ_API_KEY;
  const useDeepSeek  = !!env.DEEPSEEK_API_KEY;
  const useGemini    = !!env.GEMINI_API_KEY;
  const useAnthropic = !!env.ANTHROPIC_API_KEY;

  if (!useGroq && !useDeepSeek && !useGemini && !useAnthropic) {
    return J({ error: 'Server configuration error — no AI API key configured.' }, 500);
  }

  let respText, respStatus;
  let _groqFailed = false; // set on 413/429 so we fall through to next provider

  /* ── Groq path ── */
  if (useGroq) {
    const groqBody = anthropicToGroq(body);
    let groqResp;
    try {
      groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(groqBody),
      });
    } catch (fetchErr) {
      _groqFailed = true; // network error — fall through to next provider
    }
    if (!_groqFailed) {
      const groqText = await groqResp.text();
      if (groqResp.ok) {
        respStatus = 200;
        try {
          const groqJson = JSON.parse(groqText);
          respText = JSON.stringify(groqToAnthropic(groqJson, body.model || GROQ_MODEL));
        } catch {
          respText = groqText;
        }
      } else if (groqResp.status === 413 || groqResp.status === 429) {
        // Request too large OR rate-limited — silently fall through to next provider
        _groqFailed = true;
      } else {
        respStatus = 502;
        respText = JSON.stringify({ error: `Groq API error (${groqResp.status}): ${groqText.slice(0, 300)}` });
      }
    }
  }

  /* ── DeepSeek V3 path ── */
  let _deepseekFailed = false;
  if (!respText && (!useGroq || _groqFailed) && useDeepSeek) {
    const dsBody = anthropicToGroq(body); // DeepSeek uses same OpenAI-compatible format
    dsBody.model = 'deepseek-chat';       // DeepSeek V3
    let dsResp;
    try {
      dsResp = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(dsBody),
      });
    } catch (fetchErr) {
      _deepseekFailed = true; // network error — fall through to next provider
    }
    if (!_deepseekFailed) {
      const dsText = await dsResp.text();
      if (dsResp.ok) {
        respStatus = 200;
        try {
          const dsJson = JSON.parse(dsText);
          respText = JSON.stringify(groqToAnthropic(dsJson, 'deepseek-chat'));
        } catch {
          respText = dsText;
        }
      } else if (dsResp.status === 402 || dsResp.status === 413 || dsResp.status === 429) {
        // No balance / too large / rate-limited — fall through to Gemini/Anthropic
        _deepseekFailed = true;
      } else {
        respStatus = 502;
        respText = JSON.stringify({ error: `DeepSeek API error (${dsResp.status}): ${dsText.slice(0, 300)}` });
      }
    }
  } // end DeepSeek block

  /* ── Gemini path ── */
  if (!respText && (!useGroq && !useDeepSeek || _groqFailed || _deepseekFailed) && useGemini) {
    const geminiBody = anthropicToGemini(body);
    let gemResp;
    try {
      gemResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
      );
    } catch (fetchErr) {
      respText = null; // fall through to Anthropic
    }
    if (gemResp) {
      const gemText = await gemResp.text();
      if (gemResp.ok) {
        respStatus = 200;
        try {
          const gemJson = JSON.parse(gemText);
          respText = JSON.stringify(geminiToAnthropic(gemJson, body.model || GEMINI_MODEL));
        } catch {
          respText = gemText;
        }
      } else if (gemResp.status === 429 || gemResp.status === 413) {
        // Rate-limited / too large — fall through to Anthropic
        respText = null;
      } else {
        // Never pass Gemini's 401/403 as-is — frontend misreads it as "Invalid Pro token"
        respStatus = 502;
        respText = JSON.stringify({ error: `Gemini API error (${gemResp.status}): ${gemText.slice(0, 300)}` });
      }
    }
  }

  /* ── Anthropic path (final fallback) ── */
  if (!respText) {
    if (!useAnthropic) {
      return J({ error: 'No AI provider configured or all providers failed.' }, 502);
    }
    if (!ALLOWED_MODELS.includes(body.model)) {
      return J({ error: `Model '${body.model}' not allowed. Allowed: ${ALLOWED_MODELS.join(', ')}` }, 400);
    }
    let antResp;
    try {
      antResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      return J({ error: 'Could not reach Anthropic: ' + fetchErr.message }, 502);
    }
    respStatus = antResp.status;
    respText = await antResp.text();
  }

  /* 7. Increment usage on success (fire-and-forget) — time tokens only */
  if (respStatus >= 200 && respStatus < 300 && raw.plan !== 'credits') {
    incrementUsage(env, tokenKey, raw, month, day).catch(() => {});
  }

  return new Response(respText, {
    status: respStatus,
    headers: {
      ...getCorsHeaders(request),
      'Content-Type': 'application/json',
      'X-Usage-Month': String(monthlyUsed + 1),
      'X-Usage-Limit-Month': String(monthlyLimit),
    },
  });
}

/* ── Anthropic → Groq/OpenAI request format ─────────────────── */
function anthropicToGroq(body) {
  const messages = [];
  if (body.system) {
    const sysText = typeof body.system === 'string'
      ? body.system
      : (body.system || []).map(s => s.text || '').join('\n');
    messages.push({ role: 'system', content: sysText });
  }
  for (const msg of body.messages || []) {
    const content = typeof msg.content === 'string'
      ? msg.content
      : (msg.content || []).map(c => c.text || '').join('');
    messages.push({ role: msg.role, content });
  }
  return {
    model: GROQ_MODEL,
    messages,
    max_tokens: body.max_tokens || 8192,
    temperature: body.temperature ?? 1,
  };
}

/* ── Groq/OpenAI → Anthropic response format ─────────────────── */
function groqToAnthropic(groqResp, model) {
  const text = groqResp.choices?.[0]?.message?.content || '';
  return {
    id: 'msg_groq_' + Date.now(),
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens:  groqResp.usage?.prompt_tokens     || 0,
      output_tokens: groqResp.usage?.completion_tokens || 0,
    },
  };
}

/* ── Anthropic → Gemini request format ─────────────────────── */
function anthropicToGemini(body) {
  const contents = [];
  for (const msg of body.messages || []) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const text = typeof msg.content === 'string'
      ? msg.content
      : (msg.content || []).map(c => c.text || '').join('');
    contents.push({ role, parts: [{ text }] });
  }
  const gemBody = {
    contents,
    generationConfig: {
      maxOutputTokens: body.max_tokens || 8192,
      temperature: body.temperature ?? 1,
    },
  };
  if (body.system) {
    const sysText = typeof body.system === 'string'
      ? body.system
      : (body.system || []).map(s => s.text || '').join('\n');
    gemBody.system_instruction = { parts: [{ text: sysText }] };
  }
  return gemBody;
}

/* ── Gemini → Anthropic response format ─────────────────────── */
function geminiToAnthropic(gemResp, model) {
  const text = gemResp.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    id: 'msg_gemini_' + Date.now(),
    type: 'message',
    role: 'assistant',
    model,
    content: [{ type: 'text', text }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens:  gemResp.usageMetadata?.promptTokenCount      || 0,
      output_tokens: gemResp.usageMetadata?.candidatesTokenCount  || 0,
    },
  };
}

async function incrementUsage(env, tokenKey, raw, month, day) {
  const usage = raw.usage || {};
  usage[month] = (usage[month] || 0) + 1;
  usage[day]   = (usage[day]   || 0) + 1;

  // Keep only last 2 months of daily keys to avoid unbounded growth
  const keys = Object.keys(usage).filter(k => k.length === 10); // daily keys: YYYY-MM-DD
  if (keys.length > 62) {
    keys.sort().slice(0, keys.length - 62).forEach(k => delete usage[k]);
  }

  raw.usage = usage;
  raw.lastUsed = Date.now();
  await env.AI_TOKENS.put(tokenKey, JSON.stringify(raw));
}

/* ════════════════════════════════════════════════════════════
   ADMIN TOKEN ENDPOINT  — create / extend tokens
   POST /admin/token  { action, token?, email?, plan?, adminKey }
   ════════════════════════════════════════════════════════════ */
async function handleAdminToken(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  /* Verify admin key */
  const adminKey = env.ADMIN_KEY || '';
  if (!adminKey || body.adminKey !== adminKey) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const action = body.action || 'create';

  if (action === 'create') {
    /* Generate a new token */
    const token = 'sft-pro-' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const planMonths = body.planMonths || 1;
    const record = {
      email: body.email || '',
      plan: body.plan || 'basic',
      createdAt: Date.now(),
      expiresAt: Date.now() + planMonths * 30 * 24 * 60 * 60 * 1000,
      monthlyLimit: body.monthlyLimit || DEFAULT_MONTHLY_LIMIT,
      dailyLimit: body.dailyLimit || DEFAULT_DAILY_LIMIT,
      usage: {},
    };
    await env.AI_TOKENS.put(`token:${token}`, JSON.stringify(record));
    return json({ token, record });
  }

  if (action === 'extend') {
    const token = body.token;
    if (!token) return json({ error: 'token required' }, 400);
    const rec = await env.AI_TOKENS.get(`token:${token}`, { type: 'json' }).catch(() => null);
    if (!rec) return json({ error: 'Token not found' }, 404);
    const addMonths = body.addMonths || 1;
    rec.expiresAt = Math.max(rec.expiresAt || Date.now(), Date.now()) + addMonths * 30 * 24 * 60 * 60 * 1000;
    await env.AI_TOKENS.put(`token:${token}`, JSON.stringify(rec));
    return json({ token, expiresAt: rec.expiresAt, record: rec });
  }

  if (action === 'revoke') {
    const token = body.token;
    if (!token) return json({ error: 'token required' }, 400);
    await env.AI_TOKENS.delete(`token:${token}`);
    return json({ revoked: token });
  }

  if (action === 'info') {
    const token = body.token;
    if (!token) return json({ error: 'token required' }, 400);
    const rec = await env.AI_TOKENS.get(`token:${token}`, { type: 'json' }).catch(() => null);
    if (!rec) return json({ error: 'Token not found' }, 404);
    return json(rec);
  }

  return json({ error: `Unknown action: ${action}` }, 400);
}

/* ════════════════════════════════════════════════════════════
   SALESFORCE PROXY  — existing logic (unchanged)
   ════════════════════════════════════════════════════════════ */
async function handleSalesforce(request, env) {
  const CORS = getCorsHeaders(request);
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  try {
    const { instanceUrl, sessionId, path, method = 'GET', body } = await request.json();

    if (!instanceUrl || !path) {
      return new Response(JSON.stringify({ error: 'Missing required fields: instanceUrl, path' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const url = new URL(instanceUrl);
    const h = url.hostname.toLowerCase();
    const isValidSF = h.endsWith('.salesforce.com') || h.endsWith('.force.com') ||
                      h.endsWith('.cloudforce.com') || h.endsWith('.salesforceliveagent.com') ||
                      h.endsWith('.documentforce.com') || h.endsWith('.visualforce.com') ||
                      h === 'salesforce.com';
    if (!isValidSF) {
      return new Response(JSON.stringify({ error: 'Invalid instance URL — must be a Salesforce domain' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const allowedPaths = ['/services/data/', '/services/oauth2/', '/services/Soap/'];
    if (!allowedPaths.some(p => path.startsWith(p))) {
      return new Response(JSON.stringify({ error: 'Path not allowed' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const isOAuthTokenExchange = path === '/services/oauth2/token';
    const sfHeaders = { 'Accept': 'application/json' };
    if (isOAuthTokenExchange) {
      sfHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      sfHeaders['Content-Type'] = 'application/json';
      if (sessionId) sfHeaders['Authorization'] = `Bearer ${sessionId}`;
    }

    let sfBody = null;
    if (body && method !== 'GET') {
      sfBody = isOAuthTokenExchange ? new URLSearchParams(body).toString() : JSON.stringify(body);
    }

    const sfUrl = instanceUrl.replace(/\/$/, '') + path;
    const sfResp = await fetch(sfUrl, { method, headers: sfHeaders, body: sfBody });
    const text = await sfResp.text();

    // If SF returned HTML (e.g., login redirect), convert to JSON error
    const ct = sfResp.headers.get('content-type') || '';
    if (ct.includes('text/html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      const errBody = JSON.stringify({ error: `Salesforce returned HTML (HTTP ${sfResp.status}) — session may be invalid or instance URL incorrect` });
      return new Response(errBody, { status: sfResp.ok ? 500 : sfResp.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return new Response(text, {
      status: sfResp.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Proxy error' }), { status: 500, headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' } });
  }
}

/* ════════════════════════════════════════════════════════════
   CREDITS — GET balance
   GET /credits   Header: x-credit-token: sft-pro-xxx
   ════════════════════════════════════════════════════════════ */
async function handleGetCredits(request, env) {
  /* 👑 Admin check FIRST — unspoofable (server verifies Google session) */
  const admin = await checkAdminFromSession(request, env);
  if (admin.isAdmin) {
    return json({
      credits:      99999,
      total_bought: 99999,
      total_used:   0,
      email:        admin.email,
      admin:        true,
    });
  }

  const token = request.headers.get('x-credit-token') || '';
  if (!token.startsWith('sft-pro-')) return json({ error: 'Invalid token' }, 401);

  const raw = await env.AI_TOKENS.get(`token:${token}`, { type: 'json' }).catch(() => null);
  if (!raw) return json({ error: 'Token not found' }, 404);

  return json({
    credits:      raw.credits      ?? 0,
    total_bought: raw.total_bought ?? 0,
    total_used:   raw.total_used   ?? 0,
    email:        raw.email        || '',
    admin:        false,
  });
}

/* ════════════════════════════════════════════════════════════
   CREDITS — deduct 1 credit (or free re-gen)
   POST /credits/deduct  { className }
   Header: x-credit-token: sft-pro-xxx
   ════════════════════════════════════════════════════════════ */
async function handleDeductCredit(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  /* 👑 Admin bypass — no deduction */
  const admin = await checkAdminFromSession(request, env);
  if (admin.isAdmin) {
    return json({
      deducted:   true,
      free_regen: false,
      credits:    99999,
      admin:      true,
    });
  }

  const token = request.headers.get('x-credit-token') || '';
  if (!token.startsWith('sft-pro-')) return json({ error: 'Invalid token' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { className = '' } = body;

  const tokenKey = `token:${token}`;
  const raw = await env.AI_TOKENS.get(tokenKey, { type: 'json' }).catch(() => null);
  if (!raw) return json({ error: 'Token not found' }, 404);

  // Free re-generation: same class name within 3 attempts
  const attempts = raw.class_attempts || {};
  const prevAttempts = attempts[className] || 0;
  const FREE_REGEN_LIMIT = 3;
  const isFreeRegen = className && prevAttempts > 0 && prevAttempts < FREE_REGEN_LIMIT;

  if (!isFreeRegen) {
    // Check credit balance
    const credits = raw.credits ?? 0;
    if (credits <= 0) {
      return json({ error: 'Insufficient credits', credits: 0 }, 402);
    }
    raw.credits = credits - 1;
    raw.total_used = (raw.total_used || 0) + 1;
  }

  // Update attempt counter for this class
  if (className) {
    attempts[className] = prevAttempts + 1;
    // Clean up stale class entries (keep only recent 50)
    const keys = Object.keys(attempts);
    if (keys.length > 50) {
      keys.slice(0, keys.length - 50).forEach(k => delete attempts[k]);
    }
    raw.class_attempts = attempts;
  }

  raw.lastUsed = Date.now();
  await env.AI_TOKENS.put(tokenKey, JSON.stringify(raw));

  return json({
    credits:     raw.credits ?? 0,
    deducted:    !isFreeRegen,
    free_regen:  isFreeRegen,
    total_used:  raw.total_used || 0,
  });
}

/* ════════════════════════════════════════════════════════════
   CREDITS — restore token by email (resend token email)
   GET /credits/restore?email=user@example.com
   ════════════════════════════════════════════════════════════ */
async function handleRestoreToken(request, env) {
  const url2 = new URL(request.url);
  const email = (url2.searchParams.get('email') || '').toLowerCase().trim();
  if (!email || !email.includes('@')) return json({ error: 'Valid email required' }, 400);

  // Scan KV for token with this email (limited to 200 tokens)
  const list = await env.AI_TOKENS.list({ prefix: 'token:sft-pro-' });
  let found = null;
  for (const key of list.keys.slice(0, 200)) {
    const rec = await env.AI_TOKENS.get(key.name, { type: 'json' }).catch(() => null);
    if (rec && (rec.email || '').toLowerCase() === email) {
      found = { token: key.name.replace('token:', ''), rec };
      break;
    }
  }

  if (!found) return json({ error: 'No account found for this email' }, 404);

  // Resend token email
  if (env.RESEND_API_KEY) {
    sendCreditTokenEmail(env, found.rec.email, found.token, found.rec.credits ?? 0).catch(() => {});
  }

  return json({ sent: true, credits: found.rec.credits ?? 0 });
}

/* ════════════════════════════════════════════════════════════
   FREE TRIAL — 3 free credits per email, one-time
   POST /credits/free-trial  { email }
   ════════════════════════════════════════════════════════════ */
async function handleFreeTrial(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Per-IP rate limit: 3 requests/hour prevents email enumeration & abuse
  const trialIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!await checkIPRateLimit(env, trialIP, 'freetrial', 3, 3600)) {
    return json({ error: 'Too many requests from your IP. Please try again later.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const email = (body.email || '').toLowerCase().trim();
  if (!email || !email.includes('@')) return json({ error: 'Valid email required' }, 400);

  // Check if email already claimed free trial
  const trialKey = `freetrial:${email}`;
  const alreadyClaimed = await env.AI_TOKENS.get(trialKey).catch(() => null);
  if (alreadyClaimed) {
    return json({ error: 'Free trial already claimed for this email. Please buy credits to continue.' }, 409);
  }

  // Create token with 3 free credits
  const FREE_CREDITS = 3;
  const token = 'sft-pro-' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const record = {
    email,
    plan:          'credits',
    credits:       FREE_CREDITS,
    total_bought:  0,
    total_used:    0,
    is_trial:      true,
    class_attempts: {},
    createdAt:     Date.now(),
  };

  // Save token + mark email as used (both in parallel)
  await Promise.all([
    env.AI_TOKENS.put(`token:${token}`, JSON.stringify(record)),
    env.AI_TOKENS.put(trialKey, '1', { expirationTtl: 60 * 60 * 24 * 365 * 5 }), // 5 years
  ]);

  // Send welcome email with token (fire-and-forget)
  if (env.RESEND_API_KEY) {
    sendFreeTrialEmail(env, email, token).catch(() => {});
  }

  return json({ token, credits: FREE_CREDITS, trial: true });
}

async function sendFreeTrialEmail(env, email, token) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SF Tools <noreply@salesforcetools.in>',
      to: email,
      subject: 'Your 3 free AI generations are ready — SF Tools',
      html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;padding:40px 20px;margin:0">
        <div style="max-width:520px;margin:0 auto">
          <div style="font-size:2rem;margin-bottom:8px">🎉</div>
          <h1 style="font-size:1.4rem;font-weight:800;margin:0 0 6px">3 free AI generations are ready!</h1>
          <p style="color:#94a3b8;margin:0 0 16px;font-size:.9rem">Generate 3 Apex test classes free. No payment needed. If you love it, get more for ₹50.</p>
          <div style="background:#1e2433;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px">
            <div style="font-size:.72rem;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Your Access Token (save this)</div>
            <code style="font-family:monospace;font-size:.95rem;color:#4ade80;word-break:break-all">${token}</code>
          </div>
          <p style="font-size:.8rem;color:#94a3b8;margin-bottom:16px">Already saved in your browser — just go back to SF Tools and start generating!</p>
          <a href="https://salesforcetools.in" style="display:inline-block;background:#4F6CF7;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:.9rem;margin-bottom:24px">Start Generating →</a>
          <p style="font-size:.75rem;color:#64748b">Save this token — if you clear your browser you'll need it to restore access.</p>
        </div>
      </body></html>`
    })
  });
}

/* ════════════════════════════════════════════════════════════
   PAYMENT — create Razorpay order
   POST /payment/create-order  { credits, email }
   credits: number of generation credits to purchase
   ════════════════════════════════════════════════════════════ */
async function handleCreateOrder(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { credits, email } = body;
  const numCredits = parseInt(credits, 10);
  if (!numCredits || numCredits < 1 || numCredits > 500) {
    return json({ error: 'credits must be between 1 and 500' }, 400);
  }
  if (!email || !email.includes('@')) return json({ error: 'Valid email required' }, 400);

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return json({ error: 'Payment not configured' }, 500);
  }

  // Pricing: ₹50 for 12 credits (starter), ₹4/credit for larger packs
  const totalRs = numCredits <= 12 ? 50 : numCredits * 4;
  const pricePerCredit = Math.round(totalRs / numCredits);
  const amountPaise = totalRs * 100; // Razorpay uses paise

  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);

  let rzResp, rzText, order;
  try {
    rzResp = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:   amountPaise,
        currency: 'INR',
        notes:    { credits: String(numCredits), email, price_per_credit: String(pricePerCredit) },
      }),
    });
    rzText = await rzResp.text();
  } catch (fetchErr) {
    return json({ error: 'Could not reach Razorpay: ' + fetchErr.message }, 502);
  }

  try { order = JSON.parse(rzText); }
  catch { return json({ error: `Razorpay returned unexpected response (HTTP ${rzResp.status}): ${rzText.slice(0, 300)}` }, 502); }

  if (order.error) return json({ error: order.error.description || JSON.stringify(order.error) }, 400);
  return json({ ...order, razorpayKeyId: env.RAZORPAY_KEY_ID, credits: numCredits, price_per_credit: pricePerCredit, total_rs: totalRs });
}

/* ════════════════════════════════════════════════════════════
   PAYMENT — verify Razorpay payment + credit account
   POST /payment/verify
   { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, email, existingToken? }
   ════════════════════════════════════════════════════════════ */
async function handleVerifyPayment(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, email, existingToken } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json({ error: 'Missing payment parameters' }, 400);
  }

  // Verify HMAC-SHA256 signature
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.RAZORPAY_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${razorpay_order_id}|${razorpay_payment_id}`)
  );
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (expected !== razorpay_signature) {
    return json({ error: 'Payment verification failed' }, 400);
  }

  const numCredits = parseInt(credits, 10) || 0;

  let token, record;

  if (existingToken && existingToken.startsWith('sft-pro-')) {
    // Top-up existing account
    const tokenKey = `token:${existingToken}`;
    const existing = await env.AI_TOKENS.get(tokenKey, { type: 'json' }).catch(() => null);
    if (existing) {
      existing.credits       = (existing.credits       || 0) + numCredits;
      existing.total_bought  = (existing.total_bought  || 0) + numCredits;
      existing.lastTopUp     = Date.now();
      existing.razorpayOrderId   = razorpay_order_id;
      existing.razorpayPaymentId = razorpay_payment_id;
      await env.AI_TOKENS.put(tokenKey, JSON.stringify(existing));
      token  = existingToken;
      record = existing;
    }
  }

  if (!token) {
    // Create new credit account
    token = 'sft-pro-' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    record = {
      email:             email || '',
      plan:              'credits',
      credits:           numCredits,
      total_bought:      numCredits,
      total_used:        0,
      class_attempts:    {},
      createdAt:         Date.now(),
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    };
    await env.AI_TOKENS.put(`token:${token}`, JSON.stringify(record));
  }

  // Send email via Resend (fire-and-forget)
  if (env.RESEND_API_KEY && email) {
    sendCreditTokenEmail(env, email, token, record.credits).catch(() => {});
  }

  return json({ token, credits: record.credits, email: record.email });
}

async function sendCreditTokenEmail(env, email, token, credits) {
  const subject = `Your SF Tools Access Token — ${credits} credits ready`;
  const htmlBody = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;padding:40px 20px;margin:0">
    <div style="max-width:520px;margin:0 auto">
      <div style="font-size:2rem;margin-bottom:8px">⚡</div>
      <h1 style="font-size:1.4rem;font-weight:800;margin:0 0 6px">You have ${credits} credits ready</h1>
      <p style="color:#94a3b8;margin:0 0 24px;font-size:.9rem">Copy the token below and paste it in SF Tools → Test Generator → Restore Access.</p>
      <div style="background:#1e2433;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:24px">
        <div style="font-size:.72rem;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Your Access Token (keep safe)</div>
        <code style="font-family:monospace;font-size:1rem;color:#4ade80;word-break:break-all">${token}</code>
      </div>
      <p style="font-size:.8rem;color:#94a3b8;margin-bottom:8px">Each generation uses 1 credit. Re-generating the same class (up to 3 times) is free.</p>
      <a href="https://www.salesforcetools.in" style="display:inline-block;background:#4F6CF7;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:.9rem;margin-bottom:24px">Open SF Tools →</a>
      <p style="font-size:.75rem;color:#64748b">Keep this token safe — it is your access key. Don't share it publicly. Need help? Email support@salesforcetools.in</p>
    </div>
  </body></html>`;

  // Primary: Resend (using onboarding@resend.dev — works without domain verification)
  if (env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'SF Tools <onboarding@resend.dev>',
          to:      email,
          subject,
          html:    htmlBody,
        }),
      });
      const result = await r.json();
      console.log('[sendCreditTokenEmail] Resend status:', r.status, JSON.stringify(result));
      if (r.ok) return; // success — skip fallback
    } catch (e) {
      console.error('[sendCreditTokenEmail] Resend error:', e.message);
    }
  }

  // Fallback: Web3Forms (no domain verification needed)
  if (env.WEB3FORMS_KEY) {
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: env.WEB3FORMS_KEY,
          subject,
          email:      email,
          message:    `Your SF Tools Access Token:\n\n${token}\n\nCredits: ${credits}\n\nPaste this token in SF Tools → Test Generator → Restore Access.`,
        }),
      });
      console.log('[sendCreditTokenEmail] Web3Forms status:', r.status);
    } catch (e) {
      console.error('[sendCreditTokenEmail] Web3Forms error:', e.message);
    }
  }
}

/* ════════════════════════════════════════════════════════════
   ADMIN STATS — list tokens + usage summary
   POST /admin/stats  { adminKey }
   ════════════════════════════════════════════════════════════ */
async function handleAdminStats(request, env) {
  if (request.method !== 'POST' && request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body = {};
  if (request.method === 'POST') {
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  }

  const adminKey = env.ADMIN_KEY || '';
  if (!adminKey || body.adminKey !== adminKey) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const list = await env.AI_TOKENS.list({ prefix: 'token:' });
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  let totalUsed = 0, totalCreditsRemaining = 0, totalRevenue = 0;
  const tokens = [];

  for (const key of list.keys.slice(0, 100)) {
    const rec = await env.AI_TOKENS.get(key.name, { type: 'json' }).catch(() => null);
    if (!rec) continue;

    if (rec.plan === 'credits') {
      // Credit-based account
      const used    = rec.total_used   || 0;
      const bought  = rec.total_bought || 0;
      totalUsed += used;
      totalCreditsRemaining += (rec.credits || 0);
      // Revenue estimate: ₹4/credit avg
      totalRevenue += bought * 4;
      tokens.push({
        token:    key.name.replace('token:', ''),
        email:    rec.email,
        plan:     'credits',
        credits:  rec.credits || 0,
        total_bought: bought,
        total_used: used,
      });
    } else {
      // Legacy subscription token
      const callsThisMonth = rec.usage?.[month] || 0;
      totalUsed += callsThisMonth;
      const PLAN_REVENUE = { basic: 199, pro: 499, team: 1499 };
      if (!rec.expiresAt || rec.expiresAt > Date.now()) {
        totalRevenue += PLAN_REVENUE[rec.plan] || 199;
      }
      tokens.push({
        token:        key.name.replace('token:', ''),
        email:        rec.email,
        plan:         rec.plan,
        expiresAt:    rec.expiresAt,
        monthlyLimit: rec.monthlyLimit,
        callsThisMonth,
      });
    }
  }

  return json({
    totalTokens: tokens.length,
    totalUsed,
    totalCreditsRemaining,
    estimatedRevenue: totalRevenue,
    tokens,
  });
}

/* ── /feedback handler ─────────────────────────────────────── */
async function handleFeedback(request, env) {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

  // Per-IP rate limit: 5 submissions/hour prevents spam & email flooding
  const feedbackIP = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!await checkIPRateLimit(env, feedbackIP, 'feedback', 5, 3600)) {
    return json({ error: 'Too many feedback submissions. Please try again later.' }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { name, email, type, message } = body;
  if (!name || !message) return json({ error: 'name and message required' }, 400);

  // 1. Save to KV first — feedback is never lost even if email fails
  const fbKey = `feedback:${Date.now()}:${feedbackIP}`;
  const fbRecord = { name, email: email || '', type: type || 'General', message, ts: Date.now(), ip: feedbackIP };
  await env.AI_TOKENS.put(fbKey, JSON.stringify(fbRecord), { expirationTtl: 60 * 60 * 24 * 90 }).catch(() => {});

  // 2. Send email via Web3Forms (awaited so CF Worker doesn't cancel the fetch)
  if (env.WEB3FORMS_KEY) {
    console.log('[Feedback] Sending via Web3Forms, key prefix:', env.WEB3FORMS_KEY.slice(0, 8));
    try {
      const w3r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: env.WEB3FORMS_KEY,
          subject:    `[SF Tools Feedback] ${type || 'General'} from ${name}`,
          from_name:  'SF Tools Feedback',
          name,
          email:      email || 'noreply@salesforcetools.in',
          message:    `Type: ${type || 'General'}\nName: ${name}\nEmail: ${email || 'not provided'}\n\n${message}`,
        }),
      });
      const w3text = await w3r.text();
      console.log('[Feedback] Web3Forms status:', w3r.status, 'response:', w3text);
    } catch (e) {
      console.error('[Feedback] Web3Forms fetch error:', e.message);
    }
  } else {
    console.warn('[Feedback] WEB3FORMS_KEY not set — email skipped');
  }

  // Always return success — KV save is the source of truth
  return json({ success: true });
}

/* ══════════════════════════════════════════════════════════════
   KV TABLE STRUCTURE (all keys in AI_TOKENS namespace)
   ─────────────────────────────────────────────────────────────
   user:{googleSub}          → { name, email, picture, plan, proToken, createdAt, lastSeen }
   user:{googleSub}:orgs     → [ { nickname, instanceUrl, env, addedAt } ]
   user:{googleSub}:settings → { theme, ... }
   session:{sessionToken}    → googleSub  (TTL: 30 days)
   ══════════════════════════════════════════════════════════════ */

/* ── /auth/google — verify Google JWT → create session ─────── */
async function handleGoogleAuth(request, env) {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { credential } = body; // Google One Tap / GSI credential JWT
  if (!credential) return json({ error: 'credential required' }, 400);

  // Verify with Google tokeninfo endpoint (free, no secret needed)
  let gUser;
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!r.ok) return json({ error: 'Invalid Google token' }, 401);
    gUser = await r.json();
  } catch (e) {
    return json({ error: 'Could not verify token: ' + e.message }, 502);
  }

  // Validate audience matches our app
  const CLIENT_ID = env.GOOGLE_CLIENT_ID || '';
  if (CLIENT_ID && gUser.aud !== CLIENT_ID) return json({ error: 'Token audience mismatch' }, 401);

  const sub      = gUser.sub;   // stable unique Google user ID
  const email    = gUser.email;
  const name     = gUser.name;
  const picture  = gUser.picture;
  const now      = Date.now();

  // Load or create user profile
  const userKey  = `user:${sub}`;
  let profile    = {};
  try { profile = JSON.parse(await env.AI_TOKENS.get(userKey) || '{}'); } catch {}

  const isNew = !profile.createdAt;
  profile = {
    ...profile,
    name, email, picture,
    plan:      profile.plan      || 'free',
    proToken:  profile.proToken  || null,
    createdAt: profile.createdAt || now,
    lastSeen:  now,
  };
  await env.AI_TOKENS.put(userKey, JSON.stringify(profile));

  // Create session token (random, TTL 30 days)
  const sessionToken = crypto.randomUUID() + crypto.randomUUID();
  await env.AI_TOKENS.put(`session:${sessionToken}`, sub, { expirationTtl: 60 * 60 * 24 * 30 });

  return json({ sessionToken, profile, isNew });
}

/* ── Helper: resolve session token → googleSub ─────────────── */
async function resolveSession(request, env) {
  const authHeader = request.headers.get('x-session-token') || '';
  if (!authHeader) return null;
  const sub = await env.AI_TOKENS.get(`session:${authHeader}`);
  return sub || null;
}

/* ── /user/profile — GET or POST ───────────────────────────── */
async function handleUserProfile(request, env) {
  const sub = await resolveSession(request, env);
  if (!sub) return json({ error: 'Not authenticated' }, 401);
  const userKey = `user:${sub}`;

  if (request.method === 'GET') {
    const raw = await env.AI_TOKENS.get(userKey);
    if (!raw) return json({ error: 'User not found' }, 404);
    return json(JSON.parse(raw));
  }

  if (request.method === 'POST') {
    let updates;
    try { updates = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    let profile = {};
    try { profile = JSON.parse(await env.AI_TOKENS.get(userKey) || '{}'); } catch {}
    // Only allow safe fields to be updated
    const allowed = ['settings'];
    allowed.forEach(k => { if (updates[k] !== undefined) profile[k] = updates[k]; });
    profile.lastSeen = Date.now();
    await env.AI_TOKENS.put(userKey, JSON.stringify(profile));
    return json({ success: true, profile });
  }

  return json({ error: 'Method not allowed' }, 405);
}

/* ── /user/orgs — GET or POST saved orgs ───────────────────── */
async function handleUserOrgs(request, env) {
  const sub = await resolveSession(request, env);
  if (!sub) return json({ error: 'Not authenticated' }, 401);
  const orgsKey = `user:${sub}:orgs`;

  if (request.method === 'GET') {
    const raw = await env.AI_TOKENS.get(orgsKey);
    return json({ orgs: raw ? JSON.parse(raw) : [] });
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    // body.orgs = full array to save (client manages the list)
    const orgs = (body.orgs || []).map(o => ({
      nickname:    o.nickname    || '',
      instanceUrl: o.instanceUrl || '',
      env:         o.env         || 'production',
      addedAt:     o.addedAt     || Date.now(),
      // NEVER store access_token or session_id
    })).slice(0, 20); // max 20 saved orgs
    await env.AI_TOKENS.put(orgsKey, JSON.stringify(orgs));
    return json({ success: true, orgs });
  }

  return json({ error: 'Method not allowed' }, 405);
}

/* ── /user/delete — GDPR: delete all user data ─────────────── */
async function handleUserDelete(request, env) {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  const sub = await resolveSession(request, env);
  if (!sub) return json({ error: 'Not authenticated' }, 401);

  // Delete all user keys
  await Promise.allSettled([
    env.AI_TOKENS.delete(`user:${sub}`),
    env.AI_TOKENS.delete(`user:${sub}:orgs`),
    env.AI_TOKENS.delete(`user:${sub}:settings`),
  ]);

  // Invalidate session
  const sessionToken = request.headers.get('x-session-token') || '';
  if (sessionToken) await env.AI_TOKENS.delete(`session:${sessionToken}`);

  return json({ success: true, message: 'All your data has been deleted.' });
}

/* ── helpers ── */
// _currentRequest is a module-level fallback for the json() helper so handlers
// don't need to thread `request` through every call.  Pass `req` explicitly in
// hot/concurrent paths (handleAI, handleAdminStats) to avoid the theoretical
// race where a second concurrent request overwrites the global before json() fires.
let _currentRequest = null;
function json(data, status = 200, req) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req ?? _currentRequest ?? {}), 'Content-Type': 'application/json' },
  });
}
