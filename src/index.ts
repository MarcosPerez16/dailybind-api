import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import salesRouter from "./routes/sales";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

//global middleware

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

//route specific middleware

app.use("/auth", authRouter);

app.use("/sales", salesRouter);

app.get("/health", (req, res) => {
  res.json({
    appname: "Daily Bind",
    status: "Running",
  });
});

app.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}`);
});

export default app;
