import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  studentId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
  lectureId: {type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true},
  seconds: {type: Number, min: 0, required: true},
}, {timestamps: true});
schema.index({studentId: 1, lectureId: 1}, {unique: true});
export default mongoose.model('PlaybackPosition', schema);
