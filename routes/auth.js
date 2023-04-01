const express = require('express');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const routes = express.Router()


routes.get('/verify/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const decoded = jwt.verify(token, process.env.TOKEN_KEY);

        const user = new User(decoded);
        await user.validate();

        bcrypt.hash(user.password, parseInt(process.env.SALT_ROUNDS), async (err, hash) => {
            if(err) {
                console.log(err);
                return res.status(500).send('Password hashing failed');
            }
    
            user.password = hash;
    
            try {
                await user.save();
    
                return res.status(200).send('Account verified');
            } catch(saveErr) {
                console.log(saveErr.message);
                return res.status(400).send('Invalid verification token');
            }
        });
        
    } catch(err) {
        console.log(err.message);
        return res.status(400).send('Invalid verification token');
    }
})

routes.post('/register', async (req, res) => {
    let user;

    try {
        user = await User.findOne({ email: req.body.email });
        if(user) {
            return res.status(400).send('Email in use');
        }

        user = new User(req.body);
        await user.validate();

    } catch(err) {
        return res.status(400).send('Validation failed');
    }

    try {
        const userJSON = user.toJSON();
        delete userJSON._id;

        const token = jwt.sign(userJSON, process.env.TOKEN_KEY, { expiresIn: '24h', })
        const url = process.env.ENVIRONMENT === 'dev' ? `http://localhost:3000/verify/${token}` : `https://quiztionnaire.tech/verify/${token}`

        const transporter = nodemailer.createTransport({
            service: 'Zoho',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'jameswtory@gmail.com',
            subject: 'Quiztionnaire - Verify Account',
            text: `Use this link to verify your Quiztionnaire account: ${url}`,
            html: `<p>Click <a href="${url}" target="_blank">here</a> to verify your Quiztionnaire account.</p>`
        });
        
        return res.status(200).send('Email sent');
    } catch(err) {
        console.log(err);
        return res.status(500).send('Error sending email');
    }
});
    
routes.post('/login', async (req, res) => {
    console.log(process.env.NODE_ENV)
    try {
        const { email, password } = req.body;
        let user = null;

        if (!password || !(email || password)) {
            return res.status(400).json({ errorCode: 101, message: 'Email and password required'});
        } else {
            user = await User.findOne({ email });
        }

        if(user) {
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                const token =  jwt.sign({ id: user._id, userType: user.userType }, process.env.TOKEN_KEY, { expiresIn: '120h', });
        
                const response = {
                    jwt_token: token,
                    user: {
                        id: user._id,
                        userType: user.userType,
                        email: user.email,
                        createdAt: user.createdAt,
                        firstName: user.firstName,
                        lastName: user.lastName
                    }
                };

                return res.status(200).json(response);
            }
        } 
        return res.status(400).json({ errorCode: 102, message: 'Invalid email/password'});

    } catch (err) {
        console.log(err)
        return res.status(500).send(err);
    }
});
 
module.exports = routes