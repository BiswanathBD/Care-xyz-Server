const sendInvoiceEmail = require("./utils/sendInvoiceEmail");

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3050;

// middleWare
app.use(express.json());
app.use(cors());

// Test route
app.get("/", (req, res) => {
  res.send("Care-Xyz Server is Running");
});

const uri = process.env.MONGO_URI;

// MongoDB
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    // console.log("✅ Successfully connected to MongoDB!");

    const careXyzDb = client.db("careXyzDb");
    const services = careXyzDb.collection("services");
    const usersCollection = careXyzDb.collection("usersCollection");
    const bookingCollection = careXyzDb.collection("bookingCollection");

    // get services
    app.get("/services", async (req, res) => {
      const result = await services.find().toArray();
      res.send(result);
    });

    // get single service
    app.get("/booking/:id", async (req, res) => {
      const { id } = req.params;
      const result = await services.findOne({ id });
      res.send(result);
    });

    // create user
    app.post("/user", async (req, res) => {
      const user = req.body;

      const isExit = await usersCollection.findOne({ email: user.email });
      if (isExit) {
        return res.send(isExit);
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // get user data
    app.get("/user", async (req, res) => {
      const { email } = req.query;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    // create booking
    app.post("/booking/:userEmail", async (req, res) => {
      try {
        const newBooking = req.body;
        const { userEmail } = req.params;

        if (userEmail !== newBooking.email) {
          return res.status(401).send("Unauthorized access");
        }
        const result = await bookingCollection.insertOne(newBooking);
        await sendInvoiceEmail(newBooking);
        res.status(201).send({
          success: true,
          message: "Booking placed & invoice sent",
          result,
        });
      } catch (error) {
        console.error("Booking error:", error);
        res.status(500).send("Booking failed");
      }
    });

    // get user booking data
    app.get("/bookings/:email", async (req, res) => {
      const { email } = req.params;

      const result = await bookingCollection.find({ email }).toArray();
      res.send(result);
    });

    // cancel booking
    app.put("/booking/cancel/:id", async (req, res) => {
      const { id } = req.params;
      const result = await bookingCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "Cancelled" } }
      );
      res.send(result);
    });

    // ------------------------------//
  } catch (err) {
    console.error(err);
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Care-xyz server listening on port ${port}`);
});
