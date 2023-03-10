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

//routes.use(expressJwt.expressjwt({ secret: process.env.TOKEN_KEY, algorithms: ['HS256'] }));

const decodeToken = (headers) => {
  const token = headers.authorization.split(' ')[1];
  return jwt.verify(token, process.env.TOKEN_KEY);
};

routes.get('/grades', async (req, res) => {
  try {
    const student = decodeToken(req.headers);

    const studentId = ObjectId(student.id);

    const grades = await ScheduledQuiz.aggregate([
      { $match: { grades: { $elemMatch: { student: { $eq: studentId }}}}}, 
      { $project: { 
        quiz: 1, 
        class: 1, 
        grades: {
          $filter: {
            input: '$grades',
            as: 'grade',
            cond: {
              $eq: ['$$grade.student', studentId] }}}}}, 
      { $unset: ['grades._id','_id']}
    ])
    .sort('-grades.date');
  
    await Quiz.populate(grades, { path: 'quiz', select: 'title -_id' })
    await Class.populate(grades, { path: 'class', select: 'title -_id' })


    const out = [];
    for(let grade of grades) {
      out.push({
        classTitle: grade.class.title,
        quizTitle: grade.quiz.title,
        grade: grade.grades[0].grade,
        date: grade.grades[0].date
      });
    };

    return res.status(200).json(out);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quizzes', async (req, res) => {
  try {
    const student = decodeToken(req.headers);
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
    const student = decodeToken(req.headers);

    const sq = await ScheduledQuiz.findById(req.body.id)
      .populate('quiz', '-questions._id -instructor -__v');
    
    let correct = 0;
    let total = sq.quiz.questions.length;

    for(let i = 0; i < req.body.responses.length; i++) {
      if(req.body.responses[i] === sq.quiz.questions[i].a) {
        correct += 1;
      }
    }

    const grade = (correct / total * 100).toFixed(1);

    await ScheduledQuiz.updateOne(
      { '_id': req.body.id }, 
      { '$push': { 'grades': { student: student.id, grade: grade } }})

    return res.status(200).json({ correct: correct, total: total })
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

module.exports = routes;