import { Router } from 'express';
import { getQuiz, submitQuiz } from '../controllers/quizController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/:lectureId', protect, getQuiz);
router.post('/submit', protect, submitQuiz);

export default router;