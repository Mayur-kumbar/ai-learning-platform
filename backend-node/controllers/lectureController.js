import axios from 'axios';
import { accessibleCourses } from '../middlewares/courseAccess.js';
import jwt from 'jsonwebtoken';
import PlaybackPosition from '../models/PlaybackPosition.js';
import path from 'path';
import { fileURLToPath } from 'url';
import Lecture from '../models/Lecture.js';
import Quiz from '../models/Quiz.js';
import Course from '../models/Course.js';
import { parseYoutubeUrl } from '../utils/youtubeUrlParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) return 'video';
  if (ext === '.pdf') return 'pdf';
  if (ext === '.pptx') return 'slides';
  return 'pdf';
};

export const uploadLecture = async (req, res) => {
  // console.log("Received lecture upload request", req.file ? `with file ${req.file.filename}` : "but no file");
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // console.log("in the upload controller")

    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Lecture title is required' });
    }

    const fileType = getFileType(req.file.filename);
    const fileUrl = `/uploads/${req.file.filename}`;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.instructorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const lecture = await Lecture.create({
      title: title.trim(),
      instructorId: req.user._id,
      fileUrl,
      fileType,
      status: 'processing',
      transcriptStatus: 'processing',
      quizStatus: 'pending',
    });

    await Course.updateOne({ _id: course._id }, { $addToSet: { lectures: lecture._id } });

    // fire and forget — do not await
    const filePath = path.resolve(req.file.path);
    const callbackToken = jwt.sign({ lecture: String(lecture._id) }, process.env.JWT_SECRET, { audience: 'processing-callback', expiresIn: '24h' });
    axios.post(`${process.env.PYTHON_SERVICE_URL}/process-lecture`, {
      callbackToken,
      lectureId: lecture._id.toString(),
      filePath,
      fileType,
    }, { timeout: 10000 }).catch(async () => {
      await Lecture.updateOne({ _id: lecture._id, status: 'processing' }, { status: 'failed', transcriptStatus: 'failed', quizStatus: 'failed', transcriptError: 'Processing service unavailable.' }).catch(() => console.error('Could not save dispatch failure'));
    });

    return res.status(201).json({
      message: 'Lecture uploaded, processing started',
      lectureId: lecture._id,
      status: 'processing',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getLectures = async (req, res) => {
  try {
    const allowed = await Course.distinct('lectures', accessibleCourses(req.user));
    const lectures = await Lecture.find({ _id: { $in: allowed } })
      .populate('instructorId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ lectures });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getLectureById = async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('instructorId', 'name email');

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const data = lecture.toObject();
    const position = await PlaybackPosition.findOne({studentId:req.user._id, lectureId:lecture._id}).lean();
    data.resumeSeconds = position?.seconds || 0;
    if (data.fileUrl?.startsWith('/uploads/')) {
      const ticket = jwt.sign({ sub: String(req.user._id), lecture: String(lecture._id) }, process.env.JWT_SECRET, { audience: 'lecture-media', expiresIn: '2h' });
      data.fileUrl = '/api/lectures/' + lecture._id + '/media?ticket=' + encodeURIComponent(ticket);
    }
    return res.status(200).json({ lecture: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const lectureCallback = async (req, res) => {
  try {
    const {
      transcript,
      summary,
      topics,
      quizQuestions,
      status,
      transcriptStatus,
      transcriptError,
      quizStatus,
      quizError,
    } = req.body;

    const update = {};
    if (status) update.status = status;
    if (req.body.indexStatus) update.indexStatus = req.body.indexStatus;
    if (typeof transcript === 'string') {
      update.transcript = transcript;
      update.transcriptStatus = transcriptStatus || 'completed';
      update.transcriptError = '';
    }
    if (typeof summary === 'string') update.summary = summary;
    if (Array.isArray(topics)) update.topics = topics;
    if (transcriptStatus) update.transcriptStatus = transcriptStatus;
    if (typeof transcriptError === 'string') update.transcriptError = transcriptError;
    if (quizStatus) update.quizStatus = quizStatus;
    if (typeof quizError === 'string') update.quizError = quizError;

    if (!await Lecture.exists({_id:req.params.id})) return res.status(404).json({ error: 'Lecture not found' });
    if (Array.isArray(quizQuestions) && quizQuestions.length > 0) {
      await Quiz.findOneAndUpdate({ lectureId: req.params.id }, { $set: { questions: quizQuestions } },
        { upsert: true, runValidators: true, setDefaultsOnInsert: true });
      update.quizStatus = 'completed';
      update.quizError = '';
    } else if (quizStatus === 'completed') {
      update.quizStatus = 'failed';
      update.status = 'partial';
      update.quizError = 'Quiz generation returned no questions.';
    }
    const lecture = await Lecture.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });

    return res.status(200).json({
      message: 'Lecture processing callback received',
      lecture,
    });
  } catch (error) {
    console.error('[lectureCallback]', error);
    return res.status(500).json({ error: 'Unable to process lecture callback' });
  }
};

export const addYoutubeLecture = async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    const { title, youtubeUrl } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Lecture title is required' });
    }

    // Validate and extract YouTube video ID
    const parsed = parseYoutubeUrl(youtubeUrl);
    if (!parsed.valid) {
      return res.status(400).json({ error: parsed.error });
    }

    // Verify course exists and instructor owns it
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.instructorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You do not own this course' });
    }

    const lecture = await Lecture.create({
      title: title.trim(),
      instructorId: req.user._id,
      fileType: 'youtube',
      youtubeUrl: youtubeUrl.trim(),
      youtubeVideoId: parsed.videoId,
      status: 'processing',
      transcriptStatus: 'processing',
      quizStatus: 'pending',
    });

    await Course.updateOne({ _id: course._id }, { $addToSet: { lectures: lecture._id } });

    // Fire and forget — trigger Python AI service
    const callbackToken = jwt.sign({ lecture: String(lecture._id) }, process.env.JWT_SECRET, { audience: 'processing-callback', expiresIn: '24h' });
    axios.post(`${process.env.PYTHON_SERVICE_URL}/process-lecture`, {
      callbackToken,
      lectureId: lecture._id.toString(),
      filePath: '',
      fileType: 'youtube',
      youtubeVideoId: parsed.videoId,
    }, { timeout: 10000 }).catch(async () => {
      await Lecture.updateOne({ _id: lecture._id, status: 'processing' }, { status: 'failed', transcriptStatus: 'failed', quizStatus: 'failed', transcriptError: 'Processing service unavailable.' }).catch(() => console.error('Could not save dispatch failure'));
    });

    return res.status(201).json({
      message: 'YouTube lecture added, processing started',
      lectureId: lecture._id,
      status: 'processing',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add YouTube lecture' });
  }
};