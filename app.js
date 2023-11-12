import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import mongoose from "mongoose";

import { verifyUser } from "./auth.js";
import { Profile } from "./db.js";

const app = express();
dotenv.config();

// MAKE SURE ALL REQUESTS HAVE CONTENT-TYPE: APPLICATION/JSON
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.use((req, res, next) => {
    //allow access from every, elminate CORS
    res.setHeader('Access-Control-Allow-Origin','*');
    //set the allowed HTTP methods to be requested
    res.setHeader('Access-Control-Allow-Methods','*');
    //headers clients can use in their requests
    res.setHeader('Access-Control-Allow-Headers','*');
    //allow request to continue and be handled by routes
    next();
});

// handlers

// returns all profiles 
app.get("/profiles", async (request, response) => {
    const profiles = await Profile.find({});
    response.status(200).send(profiles);
})

// returns a profile for a specific user
app.get("/profiles/:userId", async (request, response) => {
    const profiles = await Profile.find({userId: request.params.userId});
    response.status(200).send(profiles);
})

// returns a moxfield account for a specific user if one exists
app.get("/moxfield/:moxfieldId", async (request, response) => {
    try {
        const moxfieldResult = await axios.get("https://api2.moxfield.com/v1/users/"+ request.params.moxfieldId);
        const moxfieldData = moxfieldResult.data;
        response.status(200).json(moxfieldData);
    } catch (error) {
        response.status(400).json({message: "Invalid moxfield id. Could not find Moxfield account."});
    }
})

// creates or updates a new profile
app.post("/profiles", async (request, response) => {
    const authResult = await verifyUser(request, response);

    // auth result will be false if there is an auth error
    // the response should be properly set by verifyUser
    if (!authResult) {
        return;
    }

    // convert the userId to a 24 hex character string
    const paddedUserId = request.body.userId.padEnd(24, "0");

    const objId = new mongoose.Types.ObjectId(paddedUserId);

    // if there is a moxfieldId, perform the moxfieldId validation
    const moxfieldId = request.body.moxfieldId;
    if (moxfieldId) {
        try {
            const moxfieldResult = await axios.get("https://api2.moxfield.com/v1/users/"+ moxfieldId);
            const userName = moxfieldResult.data.userName;
            if (userName !== moxfieldId) {
                response.status(400).json({message: "Invalid moxfield id. Could not find Moxfield account."});
                return;
            }
        } catch(error) {
            if (error.response) {
                response.status(400).json({message: "Invalid moxfield id. Could not find Moxfield account."});
                return;
            }
        };
    }

    const profile = new Profile({
        _id: objId,
        userId: request.body.userId.toString(),
        favoriteCommander: request.body.favoriteCommander,
        moxfieldId: moxfieldId ? moxfieldId.toString() : undefined,
        // archidektId: request.body.archidektId ? request.body.archidektId.toString(): undefined,
    });

    Profile.findOneAndUpdate(
        {_id: objId},
        profile,
        {upsert: true, new: true, setDefaultsOnInsert: true}
    ).then(
        () => console.log("One entry added"),
        (err) => console.log(err)
    );
    
    response.status(200).json(profile);
});

// app.delete("/:userId", (request, response) => {
//     const filteredMembers = members.filter(
//         member => member.id !== parseInt(request.params.id)
//     );
//     response.status(200).json({members: filteredMembers });
// })

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));