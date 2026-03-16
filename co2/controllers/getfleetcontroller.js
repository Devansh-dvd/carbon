import Fleet from "../models/fleetmodel.js";

export const getAllFleet = async (req, res) => {
  try {
    const fleet = await Fleet.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      total: fleet.length,
      fleet,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};