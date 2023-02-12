const mongoose = require('mongoose');
const { Schema } = mongoose;

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
});

module.exports = mongoose.model('Quiz', quizSchema);