import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    currentLocation: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      address: {
        type: String,
      },
    },

    destination: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      address: {
        type: String,
      },
    },

    engineVehicle: {
      mileage: {
        type: Number, 
        required: true,
      },
      unit: {
        type: String,
        enum: ['kmpl', 'mpg'],
        default: 'kmpl',
      },
    },

    evVehicle: {
      distanceRange: {
        type: Number, 
        required: true,
      },
      unit: {
        type: String,
        enum: ['km', 'miles'],
        default: 'km',
      },
    },
  },
  {
    timestamps: true, 
  }
);

const Request = mongoose.model('Request', requestSchema);

export default Request;