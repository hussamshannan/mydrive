require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
// const serverless = require("serverless-http");
const express = require('express');
const upload = require('./routers/upload');
const fetch = require('./routers/fetch');
const deleteFile = require('./routers/delete');
const storage = require('./routers/storage');
const submit = require('./routers/submit');
const app = express();
const corsOptions = {
    origin: "*",
};
// const router = express.Router();
app.use(bodyParser.json());
app.use(cors(corsOptions));

app.use('/upload', upload);
app.use('/fetch', fetch);
app.use('/delete', deleteFile);
app.use('/storage', storage);
app.use('/submit', submit);

// app.use("/.netlify/functions/app", router);
app.listen("5000", () => {
    console.log("server is running")
})
// module.exports.handler = serverless(app);
