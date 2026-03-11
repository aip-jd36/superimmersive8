/**
 * HTTP Basic Auth Middleware for Vercel Serverless Functions
 */

/**
 * Simple HTTP Basic Auth middleware
 * @param {Function} handler - The API route handler function
 * @returns {Function} Wrapped handler with auth
 */
export function withAuth(handler) {
  return async (req, res) => {
    // Get authorization header
    const authHeader = req.headers.authorization;

    // Check if auth header exists
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return unauthorized(res);
    }

    // Decode credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Get valid credentials from environment variables
    const validUsername = process.env.AUTH_USERNAME || 'admin';
    const validPassword = process.env.AUTH_PASSWORD;

    // Check password is set
    if (!validPassword) {
      console.error('AUTH_PASSWORD not set in environment variables');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    // Validate credentials
    if (username !== validUsername || password !== validPassword) {
      return unauthorized(res);
    }

    // Auth successful - call the handler
    return handler(req, res);
  };
}

/**
 * Send 401 Unauthorized response with WWW-Authenticate header
 */
function unauthorized(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Chain of Title Generator"');
  res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
}

/**
 * Middleware for static pages - redirects to login if not authenticated
 * (Not used in API routes, but useful for future HTML pages)
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Chain of Title Generator"');
    res.status(401).send('Authentication required');
    return;
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  const validUsername = process.env.AUTH_USERNAME || 'admin';
  const validPassword = process.env.AUTH_PASSWORD;

  if (username !== validUsername || password !== validPassword) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Chain of Title Generator"');
    res.status(401).send('Authentication required');
    return;
  }

  next();
}
