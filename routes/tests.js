const express = require("express");
const router = express.Router();
const { admin, db } = require('../config/firebase'); // Import Firestore instance and Firestore Admin (optional)
const crypto = require('crypto'); // For secure random ID generation
const bcrypt = require("bcrypt"); // Password hashing

//adding a test
router.post("/addtest", async (req, res) => {
  try {
    const { testPin, subject, time, expiry, createDate, imageUrl } = req.body;
    if (!testPin || !subject || !time || !expiry || !createDate || !imageUrl) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }
    // const hashedPin_test = testPin ? await bcrypt.hash(testPin, 10) : hashedPin_test; // use uniqueId if provided

    const newtest = await db.collection("tests").doc(testPin).set({
      subject,
      testPin,
      time,
      expiry,
      createDate,
      imageUrl
    });
    console.log(newtest)

    res.json("Test added!");
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


//deleting a test
router.delete("/deleteTest/:pin", async (req, res) => {
  try {
    const { pin } = req.params;
    // Ensure pin is provided
    if (!pin) {
      return res.status(400).json({
        error: "No test PIN given in request path."
      });
    }
    //check if pin in db
    const testDoc = await db.collection("test").doc(pin).get();
    if (!testDoc.exists) {
      return res.status(401).json({ error: "Invalid PIN" });

    }
    // Delete test document using pin
    else {
      await db.collection("test").doc(pin).delete();

      // Customize response message
      const response = {
        message: `Test with pin ${pin} deleted successfully`
      };
    }


    res.json(response);
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({ error: "Failed to delete test" });
  }
});

//update a test
router.put("/updateTest/:pin", async (req, res) => {
  try {
    const whitelist = ["testname", "time", "expiry", "imageUrl"]; // Fields allowed for update

    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Filter allowed fields and retrieve existing test
    const updatedData = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => whitelist.includes(key))
    );
    const testDoc = await db.collection("test").doc(pin).get();

    // Check if the test exists
    if (!testDoc.exists) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Preserve protected fields and merge updates
    const protectedFields = ["pin", "created"]; // Fields that cannot be changed
    const finalData = {
      ...testDoc.data(),
      ...updatedData,
      ...Object.fromEntries(
        protectedFields.map((field) => [field, testDoc.data()[field]])
      ),
    };

    // Update the test document
    await db.collection("test").doc(pin).update(finalData);

    // Send success response
    const response = {
      message: `Test with pin ${pin} updated successfully`
    };

    res.json(response);

    res.json(response);
  } catch (error) {
    console.error("Error updating test:", error);
    res.status(500).json({ error: "Failed to update test" });
  }
});


//get all tests
router.get("/", async (req, res) => {
  try {
    const tests = await db.collection("tests").get();
    const testList = tests.docs.map((doc) => doc.data());
    res.json(testList);
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ error: "Failed to fetch tests" });
  }
});



// Add a question to a test (POST /tests/:testId/questions)
router.post('/:testId/questions', async (req, res) => {
  try {
    const { testId } = req.params;
    // const { error } = questionSchema.validate(req.body);

    // if (error) {
    //   return res.status(400).json({ error: error.details[0].message });
    // }

    const { questionId, text, type, difficulty, options = [] } = req.body;



    await db.collection('tests').doc(testId).update({
      $push: { questions: questionId }
    });

    await db.collection('questions').doc(questionId).set({
      questionId,
      text,
      type,
      difficulty,
      options,
      testId
    });

    res.send({ message: 'Question added successfully' });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Retrieve all questions for a test (GET /tests/:testId/questions)
router.get('/tests/:testId/questions', async (req, res) => {
  try {
    const { testId } = req.params;
    const testDoc = await db.collection('tests').doc(testId).get();

    if (!testDoc.exists) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const questionIds = testDoc.data().questions;
    const questions = await Promise.all(questionIds.map(id => db.collection('questions').doc(id).get()));

    res.send({ questions: questions.map(q => q.data()) });
  } catch (error) {
    console.error('Error retrieving questions:', error);
    res.status(500).json({ error: 'Failed to retrieve questions' });
  }
});

//delete a question
router.delete('/:testId/questions/:questionId', async (req, res) => {
  try {
    const { testId, questionId } = req.params;

    const quesDoc = await db.collection('tests').doc(questionId).get();
    if (!quesDoc.exists) {
      return res.status(404).json({ error: 'Question not found' });
    }
    await db.collection('questions').doc(questionId).delete();
    await db.collection('tests').doc(testId).update({
      questions: db.arrayRemove(questionId)
    });
    res.send({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
})


module.exports = router;