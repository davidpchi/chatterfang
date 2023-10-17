const express = require("express");
const members = require("./members");
const axios = require("axios");

const app = express();
app.use(express.json());

// A8nJ0BxHVpT4N7RPMfrK5eIwx4DvXO

const PORT = process.env.PORT || 4000;

app.get("/", (request, response) => {
    response.status(200).json({members: members});
})

app.post("/", (request, response) => {
    const newMember = {
        id: request.body.id,
        name: request.body.name,
        age: request.body.age
    };

    members.push(newMember);
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