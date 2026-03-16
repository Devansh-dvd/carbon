import express from 'express';
import { registerVehicle } from '../controllers/mapcontrollers.js';

const router = express.Router();

router.post('/register', registerVehicle);

export default router;