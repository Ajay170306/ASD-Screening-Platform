const express = require('express');
const axios = require('axios');
const router = express.Router();
const ScreeningRecord = require('../models/ScreeningRecord');

const ML_API_URL = process.env.ML_API_URL || 'https://asd-ml-service.onrender.com/api/v1/screen';

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login');
}

router.get('/screen', isAuthenticated, (req, res) => {
    res.render('screen', { error: null, user: req.session.user });
});

router.post('/screen', isAuthenticated, async (req, res) => {
    try {
        const body = req.body;

        // Support both camelCase and snake_case field names from the HTML form
        const toddlerName = body.toddlerName || body.toddler_name || body.name || 'Anonymous';
        const ageMonths = parseInt(body.ageMonths || body.age_months || body.age || 24, 10);
        const sex = (body.sex || body.gender || 'm').toString().toLowerCase();
        const ethnicity = (body.ethnicity || 'asian').toString();
        const jaundice = (body.jaundice || 'no').toString().toLowerCase();
        const familyHistory = (body.familyHistory || body.family_history || body.family_mem_with_asd || 'no').toString().toLowerCase();

        // Convert the 10 assessment answers to integers (0 or 1)
        const a1 = parseInt(body.a1 || 0, 10);
        const a2 = parseInt(body.a2 || 0, 10);
        const a3 = parseInt(body.a3 || 0, 10);
        const a4 = parseInt(body.a4 || 0, 10);
        const a5 = parseInt(body.a5 || 0, 10);
        const a6 = parseInt(body.a6 || 0, 10);
        const a7 = parseInt(body.a7 || 0, 10);
        const a8 = parseInt(body.a8 || 0, 10);
        const a9 = parseInt(body.a9 || 0, 10);
        const a10 = parseInt(body.a10 || 0, 10);

        const answers = [a1, a2, a3, a4, a5, a6, a7, a8, a9, a10];
        const qchatScore = answers.reduce((acc, val) => acc + val, 0);

        // Normalize sex to 'm' or 'f' to match standard model training format
        const normalizedSex = sex.startsWith('m') ? 'm' : 'f';

        const payload = {
            a1, a2, a3, a4, a5, a6, a7, a8, a9, a10,
            age_months: ageMonths,
            sex: normalizedSex,
            ethnicity: ethnicity.toLowerCase(),
            jaundice: jaundice.startsWith('y') ? 'yes' : 'no',
            family_history: familyHistory.startsWith('y') ? 'yes' : 'no'
        };

        // Call FastAPI ML inference microservice
        const response = await axios.post(ML_API_URL, payload, { timeout: 60000 });
        const prediction = response.data;

        // Persist screening record to MongoDB Atlas
        const record = new ScreeningRecord({
            userId: req.session.user._id,
            toddlerName,
            ageMonths,
            sex: normalizedSex === 'm' ? 'Male' : 'Female',
            ethnicity,
            jaundice: payload.jaundice === 'yes' ? 'Yes' : 'No',
            familyHistory: payload.family_history === 'yes' ? 'Yes' : 'No',
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
        console.error('Screening Route Exception:', err.response ? err.response.data : err.message);
        const detail = err.response ? JSON.stringify(err.response.data) : err


        