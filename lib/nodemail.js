'use strict';
const nodemailer = require('nodemailer');
const coin = require('./coinapi');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    secure: true,
    //port: 465,
    auth: {
        user: coin.settings.masterEmail,
        pass: coin.settings.masterPassword
    }
});

module.exports = transporter;
