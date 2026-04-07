import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import Lecture from '../models/Lecture.js';
import Quiz from '../models/Quiz.js';
import Course from '../models/Course.js';

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

    const lecture = await Lecture.create({
      title,
      instructorId: req.user._id,
      fileUrl,
      fileType,
      status: 'processing',
    });

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    course.lectures.push(lecture._id);
    await course.save();

    // fire and forget — do not await
    const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
    axios.post(`${process.env.PYTHON_SERVICE_URL}/process-lecture`, {
      lectureId: lecture._id.toString(),
      filePath,
      fileType,
    }).catch((err) => {
      console.error('Python service error:', err.message);
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
    const lectures = await Lecture.find()
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

    return res.status(200).json({ lecture });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const lectureCallback = async (req, res) => {
  console.log("Received lecture callback", {
    lectureId: req.params.id,
    body: req.body,
  });
  try {
    const { transcript, summary, topics, quizQuestions, status } = req.body;

    const updateData = { status: status || 'done' };
    if (transcript) updateData.transcript = transcript;
    if (summary)    updateData.summary = summary;
    if (topics)     updateData.topics = topics;

    const lecture = await Lecture.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!lecture) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // create quiz if questions came back
    if (quizQuestions && quizQuestions.length > 0) {
      await Quiz.findOneAndUpdate(
        { lectureId: lecture._id },
        { lectureId: lecture._id, questions: quizQuestions },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({ message: 'Lecture updated', lecture });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};