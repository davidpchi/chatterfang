import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

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
    _id: mongoose.Types.ObjectId,
    userId: {
        type: String,
        required: true
    },
    favoriteCommander: String,
    moxfieldId: String,
    archidektId: String,
    decks: [{_id: String, deckId: String, source: String}],
    toskiId: String,
});

export const Profile = mongoose.model('Profile', profileSchema);

// Commander list schema - stores all Magic: The Gathering commanders from Scryfall
const commanderSchema = new mongoose.Schema({
    scryfallId: {
        type: String,
        required: true,
        unique: true
    },
    friendlyName: {
        type: String,
        required: true,
        unique: true
    },
    image: String,
    colorIdentity: [String],
    scryfallUri: String,
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

export const Commander = mongoose.model('Commander', commanderSchema);