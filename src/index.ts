import express, { Request, Response } from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { ENV } from "./data";
import { Auth } from "./features/auth";
import { Enrollments } from "./features/enrollments";
import { Notifications } from "./features/notifications";
import { SessionBroker } from "./features/session-broker";
import { UniformCompliance } from "./features/uniform-compliance";
import { Violation } from "./features/violation";
import {
  attachRequestLogger,
  requestProfiler,
  setHeaderCredentials,
} from "./middlewares";
import "./schedulers";

dotenv.config();

export const app = express();

const whitelist = ENV.getWhiteList();

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

app.use("/auth", Auth.Routes);
app.use("/uniform-compliance", UniformCompliance.Routes);
app.use("/violation", Violation.Routes);
app.use("/notifications", Notifications.Routes);
app.use("/session-broker", SessionBroker.Routes);
app.use("/enrollments", Enrollments.Routes);

let now = () => Date.now();

app.post("/set-time", (req: Request, res: Response) => {
  const { timestamp } = req.body;
  if (timestamp) {
    now = () => timestamp;
    res.send(`Time overriden to ${new Date(timestamp).toISOString()}`);
  }
});

app.post("/reset-time", (req, res) => {
  now = () => Date.now();
  res.send("Time reset to real system time");
});

const port = 2620; //  can be anything
app.listen(port, "0.0.0.0", () => {
  //  the 0.0.0.0 is for hosting on your local ip
  console.log("Server is now running at port: " + port);
});
