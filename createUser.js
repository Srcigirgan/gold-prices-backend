const fs = require('fs');
const bcrypt = require('bcrypt');

const SECRET_KEY = 'your_secret_key'; // Aynı anahtarı kullanın
const usersFile = 'users.json';

const addUser = (username, password) => {
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Error hashing password:', err);
      return;
    }

    const newUser = { username, password: hashedPassword };

    fs.readFile(usersFile, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading users file:', err);
        return;
      }

      const users = JSON.parse(data);
      users.push(newUser);

      fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8', (err) => {
        if (err) {
          console.error('Error writing users file:', err);
        } else {
          console.log('User added successfully!');
        }
      });
    });
  });
};

// Kullanıcıyı oluştur
addUser('Deneme', '12345a'); // Burada 'Admin' ve '123Aa' yerine kendi kullanıcı adınızı ve şifrenizi yazabilirsiniz
