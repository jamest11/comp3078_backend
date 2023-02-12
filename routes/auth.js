const express = require("express");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const routes = express.Router()

routes.post('/register', async (req, res) => {
    const user = new User(req.body);

    bcrypt.hash(user.password, parseInt(process.env.SALT_ROUNDS), async (err, hash) => {
        if(err) {
            console.log(err);
            return res.status(400).json({ errorCode: 103, message: 'Invalid password'});
        }

        user.password = hash;

        try {
            await user.save();

            return res.status(201).json(user);
        } catch(saveErr) {
            return res.status(500).send(saveErr);
        }
    });
});
    
routes.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        let user = null;

        if (!password || !(username || password)) {
            return res.status(400).json({ errorCode: 101, message: 'Email and password required'});
        } else {
            user = await User.findOne({ email });
        }
    
        const match = await bcrypt.compare(password, user.password);

        if (user && match) {
            const token =  jwt.sign({ id: user._id, userType: user.userType }, process.env.TOKEN_KEY, { expiresIn: '48h', });
    
            const response = {
                jwt_token: token
            };

            return res.status(200).json(response);
        } 
        return res.status(400).json({ errorCode: 102, message: 'Invalid email/password'});

    } catch (err) {
        console.log(err)
        return res.status(500).send(err);
    }
});
 
module.exports = routes