const express = require('express');
const axios = require('axios');
const router = express.Router();
const ScreeningRecord = require('../models/ScreeningRecord');

// Use Render environment variable with live fallback
const ML_API_URL = process.env.ML_API_URL || 'https://asd-ml-service.onrender.com/api/v1/screen';

// Middleware to ensure user is logged in
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// GET screening form
router.get('/screen', isAuthenticated, (req, res) => {
    res.render('screen', { error: null, user: req.session.user });
});

// POST screening form
router.post('/screen', isAuthenticated, async (req, res) => {
    try {
        const {
            toddlerName, ageMonths, sex, ethnicity,
            jaundice, familyHistory,
            a1, a2, a3, a4, a5, a6, a7, a8, a9, a10
        } = req.body;

        const answers = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10].map(Number);
        const qchatScore = answers.reduce((acc, val) => acc + val, 0);

        const payload = {
            a1: answers[0], a2: answers[1], a3: answers[2], a4: answers[3], a5: answers[4],
            a6: answers[5], a7: answers[6], a8: answers[7], a9: answers[8], a10: answers[9],
            age_months: parseInt(ageMonths, 10),
            sex: sex.toLowerCase(),
            ethnicity: ethnicity,
            jaundice: jaundice.toLowerCase(),
            family_history: familyHistory.toLowerCase()
        };

        // Call FastAPI ML inference microservice with 60s timeout for Render free tier
        console.log(`Sending payload to ML service at: ${ML_API_URL}`);
        const response = await axios.post(ML_API_URL, payload, { timeout: 60000 });
        const prediction = response.data;

        // Save screening record in MongoDB
        const record = new ScreeningRecord({
            userId: req.session.user._id,
            toddlerName,
            ageMonths: parseInt(ageMonths, 10),
            sex,
            ethnicity,
            jaundice,
            familyHistory,
            qchatScore,
            prediction: {
                riskTier: prediction.risk_tier,
                probability: prediction.probability,
                confidence: prediction.confidence,
                recommendation: prediction.recommendation
            }
        });

        await record.save();
        res.render('result', { record, user: req.session.user });

    } catch (err) {
        const detail = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error('Inference error details:', detail);
        res.render('screen', {
            error: `Inference service note: ${detail}`,
            user: req.session.user
        });
    }
});

// GET dashboard records
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const records = await ScreeningRecord.find({ userId: req.session.user._id }).sort({ createdAt: -1 });
        res.render('dashboard', { records, user: req.session.user });
    } catch (err) {
        res.render('dashboard', { records: [], error: 'Could not fetch records', user: req.session.user });
    }
});

module.exports = router;