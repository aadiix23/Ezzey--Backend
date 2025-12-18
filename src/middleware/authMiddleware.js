const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  // Read token from HTTP-only cookie instead of Authorization header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    console.log('❌ No token found in cookies');
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route - Please login first',
    });
  }

  try {
    console.log('🔍 Token received from cookie, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token verified for user:', decoded.id);

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      console.log('❌ User not found with ID:', decoded.id);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    console.log('✅ User authenticated:', req.user.email);
    next();
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route - Invalid or expired token',
      error: error.message,
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('❌ req.user not set in authorize middleware');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log(
        '❌ User role not authorized. User role:',
        req.user.role,
        'Required roles:',
        roles
      );
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route. Required roles: ${roles.join(
          ', '
        )}`,
      });
    }

    console.log('✅ User authorized with role:', req.user.role);
    next();
  };
};