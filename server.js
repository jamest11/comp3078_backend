const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const scheduledFunctions = require('./scheduledFunctions');
const authRoutes = require('./routes/auth');
const instructorRoutes = require('./routes/instructor');
const studentRoutes = require('./routes/student');

const app = express();
app.use(express.json());

mongoose.set('strictQuery', false);
mongoose.connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'capstone'
}).then(() => {
    console.log('Successfully connected to the database mongoDB Atlas Server');    
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
    process.exit();
});

app.use(cors({
    origin: '*'
}));

app.use('/auth', authRoutes);
app.use('/instructor', instructorRoutes);
app.use('/student', studentRoutes);

scheduledFunctions.initScheduledTasks();

app.listen(process.env.PORT, () => {
    console.log(`Server is listening on port ${process.env.PORT}`);
});