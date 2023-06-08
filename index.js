const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken');
// const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const cors = require('cors');
const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4plofch.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const serviceCollection = client.db('martialDB').collection('services')
        const userCollection = client.db('martialDB').collection('users')
        const instructorCollection = client.db('martialDB').collection('instructors')
        const reviewCollection = client.db('martialDB').collection('reviews')

        // JWT
        app.post('/tokens', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: "300d" })
            res.send({ token })
        })


        // USERS
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        app.get('/users', async(req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        // SERVICES
        app.get('/services', async (req, res) => {
            const result = await serviceCollection.find().toArray()
            res.send(result)
        })

        // INSTRUCTOR
        app.get('/instructors', async(req, res) => {
            const result = await instructorCollection.find().toArray()
            res.send(result)
        })

        // REVIEWS
        app.get('/reviews', async(req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('martial verse is running')
})

app.listen(port, () => {
    console.log(`martial verse is running on port: ${port}`)
})