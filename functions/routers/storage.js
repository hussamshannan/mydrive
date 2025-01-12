require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const JWTauth = require('../auth/JWTauth')

const router = express.Router();

// Google Drive API Configuration
const SCOPE = ['https://www.googleapis.com/auth/drive.readonly']; // Read-only access to files

// Authorize Service Account

async function authorize() {
    const jwtClient = new google.auth.JWT(
        process.env.CLIENT_EMAIL, // Service account email
        null,
        process.env.PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newlines in the private key
        SCOPE
    );
    await jwtClient.authorize();
    return jwtClient;
}

// Function to count files based on MIME types
async function countFiles(drive, mimeTypes) {
    let pageToken = null;
    const fileIds = new Set(); // To store unique file IDs

    do {
        try {
            const response = await drive.files.list({
                q: `(${mimeTypes.map(type => `mimeType='${type}'`).join(' or ')}) and trashed = false and 'me' in owners and mimeType != 'application/vnd.google-apps.folder'`, // Exclude folders
                fields: 'nextPageToken, files(id)',
                pageToken,
                pageSize: 1000, // Adjust the page size if needed
            });

            // Add unique file IDs to the Set
            response.data.files.forEach(file => fileIds.add(file.id));

            pageToken = response.data.nextPageToken;
        } catch (error) {
            console.error('Error fetching files:', error.message);
            throw error;
        }
    } while (pageToken);

    return fileIds.size; // Return the count of unique file IDs
}

// Route to get storage information and file counts
router.get('/',JWTauth, async (req, res) => {
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

        // Count images and videos
        const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const videoMimeTypes = ['video/mp4', 'video/mpeg', 'video/x-matroska'];

        const imageCount = await countFiles(drive, imageMimeTypes);
        const videoCount = await countFiles(drive, videoMimeTypes);

        res.status(200).json({
            success: true,
            storageInfo,
            fileCounts: {
                images: (imageCount - 53),
                videos: videoCount,
            },
        });
    } catch (error) {
        console.error('Error fetching information:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch information',
            error: error.message,
        });
    }
});

module.exports = router;
