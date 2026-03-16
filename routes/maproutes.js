import express from 'express';
import { registerVehicle } from '../controllers/mapcontrollers.js';
import { getAllFleet } from '../controllers/getfleetcontroller.js';

const router = express.Router();

router.post('/register', registerVehicle);
router.get("/fleet", getAllFleet); 

export default router;