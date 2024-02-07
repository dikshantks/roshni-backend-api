const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase"); // Import Firestore instance
const admin = require("firebase-admin"); // For Firestore Security Rules (optional)
const crypto = require("crypto"); // Secure random number generation
const bcrypt = require("bcrypt"); // Password hashing

router.get("/", async (req, res) => {
    try {
        const students = await db.collection("student").get();
        console.log(students.docs);
        const studentData = students.docs.map((doc) => doc.data());
        res.json(studentData);
    } catch (error) {
        console.error("error at GET /student", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ... other routes

// Signup endpoint
router.post("/signup", async (req, res) => {
    try {
        console.log("req.body", req.body);
        const { name, age, class_division } = req.body;

        // Validate user input
        if (!name || !age || !class_division) {
            return res.status(400).json({
                error: "Missing required fields: name, age, and class_division",
            });
        }
        // Generate a unique 4-digit PIN
        const pin = crypto.randomInt(1000, 9999).toString().padStart(4, "0");

        // Hash the PIN securely (consider storing only the hash for additional security)
        const hashedPin = await bcrypt.hash(pin, 10);

        // Create a student document in Firestore with generated PIN
        const studentRef = await db.collection("students").doc(pin).set({
            name,
            age,
            class_division,
            pin: hashedPin, // Store only the hashed PIN
        });

        // Customize response JSON according to requirements
        const response = {
            message: "Student created successfully",
            studentId: pin, // Only send PIN, not hashedPIN
            name,
            age,
            class_division,
        };

        // Optionally, return only relevant details or omit certain fields

        res.json(response);
    } catch (error) {
        console.error("error at signup:", error);
        // Handle specific errors (e.g., duplicate document ID)
        // and provide informative error messages to the user
        res.status(500).json({ error: "Failed to create student" });
    }
});

// Login endpoint
router.post("/login", async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({ error: "Missing PIN" });
        }

        const studentDoc = await db
            .collection("students")
            .doc(pin.toString())
            .get();
        console.log("studentDoc", studentDoc);

        if (!studentDoc.exists) {
            return res.status(401).json({ error: "Invalid PIN" });
        }

        const studentData = studentDoc.data();
        delete studentData.pin;

        res.json({
            message: "Login successful",
            studentData,
        });
    } catch (error) {
        console.error("error at login:", error);
        // Handle errors and provide informative messages
        res.status(500).json({ error: "Login failed", message: error.message });
    }
});

// ... other routes

module.exports = router;
