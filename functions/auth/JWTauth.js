const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Retrieve token from cookies or Authorization header
    if (!token) {
        return res.status(401).json({ message: "Access denied." });
    }

    try {
        // Verify token
        const secretKey = process.env.AUTH_KEY; // Use your secret key from environment variables
        const decoded = jwt.verify(token, secretKey);

        // Attach user info to the request object
        req.user = decoded;

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};

module.exports = authenticateJWT;
