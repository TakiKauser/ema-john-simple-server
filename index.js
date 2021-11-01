const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
var admin = require("firebase-admin");
var serviceAccount = require("./ema-john-simple-b6655-firebase-adminsdk-ek34y-fddd6d97df.json");
// const { initializeApp } = require('firebase-admin/app');

const app = express();
const port = process.env.PORT || 5000;

// firebase admin initialization


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sydng.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        // console.log("idToken", idToken);
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            // console.log(decodedUser);
            req.decodedUserEmail = decodedUser.email;

        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('online_shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        // GET API
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            });
        });
        // use POST to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } };
            const products = await productCollection.find(query).toArray();
            res.json(products);
        });

        // add Orders api

        app.get('/orders', verifyToken, async (req, res) => {
            // console.log(req.headers.authorization);
            const email = req.query.email;
            if (req.decodedUserEmail === email)
                // let query = {};
                if (email) {
                    const query = { email: email };
                    const cursor = orderCollection.find(query);
                    const orders = await cursor.toArray();
                    res.json(orders);
                }
                else {
                    res.status(401).json({ message: 'Unauthorized user!' })
                }
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Ema-john server is running.");
})
app.listen(port, () => {
    console.log("Running ar port ", port);
})