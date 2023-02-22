const express = require('express');
const mongoose = require('mongoose');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

routes.post('/update-class', async (req, res) => {
  try {

    const studentId = mongoose.Types.ObjectId(req.body.student);
    const classId = mongoose.Types.ObjectId(req.body.class)

    await Class.updateOne({ '_id': classId }, { '$addToSet': { 'students': studentId } },  { runValidators: true })

    const quizClass = await Class.findById(classId);

    return res.status(200).json(quizClass);
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

    const quizzes = await Quiz.find({ instructor: instructor.id });

    return res.status(200).json(quizzes);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/classes', async (req, res) => {
  try {
    const instructor = decodeToken(req.headers);

    const classes = await Class.find({ instructor: instructor.id });

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
      .populate('class', ['title', 'description'], { instructor: { $eq: instructor.id }})
      .populate('quiz', 'title')
      .then((sqs) => sqs.filter((sq) => sq.class !== null));

    const grades = [];

    for(let quiz of scheduledQuizzes) {
      if(quiz.grades.length > 0) {
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
          average: average.toFixed(1),
          completed: quiz.grades.length
        });
      }
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

    const quizGrades = await axios.get('http://localhost:4000/instructor/quiz-grades', { 
      headers: { authorization: req.headers.authorization },
    });

    const classGrades = []

    for(let quizClass of classes) {
      const classGrade = {
        id: quizClass.id,
        class: quizClass.title
      }

      let count = 0;
      let total = 0;

      for(let grade of quizGrades.data) {
        if(grade.class_id == quizClass._id) {
          count += 1;
          total += parseFloat(grade.average);
        }
      }
      let average = 0;

      if(count > 0 && total > 0) {
        average = total / count;
      } 

      classGrade.count = count;
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