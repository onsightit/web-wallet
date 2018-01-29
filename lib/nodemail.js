'use strict';
const nodemailer = require('nodemailer');
const coin = require('./coinapi');

const transporter = nodemailer.createTransport({
    service: coin.settings.appEmailService,
    secure: true,
    //port: 465,
    auth: {
        user: coin.settings.appEmail,
        pass: coin.settings.appEmailPassword
    }
});

module.exports = transporter;
