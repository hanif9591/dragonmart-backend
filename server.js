require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ---------- DB Connection ----------
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected ✔"))
  .catch((err) => console.log("DB Error ❌", err));

// ---------- Admin Schema ----------
const AdminSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const Admin = mongoose.model("Admin", AdminSchema);

// ---------- Order Schema ----------
const OrderSchema = new mongoose.Schema({
  customer: String,
  phone: String,
  address: String,
  items: Array,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", OrderSchema);

// ---------- Admin Registration (only one time) ----------
app.post("/create-admin", async (req, res) => {
  const { email, password } = req.body;

  const exist = await Admin.findOne({ email });
  if (exist) return res.json({ msg: "Admin already exists" });

  const hashed = await bcrypt.hash(password, 10);

  await Admin.create({ email, password: hashed });

  res.json({ msg: "Admin Created ✔" });
});

// ---------- Admin Login ----------
app.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email });
  if (!admin) return res.json({ msg: "Admin not found" });

  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.json({ msg: "Wrong password" });

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, msg: "Login Successful ✔" });
});

// ---------- Save Order ----------
app.post("/place-order", async (req, res) => {
  const order = await Order.create(req.body);
  res.json({ msg: "Order Saved ✔", order });
});

// ---------- Get All Orders ----------
app.get("/orders", async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

// ---------- Basic Test Route ----------
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Dragon Mart Online Backend Running ✔",
  });
});

// ---------- Start Server ----------
const port = process.env.PORT || 5000;
app.listen(port, () => console.log("Server Running on Port:", port));
