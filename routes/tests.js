const express = require("express");
const router = express.Router();
const { admin, db } = require('../config/firebase'); // Import Firestore instance and Firestore Admin (optional)
const crypto = require('crypto'); // For secure random ID generation
const bcrypt = require("bcrypt"); // Password hashing

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

//adding a test
router.post("/create", async (req, res) => {
  try {
    const {subject, time, expiry, createDate, imageUrl } = req.body;
    if (!subject || !time || !expiry || !createDate || !imageUrl) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }
    async function generateUniquePin() {
      let testID;
      let pinExists = true;
      // Keep generating PINs until a unique one is found
      while (pinExists) {
          testID = crypto.randomInt(1000, 9999).toString().padStart(4, "0");
          const studentDoc = await db.collection("students").doc(testID).get();
          pinExists = studentDoc.exists;
      }
      return testID;
    }
    const testID = await generateUniquePin();
    const newtest = await db.collection("tests").doc(testID).set({
      subject,
      testID,
      time,
      expiry,
      createDate,
      imageUrl,
      questions: []
  });

    const response = {
      message: "Test created successfully",
      testID: testID,
      subject,
      time,
      expiry,
      createDate,
      imageUrl
    };

    res.json(response);} 
  catch (err) {
    res.status(400).json({ error: err.message });
  }
});


//deleting a test
router.delete("/delete/:testID", async (req, res) => {
  try {
    const { testID } = req.params;
    // Ensure pin is provided
    if (!testID) {
      return res.status(400).json({
        error: "No testID given in request path."
      });
    }
    //check if pin in db
    const testDoc = await db.collection("tests").doc(testID).get();
    if (!testDoc.exists) {
      return res.status(404).json({ error: "Test not found" });

    }
    // Delete test document using pin
    else {
      await db.collection("tests").doc(testID).delete();

      // Customize response message
      const response = {
        message: `Test deleted successfully`
      };
      res.json(response);
    }
    
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({ error: "Failed to delete test" });
  }
});

//update a test
router.put("/update/:testID", async (req, res) => {
  try {
    const whitelist = ["subject", "time", "expiry", "imageUrl"]; // Fields allowed for update
    const { testID } = req.params;
    // Filter allowed fields and retrieve existing test
    const keys = Object.keys(req.body);

    // Check if any key is not in the whitelist
    const invalidFields = keys.filter(key => !whitelist.includes(key));

    if (invalidFields.length > 0) {
      return res.status(405).json({ error: "Invalid field(s): " + invalidFields.join(", ") });
    }

    const updatedData = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => whitelist.includes(key))
    );

    //check if request fields in DB
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const testDoc = await db.collection("tests").doc(testID).get();

    // Check if the test exists
    if (!testDoc.exists) {
      return res.status(404).json({ error: "Test not found" });
    }

    // Preserve protected fields and merge updates
    const protectedFields = ["testID", "createDate"]; // Fields that cannot be changed
    const finalData = {
      ...testDoc.data(),
      ...updatedData,
      ...Object.fromEntries(
        protectedFields.map((field) => [field, testDoc.data()[field]])
      ),
    };

    // Update the test document
    await db.collection("tests").doc(testID).update(finalData);

    // Send success response
    const response = {
      message: `Test updated successfully`
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating test:", error);
    res.status(500).json({ error: "Failed to update test" });
  }
});

// Add a question to a test (POST /tests/:testId/questions)
router.post('/:testID/questions', async (req, res) => {
  try {
    const { testID } = req.params;
    // const { error } = questionSchema.validate(req.body);

    // if (error) {
    //   return res.status(400).json({ error: error.details[0].message });
    // }

    const {text, type, difficulty, options = [] } = req.body;

    if (!text || !type || !difficulty || !options) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    else if(options.length < 4){
      return res.status(402).json({ error: 'Minimum 4 options required' });
    }
    async function generateUniquePin() {
      let questionID;
      let pinExists = true;
      // Keep generating PINs until a unique one is found
      while (pinExists) {
          questionID = crypto.randomInt(1000, 9999).toString().padStart(4, "0");
          const questionDoc = await db.collection("questions").doc(questionID).get();
          pinExists = questionDoc.exists;
      }
      return questionID;
    }
    const questionID = await generateUniquePin();
    await db.collection('tests').doc(testID).update({
      questions: admin.firestore.FieldValue.arrayUnion(questionID)
    });
    await db.collection('questions').doc(questionID).set({
      questionID,
      text,
      type,
      difficulty,
      options,
      testID
    });

    res.send({ message: 'Question added successfully' });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ error: 'Failed to add question' });
  }
});

// Retrieve all questions for a test (GET /tests/:testId/questions)
router.get('/:testID/questions', async (req, res) => {
  try {
    const { testID } = req.params;
    const testDoc = await db.collection('tests').doc(testID).get();

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
router.delete('/:testID/questions/:questionID', async (req, res) => {
  try {
    const { testID, questionID } = req.params;

    const quesDoc = await db.collection('questions').doc(questionID).get();
    if (!quesDoc.exists) {
      return res.status(404).json({ error: 'Question not found' });
    }
    await db.collection('questions').doc(questionID).delete();
    await db.collection('tests').doc(testID).update({
      questions: admin.firestore.FieldValue.arrayRemove(questionID)
    });
    res.send({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
})

//update a question
router.put('/:testID/questions/:questionID', async (req, res) => {
  try {
    const { testID, questionID } = req.params;
    const whitelist = ['text', 'type', 'difficulty', 'options'];
    // Filter allowed fields and retrieve existing test
    const keys = Object.keys(req.body);

    // Check if any key is not in the whitelist
    const invalidFields = keys.filter(key => !whitelist.includes(key));

    if (invalidFields.length > 0) {
      return res.status(405).json({ error: "Invalid field(s): " + invalidFields.join(", ") });
    }

    const updatedData = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => whitelist.includes(key))
    );

    //check if request fields in DB
    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const quesDoc = await db.collection('questions').doc(questionID).get();
    if (!quesDoc.exists) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const finalData = {
      ...quesDoc.data(),
      ...updatedData
    };

    await db.collection('questions').doc(questionID).update(finalData);
    res.send({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

module.exports = router;