require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const { Readable } = require('stream');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Use memory storage to avoid writing files to disk
const upload = multer({ storage: storage });

// Google Drive API functions
const SCOPE = ['https://www.googleapis.com/auth/drive'];

// Helper function to initialize Google Drive API client
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

// Helper function to upload file to Google Drive
function createReadableStreamFromBuffer(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null); // Signal end of stream
    return stream;
}

async function uploadFile(authClient, fileBuffer, fileName, mimeType, folderId = process.env.FOLDER_ID) {
    const drive = google.drive({ version: 'v3', auth: authClient });

    const fileMetaData = {
        name: fileName,
        parents: [folderId],
    };

    const media = {
        mimeType: mimeType,
        body: createReadableStreamFromBuffer(fileBuffer),
    };

    const response = await drive.files.create({
        resource: fileMetaData,
        media: media,
        fields: 'id',
    });

    return response.data.id;
}

// Route to handle file uploads
router.post('/', upload.array('files'), async (req, res) => {
    try {
        const authClient = await authorize();
        
        // Concurrently upload files using Promise.all
        const uploadedFiles = await Promise.all(req.files.map(async (file) => {
            const fileId = await uploadFile(authClient, file.buffer, file.originalname, file.mimetype);
            return { fileName: file.originalname, fileId };
        }));

        res.status(200).json({ success: true, uploadedFiles });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to upload files', error: error.message });
    }
});

module.exports = router;
