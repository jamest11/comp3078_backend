const express = require('express');
const mongoose = require('mongoose');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Class = require('../models/class');
const ScheduledQuiz = require('../models/scheduled-quiz');

const routes = express.Router()

//routes.use(expressJwt.expressjwt({ secret: process.env.TOKEN_KEY, algorithms: ['HS256'] }));

const decodeToken = (headers) => {
  const token = headers.authorization.split(' ')[1];
  return jwt.verify(token, process.env.TOKEN_KEY);
};

routes.get('/quizzes', async (req, res) => {
  try {
    const student = decodeToken(req.headers);

    const quizzes = await ScheduledQuiz
      .find({}, '-__v')
      .populate('class', 'title -_id', { students: { $in: student.id }})
      .populate('quiz', 'title -_id')
      .then((qs) => qs.filter((q) => q.class !== null));

    return res.status(200).json(quizzes);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quiz', async (req, res) => {
  try {
    const quiz = await ScheduledQuiz.findById(req.body.quiz, '-__v -grades')
      .populate('quiz', '-questions._id -questions.a -instructor -__v');

    return res.status(200).json(quiz)
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

module.exports = routes;