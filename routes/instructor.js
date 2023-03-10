const express = require('express');
const mongoose = require('mongoose');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const ObjectId = require('mongoose').Types.ObjectId;

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
    const instructor = decodeToken(req.headers);

    const quizClass = new Class({ ...req.body, instructor: instructor.id });

    await quizClass.save();

    return res.status(201).json(quizClass);
  } catch (err) {
    return res.status(500).send(err);
  }
});

routes.patch('/update-class', async (req, res) => {
  try {
    const classId = ObjectId(req.body.class)

    const students = await User.distinct(
      '_id', 
      { email: { $in: req.body.students}, userType: 'student' });

    const oldClass = await Class.findByIdAndUpdate(classId, { 
        $addToSet: { 
          students: { 
            $each: students
      }}}
    );

    const updatedClass = await Class.findById(classId);
    
    const response = {
      count: updatedClass.students.length - oldClass.students.length,
      class: updatedClass.title,
      id: updatedClass._id
    };

    return res.status(200).json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.post('/create-quiz', async(req, res) => {
  try {
    const instructor = decodeToken(req.headers);

    const quiz = new Quiz({ ...req.body, instructor: instructor.id });

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

    const scheduledQuiz = new ScheduledQuiz({ ...req.body, instructor: instructor.id });

    await scheduledQuiz.save();

    return res.status(200).json(scheduledQuiz);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/scheduled-quizzes', async (req, res) => {
  let filter = {};
  const filterOptions = ['complete', 'incomplete']

  if(req.query.filter && filterOptions.includes(req.query.filter)) {
    filter = req.query.filter === 'complete' ? {complete: true } : { complete: false }
  }

  try {
    const instructor = decodeToken(req.headers);

    const scheduledQuizzes = await ScheduledQuiz.aggregate([
      { $lookup: {
        from: 'quizzes',
        localField: 'quiz',
        foreignField: '_id',
        as: 'quiz',
        pipeline: [{
          $match: { instructor: ObjectId(instructor.id) }
        }]
      }}, { $lookup: {
        from: 'classes',
        localField: 'class',
        foreignField: '_id',
        as: 'class'
      }}, 
      { $unwind: '$quiz'}, 
      { $unwind: '$class'},
      { $match: filter},
      { $project: {
        classTitle: '$class.title',
        quizTitle: '$quiz.title',
        timeLimit: 1,
        complete: 1,
        dueDate: 1
    }}])
    .sort('dueDate');

    return res.status(200).json(scheduledQuizzes);
  }  catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quizzes', async (req, res) => {
  try {
    const instructor = decodeToken(req.headers);

    const quizzes = await Quiz.aggregate([
      { $match: { instructor: ObjectId(instructor.id)} },
      { $addFields: { questionCount: { $size: '$questions' }}}, 
      { $unset: 'questions' }
    ])
    .sort('title');

    return res.status(200).json(quizzes);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/classes', async (req, res) => {
  try {
    const instructor = decodeToken(req.headers);

    const classes = await Class.find({ instructor: instructor.id }).sort('title');

    return res.status(200).json(classes);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quiz-grades', async (req, res) => {
  try {
    const instructor = decodeToken(req.headers);
    
    const grades = await ScheduledQuiz.aggregate([
      { $lookup: {
        from: 'quizzes',
        localField: 'quiz',
        foreignField: '_id',
        as: 'quiz',
        pipeline: [{
          $match: { instructor: ObjectId(instructor.id) }
        }]
      }}, { $lookup: {
        from: 'classes',
        localField: 'class',
        foreignField: '_id',
        as: 'class'
      }}, 
      { $unwind: '$quiz'}, 
      { $unwind: '$class'}, 
      { $project: {
        classTitle: '$class.title',
        quizTitle: '$quiz.title',
        average: { $avg: '$grades.grade' },
        completed: { $size: '$grades' }, 
        timeLimit: 1,
        complete: 1,
        dueDate: 1
    }}])
    .sort('dueDate');

    return res.status(200).json(grades);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/class-grades', async (req, res) => {
  try {
    const instructor = decodeToken(req.headers);

    const classGrades = await Class.aggregate([
      { $match: { instructor: ObjectId(instructor.id) }},
      { $lookup: {
          from: 'scheduledquizzes',
          localField: '_id',
          foreignField: 'class',
          as: 'quizzes',
      }},
      { $addFields: {
        average: { 
          $map: {
            input: '$quizzes',
            as: 'quiz',
            in: { $avg: '$$quiz.grades.grade' }
      }}}},
      { $addFields: { count: { 
          $filter: {
            input: '$average',
            as: 'val',
            cond: { $ne: ['$$val', null]}
      }}}},
      { $project: {
        title: 1,
        average: { $avg: '$average'},
        count: { $size: '$count'}
    }}]);
    
    res.status(200).json(classGrades);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
})

module.exports = routes;