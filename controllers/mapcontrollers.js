import Request from "../models/requestmodel.js";
import { getAllRoutes } from "../services/mapservice.js";
import Fleet from "../models/fleetmodel.js";

export const registerVehicle = async (req, res) => {
  try {
    const {
      vehicleId,
      vehicleType,
      currentLocation,
      destination,
      engineVehicle,
      evVehicle,
    } = req.body;

    if (!vehicleId || !vehicleType || !currentLocation || !destination) {
      return res.status(400).json({
        success: false,
        message:
          "vehicleId, vehicleType, currentLocation and destination are required",
      });
    }

    if (vehicleType === "ev" && !evVehicle?.distanceRange) {
      return res.status(400).json({
        success: false,
        message: "evVehicle.distanceRange is required for EV vehicles",
      });
    }

    if (
      (vehicleType === "petrol" || vehicleType === "diesel") &&
      !engineVehicle?.mileage
    ) {
      return res.status(400).json({
        success: false,
        message: "engineVehicle.mileage is required for petrol/diesel vehicles",
      });
    }

    const vehicle = await Request.create({
      vehicleId,
      vehicleType,
      currentLocation,
      destination,
      engineVehicle: vehicleType !== "ev" ? engineVehicle : undefined,
      evVehicle: vehicleType === "ev" ? evVehicle : undefined,
    });

    const mileageKmpl = engineVehicle?.mileage || 1;
    const evRange = evVehicle?.distanceRange || 0;


    const originCoords = {
      lat: vehicle.currentLocation.lat,
      lng: vehicle.currentLocation.lng,
    };

    const destCoords = {
      lat: vehicle.destination.lat,
      lng: vehicle.destination.lng,
    };

    
    const routes = await getAllRoutes(
      originCoords,
      destCoords,
      mileageKmpl,
      evRange
    );

    const bestRoute = routes.reduce((min, route) => {
      return (route.distanceKm / mileageKmpl) * 2.31 < (min.distanceKm / mileageKmpl) * 2.31
        ? route
        : min;
    });

    const fleet = await Fleet.create({
  vehicleId: vehicle.vehicleId,
  vehicleType: vehicle.vehicleType,

  currentLocation: {
    address: vehicle.currentLocation.address,
    lat: vehicle.currentLocation.lat,
    lng: vehicle.currentLocation.lng,
  },

  destination: {
    address: vehicle.destination.address,
    lat: vehicle.destination.lat,
    lng: vehicle.destination.lng,
  },

  totalRoutes: routes.totalRoutes,

  bestRoute: {
    routeIndex: bestRoute.routeIndex,
    distanceKm: bestRoute.distanceKm,
    duration: bestRoute.duration,
    durationSeconds: bestRoute.durationSeconds,

    geometry: bestRoute.geometry,

    engineVehicle: {
      mileageKmpl: bestRoute.engineVehicle.mileageKmpl,
      fuelConsumedLitres: bestRoute.engineVehicle.fuelConsumedLitres,
      co2EmittedKg: bestRoute.engineVehicle.co2EmittedKg,
    },

    evVehicle: {
      totalRangeKm: bestRoute.evVehicle.totalRangeKm,
      rangeAfterTrip: bestRoute.evVehicle.rangeAfterTrip,
      co2EmittedKg: bestRoute.evVehicle.co2EmittedKg,
      isSufficient: bestRoute.evVehicle.isSufficient,
    },

    comparison: {
      co2SavedKg: bestRoute.comparison.co2SavedKg,
      treesEquivalent: bestRoute.comparison.treesEquivalent,
    },
  },
});

    return res.status(201).json({
      success: true,
      message: "Vehicle registered and routes calculated",
      vehicle,
      totalRoutes: routes.length,
      bestRoute,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `Vehicle with id ${req.body.vehicleId} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};