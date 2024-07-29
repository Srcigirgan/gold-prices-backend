const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
