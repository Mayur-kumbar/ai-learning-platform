import { Router } from 'express';
import {
  logEngagement,
  logBatchEngagement,
  getAnalytics,
  getWeakTopics,
  getRecommendations,
  getEngagementHeatmap,
  getEngagementSessions,
} from '../controllers/analyticsController.js';
import { protect } from '../middlewares/authMiddleware.js';

import { requireLectureAccess } from '../middlewares/courseAccess.js';
const router = Router();

router.post('/engagement', protect, requireLectureAccess, logEngagement);
router.post('/engagement/batch', protect, requireLectureAccess, logBatchEngagement);
router.get('/engagement/heatmap/:lectureId', protect, requireLectureAccess, getEngagementHeatmap);
router.get('/engagement/sessions', protect, getEngagementSessions);
router.get('/recommendations/:studentId', protect, getRecommendations);
router.get('/weak-topics/:studentId', protect, getWeakTopics);
router.get('/:studentId', protect, getAnalytics);

export default router;
