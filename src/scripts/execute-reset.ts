import dotenv from "dotenv";
import { resetDatabase } from "./reset-database";

dotenv.config();
resetDatabase();
