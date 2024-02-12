const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase"); // Import Firestore instance
const admin = require("firebase-admin"); // For Firestore Security Rules (optional)
const crypto = require("crypto"); // Secure random number generation
const bcrypt = require("bcrypt"); // Password hashing

router.get("/", async (req, res) => {
    try {
        const admins = await db.collection("admin").get();
        console.log(admins.docs);
        const adminData = admins.docs.map((doc) => doc.data());
        res.json(adminData);
    } catch (error) {
        console.error("error at GET /admin", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Signup endpoint
router.post("/signup", async (req, res) => {
    try {
        console.log("req.body", req.body);
        const { organizationName, email, password} = req.body;

        // Validate user input
        if (!organizationName ||!email || !password) {
            return res.status(400).json({
                error: "Missing required fields",
            });
        }

        // Generate a unique 4-digit PIN
        const adminID = crypto.randomInt(1000, 9999).toString().padStart(4, "0");

        // Hash the PIN securely (consider storing only the hash for additional security)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a student document in Firestore with generated PIN
        const adminRef = await db.collection("admins").doc(adminID).set({
            organizationName,
            email,
            adminID: adminID,
            password: hashedPassword, // Store only the hashed PIN
        });

        // Customize response JSON according to requirements
        const response = {
            message: "admin registered successfully",
            organizationName,
            email,
            adminID: adminID,
        };

        // Optionally, return only relevant details or omit certain fields

        res.json(response);
    } catch (error) {
        console.error("error at signup:", error);
        // Handle specific errors (e.g., duplicate document ID)
        // and provide informative error messages to the user
        res.status(500).json({ error: "Failed to register admin" });
    }
});

// Login endpoint
router.post("/admin_login", async (req, res) => {
    try {
        const { adminID, password } = req.body;

        if (!adminID || !password) {
            return res.status(400).json({ error: "Missing ID or password" });
        }

        const adminDoc = await db
            .collection("admins")
            .doc(pin.toString())
            .get();
        console.log("adminDoc", adminDoc);

        if (!adminDoc.exists) {
            return res.status(401).json({ error: "Invalid ID or password" });
        }

        const adminData = adminDoc.data();
        delete adminData.pin;

        res.json({
            message: "Login successful",
            adminData,
        });
    } catch (error) {
        console.error("error at login:", error);
        // Handle errors and provide informative messages
        res.status(500).json({ error: "Login failed", message: error.message });
    }
});

module.exports = router;

//Delete admin
router.delete("/delete/:adminID", async (req, res) => {
    try {
        const { adminID } = req.params;
        if (!adminID) {
            return res.status(400).json({ error: "Missing ID" });
        }

        await db.collection("admins").doc(adminID).delete();
        res.json({ message: "admin deleted successfully" });
    } catch (error) {
        console.error("error at delete:", error);
        res.status(500).json({ error: "Failed to delete admin" });
    }
});

