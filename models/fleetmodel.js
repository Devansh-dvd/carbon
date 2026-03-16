import mongoose from "mongoose";

const coordinateSchema = new mongoose.Schema({
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
});

const engineVehicleSchema = new mongoose.Schema({
  mileageKmpl: { type: Number },
  fuelConsumedLitres: { type: Number },
  co2EmittedKg: { type: Number },
});

const evVehicleSchema = new mongoose.Schema({
  totalRangeKm: { type: Number },
  rangeAfterTrip: { type: Number },
  co2EmittedKg: { type: Number },
  isSufficient: { type: Boolean },
});

const comparisonSchema = new mongoose.Schema({
  co2SavedKg: { type: Number },
  treesEquivalent: { type: Number },
});

const geometrySchema = new mongoose.Schema({
  type: { type: String, default: "LineString" },
  coordinates: [[Number]], // [lng, lat]
});

const routeSchema = new mongoose.Schema({
  routeIndex: { type: Number },
  distanceKm: { type: Number },
  duration: { type: String },
  durationSeconds: { type: Number },
  geometry: geometrySchema,
  engineVehicle: engineVehicleSchema,
  evVehicle: evVehicleSchema,
  comparison: comparisonSchema,
});

const fleetSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, required: true },
    vehicleType: { type: String, required: true },

    currentLocation: coordinateSchema,
    destination: coordinateSchema,

    routes: [routeSchema],

    totalRoutes: { type: Number },
    bestRoute: routeSchema,
  },
  { timestamps: true }
);

const Fleet = mongoose.model("Fleet", fleetSchema);

export default Fleet;