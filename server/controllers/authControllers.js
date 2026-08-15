import PlayerModel from "../models/PlayerModel.js";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { generateAccessToken } from "../middleware/authMiddleware.js";

export async function registerPlayer(req, res) {
  try {
    // creating salt + hashed password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    console.log(hashedPassword);

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
    const player = await PlayerModel.findOne({ name: req.body.name });
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
    const player = await PlayerModel.findOne({_id: decoded.sub});
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