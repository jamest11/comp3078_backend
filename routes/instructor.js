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

routes.get('/test', async (req, res) => {
  try {
    const emails = ['jamest2@gmail.com', 'jsmith@gmail.com', 'test@example.com'];

    const students = await User.find({ 'email': { '$in': emails}, userType: 'student' }, '_id')

    return res.status(200).json(students);
  } catch (err) {
    return res.status(500).send(err);
  }
});

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

    const students = await User.find({ 'email': { '$in': req.body.students}, userType: 'student' }, '_id')
    const studentIds = [];
    for(let student of students) {
      studentIds.push(student._id);
    }

    const oldClass = await Class.findByIdAndUpdate(classId, { 
        '$addToSet': { 
          'students': { 
            '$each': studentIds 
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

    const quizzes = await Quiz.find({ instructor: instructor.id }).sort('title');

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

    const scheduledQuizzes = await ScheduledQuiz
      .find()
      .populate('class', 'title students', { instructor: { $eq: instructor.id }})
      .populate('quiz', 'title')
      .then((sqs) => sqs.filter((sq) => sq.class !== null));

    const grades = [];

    for(let quiz of scheduledQuizzes) {
        if(quiz.class.students.length === 0) continue;

      //if(quiz.grades.length > 0) {
        let average = 0;
        for(let grade of quiz.grades) {
          average += grade.grade;
        }

        if(average > 0){
          average /= quiz.grades.length;
        }

        grades.push({
          id: quiz._id,
          class: quiz.class.title,
          class_id: quiz.class._id,
          quiz: quiz.quiz.title,
          dueDate: quiz.date,
          average: parseFloat(average.toFixed(1)),
          completed: quiz.grades.length,
          total: quiz.class.students.length
        });
      //}
    }

    return res.status(200).json(grades);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/class-grades', async (req, res) => {
  try {
    const instructor = decodeToken(req.headers);

    const classes = await Class.find({ instructor: instructor.id }, '_id, title')

    let quizGrades = await axios.get('http://localhost:4000/instructor/quiz-grades', { 
      headers: { authorization: req.headers.authorization },
    });
    quizGrades = quizGrades.data;

    const classGrades = []

    for(let quizClass of classes) {
      const classGrade = {
        _id: quizClass.id,
        class: quizClass.title
      }

      let gradeCount = -1;
      let total = 0;

      for(let grade of quizGrades) {
        if(grade.class_id == quizClass._id && grade.completed > 0) {
          if(gradeCount === -1) gradeCount = 0;

          gradeCount += 1;
          total += grade.average;
        }
      }

      let average = 0;

      if(gradeCount > 0 && total > 0) {
        average = total / gradeCount;
      }

      classGrade.count = gradeCount;
      classGrade.average = average;
      classGrades.push(classGrade);
    }
    
    res.status(200).json(classGrades);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
})

module.exports = routes;