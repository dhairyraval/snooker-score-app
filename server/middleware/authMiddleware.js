import jwt from "jsonwebtoken";
import PlayerModel from "../models/PlayerModel.js";

export async function protect(req, res, next) {
    const authHeader = req.headers['authorization'];
    const authToken = authHeader && authHeader.split(' ')[1];
    if (authToken == null) { return res.sendStatus(401); }

    try {
        const decodedPayload = jwt.verify(authToken, process.env.JWT_SECRET);
        // check if player exists (checks by claimed player._id)
        const player = await PlayerModel.findById(decodedPayload.sub);
        if (!player) {
            return res.status(401).json({ message: "User not found." });
        }

        // check for recent password changes
        if (player.passwordChangedAt) {
            const changedTimestamp = parseInt(player.passwordChangedAt.getTime() / 1000, 10);

            // decodedPayload.iat is in seconds
            if (decodedPayload.iat < changedTimestamp) {
                return res.status(401).json({
                    message: "Password was recently changed. Please log in again."
                });
            }
        }

        req.user = decodedPayload; // Token payload ({ sub, role, iat })
        req.player = player; // mongoose document
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token has expired. Please log in again." });
        }
        return res.status(401).json({ message: "Invalid token.", error: error.message });
    }
}

export async function isAdmin(req, res, next) {

    //check player is admin
    if (req.player.role !== "admin") {
        return res.status(403).json({
            message: "Forbidden: You do not have permission to perform this action."
        });
    }
    next();
};

export function generateAccessToken(player) {
    return jwt.sign({ sub: player._id, name: player.name, role: player.role }, process.env.JWT_SECRET, { expiresIn: "15m" });
}