import bookings from "./bookings.js"

import express from "express"
import os from "node:os"

import {pool} from "./db.js"

const server = express()
const PORT = process.env.PORT || 3000

server.use(express.json())

function routesRegister(server) {

    server.get("/health", (req, res) => {
        res.status(200).json({
            status: "ok"
        })
    })

    server.get("/instance", (req, res) => {
        res.status(200).json({
            instance: os.hostname()
        })
    })

    bookings(server)
}

async function startServer() {
    try {
        await pool.query("SELECT 1")

        console.log("Connected to PostgreSQL")

        routesRegister(server)

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`)
        })

    } catch (error) {
        console.error("Could not connect to PostgreSQL:")
        console.error(error)

        process.exit(1)
    }
}

startServer()
