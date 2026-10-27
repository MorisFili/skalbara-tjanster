const express = require("express");

const server = express();
const PORT = 3000;

server.get("/", (req, res) => {
    res.send("Hello World!");
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});