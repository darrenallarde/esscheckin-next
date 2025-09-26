import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

const checkInSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Invalid phone number"),
  grade: z.string().trim().min(1, "Grade is required"),
  highSchool: z.string().trim().min(1, "High school is required").max(100, "High school name must be less than 100 characters"),
  parentName: z.string().trim().min(1, "Parent name is required").max(100, "Parent name must be less than 100 characters"),
  parentPhone: z.string().trim().min(10, "Parent phone must be at least 10 digits").max(15, "Invalid parent phone number"),
  checkinStreak: z.coerce.number().min(0, "Check-in streak must be 0 or greater"),
});

type CheckInFormData = z.infer<typeof checkInSchema>;

const CheckInForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<CheckInFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CheckInFormData>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      checkinStreak: 0,
    },
  });

  const onSubmit = async (data: CheckInFormData) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const submissionData = {
        ...data,
        dateCheckedIn: new Date().toISOString().split('T')[0],
      };
      
      setSubmittedData(submissionData);
      setIsSubmitted(true);
      
      toast({
        title: "Check-in successful!",
        description: `Welcome ${data.firstName}! You've been checked in.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewCheckIn = () => {
    setIsSubmitted(false);
    setSubmittedData(null);
    reset();
  };

  if (isSubmitted && submittedData) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-card">
        <CardHeader className="text-center bg-gradient-primary text-primary-foreground rounded-t-lg">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl">Check-in Complete!</CardTitle>
          <CardDescription className="text-primary-foreground/90">
            Welcome to youth ministry, {submittedData.firstName}!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-muted-foreground">Name</p>
              <p>{submittedData.firstName} {submittedData.lastName}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Grade</p>
              <p>{submittedData.grade}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">High School</p>
              <p>{submittedData.highSchool}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Check-in Streak</p>
              <p className="text-accent font-bold">{submittedData.checkinStreak} weeks</p>
            </div>
            <div className="col-span-2">
              <p className="font-semibold text-muted-foreground">Date Checked In</p>
              <p>{new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <Button 
            onClick={handleNewCheckIn}
            className="w-full bg-gradient-accent hover:opacity-90 transition-opacity"
          >
            Check In Another Student
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-card">
      <CardHeader className="bg-gradient-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-2xl text-center">Student Check-In</CardTitle>
        <CardDescription className="text-center text-primary-foreground/90">
          Welcome to youth ministry! Please fill out your information below.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Student Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Student Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  className="shadow-input"
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  className="shadow-input"
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  {...register("phoneNumber")}
                  className="shadow-input"
                  placeholder="(123) 456-7890"
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  {...register("grade")}
                  className="shadow-input"
                  placeholder="9th, 10th, 11th, 12th"
                />
                {errors.grade && (
                  <p className="text-sm text-destructive">{errors.grade.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="highSchool">High School</Label>
              <Input
                id="highSchool"
                {...register("highSchool")}
                className="shadow-input"
                placeholder="Enter high school name"
              />
              {errors.highSchool && (
                <p className="text-sm text-destructive">{errors.highSchool.message}</p>
              )}
            </div>
          </div>

          {/* Parent Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Parent Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parentName">Parent/Guardian Name</Label>
                <Input
                  id="parentName"
                  {...register("parentName")}
                  className="shadow-input"
                  placeholder="Enter parent name"
                />
                {errors.parentName && (
                  <p className="text-sm text-destructive">{errors.parentName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="parentPhone">Parent Phone Number</Label>
                <Input
                  id="parentPhone"
                  {...register("parentPhone")}
                  className="shadow-input"
                  placeholder="(123) 456-7890"
                />
                {errors.parentPhone && (
                  <p className="text-sm text-destructive">{errors.parentPhone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Check-in Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
              Check-in Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkinStreak">Check-in Streak (weeks)</Label>
                <Input
                  id="checkinStreak"
                  type="number"
                  min="0"
                  {...register("checkinStreak")}
                  className="shadow-input"
                  placeholder="0"
                />
                {errors.checkinStreak && (
                  <p className="text-sm text-destructive">{errors.checkinStreak.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Check-in Date</Label>
                <Input
                  value={new Date().toLocaleDateString()}
                  disabled
                  className="shadow-input bg-muted"
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-gradient-primary hover:opacity-90 transition-opacity h-12 text-lg font-semibold"
          >
            {isSubmitting ? "Checking In..." : "Check In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CheckInForm;