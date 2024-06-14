import express from 'express';

import { createISAN, getAccidentById, autoDeleteExpiredAccidents } from '../controllers/accidents.js'

const router = express.Router();

router.post('/accidents', createISAN);

router.get('/accidents/:id', getAccidentById);

router.delete('/accidents', autoDeleteExpiredAccidents);

export default router;