import {pool} from "./db.js";

const allowedStatuses = [
    "PENDING",
    "CONFIRMED",
    "CANCELLED"
];

export default function (server, path) {
    path += "/bookings";


    server.get(path, async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT *
                FROM bookings
                ORDER BY id
            `);

            res.status(200).json(result.rows);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Server error."
            });
        }
    });


    // GET ONE
    server.get(`${path}/:id`, async (req, res) => {
        try {
            const id = req.params.id;

            const result = await pool.query(
                `
                    SELECT *
                    FROM bookings
                    WHERE id = $1
                `,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Booking not found."
                });
            }

            res.status(200).json(result.rows[0]);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Server error."
            });
        }
    });


    // CREATE
    server.post(path, async (req, res) => {
        try {
            const {
                name,
                email,
                date_time,
                number_of_people,
                status = "PENDING"
            } = req.body;

            if (
                !name ||
                !email ||
                !date_time ||
                !number_of_people
            ) {
                return res.status(400).json({
                    message: "Missing required booking data."
                });
            }

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid booking status."
                });
            }

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
            );

            res.status(201).json(result.rows[0]);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Server error."
            });
        }
    });



    server.put(`${path}/:id`, async (req, res) => {
        try {
            const id = req.params.id;

            const {
                name,
                email,
                date_time,
                number_of_people,
                status
            } = req.body;

            if (
                !name ||
                !email ||
                !date_time ||
                !number_of_people ||
                !status
            ) {
                return res.status(400).json({
                    message: "Missing required booking data."
                });
            }

            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    message: "Invalid booking status."
                });
            }

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
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Booking not found."
                });
            }

            res.status(200).json(result.rows[0]);

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Server error."
            });
        }
    });



    server.delete(`${path}/:id`, async (req, res) => {
        try {
            const id = req.params.id;

            const result = await pool.query(
                `
                    DELETE FROM bookings
                    WHERE id = $1
                    RETURNING id
                `,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: "Booking not found."
                });
            }

            res.status(204).send();

        } catch (error) {
            console.error(error);

            res.status(500).json({
                message: "Server error."
            });
        }
    });
}
