const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduledQuizSchema = new mongoose.Schema({
  date: {
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
      }
    }
  ]
});

module.exports = mongoose.model('ScheduledQuiz', scheduledQuizSchema);