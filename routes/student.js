const express = require('express');
const mongoose = require('mongoose');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const ObjectId = require('mongoose').Types.ObjectId;

const User = require('../models/user');
const Class = require('../models/class');
const ScheduledQuiz = require('../models/scheduled-quiz');
const Quiz = require('../models/quiz');
const routes = express.Router()

routes.use(expressJwt.expressjwt({ secret: process.env.TOKEN_KEY, algorithms: ['HS256'] },),
  (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
      res.status(401).send('invalid token');
    } else {
      next(err);
    }
});

routes.use((req, res, next) => {
  if(req.auth.userType !== 'student') {
    res.status(403).send();
  } else {
    next();
  }
});

routes.get('/quiz-grades', async (req, res) => {
  try {
    const student = req.auth;
    const studentId = ObjectId(student.id);

    const grades = await ScheduledQuiz.aggregate([    
      { $match: { 'grades.student': studentId }},
      { $project: { 
        quiz: 1, 
        class: 1, 
        grades: {
          $filter: {
            input: '$grades',
            as: 'grade',
            cond: {
              $eq: ['$$grade.student', studentId] }
      }}}}, { $lookup: {
        from: 'quizzes',
        localField: 'quiz',
        foreignField: '_id',
        as: 'quiz',
      }}, { $lookup: {
        from: 'classes',
        localField: 'class',
        foreignField: '_id',
        as: 'class'
      }}, 
      { $unwind: '$quiz'}, 
      { $unwind: '$class'},
      { $unwind: '$grades' }, 
      { $project: {
        grade: '$grades.grade',
        classTitle: '$class.title',
        quizTitle: '$quiz.title',
        date: '$grades.date'
    }}])
    .sort('-date');

    return res.status(200).json(grades);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/class-grades', async (req, res) => {
  try {
    const student = req.auth;
    const studentId = ObjectId(student.id);

    const grades = await ScheduledQuiz.aggregate([
      { $match: { 'grades.student': studentId }},
      { $project: {
        quiz: 1,
        class: 1,
        date: 1,
        grades: {
          $filter: {
            input: '$grades',
            as: 'grade',
            cond: { $eq: ['$$grade.student', studentId] }
      }}}}, { $unwind: '$grades' },
      { $project: { quiz: 1, class: 1, date: '$grades.date', grade: '$grades.grade'}},
      { $group: {
          _id: '$class',
          average: { $avg: '$grade' },
          scores: {
            $push: {
              'grade': '$grade',
              'date': '$date'
      }}}}, { $lookup: {
        from: 'classes',
        localField: '_id',
        foreignField: '_id',
        as: 'class'
      }},
      { $unwind: '$class' },
      { $project: { classTitle: '$class.title', average: 1, scores: 1, _id: 0 }}
    ])
    .sort('title');

    res.status(200).json(grades);
  } catch(err) {

  }
})

routes.get('/quizzes', async (req, res) => {
  try {
    const student = req.auth;
    const studentId = ObjectId(student.id);

    const quizzes = await ScheduledQuiz.aggregate([
      { $lookup: {
        from: 'classes',
        localField: 'class',
        foreignField: '_id',
        as: 'class',
        pipeline: [{
          $match: { students: studentId }
        }]
      }},
      { $lookup: {
        from: 'quizzes',
        localField: 'quiz',
        foreignField: '_id',
        as: 'quiz'
      }},  
      { $unwind: '$quiz'}, 
      { $unwind: '$class'},
      { $match: { 
        complete: false,
        'grades.student': { $ne: studentId }
      }},
      { $project: {
        quizTitle: '$quiz.title',
        classTitle: '$class.title',
        timeLimit: 1,
        dueDate: 1,
        questionCount: 1,
        timeLimit: '$quiz.timeLimit',
        questionCount: { $size: '$quiz.questions' }
    }}])
    .sort('dueDate')

    return res.status(200).json(quizzes);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quiz', async (req, res) => {
  try {
    const quiz = await ScheduledQuiz.findById(req.query.id, '-__v -grades')
      .populate('quiz', '-questions._id -questions.a -instructor -__v')
      .populate('class', 'title -_id');

    return res.status(200).json(quiz)
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.post('/submit-quiz', async (req, res) => {
  try {
    const student = req.auth;
    const responses = req.body.responses;

    const sq = await ScheduledQuiz.findById(req.body.id)
      .populate('quiz', '-questions._id -instructor -__v');
    
    const questions = sq.quiz.questions;
    const details = new Array(questions.length).fill(false);

    let correct = 0;
    let total = sq.quiz.questions.length;

    for(let i = 0; i < responses.length; i++) {
      if(responses[i] === questions[i].a) {
        correct += 1;
        details[i] = true;
      }
    }

    const grade = (correct / total * 100).toFixed(1);

    await ScheduledQuiz.updateOne(
      { '_id': req.body.id }, 
      { '$push': { 'grades': { student: student.id, grade: grade } }})

    const response = { 
      correct, 
      total,
      grade,
      details
    };

    console.log(response);

    return res.status(200).json(response)
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

module.exports = routes;