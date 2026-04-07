import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createCourse, getCourseById, getCourses } from "../controllers/courseController.js";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { uploadLecture } from "../controllers/lectureController.js";
import upload from "../config/multer.js";

const router = Router();

router.post("/create", protect, requireRole("instructor"), createCourse);
router.get("/", protect, getCourses);
router.get("/:courseId", protect, getCourseById)
router.post("/:courseId/lectures/upload", protect, requireRole("instructor"), upload.single("file"), uploadLecture)

export default router;