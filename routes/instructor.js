const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');
const Class = require('../models/class');
const Quiz = require('../models/quiz');
const ScheduledQuiz = require('../models/scheduled-quiz');

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

    const quizClass = await Class.findOne(classId);

    return res.status(200).json(quizClass);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.post('/create-quiz', async(req, res) => {
  try {
    const quiz = new Quiz(req.body);

    await quiz.save();

    return res.status(200).send();
  } catch(err) {
    console.log(err)
    return res.status(500).json(err);
  }
});

routes.post('/schedule-quiz', async (req, res) => {
  try {
    const scheduledQuiz = new ScheduledQuiz(req.body);

    await scheduledQuiz.save().then((sq) => {
      //sq.populate('class')
    });

    return res.status(200).json(scheduledQuiz);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/scheduled-quizzes', async (req, res) => {
  try {
    const scheduledQuizzes = await ScheduledQuiz
      .find()
      .populate('class', ['title', 'description'])
      .populate('quiz', 'title');

    return res.status(200).json(scheduledQuizzes);
  }  catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quizzes', async (req, res) => {
  try {
    const quizzes = await Quiz.find();

    return res.status(200).json(quizzes);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

module.exports = routes