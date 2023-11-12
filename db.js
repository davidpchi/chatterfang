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
    archidektId: String
});

export const Profile = mongoose.model('Profile', profileSchema);