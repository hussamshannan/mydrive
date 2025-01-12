const crypto = require('crypto');
require('dotenv').config();

const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(process.env.KEY).digest();

const encryptDecryptMiddleware = (req, res, next) => {
    
    req.encrypt = (plainText) => {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return { encryptedData: encrypted, iv: iv.toString('hex') };
    };
    
    req.decrypt = (encryptedData, ivHex) => {
        try {
            const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, 'hex'));
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (err) {
            console.error('Decryption failed:', err);
            throw new Error('Invalid decryption data');
        }
    };

    next();
};

module.exports = encryptDecryptMiddleware;
