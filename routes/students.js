const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase"); // Import Firestore instance

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

router.post("/", async (req, res) => {
    try {
        const studentData = req.body;
        const studentRef = await db.collection("students").add(studentData);
        res.json({
            message: "Student created successfully",
            studentId: studentRef.id,
        });
    } catch (error) {
        console.error("error at post student : ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
