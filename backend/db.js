import {Pool} from "pg";
import dotenv from "dotenv";

dotenv.config({path: new URL("./server.env", import.meta.url), quiet: true});

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});
