const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase"); // Import Firestore instance
const admin = require("firebase-admin"); // For Firestore Security Rules (optional)
const crypto = require("crypto"); // Secure random number generation
const bcrypt = require("bcrypt"); // Password hashing
const e = require("express");

router.get("/", async (req, res) => {
    try {
        const evaluators = await db.collection("evaluator").get();
        console.log(evaluators.docs);
        const evaluatorData = evaluators.docs.map((doc) => doc.data());
        res.json(evaluatorData);
    } catch (error) {
        console.error("error at GET /evaluator", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Signup endpoint
router.post("/signup", async (req, res) => {
    try {
        console.log("req.body", req.body);
        const { firstname, lastname, email, DOB, loc} = req.body;

        // Validate user input
        if (!firstname ||!lastname || !email || !DOB || !loc) {
            return res.status(400).json({
                error: "Missing required fields",
            });
        }
        // Generate a unique password
        const password = crypto.randomBytes(5).toString('hex');

        // Generate a unique 4-digit PIN
        const evalID = crypto.randomInt(1000, 9999).toString().padStart(4, "0");

        // Hash the PIN securely (consider storing only the hash for additional security)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a student document in Firestore with generated PIN
        const studentRef = await db.collection("evaluators").doc(pin).set({
            firstname,
            lastname,
            email,
            DOB,
            loc,
            evalID: evalID,
            password: hashedPassword, // Store only the hashed PIN
        });

        // Customize response JSON according to requirements
        const response = {
            message: "Evaluator registered successfully",
            studentId: pin, // Only send PIN, not hashedPIN
            firstname,
            lastname,
            DOB,
            gender,
            loc,
            evalID
        };

        // Optionally, return only relevant details or omit certain fields

        res.json(response);
    } catch (error) {
        console.error("error at signup:", error);
        // Handle specific errors (e.g., duplicate document ID)
        // and provide informative error messages to the user
        res.status(500).json({ error: "Failed to register evaluator" });
    }
});

// Login endpoint
router.post("/evaluator_login", async (req, res) => {
    try {
        const { evalID, password } = req.body;

        if (!evalID || !password) {
            return res.status(400).json({ error: "Missing ID or passwprd" });
        }

        const evaluatorDoc = await db
            .collection("evaluators")
            .doc(pin.toString())
            .get();
        console.log("evaluatorDoc", evaluatorDoc);

        if (!evaluatorDoc.exists) {
            return res.status(401).json({ error: "Invalid ID or password" });
        }

        const evaluatorData = evaluatorDoc.data();
        delete evaluatorData.pin;

        res.json({
            message: "Login successful",
            evaluatorData,
        });
    } catch (error) {
        console.error("error at login:", error);
        // Handle errors and provide informative messages
        res.status(500).json({ error: "Login failed", message: error.message });
    }
});

//Delete evaluator
router.delete("/delete/:evalID", async (req, res) => {
    try {
        const { evalID } = req.params;
        if (!evalID) {
            return res.status(400).json({ error: "Missing ID" });
        }

        await db.collection("evaluators").doc(evalID).delete();
        res.json({ message: "Evaluator deleted successfully" });
    } catch (error) {
        console.error("error at delete:", error);
        res.status(500).json({ error: "Failed to delete evaluator" });
    }
});
