const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase"); // Import Firestore instance
const admin = require("firebase-admin"); // For Firestore Security Rules (optional)
const crypto = require("crypto"); // Secure random number generation
const bcrypt = require("bcrypt"); // Password hashing

router.get("/", async (req, res) => {
    try {
        const admins = await db.collection("admins").get();
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

        async function generateUniquePin() {
            let adminID;
            let pinExists = true;
            // Keep generating PINs until a unique one is found
            while (pinExists) {
                adminID = crypto.randomInt(1000, 9999).toString().padStart(4, "0");
                const adminDoc = await db.collection("admins").doc(adminID).get();
                pinExists = adminDoc.exists;
            }
            return adminID;
          }
        const adminID = await generateUniquePin();
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
router.post("/login", async (req, res) => {
    try {
        const { adminID, password } = req.body;

        if (!adminID || !password) {
            return res.status(400).json({ error: "Missing ID or password" });
        }

        const adminDoc = await db.collection("admins").doc(adminID).get();

        if (!adminDoc.exists) {
            return res.status(401).json({ error: "Invalid ID or password" });
        }

        const adminData = adminDoc.data();
        const hashedPassword = adminData.password;

        // Compare the provided password with the hashed password from the database
        const passwordMatch = await bcrypt.compare(password, hashedPassword);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid ID or password" });
        }

        // If password is correct, delete the hashed password from the response
        delete adminData.password;

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
        const adminDoc = await db.collection("admins").doc(adminID).get();
        if (!adminDoc.exists) {
            return res.status(404).json({ error: "Admin not found" });
        }
        else{
        await db.collection("admins").doc(adminID).delete();
        res.json({ message: "Admin deleted successfully" });}
    } catch (error) {
        console.error("error at delete:", error);
        res.status(500).json({ error: "Failed to delete admin" });
    }
});

//funder routes
router.post('/:adminID/funders', async (req, res) => {
    try {
      const { adminID } = req.params;
      // const { error } = funderschema.validate(req.body);
  
      // if (error) {
      //   return res.status(400).json({ error: error.details[0].message });
      // }
  
      const {organizationName, email, password, locations=[] } = req.body;
  
      if (!organizationName || !email || !password || !locations) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      async function generateUniquePin() {
        let fundID;
        let pinExists = true;
        // Keep generating PINs until a unique one is found
        while (pinExists) {
            fundID = crypto.randomInt(1000, 9999).toString().padStart(4, "0");
            const questionDoc = await db.collection("funders").doc(fundID).get();
            pinExists = questionDoc.exists;
        }
        return fundID;
      }
      const fundID = await generateUniquePin();
      await db.collection('admins').doc(adminID).update({
        funders: admin.firestore.FieldValue.arrayUnion(fundID)
      });
      await db.collection('funders').doc(fundID).set({
        fundID,
        organizationName,
        email,
        password: hashedPassword,
        locations,
        adminID
      });
  
      res.send({ message: 'Funder added successfully' });
    } catch (error) {
      console.error('Error adding Funder:', error);
      res.status(500).json({ error: 'Failed to add funder' });
    }
  });
  
  // Retrieve all funders for a test (GET /admins/:adminID/funders)
  router.get('/:adminID/funders', async (req, res) => {
    try {
      const { adminID } = req.params;
      const adminDoc = await db.collection('admins').doc(adminID).get();
  
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin not found' });
      }
  
      const fundIDs = adminDoc.data().funders;
      const funders = await Promise.all(fundIDs.map(id => db.collection('funders').doc(id).get()));
  
      res.send({ funders: funders.map(q => q.data()) });
    } catch (error) {
      console.error('Error retrieving funders:', error);
      res.status(500).json({ error: 'Failed to retrieve funders' });
    }
  });
  
  //delete a question
  router.delete('/:adminID/funders/:fundID', async (req, res) => {
    try {
      const { adminID, fundID } = req.params;
  
      const fundDoc = await db.collection('funders').doc(fundID).get();
      if (!fundDoc.exists) {
        return res.status(404).json({ error: 'Funder not found' });
      }
      await db.collection('funders').doc(fundID).delete();
      await db.collection('admins').doc(adminID).update({
        funders: admin.firestore.FieldValue.arrayRemove(fundID)
      });
      res.send({ message: 'Funder deleted successfully' });
    } catch (error) {
      console.error('Error deleting Funder:', error);
      res.status(500).json({ error: 'Failed to delete Funder' });
    }
  })
  
  //update a question
  router.put('/:adminID/funders/:fundID', async (req, res) => {
    try {
        const { adminID, fundID } = req.params;
        const whitelist = ['locations'];
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

        const fundDoc = await db.collection('funders').doc(fundID).get();
        if (!fundDoc.exists) {
        return res.status(404).json({ error: 'Funder not found' });
        }

        const finalData = {
        ...fundDoc.data(),
        ...updatedData
        };

        await db.collection('funders').doc(fundID).update(finalData);
        res.send({ message: 'Funder updated successfully' });
    } catch (error) {
        console.error('Error updating Funder:', error);
        res.status(500).json({ error: 'Failed to update funder' });
    }
    });
  
