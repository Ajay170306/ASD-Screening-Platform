const express = require('express');
const router = express.Router();
const axios = require('axios');
const ScreeningRecord = require('../models/ScreeningRecord');

function requireAuth(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect('/login');
}

// Render Questionnaire Stepper
router.get('/screen', requireAuth, (req, res) => {
    res.render('screen', { user: req.session.user, error: null });
});

// Process Questionnaire Responses & Call FastAPI
router.post('/screen', requireAuth, async (req, res) => {
    try {
        const {
            toddlerName, ageMonths, sex, ethnicity, jaundice, familyHistoryASD,
            a1, a2, a3, a4, a5, a6, a7, a8, a9, a10
        } = req.body;

        const payload = {
            a1: parseInt(a1, 10),
            a2: parseInt(a2, 10),
            a3: parseInt(a3, 10),
            a4: parseInt(a4, 10),
            a5: parseInt(a5, 10),
            a6: parseInt(a6, 10),
            a7: parseInt(a7, 10),
            a8: parseInt(a8, 10),
            a9: parseInt(a9, 10),
            a10: parseInt(a10, 10),
            age_months: parseInt(ageMonths, 10),
            sex: sex.toLowerCase(),
            ethnicity: ethnicity.toLowerCase(),
            jaundice: jaundice.toLowerCase(),
            family_mem_with_asd: familyHistoryASD.toLowerCase()
        };

        const apiEndpoint = process.env.ML_API_URL || 'http://127.0.0.1:8000/api/v1/screen';
        const response = await axios.post(apiEndpoint, payload);
        const { qchat_score, asd_probability, risk_tier, clinical_recommendation } = response.data;

        const record = new ScreeningRecord({
            userId: req.session.user._id,
            toddlerName: toddlerName || 'Anonymous Child',
            ageMonths: payload.age_months,
            sex: payload.sex,
            ethnicity: payload.ethnicity,
            jaundice: payload.jaundice,
            familyHistoryASD: payload.family_mem_with_asd,
            responses: {
                a1: payload.a1, a2: payload.a2, a3: payload.a3, a4: payload.a4, a5: payload.a5,
                a6: payload.a6, a7: payload.a7, a8: payload.a8, a9: payload.a9, a10: payload.a10
            },
            qchatScore: qchat_score,
            prediction: {
                probability: asd_probability,
                riskTier: risk_tier,
                recommendation: clinical_recommendation
            }
        });

        await record.save();
        res.render('result', { user: req.session.user, record });
    } catch (err) {
        console.error("Screening failure:", err.message);
        res.render('screen', {
            user: req.session.user,
            error: "Inference engine connection failed. Please ensure the Python FastAPI service is running."
        });
    }
});

// Patient Assessment History Dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const records = await ScreeningRecord.find({ userId: req.session.user._id }).sort({ createdAt: -1 });
        res.render('dashboard', { user: req.session.user, records });
    } catch (err) {
        console.error(err);
        res.redirect('/home');
    }
});

module.exports = router;