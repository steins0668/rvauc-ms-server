import express from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { AuthRoutes } from "./features/auth";
import {
  attachRequestLogger,
  requestProfiler,
  setHeaderCredentials,
} from "./middlewares";

dotenv.config();

const app = express();

const whitelist = ["http://localhost:[port]"];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || whitelist.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS."));
  },
};

app.use(setHeaderCredentials); //  * for cors
app.use(cors(corsOptions));

app.use(express.json()); // json parsing

app.use(cookieParser());

app.use(attachRequestLogger); //  * request logging
app.use(requestProfiler); //  * request profiling

app.use("/auth", AuthRoutes);

const port = 2620; //  can be anything
app.listen(port, "0.0.0.0", () => {
  //  the 0.0.0.0 is for hosting on your local ip
  console.log("Server is now running at port: " + port);
});
