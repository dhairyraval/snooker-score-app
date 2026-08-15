import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import playersRouter from "./routes/playersRoutes.js";
import gamesRouter from "./routes/gamesRoutes.js";
import contactRouter from "./routes/contactRoutes.js";
import authRouter from "./routes/authRoutes.js"

import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware

// if (process.env.NODE_ENV !== "production") {
//   app.use(
//     cors({
//       origin: "http://localhost:5173",
//     })
//   );
// }

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/players", playersRouter);
app.use("/api/games", gamesRouter);
app.use("/api/contact", contactRouter);


connectDB().then(() => {

  app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
  });

})