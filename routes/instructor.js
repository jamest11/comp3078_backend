const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');
const Class = require('../models/class');

const routes = express.Router()

routes.post('/create-class', async (req, res) => {
  try {
    const quizClass = new Class({ 
      title: req.body.title, 
      description: req.body.description, 
      instructor: mongoose.Types.ObjectId(req.body.instructor) 
    });
    
    await quizClass.save();

    return res.status(201).json(quizClass);
  } catch (err) {
      return res.status(500).send(err);
  }
});

routes.post('/update-class', async (req, res) => {
  try {

    const studentId = mongoose.Types.ObjectId(req.body.student);
    const classId = mongoose.Types.ObjectId(req.body.class)

    await Class.updateOne({ '_id': classId }, { '$addToSet': { 'students': studentId } },  { runValidators: true })

    const quizClass = await Class.findOne(mongoose.Types.ObjectId(req.body.class));

    return res.status(200).json(quizClass);
  } catch (err) {
    console.log(err);
    return res.status(500).send();
  }
});
 
module.exports = routes