import assert from "node:assert/strict"
import {execFileSync} from "node:child_process"
import {randomUUID} from "node:crypto"
import {fileURLToPath} from "node:url"

const currentDir = fileURLToPath(new URL(".", import.meta.url))

const baseUrl = "http://localhost:8080"
let step = "Check running application"
let bookingId
let api2Stopped = false
let stackStopped = false

function compose(...args) {
    return execFileSync("docker", ["compose", "--env-file", "server.env", ...args], {
        cwd: currentDir,
        encoding: "utf8",
        timeout: 120000,
        stdio: "pipe"
    })
}

async function request(method, path, expectedStatus, body) {
    const response = await fetch(baseUrl + path, {
        method,
        headers: {"Content-Type": "application/json", Connection: "close"},
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(5000)
    })
    const text = await response.text()
    assert.equal(response.status, expectedStatus, `${method} ${path}: expected ${expectedStatus}, got ${response.status}. ${text}`)
    return text ? JSON.parse(text) : null
}

async function waitForApplication() {
    let lastError
    for (let attempt = 0; attempt < 20; attempt++) {
        try {
            await request("GET", "/instance", 200)
            return
        } catch (error) {
            lastError = error
            await new Promise(resolve => setTimeout(resolve, 500))
        }
    }
    throw lastError
}

const testBooking = {
    name: "Verification booking",
    email: `verify-${randomUUID()}@example.invalid`,
    date_time: "2030-06-01T18:00:00Z",
    number_of_people: 2
}

async function verifyApplicationRunning() {
    const services = compose("ps", "--status", "running", "--services").trim().split(/\s+/)
    for (const service of ["db", "api1", "api2", "api3", "nginx"]) {
        assert.ok(services.includes(service), `${service} is not running`)
    }
    await waitForApplication()
}

async function verifyBookingCreation() {
    step = "Create booking"
    const created = await request("POST", "/bookings", 201, testBooking)
    bookingId = created.id
    assert.ok(bookingId, "Booking ID is missing")
    assert.equal(created.status, "PENDING")
    console.log("PASS - Create booking")
}

async function verifyBookingList() {
    step = "List bookings"
    const bookings = await request("GET", "/bookings", 200)
    assert.ok(Array.isArray(bookings), "Expected a booking array")
    assert.ok(bookings.some(booking => booking.id === bookingId && booking.email === testBooking.email), "Created booking is missing")
    console.log("PASS - List bookings")
}

async function verifyBookingRetrieval() {
    step = "Retrieve booking"
    const retrieved = await request("GET", `/bookings/${bookingId}`, 200)
    assert.equal(retrieved.id, bookingId)
    assert.equal(retrieved.email, testBooking.email)
    console.log("PASS - Retrieve booking")
}

async function verifyBookingUpdate() {
    step = "Update booking"
    testBooking.status = "CONFIRMED"
    const updated = await request("PUT", `/bookings/${bookingId}`, 200, testBooking)
    assert.equal(updated.id, bookingId)
    assert.equal(updated.status, "CONFIRMED")
    console.log("PASS - Update booking")
}

async function verifyLoadBalancing() {
    step = "Load balancing"
    const instances = new Set()
    for (let i = 0; i < 12; i++) {
        const result = await request("GET", "/instance", 200)
        instances.add(result.instance)
    }
    console.log("Instances: " + [...instances].join(", "))
    assert.deepEqual([...instances].sort(), ["api1", "api2", "api3"])
    console.log("PASS - Load balancing")
}

async function verifyInstanceFailure() {
    step = "Instance failure"
    api2Stopped = true
    compose("stop", "api2")
    const remaining = new Set()
    for (let i = 0; i < 12; i++) {
        const result = await request("GET", "/instance", 200)
        remaining.add(result.instance)
    }
    console.log("Remaining instances: " + [...remaining].join(", "))
    assert.deepEqual([...remaining].sort(), ["api1", "api3"])
    console.log("PASS - Instance failure")
}

async function verifyBookingSurvivesInstanceFailure() {
    step = "Booking survives instance failure"
    const surviving = await request("GET", `/bookings/${bookingId}`, 200)
    assert.equal(surviving.id, bookingId)
    assert.equal(surviving.email, testBooking.email)
    console.log("PASS - Booking survives instance failure")
}

async function verifyInstanceRecovery() {
    step = "Instance recovery"
    compose("start", "api2")
    api2Stopped = false
    let recovered = false
    for (let attempt = 0; attempt < 30; attempt++) {
        const result = await request("GET", "/instance", 200)
        if (result.instance === "api2") {
            recovered = true
            break
        }
        await new Promise(resolve => setTimeout(resolve, 500))
    }
    assert.ok(recovered, "api2 did not resume handling requests")
    console.log("PASS - Instance recovery")
}

async function verifyPostgresPersistence() {
    step = "PostgreSQL persistence"
    stackStopped = true
    compose("down")
    compose("up", "-d", "--wait")
    stackStopped = false
    await waitForApplication()
    const persisted = await request("GET", `/bookings/${bookingId}`, 200)
    assert.equal(persisted.id, bookingId)
    assert.equal(persisted.email, testBooking.email)
    assert.equal(persisted.status, "CONFIRMED")
    console.log("PASS - PostgreSQL persistence")
}

async function verifyBookingDeletion() {
    step = "Delete booking"
    await request("DELETE", `/bookings/${bookingId}`, 204)
    await request("GET", `/bookings/${bookingId}`, 404)
    bookingId = undefined
    console.log("PASS - Delete booking")
}

async function runVerification() {
    try {
        await verifyApplicationRunning()
        await verifyBookingCreation()
        await verifyBookingList()
        await verifyBookingRetrieval()
        await verifyBookingUpdate()
        await verifyLoadBalancing()
        await verifyInstanceFailure()
        await verifyBookingSurvivesInstanceFailure()
        await verifyInstanceRecovery()
        await verifyPostgresPersistence()
        await verifyBookingDeletion()

    } catch (error) {
        console.error(`FAIL - ${step}: ${error.message}`)
        if (error.stderr) console.error(error.stderr.trim())
        if (step === "Check running application") {
            console.error("Ensure Docker is running, configure backend/server.env, then run from backend: docker compose --env-file server.env up --build -d --wait")
        }
        process.exitCode = 1
    } finally {
        try {
            if (stackStopped) {
                compose("up", "-d", "--wait")
                await waitForApplication()
            }
            if (api2Stopped) {
                compose("start", "api2")
            }
        } catch (error) {
            console.error("FAIL - Restore services: " + error.message)
            process.exitCode = 1
        }

        if (bookingId) {
            try {
                await waitForApplication()
                const response = await fetch(`${baseUrl}/bookings/${bookingId}`, {
                    method: "DELETE",
                    headers: {Connection: "close"},
                    signal: AbortSignal.timeout(5000)
                })
                assert.ok(response.status === 204 || response.status === 404, `Cleanup returned ${response.status}`)
                console.log("Temporary booking cleaned up")
            } catch (error) {
                console.error(`FAIL - Cleanup booking ${bookingId}: ${error.message}`)
                process.exitCode = 1
            }
        }
    }


    if (!process.exitCode) console.log("All checks passed!")
}

await runVerification()
