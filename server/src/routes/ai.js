import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { classifyTicket } from "../services/ai.js";
const router = Router(); router.use(authenticate);
router.post("/classify", async (req,res) => {
  const text = z.string().trim().min(5).max(12000).parse(req.body.text);
  res.json({ classification: await classifyTicket(text) });
});
export default router;
