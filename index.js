const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

let prices = {};

app.post('/api/prices', (req, res) => {
  prices = { ...req.body };
  console.log('Updated prices:', prices);  // Log the prices to the console
  res.status(200).json({ message: 'Prices updated successfully', prices });
});

app.get('/api/prices', (req, res) => {
  res.status(200).json(prices);  // Return the current prices
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Route to handle file upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.status(200).json({ message: 'File uploaded successfully', file: req.file });
});

// Route to get the list of uploaded images
app.get('/api/images', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);  // Hata mesajını konsola yazdır
      return res.status(500).json({ message: 'Unable to scan files' });
    }
    const images = files.map(file => ({
      filename: file,
      url: `http://localhost:3001/uploads/${file}`
    }));
    res.status(200).json(images);
  });
});

// Route to delete an image
app.delete('/api/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).json({ message: 'Error deleting file' });
    }
    res.status(200).json({ message: 'File deleted successfully' });
  });
});


// Serve uploaded images
app.use('/uploads', express.static('uploads'));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
