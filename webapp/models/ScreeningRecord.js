const mongoose = require('mongoose');

const ScreeningRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    toddlerName: {
        type: String,
        default: 'Anonymous Child',
        trim: true
    },
    ageMonths: {
        type: Number,
        required: true,
        min: 12,
        max: 60
    },
    sex: {
        type: String,
        enum: ['m', 'f'],
        required: true
    },
    ethnicity: {
        type: String,
        required: true
    },
    jaundice: {
        type: String,
        enum: ['yes', 'no'],
        required: true
    },
    familyHistoryASD: {
        type: String,
        enum: ['yes', 'no'],
        required: true
    },
    responses: {
        a1: { type: Number, required: true },
        a2: { type: Number, required: true },
        a3: { type: Number, required: true },
        a4: { type: Number, required: true },
        a5: { type: Number, required: true },
        a6: { type: Number, required: true },
        a7: { type: Number, required: true },
        a8: { type: Number, required: true },
        a9: { type: Number, required: true },
        a10: { type: Number, required: true }
    },
    qchatScore: {
        type: Number,
        required: true,
        min: 0,
        max: 10
    },
    prediction: {
        probability: { type: Number, required: true },
        riskTier: { 
            type: String, 
            enum: ['Low Likelihood', 'Moderate Likelihood', 'Elevated Likelihood'], 
            required: true 
        },
        recommendation: { type: String, required: true }
    }
}, { timestamps: true });

module.exports = mongoose.model('ScreeningRecord', ScreeningRecordSchema);