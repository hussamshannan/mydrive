require('dotenv').config();

const express = require('express');
const { google } = require('googleapis');

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
router.delete('/:fileId', async (req, res) => {
    const { fileId } = req.params;

    try {
        const authClient = await authorize();
        await deleteFile(authClient, fileId);
        res.status(200).json({ success: true, message: `File ${fileId} deleted successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
