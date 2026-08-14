// import Transaction from "../models/Transaction.js";

export async function contactAdmin(req, res) {
  try {
    // TODO
    res.status(200).json({message: "contactAdmin working!"});
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}