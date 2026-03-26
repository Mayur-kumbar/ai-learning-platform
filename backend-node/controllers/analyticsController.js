import QuizResult from '../models/QuizResult.js';
import EngagementLog from '../models/EngagementLog.js';
import axios from 'axios';

export const logEngagement = async (req, res) => {
  try {
    const { lectureId, score, timestamp } = req.body;

    if (!lectureId || score === undefined) {
      return res.status(400).json({ error: 'lectureId and score are required' });
    }

    await EngagementLog.create({
      studentId: req.user._id,
      lectureId,
      score,
      timestamp: timestamp || new Date(),
    });

    return res.status(201).json({ message: 'Engagement logged' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const studentId = req.params.studentId;

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
    const topicMap = {};
    results.forEach((result) => {
      const topics = result.lectureId?.topics || [];
      topics.forEach((topic) => {
        if (!topicMap[topic]) {
          topicMap[topic] = { total: 0, count: 0 };
        }
        topicMap[topic].total += result.score;
        topicMap[topic].count += 1;
      });
    });

    const topicPerformance = Object.entries(topicMap).map(([topic, data]) => ({
      topic,
      averageScore: Math.round(data.total / data.count),
    }));

    // weak topics — average score below 60
    const weakTopics = topicPerformance
      .filter((t) => t.averageScore < 60)
      .map((t) => ({ topic: t.topic, averageScore: t.averageScore }));

    // average engagement score
    const avgEngagement = engagementLogs.length
      ? parseFloat(
          (
            engagementLogs.reduce((sum, e) => sum + e.score, 0) /
            engagementLogs.length
          ).toFixed(2)
        )
      : 0;

    // engagement per lecture
    const engagementByLecture = {};
    engagementLogs.forEach((log) => {
      const id = log.lectureId.toString();
      if (!engagementByLecture[id]) {
        engagementByLecture[id] = { total: 0, count: 0 };
      }
      engagementByLecture[id].total += log.score;
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
        totalLectures: results.length,
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

    const results = await QuizResult.find({ studentId })
      .populate('lectureId', 'topics');

    const topicMap = {};
    results.forEach((result) => {
      const topics = result.lectureId?.topics || [];
      topics.forEach((topic) => {
        if (!topicMap[topic]) {
          topicMap[topic] = { total: 0, count: 0 };
        }
        topicMap[topic].total += result.score;
        topicMap[topic].count += 1;
      });
    });

    const weakTopics = Object.entries(topicMap)
      .map(([topic, data]) => ({
        topic,
        averageScore: Math.round(data.total / data.count),
      }))
      .filter((t) => t.averageScore < 60);

    return res.status(200).json({ weakTopics });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // get weak topics first
    const results = await QuizResult.find({ studentId })
      .populate('lectureId', 'topics');

    const topicMap = {};
    results.forEach((result) => {
      const topics = result.lectureId?.topics || [];
      topics.forEach((topic) => {
        if (!topicMap[topic]) topicMap[topic] = { total: 0, count: 0 };
        topicMap[topic].total += result.score;
        topicMap[topic].count += 1;
      });
    });

    const weakTopics = Object.entries(topicMap)
      .map(([topic, data]) => ({
        topic,
        averageScore: Math.round(data.total / data.count),
      }))
      .filter((t) => t.averageScore < 60)
      .map((t) => t.topic);

    if (weakTopics.length === 0) {
      return res.status(200).json({
        recommendations: [],
        message: 'No weak topics found — great performance!',
      });
    }

    // call Python recommendations service
    const pythonUrl = process.env.PYTHON_SERVICE_URL;
    const response = await axios.get(`${pythonUrl}/recommendations`, {
      params: {
        studentId,
        topics: weakTopics.join(','),
      },
      timeout: 15000,
    });

    return res.status(200).json(response.data);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'AI service unavailable' });
    }
    return res.status(500).json({ error: error.message });
  }
};