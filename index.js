const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // JWT kütüphanesini ekle
const bcrypt = require('bcrypt');

const app = express();
const port = 3001;
const SECRET_KEY = 'your_secret_key'; // Bu anahtarı güvenli bir şekilde sakla

// CORS ayarlarını yapılandır
const corsOptions = {
  origin: '*', // Tüm alan adlarına izin verir, güvenlik için belirli domainleri kullanmak daha iyi bir uygulamadır
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions)); // Cross-Origin Resource Sharing'i etkinleştirir
app.use(bodyParser.json()); // JSON biçimindeki istek gövdelerini ayrıştırır

// Kullanıcıları JSON dosyasından yükler
const loadUsers = () => {
  const data = fs.readFileSync('users.json', 'utf8');
  return JSON.parse(data);
};

// Fiyatları dosyadan yüklemek için yardımcı fonksiyon
const loadPrices = () => {
  try {
    const data = fs.readFileSync('Fiyatlar.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading prices:', error);
    return {};
  }
};

const addUser = (username, password) => {
  const users = loadUsers();
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) throw err;
    users.push({ username, password: hashedPassword });
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2), 'utf8');
  });
};

// Fiyatları dosyaya kaydeder
const savePrices = (prices) => {
  fs.writeFileSync('Fiyatlar.json', JSON.stringify(prices, null, 2), 'utf8');
};

// Fiyatları güncellemek için endpoint
app.post('/api/prices', (req, res) => {
  const { date, ...prices } = req.body;

  try {
    const currentPrices = loadPrices();

    // Tarih varsa mevcut verileri güncelle
    currentPrices[date] = prices;

    // Güncellenmiş fiyatları kaydet
    savePrices(currentPrices);
    console.log('Updated prices:', currentPrices);
    res.status(200).json({ message: 'Prices updated successfully', prices: currentPrices });
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({ message: 'Error updating prices' });
  }
});

// Fiyatları almak için endpoint
app.get('/api/prices', (req, res) => {
  const { date } = req.query;

  try {
    const data = loadPrices();
    if (date) {
      if (data[date]) {
        res.status(200).json({ [date]: data[date] });
      } else {
        res.status(404).json({ message: 'Date not found' });
      }
    } else {
      res.status(200).json(data);  // Mevcut fiyatları döndürür
    }
  } catch (error) {
    console.error('Error loading prices:', error);
    res.status(500).json({ message: 'Error loading prices' });
  }
});

// Dosya yüklemeleri için Multer konfigürasyonu
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// Tek bir resim yüklemek için endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.status(200).json({ message: 'File uploaded successfully', file: req.file });
});

// Yüklenen resimleri listelemek için endpoint
app.get('/api/images', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);  // Hata mesajını konsola yazdırır
      return res.status(500).json({ message: 'Unable to scan files' });
    }
    const images = files.map(file => ({
      filename: file,
      url: `http://${req.hostname}:${port}/uploads/${file}` // URL'yi dinamik olarak oluştur
    }));
    res.status(200).json(images);
  });
});

// Belirtilen dosyayı silmek için endpoint
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

app.use('/uploads', express.static('uploads')); // Yüklenen dosyalar için statik dosya sunumu

// Kullanıcı giriş endpoint'i
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

// Kimlik doğrulama için middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Token'ı Authorization header'dan al

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

// Mevcut tarihleri almak için endpoint
app.get('/api/prices/dates', (req, res) => {
  try {
    const data = loadPrices();
    const dates = Object.keys(data);
    res.status(200).json(dates);
  } catch (error) {
    console.error('Error loading dates:', error);
    res.status(500).json({ message: 'Error loading dates' });
  }
});

app.get('/api/protected', authenticate, (req, res) => {
  res.status(200).json({ message: 'Access granted' });
});

// Sunucuyu başlatır
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
