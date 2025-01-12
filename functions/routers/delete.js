require('dotenv').config();

const express = require('express');
const { google } = require('googleapis');
const mysql = require("mysql2/promise");
const JWTauth = require('../auth/JWTauth')

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
const router = express.Router();

// Google Drive API Configuration
const SCOPE = ['https://www.googleapis.com/auth/drive'];

// Authorize Google Service Account
async function authorize() {
    try {
        const jwtClient = new google.auth.JWT(
            process.env.CLIENT_EMAIL,
            null,
            process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
            SCOPE
        );
        await jwtClient.authorize();
        return jwtClient;
    } catch (error) {
        console.error('Error authorizing Google Drive API:', error.message);
        throw new Error('Failed to authorize Google Drive API');
    }
}

// Delete File from Google Drive
async function deleteFile(authClient, fileId) {
    try {
        const drive = google.drive({ version: 'v3', auth: authClient });
        await drive.files.delete({ fileId });
        console.log(`File deleted successfully: ${fileId}`);
    } catch (error) {
        console.error(`Error deleting file with ID ${fileId}:`, error.message);
        throw new Error('Failed to delete file from Google Drive');
    }
}

// Delete File Route
router.delete('/:fileId', JWTauth,async (req, res) => {
    const { fileId } = req.params;
    try {
        const authClient = await authorize();
        await deleteFile(authClient, fileId);
        await deleteFilesql(fileId);
        res.status(200).json({ success: true, message: `File deleted successfully!` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete the file." });
    }
});
async function deleteFilesql(id) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
        await connection.query(
            `
                DELETE FROM files
                WHERE fileId = ?;
                `,
            [
                id,
            ]
        );
        await connection.commit();

        return true;
    } catch (error) {
        await connection.rollback();
        console.log(error);
        return false;
    } finally {
        connection.release();
    }
}
module.exports = router;
