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
  fileUrl: {
    type: String,
  },
  fileType: {
    type: String,
    enum: ['video', 'pdf', 'slides'],
  },
  transcript: {
    type: String,
    default: '',
  },
  summary: {
    type: String,
    default: '',
  },
  topics: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'done', 'failed'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Lecture = mongoose.model('Lecture', lectureSchema);

export default Lecture;