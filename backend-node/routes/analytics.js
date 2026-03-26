import { Router } from 'express';
import {
  logEngagement,
  getAnalytics,
  getWeakTopics,
  getRecommendations,
} from '../controllers/analyticsController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/engagement', protect, logEngagement);
router.get('/recommendations/:studentId', protect, getRecommendations);
router.get('/weak-topics/:studentId', protect, getWeakTopics);
router.get('/:studentId', protect, getAnalytics);

export default router;