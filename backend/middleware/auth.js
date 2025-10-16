// backend/middleware/auth.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Middleware to verify Supabase JWT token and extract user
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user to request object
    req.user = user;
    next();

  } catch (err) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to check if user has specific role
 */
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Fetch user role from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error || !userData) {
        return res.status(403).json({ error: 'User role not found' });
      }

      if (!allowedRoles.includes(userData.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          requiredRole: allowedRoles,
          userRole: userData.role
        });
      }

      req.userRole = userData.role;
      next();

    } catch (err) {
      console.error('Role check error:', err);
      return res.status(500).json({ error: 'Authorization failed' });
    }
  };
}

module.exports = {
  authenticateUser,
  requireRole
};