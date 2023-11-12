import axios from "axios";

export async function verifyUser(request, response) {
    try {
        const discordResult = await axios.get("https://discord.com/api/users/@me", {
            headers: { authorization: `Bearer ${request.headers["access-token"]}` }
        })
        const discordProfile = discordResult.data;
        
        if (discordProfile.id !== request.body.userId) {
            response.status(403).json({message: "Request id does not match access token claims."});
            return false;
        }
    
        return true;
    } catch {
        response.status(403).json({message: "Authorization failed."});
        return false;
    }

}