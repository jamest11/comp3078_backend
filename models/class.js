const mongoose = require('mongoose');
const User = require('../models/user');
const { Schema } = mongoose;


const classSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
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
        console.log('STUDENT VALIDATOR');
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

module.exports = mongoose.model('Class', classSchema);