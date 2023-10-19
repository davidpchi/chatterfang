require("dotenv").config();
const express = require("express");
const members = require("./members");
const axios = require("axios");
const mongoose = require("mongoose");

const app = express();

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

// connect to the db
mongoose.connect(
    process.env.MONGODB_URI, 
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

// initialize our db models
const profileSchema = new mongoose.Schema({
    _id: Number,
    userId: {
        type: Number,
        required: true
    },
    favoriteCommander: String,
});

const Profile = mongoose.model('Profile', profileSchema);

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

// creates or updates a new profile
app.post("/profiles", async (request, response) => {
    const result = await axios.get("https://discord.com/api/users/@me", {
        headers: { authorization: `Bearer ${request.headers["access-token"]}` }
    })
    const discordProfile = result.data;

    if (discordProfile.id !== request.body.userId) {
        response.status(403).json({message: "Request id does not match access token claims."});
        return;
    }

    const profile = new Profile({
        userId: request.body.userId,
        favoriteCommander: request.body.favoriteCommander,
    });

    const objId = Number(request.body.userId);

    Profile.findOneAndUpdate(
        {_id: objId},
        {
            _id: objId,
            favoriteCommander: request.body.favoriteCommander,
            userId: request.body.userId,
        },
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