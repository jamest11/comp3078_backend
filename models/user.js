const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        validate: {
          validator: (v) => /(?!.*[-_.]{2}.*)^[a-zA-Z\d][a-zA-Z\d._-]+[a-zA-Z\d]@([a-zA-Z\d][a-zA-Z\d-]*[a-zA-Z\d]\.){1,}[a-z]{2,}$/.test(v),
          message: 'Invalid email address'
        }
    },
    password: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    birthDate: {
      type: Date,
      required: true
    },
    userType: {
      type: String,
      enum: {
        values: ['instructor', 'student'],
      }
    }
},{ 
  timestamps: {
    createdAt: true,
    updatedAt: false
  }
});

module.exports = mongoose.model('User', userSchema);