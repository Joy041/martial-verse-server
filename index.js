const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())

const verifyJwt = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.JWT_TOKEN, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded
        next()
    });
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: Stripe } = require('stripe');
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
        const reviewCollection = client.db('martialDB').collection('reviews')
        const selectClassCollection = client.db('martialDB').collection('selectClasses')
        const paymentCollection = client.db('martialDB').collection('payments')

        // JWT
        app.post('/tokens', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: "300d" })
            res.send({ token })
        })


        // VERIFY ADMIN
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)

            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }

        // VERIFY INSTRUCTOR
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query)

            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }


        // USERS
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })


        app.get('/users/admin/:email', verifyJwt,  async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query)
            const result = { admin: user?.role === 'admin' }
            res.send(result)
        })


        app.get('/users/instructor/:email', verifyJwt,  async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query)
            const result = { admin: user?.role === 'instructor' }
            res.send(result)
        })

        app.get('/users/student/:email', verifyJwt, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ student: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query)
            const result = { admin: user?.role === 'student' }
            res.send(result)
        })


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


        app.patch('/users/admin/:id', verifyJwt, verifyAdmin,  async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result)
        })


        app.patch('/users/instructor/:id', verifyJwt, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'instructor'
                }
            }
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result)
        })

        // SERVICES
        app.get('/services', async (req, res) => {
            const result = await serviceCollection.find().toArray()
            res.send(result)
        })

        app.get('/popular', async(req, res) => {
            const item = req.body
            const optionDoc = {
                sort: {
                    'booking': -1
                }
            }
            const result = await serviceCollection.find( item ,optionDoc).toArray()
            res.send(result)
        })

        app.post('/services', verifyJwt, verifyInstructor,  async(req, res) => {
            const item = req.body;
            const result = await serviceCollection.insertOne(item)
            res.send(result)
        })

        app.patch('/services/booking/:id', async(req, res) => {
            const {seat, book} = req.body;
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const updateDoc = {
                $set: {
                    seats: seat,
                    booking: book
                }
            }
            const result = await serviceCollection.updateMany(query, updateDoc)
            res.send(result)
        })

        app.patch('/services/feedback/:id', verifyJwt, verifyAdmin, async(req, res) => {
            const {feedback} = req.body;
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const updateDoc = {
                $set: {
                    feedback: feedback
                }
            }
            const result = await serviceCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        app.patch('/services/approved/:id', verifyJwt, verifyAdmin,  async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'approved'
                }
            }
            const result = await serviceCollection.updateOne(query, updateDoc);
            res.send(result)
        })

        app.patch('/services/denied/:id', verifyJwt, verifyAdmin,  async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'denied'
                }
            }
            const result = await serviceCollection.updateOne(query, updateDoc);
            res.send(result)
        })


        // SELECT CLASSES
        app.get('/selected', verifyJwt, async (req, res) => {
            const email = req.query.email;
            console.log(email)
            if (!email) {
                res.send([]);
            }

            const query = { email: email }
            const result = await selectClassCollection.find(query).toArray()
            res.send(result)
        })


        app.post('/selected', verifyJwt,  async (req, res) => {
            const item = req.body;
            const result = await selectClassCollection.insertOne(item)
            res.send(result)
        })

        app.delete('/selected/:id', verifyJwt, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectClassCollection.deleteOne(query)
            res.send(result)
        })


        // REVIEWS
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        // CREATE PAYMENT
        app.post('/create-payment', verifyJwt, async (req, res) => {
            const { price } = req.body;

            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // PAYMENT
        app.get('/payments', verifyJwt, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }

            const options = {
                sort: { 'date': -1 }
            }

            const query = { email: email }
            const result = await paymentCollection.find(query, options).toArray()
            res.send(result)
        })


        app.post('/payments', verifyJwt, async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment)
            const id = req.body.selectItem;

            const query = { _id:  new ObjectId(id) }

            const deleteResult = await selectClassCollection.deleteMany(query)

            res.send( {paymentResult, deleteResult} )
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