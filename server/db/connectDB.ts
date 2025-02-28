// mongo password = SrbHqPc473182PSb
// username = vaibhavsingh31kh
import mongoose from 'mongoose';
import {config} from 'dotenv';
config();
// import express from 'express';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI!)
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.log(error);
    }
}

export default connectDB;