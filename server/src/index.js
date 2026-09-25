import express from "express";
import cors from "cors";
import dotenv from "dotenv"
import connectDB from "./config/db.js"; 
import {userRouter, spocRouter, PowerPlantRouter, paymentRouter} from "./routes/index.js"
import cookieParser from "cookie-parser"
import {completeProfileRouter} from "./routes/index.js"
import performanceLogger from "./middlewares/performanceLogger.middleware.js"
import errorHandler from "./middlewares/errorHandler.middleware.js"
dotenv.config();

const app = express();

// Allowed origins for CORS. Vite may switch ports (5173 -> 5174) if one is busy,
// so we allow the common dev ports plus anything set in FRONTEND_URL.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
].filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, same-origin server calls)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));
app.use(express.json());
app.use(cookieParser());
app.use(performanceLogger); // log response time for every request

connectDB();

app.get("/",(req,res)=>{
  res.send("SERVER RUNNING...")
})

app.use("/api/v1/auth",userRouter);
app.use("/api/v1/spoc", spocRouter);
// complete profile routes
app.use("/api/v1/users" , completeProfileRouter)
app.use("/api/v1/powerplant", PowerPlantRouter)
app.use("/api/payment", paymentRouter);

// ↓ ADD THIS — must be the very last app.use() - below the routes otherwise routes errors won't be handled via this!
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
