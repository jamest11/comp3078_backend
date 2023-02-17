const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduledQuizSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  quiz: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  class: {
    type: Schema.Types.ObjectId,
    ref: 'Class'
  }
});

module.exports = mongoose.model('ScheduledQuiz', scheduledQuizSchema);