import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: {
    type: [{ type: String, required: true, trim: true }],
    required: true,
    validate: {
      validator: (options) =>
        Array.isArray(options) &&
        options.length === 4 &&
        options.every((option) => typeof option === 'string' && option.trim().length > 0),
      message: 'Each question must have exactly four non-empty options.',
    },
  },
  correctIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
    validate: Number.isInteger,
  },
  topic: { type: String, default: '', trim: true },
  timestamp: { type: Number, default: null, min: 0 },
  explanation: { type: String, default: '' },
});

const quizSchema = new mongoose.Schema(
  {
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lecture',
      required: true,
      index: true,
    },
    questions: {
      type: [questionSchema],
      default: [],
      validate: {
        validator: (questions) => Array.isArray(questions) && questions.length > 0,
        message: 'A quiz must contain at least one question.',
      },
    },
  },
  { timestamps: true }
);

const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', quizSchema);
export default Quiz;
