const express = require('express');
const expressJwt = require('express-jwt');
const jwt = require('jsonwebtoken');
const ObjectId = require('mongoose').Types.ObjectId;

const User = require('../models/user');
const Class = require('../models/class');
const Quiz = require('../models/quiz');
const ScheduledQuiz = require('../models/scheduled-quiz');

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
  if(req.auth.userType !== 'instructor') {
    res.status(403).send();
  } else {
    next();
  }
});

const decodeToken = (headers) => {
  const token = headers.authorization.split(' ')[1];
  return jwt.verify(token, process.env.TOKEN_KEY);
};

routes.get('/test', async (req, res) => {
  try {
    
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.post('/create-class', async (req, res) => {
  try {
    const instructor = req.auth;

    const quizClass = new Class({ ...req.body, instructor: instructor.id });

    await quizClass.save();

    return res.status(201).json(quizClass);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.post('/create-quiz', async(req, res) => {
  try {
    const instructor = req.auth;

    const quiz = new Quiz({ ...req.body, instructor: instructor.id });

    await quiz.save();

    return res.status(201).send();
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.post('/schedule-quiz', async (req, res) => {
  try {
    const instructor = req.auth;

    const scheduledQuiz = new ScheduledQuiz({ ...req.body, instructor: instructor.id });

    await scheduledQuiz.save();

    return res.status(200).json(scheduledQuiz);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
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

routes.patch('/update-scheduled-quiz', async (req, res) => {
  try {
    await ScheduledQuiz.findByIdAndUpdate(req.body.id, { dueDate: req.body.dueDate });

    return res.status(200).send()
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.patch('/update-quiz', async (req, res) => {
  try {
    await Quiz.findByIdAndUpdate(req.body.id, req.body.data);

    return res.status(200).send()
  } catch (err) {
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
    const instructor = req.auth;

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
        quiz_id: '$quiz._id',
        class_id: '$class._id',
        numComplete: { $size: '$grades' },
        numStudents: { $size: '$class.students' },
        timeLimit: 1,
        complete: 1,
        dueDate: 1,

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
    const instructor = req.auth;

    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10);
    const pagination = req.query.pagination === 'true';

    const agg = Quiz.aggregate([
      { $match: { instructor: ObjectId(instructor.id)} },
      { $addFields: { 
        questionCount: { $size: '$questions' },
        lowerTitle: { $toLower: '$title' }
      }},
      { $sort: { lowerTitle: 1 }}, 
      { $unset: ['questions', 'lowerTitle'] }
    ]);

    if(pagination && page && limit) {
      const options = {
        page,
        limit,
      }
  
      const quizzes = await Quiz.aggregatePaginate(agg, options);

      return res.status(200).json(quizzes);
    }
    else {
      const quizzes = await agg.exec();

      return res.status(200).json(quizzes);
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quiz', async (req, res) => {
  try {
    const id = req.query.id;
    
    if(!id) {
      return res.status(400).send()
    }

    const quiz = await Quiz.findById(id);

    return res.status(200).json(quiz);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/classes', async (req, res) => {
  try {
    const instructor = req.auth;

    const classes = await Class.find({ instructor: instructor.id }).sort('title');

    return res.status(200).json(classes);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.get('/quiz-grades', async (req, res) => {
  try {
    const instructor = req.auth;
    
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
        numComplete: { $size: '$grades' },
        numStudents: { $size: '$class.students' }, 
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
    const instructor = req.auth;

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
        classTitle: '$title',
        average: { $avg: '$average'},
        count: { $size: '$count'}
    }}])
    .sort('classTitle');
    
    res.status(200).json(classGrades);
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
})

routes.delete('/scheduled-quiz', async (req, res) => {
  try {
    const del = await ScheduledQuiz.deleteOne({ _id: req.body.id })

    return res.status(200).json(del)
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

routes.delete('/quiz', async (req, res) => {
  try {
    const del = await Quiz.findOneAndDelete({ _id: req.body.id })

    return res.status(200).json(del)
  } catch(err) {
    console.log(err);
    return res.status(500).json(err);
  }

});

module.exports = routes;