const express = require('express');
const axios = require('axios');
const router = express.Router();
const ScreeningRecord = require('../models/ScreeningRecord');

const ML_API_URL = process.env.ML_API_URL || 'https://asd-ml-service-ajay.onrender.com/api/v1/screen';

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
        const toddlerName = body.toddlerName || body.toddler_name || body.name || 'Anonymous';
        const ageMonths = parseInt(body.ageMonths || body.age_months || body.age || 24, 10);
        const sex = (body.sex || body.gender || 'm').toString().toLowerCase();
        const ethnicity = (body.ethnicity || 'asian').toString();
        const jaundice = (body.jaundice || 'no').toString().toLowerCase();
        const familyHistory = (body.familyHistory || body.family_history || body.family_mem_with_asd || 'no').toString().toLowerCase();

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
        const normalizedSex = sex.startsWith('m') ? 'm' : 'f';
        const formattedFamilyHistory = familyHistory.startsWith('y') ? 'yes' : 'no';

        const payload = {
            a1, a2, a3, a4, a5, a6, a7, a8, a9, a10,
            age_months: ageMonths,
            sex: normalizedSex,
            ethnicity: ethnicity.toLowerCase(),
            jaundice: jaundice.startsWith('y') ? 'yes' : 'no',
            family_history: formattedFamilyHistory,
            family_mem_with_asd: formattedFamilyHistory
        };

        const response = await axios.post(ML_API_URL, payload, { timeout: 60000 });
        const prediction = response.data;

        const record = new ScreeningRecord({
            userId: req.session.user._id,
            toddlerName,
            ageMonths,
            sex: normalizedSex === 'm' ? 'Male' : 'Female',
            ethnicity,
            jaundice: payload.jaundice === 'yes' ? 'Yes' : 'No',
            familyHistory: formattedFamilyHistory === 'yes' ? 'Yes' : 'No',
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
        console.error('Screening Error Details:', detail);
        res.render('screen', {
            error: 'Inference error: ' + detail,
            user: req.session.user
        });
    }
});

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const records = await ScreeningRecord.find({ userId: req.session.user._id }).sort({ createdAt: -1 });
        res.render('dashboard', { records, user: req.session.user });
    } catch (err) {
        res.render('dashboard', { records: [], error: 'Could not fetch records', user: req.session.user });
    }
});

module.exports = router;