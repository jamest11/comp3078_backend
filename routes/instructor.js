const express = require('express');
const mongoose = require('mongoose');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Class = require('../models/class');
const Quiz = require('../models/quiz');
const ScheduledQuiz = require('../models/scheduled-quiz');

const routes = express.Router()

//routes.use(expressJwt.expressjwt({ secret: process.env.TOKEN_KEY, algorithms: ['HS256'] }));

const decodeToken = (headers) => {
  const token = headers.authorization.split(' ')[1];
  return jwt.verify(token, process.env.TOKEN_KEY);
};

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
    const instructor = decodeToken(req.headers);

    const quiz = new Quiz({ ...req.body, instructor: mongoose.Types.ObjectId(instructor.id) });

    await quiz.save();

    return res.status(200).send();
  } catch(err) {
    console.log(err)
    return res.status(500).json(err);
  }
});

routes.post('/schedule-quiz', async (req, res) => {
  try {
    const instructor = decodeToken(req.headers);

    const scheduledQuiz = new ScheduledQuiz({ ...req.body, instructor: mongoose.Types.ObjectId(instructor.id) });

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
    const instructor = decodeToken(req.headers);

    const scheduledQuizzes = await ScheduledQuiz
      .find()
      .populate('class', ['title', 'description'], { instructor: { $eq: instructor.id }})
      .populate('quiz', 'title')
      .then((sqs) => sqs.filter((sq) => sq.class !== null));

    return res.status(200).json(scheduledQuizzes);
  }  catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quizzes', async (req, res) => {
  try {
    const instructor = decodeToken(req.headers);

    const quizzes = await Quiz.find({ instructor: instructor.id });

    return res.status(200).json(quizzes);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

module.exports = routes;