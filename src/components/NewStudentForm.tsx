import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const newStudentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be less than 15 digits"),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  instagramHandle: z.string().trim().optional().or(z.literal("")),
  isStudentLeader: z.boolean().default(false),
  grade: z.string().trim().optional().or(z.literal("")),
  highSchool: z.string().trim().optional().or(z.literal("")),
  parentName: z.string().trim().optional().or(z.literal("")),
  parentPhone: z.string().trim().optional().or(z.literal("")),
}).refine((data) => {
  // If not a student leader, these fields are required
  if (!data.isStudentLeader) {
    return data.grade && data.grade.length > 0 && 
           data.highSchool && data.highSchool.length > 0 && 
           data.parentName && data.parentName.length > 0 && 
           data.parentPhone && data.parentPhone.length >= 10;
  }
  return true;
}, {
  message: "Grade, high school, and parent information are required for students",
  path: ["grade"], // This will show the error on the grade field
});

type NewStudentFormData = z.infer<typeof newStudentSchema>;

interface NewStudentFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

const NewStudentForm = ({ onSuccess, onBack }: NewStudentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewStudentFormData>({
    resolver: zodResolver(newStudentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
      email: "",
      dateOfBirth: "",
      instagramHandle: "",
      isStudentLeader: false,
      grade: "",
      highSchool: "",
      parentName: "",
      parentPhone: "",
    },
  });

  const isStudentLeader = form.watch("isStudentLeader");

  const onSubmit = async (data: NewStudentFormData) => {
    setIsSubmitting(true);
    try {
      // Use the secure registration function
      const { data: result, error } = await supabase
        .rpc('register_student_and_checkin', {
          p_first_name: data.firstName,
          p_last_name: data.lastName,
          p_phone_number: data.phoneNumber || null,
          p_email: data.email || null,
          p_date_of_birth: data.dateOfBirth,
          p_instagram_handle: data.instagramHandle || null,
          p_user_type: data.isStudentLeader ? 'student_leader' : 'student',
          p_grade: data.isStudentLeader ? null : data.grade,
          p_high_school: data.isStudentLeader ? null : data.highSchool,
          p_parent_name: data.isStudentLeader ? null : data.parentName,
          p_parent_phone: data.isStudentLeader ? null : data.parentPhone,
        });

      if (error) {
        throw error;
      }

      if (result && result[0]?.success) {

        const userType = data.isStudentLeader ? "Student Leader" : "Student";
        toast({
          title: "Success!",
          description: `Welcome ${data.firstName}! You've been successfully registered as a ${userType} and checked in.`,
        });

        onSuccess();
      } else {
        throw new Error(result?.[0]?.message || 'Registration failed');
      }
    } catch (error) {
      console.error("Error creating student:", error);
      toast({
        title: "Error",
        description: "Failed to register. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>New Registration</CardTitle>
        <CardDescription>
          Let's get you registered and checked in for today's ministry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* User Type Toggle */}
            <FormField
              control={form.control}
              name="isStudentLeader"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Student Leader</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Check this if you're a student leader or volunteer
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instagramHandle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram Handle (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Student-specific fields - only show if not a student leader */}
            {!isStudentLeader && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter grade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="highSchool"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>High School</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter high school" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="parentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter parent name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parentPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent/Guardian Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter parent phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="flex-1"
              >
                Back to Search
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Registering..." : `Register & Check In${isStudentLeader ? ' as Leader' : ''}`}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NewStudentForm;