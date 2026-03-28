import axios from "axios";
import { Commander } from "./db.js";

const SCRYFALL_DELAY_MS = 5000; // 5 second delay between requests

// Helper function to delay execution
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Extract commander data from Scryfall card object
const getCommanderData = (item) => {
    const imageUrl = item.image_uris?.normal || item.card_faces?.[0]?.image_uris?.normal;
    
    return {
        scryfallId: item.id,
        friendlyName: item.name,
        image: imageUrl,
        colorIdentity: item.color_identity || [],
        scryfallUri: item.scryfall_uri
    };
};

// Fetch all commanders from Scryfall API with pagination
const fetchAllCommanders = async () => {
    const commanders = [];
    let nextPageUrl = "https://api.scryfall.com/cards/search?q=is:commander%20-is:digital";

    while (nextPageUrl) {
        try {
            console.log(`Fetching: ${nextPageUrl}`);
            const response = await axios.get(nextPageUrl);
            const result = response.data;

            if (result.data && Array.isArray(result.data)) {
                for (const item of result.data) {
                    commanders.push(getCommanderData(item));
                }
            }

            nextPageUrl = result.next_page;
            
            // Rate limiting - wait between requests
            if (nextPageUrl) {
                await delay(SCRYFALL_DELAY_MS);
            }
        } catch (error) {
            console.error(`Error fetching commanders from Scryfall:`, error.message);
            throw error;
        }
    }

    return commanders;
};

// Fetch special case commanders (extras)
const fetchSpecialCommanders = async (specialCases) => {
    const commanders = [];

    for (const cardName of specialCases) {
        if (!cardName || cardName.trim() === "") {
            continue;
        }

        try {
            console.log(`Fetching special case: ${cardName}`);
            const response = await axios.get(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
            const item = response.data;
            commanders.push(getCommanderData(item));
            
            // Rate limiting between requests
            await delay(SCRYFALL_DELAY_MS);
        } catch (error) {
            console.error(`Error fetching special case ${cardName}:`, error.message);
            // Continue with next card instead of failing completely
        }
    }

    return commanders;
};

// Main function to refresh all commander data
export const refreshCommanderList = async (specialCases = []) => {
    try {
        console.log("Starting commander list refresh...");
        
        // Fetch all regular commanders
        const mainCommanders = await fetchAllCommanders();
        console.log(`Fetched ${mainCommanders.length} commanders from main search`);

        // Fetch special case commanders
        let specialCommanders = [];
        if (specialCases && specialCases.length > 0) {
            specialCommanders = await fetchSpecialCommanders(specialCases);
            console.log(`Fetched ${specialCommanders.length} special case commanders`);
        }

        // Combine all commanders
        const allCommanders = [...mainCommanders, ...specialCommanders];

        // Clear existing commanders and insert new ones
        await Commander.deleteMany({});
        const savedCommanders = await Commander.insertMany(allCommanders);
        
        console.log(`Successfully saved ${savedCommanders.length} commanders to database`);
        return savedCommanders;
    } catch (error) {
        console.error("Error refreshing commander list:", error);
        throw error;
    }
};

// Get all commanders from database
export const getAllCommanders = async () => {
    try {
        const commanders = await Commander.find({}).sort({friendlyName: 1});
        return commanders;
    } catch (error) {
        console.error("Error fetching commanders from database:", error);
        throw error;
    }
};

// Get commander by friendly name
export const getCommanderByName = async (name) => {
    try {
        const commander = await Commander.findOne({friendlyName: name});
        return commander;
    } catch (error) {
        console.error("Error fetching commander by name:", error);
        throw error;
    }
};
