import { Router } from 'express';
import {
  uploadLecture,
  getLectures,
  getLectureById,
  lectureCallback,
} from '../controllers/lectureController.js';
import upload from '../config/multer.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/upload', protect, requireRole('instructor'), upload.single('file'), uploadLecture);
router.get('/', protect, getLectures);
router.get('/:id', protect, getLectureById);

// internal callback from Python — no auth
router.put('/:id/callback', lectureCallback);

export default router;