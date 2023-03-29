const mongoose = require('mongoose');
const User = require('../models/user');
const ScheduledQuiz = require('../models/scheduled-quiz');
const { Schema } = mongoose;


const classSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  students: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async (v) => {
        const user = await User.findById(v);
        
        if(!user || user.userType !== 'student'){
          return false;
        }
        return true;
      },
      message: 'Invalid user type'
    }
  }]
});

classSchema.post('findOneAndDelete', function(doc) {
  if(doc !== null) {
    ScheduledQuiz.deleteMany({ class: doc._id }).exec()
  }
});

module.exports = mongoose.model('Class', classSchema);