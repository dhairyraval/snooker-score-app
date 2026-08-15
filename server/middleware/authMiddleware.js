import jwt from "jsonwebtoken";

export async function protect(req, res, next) {
    const authHeader = req.headers['authorization'];
    const authToken = authHeader && authHeader.split(' ')[1];
    if (authToken == null) { return res.sendStatus(404); }

    try {
        const decodedPayload = jwt.verify(authToken, process.env.JWT_SECRET);
        req.player = decodedPayload;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Token has expired. Please log in again." });
        }
        return res.status(401).json({ message: "Invalid token." });
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

export function generateAccessToken(player){
    return jwt.sign({sub: player._id, name: player.name, role: player.role}, process.env.JWT_SECRET, {expiresIn: "15m"});
}