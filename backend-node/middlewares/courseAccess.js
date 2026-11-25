import mongoose from 'mongoose';
import Course from '../models/Course.js';

export function accessibleCourses(user) {
  return user.role === 'instructor' ? { instructorId: user._id } : { published: true, students: user._id };
}

export async function requireLectureAccess(req, res, next) {
  const id = req.params.lectureId || req.params.id || req.body?.lectureId;
  if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ error: 'Invalid lecture ID' });
  if (!await Course.exists({ lectures: id, ...accessibleCourses(req.user) })) {
    return res.status(404).json({ error: 'Lecture unavailable for this account' });
  }
  next();
}
