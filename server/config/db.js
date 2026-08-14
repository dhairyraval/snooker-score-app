import mongoose from "mongoose"

export const connectDB = async () =>{
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("mongoDB connected successfully!");
    } catch(err) {
        console.log("error connectiong to mongoDB", err);
        process.exit(1); // exit with failure
    }
}