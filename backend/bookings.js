import {pool} from "./db.js";

const allowedStatuses = [
    "PENDING",
    "CONFIRMED",
    "CANCELLED"
];

function validateBooking(req, res, next) {
    const body = req.body;
    if (body === undefined || body === null) {
        return res.status(400).json({message: "A booking object is required."});
    }

    if (typeof body !== "object" || Array.isArray(body)) {
        return res.status(400).json({message: "A booking object is required."});
    }

    const name = body.name;
    const email = body.email;
    const dateTime = body.date_time;
    const numberOfPeople = body.number_of_people;
    let status = body.status;

    if (typeof name !== "string") {
        return res.status(400).json({message: "Name must be text."});
    }
    if (name.trim() === "") {
        return res.status(400).json({message: "Name is required."});
    }
    if (Array.from(name).length > 100) {
        return res.status(400).json({message: "Name cannot be longer than 100 characters."});
    }

    if (typeof email !== "string") {
        return res.status(400).json({message: "Email must be text."});
    }
    if (email.length > 255) {
        return res.status(400).json({message: "Email cannot be longer than 255 characters."});
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(email) === false) {
        return res.status(400).json({message: "Email must contain a name, @, and a domain."});
    }

    if (typeof dateTime !== "string" || dateTime.trim() === "") {
        return res.status(400).json({message: "Date and time are required as text."});
    }
    const parsedDate = Date.parse(dateTime);
    if (Number.isFinite(parsedDate) === false) {
        return res.status(400).json({message: "Date and time are invalid."});
    }

    if (Number.isInteger(numberOfPeople) === false) {
        return res.status(400).json({message: "Number of people must be a whole number."});
    }
    if (numberOfPeople < 1) {
        return res.status(400).json({message: "Number of people must be at least 1."});
    }
    if (numberOfPeople > 2147483647) {
        return res.status(400).json({message: "Number of people is too large."});
    }

    if (req.method === "POST" && status === undefined) {
        status = "PENDING";
    }
    if (allowedStatuses.includes(status) === false) {
        return res.status(400).json({message: "Invalid booking status."});
    }
    next();
}

function bookingError(error, res) {
    const code = error.code || "";
    const isDataError = code.startsWith("22");
    const isConstraintError = code.startsWith("23");
    if (isDataError || isConstraintError) {
        return res.status(400).json({message: "Invalid booking data."});
    }
    console.error(error);
    return res.status(500).json({message: "Server error."});
}

export default function (server, path) {
    path += "/bookings";

    server.param("id", (req, res, next, id) => {
        if (id.length > 19 || id.startsWith("0")) {
            return res.status(400).json({message: "Booking ID must be a positive whole number within the database limit."});
        }

        for (const character of id) {
            if (character < "0" || character > "9") {
                return res.status(400).json({message: "Booking ID must contain only digits."});
            }
        }

        const bookingId = BigInt(id);
        const largestDatabaseId = 9223372036854775807n;
        if (bookingId > largestDatabaseId) {
            return res.status(400).json({message: "Booking ID is too large."});
        }
        next();
    });


    server.get(path, async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT *
                FROM bookings
                ORDER BY id
            `);

            res.status(200).json(result.rows);

        } catch (error) {
            bookingError(error, res);
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
            bookingError(error, res);
        }
    });


    // CREATE
    server.post(path, validateBooking, async (req, res) => {
        try {
            const {
                name,
                email,
                date_time,
                number_of_people,
                status = "PENDING"
            } = req.body;

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
            bookingError(error, res);
        }
    });



    server.put(`${path}/:id`, validateBooking, async (req, res) => {
        try {
            const id = req.params.id;

            const {
                name,
                email,
                date_time,
                number_of_people,
                status
            } = req.body;

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
            bookingError(error, res);
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
            bookingError(error, res);
        }
    });
}
