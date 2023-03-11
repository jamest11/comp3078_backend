const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");
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
      r1: {
        type: String,
        required: true
      },
      r2: {
        type: String,
        required: true
      },
      r3: {
        type: String,
        required: true
      },
      r4: {
        type: String,
        required: true
      },
      a: {
        type: String,
        required: true,
        enum: {
          values: ['r1', 'r2', 'r3', 'r4']
        }
      }
    }
  ]
});

quizSchema.plugin(mongoosePaginate);
quizSchema.plugin(aggregatePaginate);

quizSchema.post('findOneAndDelete', function(doc) {
  if(doc !== null) {
    ScheduledQuiz.deleteMany({ quiz: doc._id }).exec()
  }
});


module.exports = mongoose.model('Quiz', quizSchema);