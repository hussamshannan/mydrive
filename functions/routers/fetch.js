require('dotenv').config();

const express = require('express');
const { google } = require('googleapis');

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

// Fetch all files in a folder
async function listFiles(authClient, folderId = FOLDER_ID) {
    const drive = google.drive({ version: 'v3', auth: authClient });
    const files = [];
    let pageToken = null;

    try {
        do {
            const { data } = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType)',
                spaces: 'drive',
                pageToken,
            });

            for (const file of data.files) {
                try {
                    const fileBlob = await getFileAsBlob(drive, file.id);
                    files.push({
                        id: file.id,
                        name: file.name,
                        mimeType: file.mimeType,
                        src: blobToDataUri(fileBlob, file.mimeType),
                    });
                } catch (error) {
                    console.error(`Error fetching file as blob: ${file.id}`, error.message);
                }
            }

            pageToken = data.nextPageToken;
        } while (pageToken);

        return files;
    } catch (error) {
        console.error('Error listing files:', error.message);
        throw new Error('Failed to list files');
    }
}

// Fetch file content as a blob
async function getFileAsBlob(drive, fileId) {
    try {
        const { data } = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        return await streamToBuffer(data);
    } catch (error) {
        console.error(`Error fetching file ${fileId} as blob:`, error.message);
        throw new Error('Error fetching file blob');
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
router.get('/', async (req, res) => {
    try {
        const authClient = await authorize();
        const files = await listFiles(authClient);
        res.status(200).json({ success: true, files });
    } catch (error) {
        console.error('Error fetching files:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
