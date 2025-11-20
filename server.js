// server.js  — Dragon Mart Online backend

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ----- MongoDB connection -----
const mongoUrl = process.env.MONGO_URL;

if (!mongoUrl) {
  console.error("MONGO_URL is not set in environment variables!");
}

mongoose
  .connect(mongoUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ----- Order model -----
const orderSchema = new mongoose.Schema(
  {
    customerName: String,
    phone: String,
    address: String,
    items: [
      {
        name: String,
        quantity: Number,
        price: Number,
      },
    ],
    status: {
      type: String,
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

// ----- Routes -----

// Test route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Dragon Mart Online Backend Running ✅",
  });
});

// GET /orders  → list all orders
app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders); // always JSON array
  } catch (err) {
    console.error("Error loading orders:", err.message);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// POST /orders → create new order (future checkout use)
app.post("/orders", async (req, res) => {
  try {
    const { customerName, phone, address, items } = req.body;

    const order = await Order.create({
      customerName,
      phone,
      address,
      items: items || [],
    });

    res.status(201).json(order);
  } catch (err) {
    console.error("Error creating order:", err.message);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ----- Start server -----
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("🚀 Server is running on port", PORT);
});

module.exports = app;
