require('dotenv').config()
const express = require('express');
const { google } = require('googleapis');

const router = express.Router();

// Google Drive API Configuration
const SCOPE = ['https://www.googleapis.com/auth/drive'];

// Authorize Service Account
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
router.get('/', async (req, res) => {
    try {
        const authClient = await authorize();
        const drive = google.drive({ version: 'v3', auth: authClient });

        // Get storage quota information
        const response = await drive.about.get({
            fields: 'storageQuota',
        });

        const { storageQuota } = response.data;
        const storageInfo = {
            total: parseInt(storageQuota.limit, 10), // Total storage in bytes
            used: parseInt(storageQuota.usage, 10), // Used storage in bytes
            remaining: parseInt(storageQuota.limit, 10) - parseInt(storageQuota.usage, 10), // Remaining storage in bytes
        };

        res.status(200).json({ success: true, storageInfo });
    } catch (error) {
        console.error('Error fetching storage information:', error.message);
        res.status(500).json({ success: false, message: 'Failed to fetch storage information', error: error.message });
    }
});

module.exports = router;
