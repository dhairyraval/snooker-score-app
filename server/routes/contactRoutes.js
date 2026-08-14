import express from "express";

import { contactAdmin } from "../controllers/contactController.js";

const router = express.Router();

router.post("/", contactAdmin);     // contact & log for bug reports

export default router;