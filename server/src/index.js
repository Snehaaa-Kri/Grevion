import express from "express";
import cors from "cors";
import dotenv from "dotenv"
import connectDB from "./config/db.js"; 
import userRoutes from "./routes/User.routes.js"
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/",(req,res)=>{
  res.send("SERVER RUNNING...")
})

app.use("/api/v1/auth",userRoutes)


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
