import express from "express";
import dotenv from "dotenv";
import expressWinston from "express-winston";
import jwt from "jsonwebtoken";

import playersRouter from "./routes/playersRoutes.js";
import gamesRouter from "./routes/gamesRoutes.js";
import contactRouter from "./routes/contactRoutes.js";
import authRouter from "./routes/authRoutes.js"

import { connectDB } from "./config/db.js";
import { logger } from "./logger.js";
import { createServer } from 'node:http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
app.set("io", io);
const PORT = process.env.PORT || 5001;

// Middleware

// if (process.env.NODE_ENV !== "production") {
//   app.use(
//     cors({
//       origin: "http://localhost:5173",
//     })
//   );
// }

app.use(expressWinston.logger({
  winstonInstance: logger,
  statusLevels: true // Uses standard levels (e.g., 4xx = warn, 5xx = error)
}));

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/players", playersRouter);
app.use("/api/games", gamesRouter);
app.use("/api/contact", contactRouter);


// Centralized Express Error Handling Middleware
app.use(expressWinston.errorLogger({
  winstonInstance: logger
}));


// Socket.io Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid or expired token"));
  }
});

// Socket connection logic
io.on("connection", (socket) => {
  console.log(`Authenticated user connected: ${socket.user.sub} (${socket.id})`);
  socket.on("join_game", ({ gameId }) => {
    const room = `game:${gameId}`;
    socket.currentGameRoom = room;
    socket.join(room);
    console.log(`Socket ${socket.id} successfully joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} successfully left room: ${socket.currentGameRoom}`);
  });
});

connectDB().then(() => {

  // app.listen(PORT, () => {
  //   console.log(`Server running on port http://localhost:${PORT}`);
  // });

  server.listen(PORT, () => {
    console.log(`server running at http://localhost:${PORT}`);
  });

})