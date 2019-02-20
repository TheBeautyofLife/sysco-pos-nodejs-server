var express = require('express');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var config = require('../auth/config');
var router = express.Router();

var UserModel = require('../database/models/user.model');

/** Tested */
router.post('/register', function (req, res) {
    if (req.body.username && req.body.password) {
        var pwd_hashed = bcrypt.hashSync(req.body.password, 10);
        let u = new UserModel({
            username: req.body.username,
            password: pwd_hashed,
            isAdmin: false
        });
        u.save().then(doc => {
            UserModel.find({ username: req.body.username }).then(docs => {
                if (docs.length === 1) {
                    var token = jwt.sign({ id: doc._id }, config.secret, {
                        expiresIn: (24 * 60 * 60)
                    });
                    return res.status(200).send({ 'status': 'User created successfully', 'token': token });
                } else {
                    return res.status(409).json({ 'error': 'Duplicate user name' });
                }
            }).catch(e => {
                return res.status(409).json({ 'error': 'Duplicate user name' });
            });
        }).catch(err => {
            if (err.name === 'MongoError' && err.code === 11000) {
                return res.status(409).json({ 'error': 'Duplicate user name' });
            }
            if (err.name === 'ValidationError') {
                return res.status(400).json({ 'error': 'Some fields are missing' });
            }
        });
    } else {
        return res.status(406).json({ 'error': 'User data missing' });
    }
});

/** Tested */
router.post('/login', function (req, res) {
    if (req.body.username && req.body.password) {
        UserModel.findOne({ username: req.body.username }, function (err, user) {
            if (err) {
                return res.status(500).json({ 'error': 'Internal server error' });
            }
            if (!user) {
                return res.status(404).json({ 'error': 'No user with provided username' });
            }
            if (!bcrypt.compareSync(req.body.password, user.password)) {
                return res.status(401).json({ 'error': 'Incorrect password' });
            }
            var token = jwt.sign({ id: user._id }, config.secret, {
                expiresIn: (24 * 60 * 60)
            });
            res.status(200).json({ 'status': 'Logged in successfully', token: token });
        });
    } else {
        res.status(406).json({ 'error': 'User data missing' });
    }
});

module.exports = router