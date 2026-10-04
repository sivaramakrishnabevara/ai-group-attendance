/**
 * Role-based authorization middleware.
 * Verifies that the authenticated user possesses one of the allowed roles.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication credentials not provided.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' lacks permission for this action.`
      });
    }

    next();
  };
}

module.exports = {
  requireRole
};
