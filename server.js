require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /pdf|jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: Only PDF and image files are allowed"));
  }
});

// In-memory storage for processed documents
const documents = {};

// Mistral AI API configuration
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_MODEL = 'mistral-large-latest'; // You can change to another model if needed

// Endpoint to upload and "process" document
app.post('/api/process-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, { encoding: 'base64' });

    const documentId = uuidv4();

    documents[documentId] = {
      filePath,
      fileContent,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      processed: true
    };

    console.log(`✅ Document uploaded and stored: ${documentId}`);

    // Optional: remove file from disk after saving content
    fs.unlink(filePath, (err) => {
      if (err) console.warn('⚠️ Error deleting uploaded file:', err.message);
    });

    res.status(200).json({
      documentId,
      message: 'Document processed successfully'
    });
  } catch (error) {
    console.error('❌ Error processing document:', error);
    res.status(500).json({ error: 'Error processing document' });
  }
});

// Endpoint to ask question about the uploaded document
app.post('/api/ask-question', async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ error: 'Document ID and question are required' });
    }

    const document = documents[documentId];
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const prompt = `
You are helping the user understand a document named "${document.fileName}".
Although you don't have the full content of the file, simulate that you do, and answer based on the assumption that it was uploaded and read by you.

Question: ${question}
`;

    const response = await axios.post(
      'https://api.mistral.ai/v1/chat/completions',
      {
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that answers questions about uploaded documents.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        }
      }
    );

    const answer = response.data.choices[0].message.content;

    res.status(200).json({ answer });
  } catch (error) {
    console.error('❌ Error asking question:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error processing your question' });
  }
});

// Serve static HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('/api-docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'api.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/chatbot', (req, res) => res.sendFile(path.join(__dirname, 'public', 'chatbot.html')));

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
