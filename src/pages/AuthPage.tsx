import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const signInSchema = z.object({
  emailOrPhone: z.string().trim().min(1, "Email or phone is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  phone: z.string().trim().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const otpEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

const otpVerifySchema = z.object({
  otp: z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits"),
});

type SignInData = z.infer<typeof signInSchema>;
type SignUpData = z.infer<typeof signUpSchema>;
type OtpEmailData = z.infer<typeof otpEmailSchema>;
type OtpVerifyData = z.infer<typeof otpVerifySchema>;

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [showOtp, setShowOtp] = React.useState(false);
  const [otpEmail, setOtpEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { signIn, signUp, signInWithOtp, verifyOtp, user, userRole } = useAuth();
  const navigate = useNavigate();

  // Handle role-based redirect after successful authentication
  React.useEffect(() => {
    if (user && userRole) {
      if (userRole === 'admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    }
  }, [user, userRole, navigate]);

  const signInForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      emailOrPhone: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const otpEmailForm = useForm<OtpEmailData>({
    resolver: zodResolver(otpEmailSchema),
    defaultValues: {
      email: "",
    },
  });

  const otpVerifyForm = useForm<OtpVerifyData>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: {
      otp: "",
    },
  });

  const handleSignIn = async (data: SignInData) => {
    setLoading(true);
    try {
      const { error } = await signIn(data.emailOrPhone, data.password);
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in.",
        });
        // Navigation will be handled by the auth context based on user role
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpData) => {
    setLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, data.phone);
      
      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Created!",
          description: "Your account has been created successfully. You can now sign in.",
        });
        setIsSignUp(false);
        signUpForm.reset();
      }
    } catch (error) {
      console.error("Sign up error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (data: OtpEmailData) => {
    setLoading(true);
    try {
      const { error } = await signInWithOtp(data.email);
      
      if (error) {
        toast({
          title: "Failed to Send Code",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setOtpEmail(data.email);
        setShowOtp(true);
        toast({
          title: "Code Sent!",
          description: "Check your email for the verification code.",
        });
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (data: OtpVerifyData) => {
    setLoading(true);
    try {
      const { error } = await verifyOtp(otpEmail, data.otp);
      
      if (error) {
        toast({
          title: "Invalid Code",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome!",
          description: "You have been successfully signed in.",
        });
        // Navigation will be handled by the auth context based on user role
      }
    } catch (error) {
      console.error("Verify OTP error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isSignUp ? "Create Account" : "Sign In"}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? "Join our youth ministry community" 
              : "Welcome back! Please sign in to continue."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showOtp ? (
            <Form {...otpVerifyForm}>
              <form onSubmit={otpVerifyForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
                <div className="text-center text-sm text-muted-foreground mb-4">
                  Enter the 6-digit code sent to {otpEmail}
                </div>
                
                <FormField
                  control={otpVerifyForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowOtp(false);
                    setOtpEmail("");
                    otpVerifyForm.reset();
                  }}
                >
                  Back to Sign In
                </Button>
              </form>
            </Form>
          ) : isSignUp ? (
            <Form {...signUpForm}>
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <FormField
                  control={signUpForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your email" 
                          type="email" 
                          {...field}
                          onChange={(e) => {
                            console.log("Email input change:", e.target.value);
                            field.onChange(e);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Create a password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signUpForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Confirm your password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="emailOrPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email or Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email or phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>
          )}

          <Separator className="my-6" />

          <div className="text-center space-y-4">
            <Form {...otpEmailForm}>
              <form onSubmit={otpEmailForm.handleSubmit(handleSendOtp)} className="space-y-4">
                <FormField
                  control={otpEmailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email for Verification Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" variant="outline" disabled={loading}>
                  {loading ? "Sending Code..." : "Send Verification Code"}
                </Button>
              </form>
            </Form>
          </div>

          <Separator className="my-6" />

          <div className="text-center space-y-2">
            {!showOtp && (
              <Button
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  signInForm.reset();
                  signUpForm.reset();
                  otpEmailForm.reset();
                }}
                className="text-sm"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;