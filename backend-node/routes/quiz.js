import { Router } from 'express';
import { getQuiz, submitQuiz, checkAnswer } from '../controllers/quizController.js';
import { protect } from '../middlewares/authMiddleware.js';

import { requireRole } from '../middlewares/roleMiddleware.js';
import { requireLectureAccess } from '../middlewares/courseAccess.js';
const router = Router();

router.get('/:lectureId', protect, requireLectureAccess, getQuiz);
router.post('/check-answer', protect, requireLectureAccess, checkAnswer);
router.post('/submit', protect, requireRole('student'), requireLectureAccess, submitQuiz);

export default router;