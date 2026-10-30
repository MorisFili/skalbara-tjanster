import {readFile} from "node:fs/promises";
import {pool} from "./db.js";

try {
    const schema = await readFile(new URL("./initdb.sql", import.meta.url), "utf8");
    await pool.query(schema);
    console.log("Database initialized");
} catch (error) {
    console.error("Could not initialize database:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
