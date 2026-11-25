import Course from '../models/Course.js';
import Lecture from '../models/Lecture.js';
import Quiz from '../models/Quiz.js';
import QuizResult from '../models/QuizResult.js';
import { accessibleCourses } from '../middlewares/courseAccess.js';

export const PASS_SCORE = 70;

export async function createReading(req, res) {
  const { title, text, topic, question, options, correctIndex, explanation } = req.body;
  const fields = [title, text, topic, question, explanation];
  if (fields.some(value => typeof value !== 'string' || !value.trim()) ||
      !Array.isArray(options) || options.length !== 4 || options.some(value => typeof value !== 'string' || !value.trim()) ||
      new Set(options.map(value => value.trim().toLowerCase())).size !== 4 ||
      !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return res.status(400).json({ error: 'Supply the reading, topic, question, four distinct options, correct answer and explanation.' });
  }
  const course = await Course.findOne({ _id: req.params.courseId, instructorId: req.user._id });
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const lecture = new Lecture({ title, instructorId: req.user._id, fileType: 'reading', transcript: text.trim(),
    topics: [topic.trim()], status: 'done', transcriptStatus: 'completed', quizStatus: 'completed' });
  const quiz = new Quiz({ lectureId: lecture._id, questions: [{ topic, question, options, correctIndex, explanation }] });
  await Promise.all([lecture.validate(), quiz.validate()]);
  try {
    await lecture.save();
    await quiz.save();
    const linked = await Course.updateOne({ _id: course._id, instructorId: req.user._id }, { $addToSet: { lectures: lecture._id } });
    if (!linked.matchedCount) throw new Error('Course changed before reading could be added');
  } catch (error) {
    await Promise.all([Lecture.deleteOne({_id: lecture._id}), Quiz.deleteOne({_id: quiz._id})]);
    throw error;
  }
  res.status(201).json({ lectureId: lecture._id });
}

export async function learningOverview(req, res) {
  const courses = await Course.find(accessibleCourses(req.user)).select('title lectures students published')
    .populate('lectures', 'title').lean();
  const lectureIds = courses.flatMap(course => course.lectures.map(lecture => lecture._id));
  const owner = req.user.role === 'instructor';
  const filter = { lectureId: { $in: lectureIds } };
  if (!owner) filter.studentId = req.user._id;
  const attempts = await QuizResult.find(filter).sort({submittedAt: -1, _id: -1}).lean();
  const latest = new Map();
  const passed = new Set();
  for (const attempt of attempts) {
    const key = attempt.studentId + '/' + attempt.lectureId;
    if (!latest.has(key)) latest.set(key, attempt);
    if (attempt.score >= PASS_SCORE) passed.add(key);
  }
  const result = courses.map(course => {
    const members = new Set(course.students.map(String));
    const lectures = course.lectures.map(lecture => {
      const last = latest.get(req.user._id + '/' + lecture._id);
      return { id: lecture._id, title: lecture.title, completed: passed.has(req.user._id + '/' + lecture._id),
        latestScore: last?.score ?? null,
        revision: (last?.outcomes || []).filter(item => !item.correct).map(({topic, question, explanation}) => ({topic, question, explanation})) };
    });
    const ids = new Set(lectures.map(lecture => String(lecture.id)));
    const records = attempts.filter(a => ids.has(String(a.lectureId)) && members.has(String(a.studentId)));
    const recent = records.filter(a => latest.get(a.studentId + '/' + a.lectureId) === a);
    return { id: course._id, title: course.title, published: Boolean(course.published), lectures,
      completed: lectures.filter(l => l.completed).length,
      ...(owner && { enrollmentCount: members.size, attemptCount: records.length,
        assessedLearners: new Set(records.map(a => String(a.studentId))).size,
        averageScore: recent.length ? Math.round(recent.reduce((sum,a) => sum + a.score, 0) / recent.length) : null }) };
  });
  res.json({ passScore: PASS_SCORE, courses: result });
}
