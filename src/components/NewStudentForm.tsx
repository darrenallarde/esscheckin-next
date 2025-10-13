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
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits"),
  email: z.string().trim().email("Invalid email address").min(1, "Email is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  instagramHandle: z.string().trim().optional().or(z.literal("")),
  isStudentLeader: z.boolean().default(false),
  grade: z.string().trim().optional().or(z.literal("")),
  highSchool: z.string().trim().optional().or(z.literal("")),
  // Address information
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().min(1, "State is required"),
  zip: z.string().trim().optional().or(z.literal("")),
  // Father information
  fatherFirstName: z.string().trim().optional().or(z.literal("")),
  fatherLastName: z.string().trim().optional().or(z.literal("")),
  fatherPhone: z.string().trim().optional().or(z.literal("")),
  // Mother information
  motherFirstName: z.string().trim().optional().or(z.literal("")),
  motherLastName: z.string().trim().optional().or(z.literal("")),
  motherPhone: z.string().trim().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  // Student-specific validations
  if (!data.isStudentLeader) {
    if (!data.grade || data.grade.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["grade"],
        message: "Grade is required for students",
      });
    }
    if (!data.highSchool || data.highSchool.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["highSchool"],
        message: "High school is required for students",
      });
    }

    // Parent information is now optional - no validation required
  }
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
      address: "",
      city: "",
      state: "California",
      zip: "",
      fatherFirstName: "",
      fatherLastName: "",
      fatherPhone: "",
      motherFirstName: "",
      motherLastName: "",
      motherPhone: "",
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
          p_father_first_name: data.isStudentLeader ? null : data.fatherFirstName || null,
          p_father_last_name: data.isStudentLeader ? null : data.fatherLastName || null,
          p_father_phone: data.isStudentLeader ? null : data.fatherPhone || null,
          p_mother_first_name: data.isStudentLeader ? null : data.motherFirstName || null,
          p_mother_last_name: data.isStudentLeader ? null : data.motherLastName || null,
          p_mother_phone: data.isStudentLeader ? null : data.motherPhone || null,
          p_address: data.address || null,
          p_city: data.city || null,
          p_state: data.state || 'California',
          p_zip: data.zip || null,
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
                      <Input
                        placeholder="Enter phone number"
                        {...field}
                      />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        {...field}
                      />
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

            {/* Address Information */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-foreground">Address Information (Optional)</h4>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Los Angeles" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input placeholder="California" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="90210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter school name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Father Information */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Father Information (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="fatherFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fatherLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fatherPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Mother Information */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Mother Information (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="motherFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="motherLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="motherPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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