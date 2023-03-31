const mongoose = require('mongoose');
const { Schema } = mongoose;

const User = require('../models/user');
const ScheduledQuiz = require('../models/scheduled-quiz');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async (v) => {
        const user = await User.findById(v);

        if(!user || user.userType !== 'instructor'){
          return false;
        }
        return true;
      },
      message: 'Invalid user type'
    }
  },
  timeLimit: {
    type: Number,
    required: true
  },
  questions: [
    {
      q: {
        type: String,
        required: true
      },
      r: [String],
      a: {
        type: Number,
        required: true,
      }
    }
  ]
});

quizSchema.post('findOneAndDelete', function(doc) {
  if(doc !== null) {
    ScheduledQuiz.deleteMany({ quiz: doc._id }).exec()
  }
});


module.exports = mongoose.model('Quiz', quizSchema);