const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase"); // Import Firestore instance
const admin = require("firebase-admin"); // For Firestore Security Rules (optional)
const crypto = require("crypto"); // Secure random number generation
const bcrypt = require("bcrypt"); // Password hashing

router.get("/", async (req, res) => {
    try {
        const students = await db.collection("development-1").get();
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
      // Destructure required fields from request body
      const { firstName, lastName, dob, gender, location, uniqueId } = req.body;
  
      // Validate all required fields
      if (!firstName || !lastName || !dob || !gender || !location || !uniqueId) {
        return res.status(400).json({
          error: "Missing required fields: firstName, lastName, dob, gender, location"
        });
      }
  
      const dobRegex = /^\d{2}-\d{2}-\d{4}$/;
      if (!dobRegex.test(dob)) {
        return res.status(400).json({
          error: "Invalid DOB format. Please use DD-MM-YYYY."
        });
      }
      // Hash the PIN securely (consider storing only the hash)
      const hashedPin = uniqueId ? await bcrypt.hash(uniqueId, 10) : hashedPin; // use uniqueId if provided
  
      // Create a student document in Firestore
      const studentRef = await db.collection("students").doc(uniqueId || pin).set({
        firstName,
        lastName,
        dob,
        gender,
        location,
        pin: hashedPin, // Store only the hashed PIN (or uniqueId if used)
      });
  
      // Customize response JSON
      const response = {
        message: "Student created successfully",
        studentId: uniqueId || pin, // use uniqueId if provided
      };
  
      res.json(response);
    } catch (error) {
      console.error("Error at signup:", error);
      res.status(500).json({ error: "Failed to create student" });
    }
  });

  router.delete("/delete/:uniqueId", async (req, res) => {
    try {
      const { uniqueId } = req.params;
  
      // Ensure uniqueId is provided
      if (!uniqueId) {
        return res.status(400).json({
          error: "Missing student unique ID in request path."
        });
      }
  
      // Delete student document using uniqueId
      await db.collection("students").doc(uniqueId).delete();
  
      // Customize response message
      const response = {
        message: `Student with ID ${uniqueId} deleted successfully`
      };
  
      res.json(response);
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ error: "Failed to delete student" });
    }
  });
  
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
