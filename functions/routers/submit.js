require('dotenv').config();
const express = require('express');
const router = express.Router();
const mysql = require("mysql2/promise");
const jwt = require('jsonwebtoken');
const encryptDecryptMiddleware = require('../auth/encrypt')
const pool = mysql.createPool({
    host: process.env.DB_HOST, // e.g. '127.0.0.1'
    port: process.env.DB_PORT, // e.g. '3306'
    user: process.env.DB_USER, // e.g. 'my-db-user'
    password: process.env.DB_PASSWORD, // e.g. 'my-db-password'
    database: process.env.DB_NAME,
});
router.use(encryptDecryptMiddleware)

router.post('/login', async (req, res) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
       
        const [member] = await connection.query(
            `
          SELECT email, password, iv
          FROM admin 
          WHERE email=?
           ;
          `,
            [
                req.body.email,
            ]
        );
        if (member.length == 0) {
            return res.status(404).json({ message: "email or password is incorrect !!" });
        } else {
            var password = req.decrypt(member[0].password, member[0].iv);
            if (password === req.body.password) {
                const user = { email: member[0].email }; // Example user data
                const secretKey = process.env.AUTH_KEY;
                const token = jwt.sign(user, secretKey, { expiresIn: '1d' });
                await connection.commit();
                return res.status(200).json({ token: token })
            }
        }
        
    } catch (error) {
        await connection.rollback();
        console.log(error);
        res.status(500).json({ message: "server error" });
    } finally {
        connection.release();
    }
})

module.exports = router;