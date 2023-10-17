require("dotenv").config();

const express = require("express");
const members = require("./members");
const axios = require("axios");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

mongoose.connect(
    process.env.MONGODB_URI, 
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

const studentSchema = new mongoose.Schema({
    roll_no: {
        type: Number,
        required: true
    },
    name: String,
    year: Number,
    subjects: [String]
});

const Student = mongoose.model('Student', studentSchema);

app.get("/", async (request, response) => {
    const students = await Student.find({});
    response.status(200).send(students);

    // response.status(200).json({members: members});
})

app.post("/", (request, response) => {
    const newMember = {
        id: request.body.id,
        name: request.body.name,
        age: request.body.age
    };

    members.push(newMember);

    // MONGO DB TEST CODE:
    // const stud = new Student({
    //     roll_no: 1001,
    //     name: 'Madison Hyde',
    //     year: 3,
    //     subjects: ['DBMS', 'OS', 'Graph Theory', 'Internet Programming']
    // });
    // stud
    //     .save()
    //     .then(
    //         () => console.log("One entry added"), 
    //         (err) => console.log(err)
    //     );

    response.status(200).json({members: members});
});

app.post("/test", async (request, response) => {
    const result = await axios.get("https://discord.com/api/users/@me", {
        headers: { authorization: `Bearer ${request.body.accessToken}` }
    })
    const discordProfile = result.data;

    if (discordProfile.id !== request.body.id) {
        response.status(403).json({message: "Request id does not match access token claims."})
    }
    else {
        response.status(200).json(discordProfile);
    }
});


app.delete("/:id", (request, response) => {
    const filteredMembers = members.filter(
        member => member.id !== parseInt(request.params.id)
    );
    response.status(200).json({members: filteredMembers });
})

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));