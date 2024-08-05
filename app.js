import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import mongoose from "mongoose";

import { verifyUser, verifyAdmin } from "./auth.js";
import { Profile } from "./db.js";
import { submitMatch } from "./googleFormsService.js";

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
app.get("/moxfield/profile/:moxfieldId", async (request, response) => {
    try {
        const moxfieldResult = await axios.get("https://api2.moxfield.com/v1/users/"+ request.params.moxfieldId);
        const moxfieldData = moxfieldResult.data;
        response.status(200).json(moxfieldData);
    } catch (error) {
        response.status(400).json({message: "Invalid moxfield id. Could not find Moxfield account."});
    }
})

// returns a moxfield deck for a specific id if one exists
app.get("/moxfield/deck/:moxfieldId", async (request, response) => {
    try {
        const moxfieldResult = await axios.get("https://api2.moxfield.com/v3/decks/all/"+ request.params.moxfieldId);
        const moxfieldData = moxfieldResult.data;
        response.status(200).json(moxfieldData);
    } catch (error) {
        response.status(400).json({message: "Invalid moxfield id. Could not find Moxfield deck."});
    }
})

// adds a deck to a given user
// the deck is identified by a full url, and then we extract the id
// today, only moxfield is supported
app.post("/addDeck", async(request, response) => {
    const authResult = await verifyUser(request, response);

    // auth result will be false if there is an auth error
    // the response should be properly set by verifyUser
    if (!authResult) {
        return;
    }

    // validate request body
    if (request.body.url === undefined) {
        response.status(400).json({message: "Missing deck url."});
        return;
    }

    if (request.body.source === undefined) {
        response.status(400).json({message: "Missing deck source."});
    } else if (request.body.source !== "moxfield") {
        // today, only moxfield is the supported deck source
        response.status(400).json({message: "Invalid deck source."});
    }

    const rawUrl = request.body.url;
    const deckSource = request.body.source;

    // validate the deck to make sure it exists in moxfield
    let startingIndex = 0; 
    // strip out any potential http and https
    const httpIndex = rawUrl.indexOf("http://");
    if (httpIndex > -1) {
        startingIndex = httpIndex + "http://".length + 1;
    } else {
        const httpsIndex = rawUrl.indexOf("https://");
        if (httpsIndex > -1) {
            startingIndex = httpIndex + "https://".length + 1;
        }
    }

    const deckUrl = rawUrl.substring(startingIndex);
    const urlContents = deckUrl.split("/");

    // the 3rd item should be our deckId
    const deckId = urlContents.length === 3 ? urlContents[2] : undefined;

    // make sure the deckId exists
    if (deckId === undefined || deckId.length === 0) {
        // if deck id is undefined at this point, this is a bad url.
        response.status(400).json({message: "Invalid Moxfield url."})
        return;
    }

    try {
        const moxfieldResult = await axios.get("https://api2.moxfield.com/v3/decks/all/"+ deckId);
        const publicId = moxfieldResult.data.publicId;
        if (publicId !== deckId) {
            response.status(400).json({message: "Invalid deck url. Could not find Moxfield deck."});
            return;
        }
    } catch(error) {
        if (error.response) {
            response.status(400).json({message: "Failed to lookup Moxfield deck."});
            return;
        }
    };

    // convert the userId to a 24 hex character string
    const paddedUserId = request.body.userId.padEnd(24, "0");
    const objId = new mongoose.Types.ObjectId(paddedUserId);

    const existingProfile = await Profile.findOne({_id: objId});
    if (existingProfile) {
        // there is a 10 deck limit
        if (existingProfile.decks.length >= 10) {
            response.status(400).json({message: "Deck limit reached."});
            return;
        }
    }
    
    const newDeckId = new mongoose.Types.ObjectId();

    Profile.findOneAndUpdate(
        {_id: objId},
        {$push: {
            decks: {
                _id: newDeckId,
                deckId: deckId,
                source: deckSource,
            }
        }}
    ).then(
        () => console.log("Added deck to user."),
        (err) => console.log(err)
    );

    response.status(200).json({});

    return;
});

// removes a deck from a user based on a deckId
app.post("/removeDeck", async(request, response) => {
    const authResult = await verifyUser(request, response);

    // auth result will be false if there is an auth error
    // the response should be properly set by verifyUser
    if (!authResult) {
        return;
    }

    // convert the userId to a 24 hex character string
    const paddedUserId = request.body.userId.padEnd(24, "0");
    const objId = new mongoose.Types.ObjectId(paddedUserId);

    const existingProfile = Profile.findOne({_id: objId});
    if (existingProfile) {
        console.log("found the profile")
    } else {
        response.status(400).json({message: "User not found."})
        return;
    }

    // validate the request body
    const deckId = request.body.deckId;
    if (deckId === undefined) {
        response.status(400).json({message: "Invalid Moxfield url."})
        return;
    }

    Profile.findOneAndUpdate(
        {_id: objId},
        {$pull: {
            decks: {_id: request.body.deckId},
        }},
        {new: true}
    ).then(
        () => console.log("Removed deck from user."),
        (err) => console.log(err)
    );

    response.status(200).json({});

    return;
});

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

    let moxfieldId = request.body.moxfieldId;
    // if there is a moxfieldId, perform the moxfieldId validation. Empty moxfield id means caller is removing the moxfield account link.
    if (moxfieldId !== undefined && moxfieldId !== "") {
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

    // const profile = new Profile({
    //     _id: objId,
    //     userId: request.body.userId.toString(),
    //     favoriteCommander: request.body.favoriteCommander,
    //     moxfieldId: moxfieldId !== undefined ? moxfieldId.toString() : undefined,
    //     // archidektId: request.body.archidektId ? request.body.archidektId.toString(): undefined,
    // });

    const result = Profile.findOneAndUpdate(
        {_id: objId},
        { $set: { 
            "_id": objId,
            "userId": request.body.userId.toString(),
            "favoriteCommander": request.body.favoriteCommander,
            "moxfieldId": moxfieldId !== undefined ? moxfieldId.toString() : undefined,
            // archidektId: request.body.archidektId ? request.body.archidektId.toString(): undefined,
        }},
        {upsert: true, new: true, setDefaultsOnInsert: true}
    ).then(
        () => {
            console.log("One entry added");
        },
        (err) => {
            console.log(err);
            response.status(503).json({message: "Error occured trying to update or create profile."});
            return;
        }
    );

    response.status(200).json(result);
});

// TODO: we should probably merge this in with the /profiles POST endpoint and improve how auth is done there 
// to allow for better permissions checks than a blanket "YES" or "NO"
app.post("/profiles/link", async (request, response) => {
    const authResult = await verifyAdmin(request, response);

    if (!authResult) {
        return;
    }

    // convert the userId to a 24 hex character string
    const paddedUserId = request.body.userId.padEnd(24, "0");

    const objId = new mongoose.Types.ObjectId(paddedUserId);

    const toskiId = request.body.toskiId;

    const result = Profile.findOneAndUpdate(
        {_id: objId},
        { $set: { 
            "_id": objId,
            "toskiId": toskiId !== undefined ? toskiId.toString() : undefined,
        }},
        {upsert: true, new: true, setDefaultsOnInsert: true}
    ).then(
        () => {
            console.log("Updated profile via linking.");
        },
        (err) => {
            console.log(err);
            response.status(503).json({message: "Error occured trying to update or create profile via linking."});
            return;
        }
    );

    response.status(200).json(result);
})

app.post("/matches", async (request, response) => {

    const date = new Date();

    // validate date
    if (date === undefined) {
        response.status(400).json({message: "Missing required ISO String Date." });
        return;
    }

    const player1 = request.body.player1;
    const player2 = request.body.player2;
    const player3 = request.body.player3;
    const player4 = request.body.player4;

    const result = await submitMatch(
        date,
        player1 ? {
            name: player1.name,
            commander: player1.commander,    
            turnOrder: player1.turnOrder,
            rank: player1.rank
        } : undefined,
        player2 ? {
            name: player2.name,
            commander: player2.commander,    
            turnOrder: player2.turnOrder,
            rank: player2.rank
        } : undefined,
        player3 ? {
            name: player3.name,
            commander: player3.commander,    
            turnOrder: player3.turnOrder,
            rank: player3.rank
        } : undefined,
        player4 ? {
            name: player4.name,
            commander: player4.commander,    
            turnOrder: player4.turnOrder,
            rank: player4.rank
        } : undefined,
        request.body.turnCount,
        request.body.extraNotes,
        request.body.firstKOTurn,
        request.body.timeLength
    )

    if (result === false) {
        response.status(500).json({message: "Failed to send form data."});
        return;
    }

    response.status(204).json({});
})

// app.delete("/:userId", (request, response) => {
//     const filteredMembers = members.filter(
//         member => member.id !== parseInt(request.params.id)
//     );
//     response.status(200).json({members: filteredMembers });
// })

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));