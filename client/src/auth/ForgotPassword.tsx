import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserStore } from "@/store/useUserStore" //change
import { Loader2, Mail } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
const ForgotPassword = () => {
    const [email, setEmail] = useState<string>("")
    const { forgotPassword, loading } = useUserStore(); //change

    //change
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            alert("Please enter your email");
            return;
        }
        await forgotPassword(email);
    };
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
        {/* change */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 md:border md:p-8 w-full max-w-md rounded-lg mx-4"> 
            <div className="text-center">
                <h1 className="font-extrabold text-2xl mb-2">Forgot Password</h1>
                <p className="text-sm text-gray-600">Enter your email address to reset your password</p>
            </div>
            <div className="relative w-full">
                <Input
                    type="text"
                    value={email}
                    onChange={(e)=>setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                />
                <Mail className=" absolute inset-y-2 left-2 text-gray-600 pointer-events-none"/>
                
            </div>
            {
                loading ? (
                    <Button disabled className="bg-orange hover:bg-hoverOrange "><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Please wait</Button>
                ) : (
                    //change
                    <Button type="submit" className="bg-orange hover:bg-hoverOrange ">Send Reset Link</Button>
                )
            }
            <span className="text-center">
                Back to{" "}
                <Link to="/login" className="text-blue-500">Login</Link>
            </span>
        </form>
    </div>
  )
}

export default ForgotPassword