require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const serverless = require("serverless-http");
const express = require('express');
const upload = require('./routers/upload');
const fetch = require('./routers/fetch');
const deleteFile = require('./routers/delete');
const storage = require('./routers/storage');
const app = express();
const corsOptions = {
    origin: "*",
};
const router = express.Router();
app.use(bodyParser.json());
app.use(cors(corsOptions));

router.use('/upload', upload);
router.use('/fetch', fetch);
router.use('/delete', deleteFile);
router.use('/storage', storage);

app.use("/.netlify/functions/app", router);
app.listen("5000", () => {
    console.log("server is running")
})
module.exports.handler = serverless(app);
