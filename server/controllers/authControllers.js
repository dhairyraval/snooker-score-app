import PlayerModel from "../models/PlayerModel.js";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { generateAccessToken } from "../middleware/authMiddleware.js";

export async function registerPlayer(req, res) {
  try {
    // creating salt + hashed password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // create new player in DB
    const newPlayer = await PlayerModel.create({
      name: req.body.name,
      password: hashedPassword
    });

    res.status(201).json({ newPlayer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

export async function loginPlayer(req, res) {
  try {
    const player = await PlayerModel.findOne({ name: req.body.name }).select("+password");
    if (player == null) {
      return res.status(404).json({ message: "User with given name not found." });
    }
    if (await bcrypt.compare(req.body.password, player.password)) {
      // provide jwt & refresh tokens
      const accessToken = generateAccessToken(player);
      const refreshToken = jwt.sign({ sub: player._id }, process.env.REFRESH_SECRET);

      // update refresh tokens
      player.refreshTokens.push(refreshToken);
      await player.save();

      res.status(200).json({ message: "Logged In Sucessfully", accessToken: accessToken, refreshToken: refreshToken });
    }
    else {
      res.status(200).send("Incorrect password!");
    }

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

export async function handleRefreshToken(req, res) {
  const refreshToken = req.body.refreshToken;
  if (refreshToken == null) { return res.sendStatus(401); }

  let decoded;
  try {
    // verify signature & expiration
    decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token." });
  }

  try {
    // find claimed player
    const player = await PlayerModel.findOne({ _id: decoded.sub });
    if (!player) {
      return res.status(403).json({ message: "user does not exist" });
    }

    // reuse detection
    if (!player.refreshTokens.includes(refreshToken)) {
      player.refreshTokens = [];
      await player.save();
      return res.status(403).json({ message: "Token reuse detected, all sessions revoked!" });
    }

    //create new refreshToken
    const newRefreshToken = jwt.sign(
      { sub: player._id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // remove old refreshToken add new one to refreshTokens array
    player.refreshTokens = player.refreshTokens
      .filter((t) => t !== refreshToken)
      .concat(newRefreshToken);

    await player.save();

    // issue new accessToken
    const newAccessToken = generateAccessToken(player);

    // send new tokens back to player
    return res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });

  } catch (error) {
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
}

// used directly by user
export async function changePassword(req, res) {
  try {
    const player = await PlayerModel.findById(req.player._id).select("+password");
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Both old and new passwords are required." });
    }

    // if oldPassword matches saved password, save newPassword in DB
    if (await bcrypt.compare(oldPassword, player.password)) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // issue new tokens, remove old refresh tokens
      const accessToken = generateAccessToken(player);
      const refreshToken = jwt.sign({ sub: player._id }, process.env.REFRESH_SECRET);

      //update changes
      player.password = hashedPassword;
      player.passwordChangedAt = new Date(Date.now() - 1000);
      player.refreshTokens = [refreshToken];
      await player.save();

      res.status(200).json({ message: "password changed successfully", accessToken: accessToken, refreshToken: refreshToken });
    }
    //TODO: Logging + Notify
    else {
      res.status(401).send("incorrect password!");
    }
  } catch (error) {
    res.status(500).json({ message: "internal server error", error: error.message });
  }
}

export async function changePasswordAdmin(req, res) {
  const { name, newPassword } = req.body;
  if (!name || !newPassword) {
    return res.status(400).json({ message: "Cannot update password - missing details" });
  }
  try {
    // find player to update
    const playerToUpdate = await PlayerModel.findOne({ name: name }).select("+password");

    // update player details
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    playerToUpdate.password = hashedPassword;
    playerToUpdate.passwordChangedAt = new Date(Date.now() - 1000);
    playerToUpdate.refreshTokens = [];
    await playerToUpdate.save();

    res.status(200).json({ message: `password for ${name} changed successfully` });
  } catch (error) {
    res.status(500).json({ message: "internal server error", error: error.message });
  }
}

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken == null) { return res.sendStatus(204); }

  //verify refreshToken
  let decoded;
  try {
    // verify signature & expiration
    decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
  } catch (error) {
    // even if token is malformed/invalid, pass status 200 so client can proceed with local cleanup
    // will be applicable for:
    //1. Expired Refresh Tokens being given by user (eg: logging out of a device after not using it for a very long time)
    //2. Server updated REFRESH_SECRETs
    //3. Client sends garbage data as a refresh token (logout should still proceed)
    await PlayerModel.updateOne(
      { refreshTokens: refreshToken },
      { $pull: { refreshTokens: refreshToken } }
    );
    return res.status(200).json({ message: "logged out successfully." });
  }

  //logout of current device (remove current valid refreshToken)
  try {
    await PlayerModel.updateOne(
      { _id: decoded.sub },
      { $pull: { refreshTokens: refreshToken } }
    );
    return res.status(200).json({ message: "logged out successfully." });
  } catch (error) {
    return res.status(500).json({ message: "internal server error" });
  }
}

export async function logoutAll(req, res) {

  req.player.refreshTokens = [];
  req.player.passwordChangedAt = new Date(Date.now() - 1000); // as logging out of all devices should invalidated all accessTokens
  await req.player.save();

  return res.status(200).json({ message: "Logged out of all devices successfully." });

}