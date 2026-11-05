import {pool} from "./db.js"

const allowedStatuses = ["PENDING", "CONFIRMED", "CANCELLED"]

function validateBooking(req, res, next) {
    const body = req.body

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({message: "A booking object is required."})
    }

    if (typeof body.name !== "string" || body.name.trim() === "") {
        return res.status(400).json({message: "Name is required and must be text."})
    }

    if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        return res.status(400).json({message: "A valid email address is required."})
    }

    if (typeof body.date_time !== "string" || Number.isNaN(Date.parse(body.date_time))) {
        return res.status(400).json({message: "A valid date and time are required."})
    }

    if (!Number.isInteger(body.number_of_people) || body.number_of_people < 1) {
        return res.status(400).json({message: "Number of people must be a positive whole number."})
    }

    if (req.method === "POST" && body.status === undefined) {
        body.status = "PENDING"
    }

    if (!allowedStatuses.includes(body.status)) {
        return res.status(400).json({message: "Invalid booking status."})
    }

    next()
}

function bookingError(error, res) {
    const code = error.code || ""
    if (code.startsWith("22") || code.startsWith("23")) {
        return res.status(400).json({message: "Invalid booking data."})
    }
    console.error(error)
    return res.status(500).json({message: "Server error."})
}

export default function (server) {
    const path = "/bookings"

    server.param("id", (req, res, next, id) => {
        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({message: "Booking ID must be a positive whole number."})
        }
        next()
    })

    server.get(path, async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT *
                FROM bookings
                ORDER BY id
            `)

            res.status(200).json(result.rows)

        } catch (error) {
            bookingError(error, res)
        }
    })

    server.get(`${path}/:id`, async (req, res) => {
        try {
            const id = req.params.id

            const result = await pool.query(
                `
                    SELECT *
                    FROM bookings
                    WHERE id = $1
                `,
                [id]
            )

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Booking not found."
                })
            }

            res.status(200).json(result.rows[0])

        } catch (error) {
            bookingError(error, res)
        }
    })

    server.post(path, validateBooking, async (req, res) => {
        try {
            const {
                name,
                email,
                date_time,
                number_of_people,
                status
            } = req.body

            const result = await pool.query(
                `
                    INSERT INTO bookings (
                        name,
                        email,
                        date_time,
                        number_of_people,
                        status
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                `,
                [
                    name,
                    email,
                    date_time,
                    number_of_people,
                    status
                ]
            )

            res.status(201).json(result.rows[0])

        } catch (error) {
            bookingError(error, res)
        }
    })

    server.put(`${path}/:id`, validateBooking, async (req, res) => {
        try {
            const id = req.params.id

            const {
                name,
                email,
                date_time,
                number_of_people,
                status
            } = req.body

            const result = await pool.query(
                `
                    UPDATE bookings

                    SET
                        name = $1,
                        email = $2,
                        date_time = $3,
                        number_of_people = $4,
                        status = $5

                    WHERE id = $6

                    RETURNING *
                `,
                [
                    name,
                    email,
                    date_time,
                    number_of_people,
                    status,
                    id
                ]
            )

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Booking not found."
                })
            }

            res.status(200).json(result.rows[0])

        } catch (error) {
            bookingError(error, res)
        }
    })

    server.delete(`${path}/:id`, async (req, res) => {
        try {
            const id = req.params.id

            const result = await pool.query(
                `
                    DELETE FROM bookings
                    WHERE id = $1
                    RETURNING id
                `,
                [id]
            )

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Booking not found."
                })
            }

            res.status(204).send()

        } catch (error) {
            bookingError(error, res)
        }
    })
}
