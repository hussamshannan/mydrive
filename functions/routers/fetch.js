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
const SCOPE = ['https://www.googleapis.com/auth/drive'];
const FOLDER_ID = process.env.FOLDER_ID; // Default folder ID
// Initialize Google Drive client
async function authorize() {
    const jwtClient = new google.auth.JWT(
        process.env.CLIENT_EMAIL,
        null,
        process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        SCOPE
    );
    await jwtClient.authorize();
    return jwtClient;
}
async function getFiles(authClient) {
    const drive = google.drive({ version: 'v3', auth: authClient });
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Fetch file IDs from the database
        const [rows] = await connection.query(`SELECT fileId FROM files`);
        const fileIds = rows.map((row) => row.fileId);

        // Limit to the first 20 files
        const limitedFiles = fileIds.slice(0, 20);
        const remain = fileIds.slice(20);

        // Fetch file details for each limited file
        const results = await Promise.all(
            limitedFiles.map(async (fileId) => {
                try {
                    // Fetch file metadata
                    const { data: { name, mimeType } } = await drive.files.get({
                        fileId,
                        fields: 'name, mimeType',
                    });

                    // Fetch file content
                    const { data: contentStream } = await drive.files.get(
                        { fileId, alt: 'media' },
                        { responseType: 'stream' }
                    );

                    // Convert stream to buffer
                    const buffer = await streamToBuffer(contentStream);

                    // Construct the result object
                    return {
                        id: fileId,
                        name: name,
                        mimeType: mimeType,
                        src: blobToDataUri(buffer, mimeType),
                    };
                } catch (error) {
                    console.error(`Error fetching file ${fileId}:`, error.message);
                    return null; // Skip this file if there's an error
                }
            })
        );

        // Filter out null results due to errors
        const filteredResults = results.filter((result) => result !== null);

        // Commit the transaction
        await connection.commit();

        return { files: filteredResults, remain };
    } catch (error) {
        console.error('Transaction error:', error.message);
        await connection.rollback();
        return false;
    } finally {
        connection.release();
    }
}
// Convert a readable stream to a buffer
function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (chunk) => chunks.push(chunk));
        readableStream.on('end', () => resolve(Buffer.concat(chunks)));
        readableStream.on('error', reject);
    });
}
// Convert a buffer to a Data URI
function blobToDataUri(buffer, mimeType) {
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
}
// Route to fetch files
router.get('/', JWTauth, async (req, res) => {
    try {
        const authClient = await authorize();
        // const { files, remain } = await listFiles(authClient);
        const { files, remain } = await getFiles(authClient);
        res.status(200).json({ success: true, files, remain });
    } catch (error) {
        console.error('Error fetching files:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});
async function getnext(authClient, files) {
    try {
        const drive = google.drive({ version: 'v3', auth: authClient });

        const results = await Promise.all(
            files.map(async (fileId) => {
                try {
                    // Fetch file metadata
                    const { data: { name, mimeType } } = await drive.files.get({
                        fileId,
                        fields: 'name, mimeType',
                    });
                    // Fetch file content
                    const { data: contentStream } = await drive.files.get(
                        { fileId, alt: 'media' },
                        { responseType: 'stream' }
                    );

                    // Convert stream to buffer
                    const buffer = await streamToBuffer(contentStream);

                    // Construct the result object
                    return {
                        id: fileId,
                        name: name,
                        mimeType: mimeType,
                        src: blobToDataUri(buffer, mimeType),
                    };
                } catch (error) {
                    console.error(`Error fetching file: ${fileId}`, error.message);
                    return null; // Skip this file if there's an error
                }
            })
        );

        return results.filter(Boolean); // Filter out null results
    } catch (error) {
        console.error('Error processing files:', error.message);
        throw new Error('Failed to process files');
    }
}

router.post('/next', JWTauth, async (req, res) => {
    try {
        const authClient = await authorize();
        const files = req.body.files;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ success: false, message: 'Invalid files input' });
        }

        const result = await getnext(authClient, files);
        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error('Error fetching files:', error.message);
        res.status(500).json({ success: false, message: "Error fetching files" });
    }
});


module.exports = router;
