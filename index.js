const express = require('express');
const app = express();
require('dotenv').config()
const jwt = require('jsonwebtoken');
// const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const cors = require('cors');
const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())


app.get('/', (req, res) => {
    res.send('martial verse is running')
})

app.listen(port, () => {
    console.log(`martial verse is running on port: ${port}`)
})