import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true, min: 0, max: 3 },
});

const quizSchema = new mongoose.Schema({
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true,
  },
  questions: {
    type: [questionSchema],
    default: [],
  },
});

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;