import QuizResult from '../models/QuizResult.js';
import EngagementLog from '../models/EngagementLog.js';
import Course from '../models/Course.js';
import { accessibleCourses } from '../middlewares/courseAccess.js';
import mongoose from 'mongoose';
import Lecture from '../models/Lecture.js';

const isSelf = (studentId, req) => studentId === req.user._id.toString();

const findAccessibleLecture = async (lectureId, user) => {
  if (!mongoose.isValidObjectId(lectureId)) return null;
  const lecture = await Lecture.findById(lectureId).select('instructorId');
  if (!lecture) return null;
  return user.role === 'instructor' && lecture.instructorId.toString() !== user._id.toString()
    ? null
    : lecture;
};

export const logEngagement = async (req, res) => {
  try {
    const { lectureId, score, timestamp } = req.body;

    if (!lectureId || score === undefined) {
      return res.status(400).json({ error: 'lectureId and score are required' });
    }
    if (!mongoose.isValidObjectId(lectureId) || !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 1) {
      return res.status(400).json({ error: 'Valid lectureId and score from 0 to 1 are required' });
    }
    if (!await findAccessibleLecture(lectureId, req.user)) {
      return res.status(404).json({ error: 'Lecture not found or inaccessible' });
    }

    await EngagementLog.create({
      studentId: req.user._id,
      lectureId,
      score: Number(score),
      timestamp: timestamp || new Date(),
    });

    return res.status(201).json({ message: 'Engagement logged' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

function topicScores(results) {
  const counts = new Map();
  for (const result of results) {
    for (const item of result.outcomes || []) {
      if (!item.topic) continue;
      const count = counts.get(item.topic) || {correct:0, total:0};
      count.total++;
      if (item.correct) count.correct++;
      counts.set(item.topic, count);
    }
  }
  return Array.from(counts, ([topic, count]) => ({
    topic, averageScore: Math.round(100 * count.correct / count.total), assessedItems: count.total
  }));
}

export const getAnalytics = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ error: 'Invalid student ID' });
    if (!isSelf(studentId, req)) {
      return res.status(403).json({ error: 'You can only view your own analytics' });
    }

    // all quiz results for this student
    const results = await QuizResult.find({ studentId })
      .populate('lectureId', 'title topics')
      .sort({ submittedAt: 1 });

    // all engagement logs
    const engagementLogs = await EngagementLog.find({ studentId });

    // overall average quiz score
    const avgScore = results.length
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0;

    // scores over time for line chart
    const scoresOverTime = results.map((r) => ({
      date: r.submittedAt,
      score: r.score,
      lectureTitle: r.lectureId?.title || 'Unknown',
    }));

    // topic performance — aggregate scores per topic
    const topicPerformance = topicScores(results);

    // weak topics — average score below 60
    const weakTopics = topicPerformance
      .filter((t) => t.averageScore < 60)
      .map((t) => ({ topic: t.topic, averageScore: t.averageScore }));

    // average engagement score
    const scoredLogs = engagementLogs.filter((log) => Number.isFinite(log.averageScore ?? log.score));
    const avgEngagement = scoredLogs.length
      ? parseFloat(
          (
            scoredLogs.reduce((sum, e) => sum + (e.averageScore ?? e.score), 0) /
            scoredLogs.length
          ).toFixed(2)
        )
      : 0;

    // engagement per lecture
    const engagementByLecture = {};
    scoredLogs.forEach((log) => {
      const id = log.lectureId.toString();
      if (!engagementByLecture[id]) {
        engagementByLecture[id] = { total: 0, count: 0 };
      }
      engagementByLecture[id].total += log.averageScore ?? log.score;
      engagementByLecture[id].count += 1;
    });

    const engagementPerLecture = Object.entries(engagementByLecture).map(
      ([lectureId, data]) => ({
        lectureId,
        averageEngagement: parseFloat((data.total / data.count).toFixed(2)),
      })
    );

    return res.status(200).json({
      overview: {
        totalLectures: new Set(results.map(result => result.lectureId?._id?.toString()).filter(Boolean)).size,
        averageScore: avgScore,
        averageEngagement: avgEngagement,
        weakTopicsCount: weakTopics.length,
      },
      scoresOverTime,
      topicPerformance,
      weakTopics,
      engagementPerLecture,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getWeakTopics = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ error: 'Invalid student ID' });
    if (!isSelf(studentId, req)) return res.status(403).json({ error: 'You can only view your own analytics' });

    const results = await QuizResult.find({ studentId })
      .populate('lectureId', 'topics');

    const weakTopics = topicScores(results).filter(item => item.averageScore < 60);
    return res.status(200).json({ weakTopics });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ error: 'Invalid student ID' });
    if (!isSelf(studentId, req)) return res.status(403).json({ error: 'You can only view your own recommendations' });

    const allowed = await Course.distinct('lectures', accessibleCourses(req.user));
    const attempts = await QuizResult.find({ studentId, lectureId: { $in: allowed } }).sort({ submittedAt: -1, _id: -1 }).lean();
    const seen = new Set();
    const recommendations = [];
    for (const attempt of attempts) {
      const id = String(attempt.lectureId);
      if (seen.has(id)) continue;
      seen.add(id);
      for (const item of attempt.outcomes || []) {
        if (!item.correct) recommendations.push({ topic: item.topic || item.question, resources: [{lectureId: id, excerpt: item.explanation}] });
      }
    }
    return res.json({ recommendations });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI service unavailable' });
    }
    return res.status(500).json({ error: error.message });
  }
};

export const logBatchEngagement = async (req, res) => {
  try {
    const { lectureId, sessionId, batchId, samples = [] } = req.body;

    if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can submit engagement observations' });
    if (!mongoose.isValidObjectId(lectureId) || !/^[\w-]{8,100}$/.test(sessionId || '') || !/^[\w-]{8,200}$/.test(batchId || '')) {
      return res.status(400).json({ error: 'Valid lectureId, sessionId and batchId are required' });
    }
    if (!Array.isArray(samples) || samples.length === 0 || samples.length > 200) {
      return res.status(400).json({ error: 'samples must contain 1 to 200 observations' });
    }

    const lecture = await Lecture.findById(lectureId).select('_id');
    if (!lecture) return res.status(404).json({ error: 'Lecture not found' });

    // Clamp timeline to 200 entries max (oldest dropped)
    const timeline = [];
    for (const sample of samples) {
      if (!sample || typeof sample !== 'object') return res.status(400).json({error:'Invalid observation'});
      const score = sample.score == null ? null : Number(sample.score);
      const confidence = Number(sample.confidence);
      if (!Number.isFinite(sample.lectureTimestamp) || !Number.isFinite(sample.durationSec) || sample.durationSec < 0 || sample.durationSec > 10 || (score != null && (!Number.isFinite(score) || score < 0 || score > 1)) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) return res.status(400).json({ error: 'Invalid observation in batch' });
      const mode = sample.mode === 'camera' ? 'camera' : 'behavioral';
      timeline.push({ lectureSecond: Math.max(0, Math.floor(sample.lectureTimestamp)), score, confidence, presence: mode === 'camera' && sample.facePresence != null ? sample.facePresence === 1 : null, tabVisible: Boolean(sample.tabVisible), trackingMode: mode, playbackActive: Boolean(sample.playbackActive), watchedDurationSec: Math.min(5, Number(sample.watchedDurationSec) || 0) });
    }
    const scored = timeline.filter((entry) => Number.isFinite(entry.score));
    const avgScore = scored.length ? scored.reduce((sum, entry) => sum + entry.score, 0) / scored.length : undefined;
    const duplicate = await EngagementLog.findOne({ studentId: req.user._id, sessionId, batchId }).select('_id');
    if (duplicate) return res.status(200).json({ message: 'Batch already received', duplicate: true });

    await EngagementLog.create({
      studentId: req.user._id,
      lectureId,
      sessionId,
      batchId,
      averageScore: avgScore,
      presenceRatio: timeline.some((entry) => entry.presence != null) ? timeline.filter((entry) => entry.presence === true).length / timeline.filter((entry) => entry.presence != null).length : undefined,
      tabFocusRatio: timeline.length ? timeline.filter((entry) => entry.tabVisible).length / timeline.length : undefined,
      averageConfidence: timeline.reduce((sum, entry) => sum + entry.confidence, 0) / timeline.length,
      observationCoverage: timeline.filter((entry) => entry.score != null).length / timeline.length,
      sessionDurationSec: samples.reduce((sum, sample) => sum + sample.durationSec, 0),
      watchedDurationSec: samples.reduce((sum, sample) => sum + (Number(sample.watchedDurationSec) || 0), 0),
      trackingMode: timeline.some((entry) => entry.trackingMode === 'camera') ? 'camera' : 'behavioral',
      timeline,
    });

    return res.status(201).json({ message: 'Engagement batch logged', avgScore });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getEngagementHeatmap = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await findAccessibleLecture(lectureId, req.user);
    if (!lecture) return res.status(404).json({ error: 'Lecture not found or inaccessible' });
    const filter = { lectureId };
    if (req.user.role === 'student') filter.studentId = req.user._id;

    const logs = await EngagementLog.find(filter, 'timeline averageScore studentId').lean();

    if (!logs.length) {
      return res.status(200).json({ heatmap: [], overallAverage: null });
    }

    // Merge all timelines into 10-second buckets
    const buckets = {};
    for (const log of logs) {
      for (const entry of (log.timeline || [])) {
        if (!Number.isFinite(entry.score)) continue;
        const bucket = Math.floor(entry.lectureSecond / 10) * 10;
        if (!buckets[bucket]) buckets[bucket] = { total: 0, count: 0 };
        buckets[bucket].total += entry.score;
        buckets[bucket].count += 1;
      }
    }

    const heatmap = Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([second, data]) => ({
        second: Number(second),
        avgScore: parseFloat((data.total / data.count).toFixed(3)),
        sampleCount: data.count,
      }));

    const scoredLogs = logs.filter((log) => Number.isFinite(log.averageScore ?? log.score));
    const overallAverage = scoredLogs.length
      ? scoredLogs.reduce((sum, log) => sum + (log.averageScore ?? log.score), 0) / scoredLogs.length
      : null;

    return res.status(200).json({ heatmap, overallAverage: overallAverage == null ? null : parseFloat(overallAverage.toFixed(3)) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getEngagementSessions = async (req, res) => {
  try {
    const studentId = req.user._id;
    const sessions = await EngagementLog.aggregate([
      { $match: { studentId } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: { $ifNull: ['$sessionId', { $toString: '$_id' }] }, lectureId: { $first: '$lectureId' },
        trackingMode: { $first: { $ifNull: ['$trackingMode', 'legacy'] } },
        averageScore: { $avg: '$averageScore' }, observationCoverage: { $avg: '$observationCoverage' },
        averageConfidence: { $avg: '$averageConfidence' }, presenceRatio: { $avg: '$presenceRatio' },
        tabFocusRatio: { $avg: '$tabFocusRatio' }, sessionDurationSec: { $sum: '$sessionDurationSec' },
        watchedDurationSec: { $sum: '$watchedDurationSec' }, createdAt: { $first: '$createdAt' },
      } },
      { $sort: { createdAt: -1 } }, { $limit: 30 },
      { $lookup: { from: 'lectures', localField: 'lectureId', foreignField: '_id', as: 'lecture' } },
      { $unwind: { path: '$lecture', preserveNullAndEmptyArrays: true } },
      { $project: { sessionId: '$_id', lectureId: { _id: '$lecture._id', title: '$lecture.title' }, trackingMode: 1,
        averageScore: 1, observationCoverage: 1, averageConfidence: 1, presenceRatio: 1, tabFocusRatio: 1,
        sessionDurationSec: 1, watchedDurationSec: 1, createdAt: 1 } },
    ]);
    return res.status(200).json({ sessions });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load engagement sessions' });
  }
};
