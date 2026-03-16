import mongoose from "mongoose";
import fetch from "node-fetch";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

const geocodeAddress = async (address) => {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "co2-app/1.0" },
  });

  const data = await res.json();

  if (!data.length) {
    throw new Error(`Location not found: ${address}`);
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
  };
};

const requestSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
    },

    vehicleType: {
      type: String,
      enum: ["ev", "petrol", "diesel"],
      required: true,
    },

    currentLocation: {
      address: {
        type: String,
        required: true,
      },
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },

    destination: {
      address: {
        type: String,
        required: true,
      },
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },

    engineVehicle: {
      mileage: {
        type: Number,
      },
      unit: {
        type: String,
        enum: ["kmpl", "mpg"],
        default: "kmpl",
      },
    },

    evVehicle: {
      distanceRange: {
        type: Number,
      },
      unit: {
        type: String,
        enum: ["km", "miles"],
        default: "km",
      },
    },
  },
  { timestamps: true }
);

requestSchema.pre("save", async function (next) {
  try {
    if (
      this.currentLocation?.address &&
      (!this.currentLocation.lat || !this.currentLocation.lng)
    ) {
      const coords = await geocodeAddress(this.currentLocation.address);
      this.currentLocation.lat = coords.lat;
      this.currentLocation.lng = coords.lng;
    }

    if (
      this.destination?.address &&
      (!this.destination.lat || !this.destination.lng)
    ) {
      const coords = await geocodeAddress(this.destination.address);
      this.destination.lat = coords.lat;
      this.destination.lng = coords.lng;
    }
  } catch (error) {
    next(error);
  }
});

const Request = mongoose.model("Request", requestSchema);

export default Request;