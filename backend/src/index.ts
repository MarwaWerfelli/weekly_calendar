import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import eventRoutes from "./routes/eventRoutes"; // Create this file

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" })); // Adjust for Vite dev server
app.use(express.json());

app.get("/health", (req, res) => res.send("Backend Healthy!")); // Health check
app.use("/api/events", eventRoutes); // Event routes

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
