import { Router } from "express";
import {
  getDashboard,
  runScraper,
  killScraper,
} from "../controllers/adminController";

const router = Router();

router.get("/dashboard", getDashboard);
router.post("/scrape/:brand", runScraper);
router.post("/scrape/stop/:brand", killScraper); // NEW

export default router;
