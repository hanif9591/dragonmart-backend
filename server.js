const express = require("express");
const cors = require("cors");

const app = express();

// basic middlewares
app.use(cors());
app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Dragon Mart Online backend working ✅",
  });
});

// important: use Render's port, not localhost:5000 only
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend server running on port ${PORT}`);
});
