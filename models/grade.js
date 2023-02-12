const mongoose = require('mongoose');
const { Schema } = mongoose;

const gradeSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  quiz: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz'
  }
});

module.exports = mongoose.model('Grade', gradeSchema);