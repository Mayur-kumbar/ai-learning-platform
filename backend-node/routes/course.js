import { Router } from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { createCourse, getCourseById, getCourses } from "../controllers/courseController.js";
import { requireRole } from "../middlewares/roleMiddleware.js";
import { uploadLecture, addYoutubeLecture } from "../controllers/lectureController.js";
import upload from "../config/multer.js";

import Course from '../models/Course.js';
import { createReading, learningOverview } from '../controllers/learningController.js';
const router = Router();
async function verifyOwner(req, res, next) {
  if (!await Course.exists({_id:req.params.courseId, instructorId:req.user._id})) return res.status(404).json({error:'Course not found'});
  next();
}
router.get('/learning', protect, learningOverview);
router.post('/:courseId/lectures/reading', protect, requireRole('instructor'), createReading);

router.post("/create", protect, requireRole("instructor"), createCourse);
router.get("/", protect, getCourses);
router.get("/:courseId", protect, getCourseById)
router.post("/:courseId/lectures/upload", protect, requireRole("instructor"), verifyOwner, upload.single("file"), uploadLecture)
router.post("/:courseId/lectures/youtube", protect, requireRole("instructor"), addYoutubeLecture)

router.post('/:courseId/publish', protect, requireRole('instructor'), async (req, res) => {
  const course = await Course.findOneAndUpdate(
    { _id: req.params.courseId, instructorId: req.user._id, 'lectures.0': { $exists: true } },
    { $set: { published: true } }, { new: true }
  ).select('_id published');
  if (!course) return res.status(400).json({ error: 'Add a lecture to your course before publishing.' });
  res.json(course);
});
router.post('/:courseId/enroll', protect, requireRole('student'), async (req, res) => {
  const course = await Course.findOneAndUpdate({ _id: req.params.courseId, published: true },
    { $addToSet: { students: req.user._id } }, { new: true }).select('_id');
  if (!course) return res.status(404).json({ error: 'Published course not found' });
  res.json({ enrolled: true });
});

export default router;