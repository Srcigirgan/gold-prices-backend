const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const port = 3001;
const SECRET_KEY = 'your_secret_key';

// CORS ayarlarını yap
const corsOptions = {
  origin: ['http://localhost:3000', 'http://192.168.1.103:3000'], // Bu adresi ağınızdaki IP adresinizle değiştirin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

app.use('/Fiyatlar', express.static(path.join(__dirname, 'Fiyatlar')));

const loadUsers = () => {
  const data = fs.readFileSync('users.json', 'utf8');
  return JSON.parse(data);
};

const loadPrices = (date) => {
  const filePath = path.join('Fiyatlar', `${date}.json`);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading prices:', error);
    return {};
  }
};

const savePrices = (date, prices) => {
  const filePath = path.join('Fiyatlar', `${date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(prices, null, 2), 'utf8');
};

app.post('/api/prices', (req, res) => {
  const { date, ...newPrices } = req.body;

  try {
    const currentPrices = loadPrices(date);
    const updatedPrices = { ...currentPrices, ...newPrices };
    savePrices(date, updatedPrices);
    res.status(200).json({ message: 'Prices updated successfully', prices: updatedPrices });
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({ message: 'Error updating prices' });
  }
});

app.get('/api/prices', (req, res) => {
  const { date } = req.query;

  try {
    const data = loadPrices(date);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error loading prices:', error);
    res.status(500).json({ message: 'Error loading prices' });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.status(200).json({ message: 'File uploaded successfully', file: req.file });
});

app.get('/api/images', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return res.status(500).json({ message: 'Unable to scan files' });
    }
    const images = files.map(file => ({
      filename: file,
      url: `http://${req.hostname}:${port}/uploads/${file}`
    }));
    res.status(200).json(images);
  });
});

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

app.use('/uploads', express.static('uploads'));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users.find((user) => user.username === username);

  if (user) {
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token });
      } else {
        res.status(401).json({ message: 'Invalid credentials' });
      }
    });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

app.get('/api/prices/dates', (req, res) => {
  try {
    const files = fs.readdirSync('Fiyatlar');
    const dates = files.map(file => file.replace('.json', ''));
    res.status(200).json(dates);
  } catch (error) {
    console.error('Error loading dates:', error);
    res.status(500).json({ message: 'Error loading dates' });
  }
});

app.get('/api/protected', authenticate, (req, res) => {
  res.status(200).json({ message: 'Access granted' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
