const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
var admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//Firebase Admin Initialization

var serviceAccount = require("./ema-john-e247d-firebase-adminsdk-smmbn-75ec4b9355.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.voagd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const verifyToken = async (req, res, next) => {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
    } catch {}
  }
    next();
};

async function run() {
  try {
    await client.connect();
    const database = client.db("online_shop");
    const productCollections = database.collection("products");
    const orderCollections = database.collection("orders");

    //Get Products API

    app.get("/products", async (req, res) => {
      const cursor = productCollections.find({});
      const page = req.query.page;
      const size = parseInt(req.query.size);

      const count = await cursor.count();
      let products;
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }

      res.send({
        count,
        products,
      });
    });

    //USE POST to get data by KEYS
    app.post("/products/byKeys", async (req, res) => {
      const keys = req.body;

      const query = { key: { $in: keys } };

      const cursor = await productCollections.find(query);
      const products = await cursor.toArray();

      res.json(products);
    });

    //Add orders API
    app.post("/orders", async (req, res) => {
      const order = req.body;
      order.createdAt = new Date();
      const result = await orderCollections.insertOne(order);

      res.json(result);
    });

    //GET API to get Orders of a user
    app.get("/orders", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (email === req.decodedUserEmail) {
        const query = { email: email };
        const cursor = orderCollections.find(query);
        const orders = await cursor.toArray();
        res.send(orders);
      }
      else{
          res.status(401).json({message : "User Not authorized"});
      }
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Ema John Server is running");
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
