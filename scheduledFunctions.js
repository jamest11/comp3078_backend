const cron = require('node-cron');
const dayjs = require('dayjs');

const ScheduledQuiz = require('./models/scheduled-quiz');

const completeOverdueQuizzes = async () => {
  try {
    console.log('Completing overdue quizzes...')
    const today = dayjs().startOf('day');

    const sq = await ScheduledQuiz.find({ date: { $gt: today.toDate() }, complete: false }).populate('class');
    
    for(let quiz of sq) {
      const classStudents = quiz.class.students;
      const quizStudents = quiz.grades.map(grade => grade.student);

      const incompleteStudents = classStudents
        .filter(cs => !quizStudents.some(qs => cs.equals(qs)))
        .map(s => ({ student: s, grade: 0 }))

      if(incompleteStudents.length > 0) {
        await ScheduledQuiz.updateOne(
          { '_id': quiz._id }, 
          { 
            '$push': { 'grades': incompleteStudents },
            complete: true
        })
      }
      else {
        await ScheduledQuiz.updateOne({ '_id': quiz._id }, { complete: true });
      }
    }

    console.log(`Marked ${sq.length} quizzes as complete`)
    console.log('Scheduled task finished')
   } catch(err) {
    console.log(err);
  }
};

const task = cron.schedule('1 0 * * *', () => {
  completeOverdueQuizzes();
}, {
  scheduled: false,
  timezone: 'America/Toronto'
});

exports.initScheduledTasks = () => {
  task.start();
};