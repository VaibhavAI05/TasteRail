import { Request, Response } from 'express';
import { User } from '../models/user.model';
import bcrypt from "bcryptjs";
import crypto from "crypto";
import cloudinary from '../utils/cloudinary';
import { generateVerificationCode } from '../utils/generateVerificationCode';
import { generateToken } from '../utils/generateToken';
import { sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationEmail, sendWelcomeEmail } from '../mailtrap/email';


export const signup = async (req: Request, res: Response): Promise<void> => {
    try {
        const  { fullname, email, password, contact} = req.body;

        let user = await User.findOne({fullname});  //change
        if (user) {
            res.status(400).json({
                success: false,
                message: "User already exists with this fullname"  //change
            });
            return;
        }
        const hashedPassword = await bcrypt.hash(password,10);

        const verificationToken = generateVerificationCode();

        user = await User.create({
            fullname,
            email,
            password: hashedPassword,
            contact: Number(contact),
            verificationToken,
            verificationTokenExpiresAt: Date.now()+24*60*60*1000,
        })
        generateToken(res, user);

        await sendVerificationEmail(email, verificationToken);

        const userWithoutPassword = await User.findOne({email}).select("-password")
        res.status(201).json({
            success: true,
            message: "Account created successfully",
            user: userWithoutPassword
        });
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({message: "Internal server error"});
        return;
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const {fullname, email, password } = req.body; 
        const user = await User.findOne({fullname});  //change
        if (!user){
            res.status(400).json({
                success:false,
                message: "Incorrect login credentials"
            });
            return;
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            res.status(400).json({
                success: false,
                message: "Incorrect email or password"
            })
            return;
        }

        generateToken(res, user);
        user.lastLogin = new Date();
        await user.save();

        const userWithoutPassword =  await User.findOne({fullname}).select("-password"); 
        res.status(200).json({
            success: true,
            message: `Welcone back ${user.fullname}`,
            user: userWithoutPassword
        })
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal server error"});
        return;
    }
}

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
        const { verificationCode } = req.body;

        const user = await User.findOne({verificationToken: verificationCode, verificationTokenExpiresAt: {$gt: Date.now()}}).select("-password");

        if (!user) {
            res.status(400).json({
                success:false,
                message: "Invalid or expired verification token"
            })
            return;
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();

        await sendWelcomeEmail(user.email, user.fullname);

        res.status(200).json({
            success: true,
            message: "Email verified successfully",
            user,
        })
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal server error"});
        return;
    }
}

export const logout = async (_: Request, res: Response):Promise<void> => {
    try {
        res.clearCookie("token").status(200).json({
            success: true,
            message: "Logged out successfully"
        })
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal server error"});
        return; 
    }
}

export const forgotPassword = async (req: Request, res: Response):Promise<void> => {
    try {
        const { email } = req.body;
        const user = await User.findOne({email});

        if (!user) {
            res.status(400).json({
                success: false,
                message: "User doesn't exist"
            })
            return;
        }

        const token = crypto.randomBytes(40).toString('hex');
        const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
        //resetToken ko token kr diya
        user.resetPasswordToken = token;
        user.resetPasswordTokenExpiresAt = resetTokenExpiresAt;
        await user.save();

        //send  reset password email
        await sendPasswordResetEmail(user.email, `${process.env.FRONTEND_URL}/reset-password/${token}`);


        res.status(200).json({
            success: true,
            message: "Password reset links sent to yout email"
        })
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal server error"});
        return;
    }
}

export const resetPassword = async ( req: Request, res: Response):Promise<void> => {
    try {
        const { token } = req.params;
        const { newPassword } =req.body;
        const user = await User.findOne({resetPasswordToken: token, resetPasswordTokenExpiresAt: {$gt: Date.now()}});
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            })
            return;
        }
        //update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpiresAt = undefined;
        await user.save();

        //send success reset email
        await sendResetSuccessEmail(user.email);

        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        })
        return; 
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal server error"});
        return;
    }
}

export const checkAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.id;
        const user = await User.findById(userId).select("-password");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            })
            return;
        }
        res.status(200).json({
            success: true,
            user,
        })
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal server error"});
        return;
    }
}

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.id;
        const { fullname, email, address, city, country, profilePicture} = req.body;
        //upload image on cloudinary
        let cloudResponse: any;
        cloudResponse = await cloudinary.uploader.upload(profilePicture);
        const updatedData = {fullname, email, address, city, country, profilePicture};

        const user = await User.findByIdAndUpdate(userId, updatedData,{new:true}).select("-password");
        
        res.status(200).json({
            success: true,
            user,
            message: "Profile updated successfully"
        })
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal server error"});
        return;
    }
} 