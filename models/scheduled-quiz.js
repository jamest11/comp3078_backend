const mongoose = require('mongoose');
const dayjs = require('dayjs');
const { Schema } = mongoose;

const scheduledQuizSchema = new mongoose.Schema({
  dueDate: {
    type: Date,
    required: true
  },
  quiz: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  complete: {
    type: Boolean,
    default: false
  },
  grades: [
    {
      student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      grade: {
        type: Number,
        required: true
      },
      date: {
        type: Date,
        default: dayjs().toDate()
      }
    }
  ]
});

module.exports = mongoose.model('ScheduledQuiz', scheduledQuizSchema);