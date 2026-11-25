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

import jwt from 'jsonwebtoken';
import path from 'node:path';
import Lecture from '../models/Lecture.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { requireLectureAccess, accessibleCourses } from '../middlewares/courseAccess.js';
import PlaybackPosition from '../models/PlaybackPosition.js';
const router = Router();
router.put('/:id/position', protect, requireRole('student'), requireLectureAccess, async (req, res) => {
  const seconds = req.body.seconds;
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 604800) return res.status(400).json({error:'Invalid playback position'});
  await PlaybackPosition.updateOne({ studentId:req.user._id, lectureId:req.params.id }, { $set:{seconds} }, { upsert:true });
  res.sendStatus(204);
});

router.post('/upload', protect, requireRole('instructor'), (req,res) => res.status(400).json({error:'Upload through a course.'}));
router.get('/', protect, getLectures);
router.get('/:id', protect, requireLectureAccess, getLectureById);

router.get('/:id/media', async (req, res) => {
  let ticket;
  try { ticket = jwt.verify(req.query.ticket, process.env.JWT_SECRET, { audience: 'lecture-media' }); }
  catch { return res.sendStatus(401); }
  if (ticket.lecture !== req.params.id) return res.sendStatus(403);
  const user = await User.findById(ticket.sub);
  if (!user || !await Course.exists({ lectures: req.params.id, ...accessibleCourses(user) })) return res.sendStatus(403);
  const lecture = await Lecture.findById(req.params.id).select('fileUrl');
  if (!lecture?.fileUrl?.startsWith('/uploads/')) return res.sendStatus(404);
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(path.basename(lecture.fileUrl), {root: path.resolve(process.env.UPLOAD_DIR || './uploads'), cacheControl: false});
});
router.put('/:id/callback', (req, res, next) => {
  try {
    const claims = jwt.verify(req.headers.authorization?.split(' ')[1], process.env.JWT_SECRET, { audience: 'processing-callback' });
    if (claims.lecture !== req.params.id) return res.sendStatus(403);
    next();
  } catch { res.sendStatus(401); }
}, lectureCallback);

export default router;