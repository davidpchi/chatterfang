import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const ROOT_ADMIN_ID = process.env.ROOT_ADMIN_ID || undefined;

export async function verifyUser(request, response) {
    try {
        const discordResult = await axios.get("https://discord.com/api/users/@me", {
            headers: { authorization: `Bearer ${request.headers["access-token"]}` }
        })
        const discordProfile = discordResult.data;

        if (discordProfile.id !== request.body.userId) {
            response.status(403).json({message: "Authorization failed."});
            return false;
        }
    
        return true;
    } catch {
        response.status(500).json({message: "Internal Server Error."});
        return false;
    }
}

export async function verifyAdmin(request, response) {
    try {
        const discordResult = await axios.get("https://discord.com/api/users/@me", {
            headers: { authorization: `Bearer ${request.headers["access-token"]}` }
        })
        const discordProfile = discordResult.data;

        if (ROOT_ADMIN_ID !== undefined && discordProfile.id === ROOT_ADMIN_ID) {
            return true;
        }

        response.status(403).json({message: "Authorization failed."});
        return false;
    } catch (exception) {
        response.status(500).json({message: "Internal Server Error."});
        return false;
    }
}

