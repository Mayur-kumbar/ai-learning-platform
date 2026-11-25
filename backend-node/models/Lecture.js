import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fileUrl: { type: String },
  fileType: {
    type: String,
    enum: ['video', 'pdf', 'slides', 'youtube', 'reading'],
  },
  youtubeUrl: { type: String },
  youtubeVideoId: { type: String },
  transcript: { type: String, default: '' },
  summary: { type: String, default: '' },
  topics: { type: [String], default: [] },
  transcriptStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'unavailable'],
    default: 'pending',
  },
  indexStatus: { type: String, enum: ["completed","failed"] },
  transcriptError: { type: String, default: '' },
  quizStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'unavailable'],
    default: 'pending',
  },
  quizError: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'done', 'partial', 'failed'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

const Lecture = mongoose.models.Lecture || mongoose.model('Lecture', lectureSchema);
export default Lecture;
