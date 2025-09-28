import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const newStudentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be less than 15 digits"),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  grade: z.string().trim().min(1, "Grade is required").max(20, "Grade must be less than 20 characters"),
  highSchool: z.string().trim().min(1, "High school is required").max(100, "High school must be less than 100 characters"),
  parentName: z.string().trim().min(1, "Parent name is required").max(100, "Parent name must be less than 100 characters"),
  parentPhone: z.string().trim().min(10, "Parent phone must be at least 10 digits").max(15, "Parent phone must be less than 15 digits"),
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
      grade: "",
      highSchool: "",
      parentName: "",
      parentPhone: "",
    },
  });

  const onSubmit = async (data: NewStudentFormData) => {
    setIsSubmitting(true);
    try {
      // Create new student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber,
          email: data.email || null,
          grade: data.grade,
          high_school: data.highSchool,
          parent_name: data.parentName,
          parent_phone: data.parentPhone,
        })
        .select()
        .single();

      if (studentError) {
        throw studentError;
      }

      // Create check-in record
      const { error: checkinError } = await supabase
        .from('check_ins')
        .insert({
          student_id: student.id,
        });

      if (checkinError) {
        throw checkinError;
      }

      toast({
        title: "Success!",
        description: `Welcome ${data.firstName}! You've been successfully registered and checked in.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error creating student:", error);
      toast({
        title: "Error",
        description: "Failed to register student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>New Student Registration</CardTitle>
        <CardDescription>
          Let's get you registered and checked in for today's ministry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                {isSubmitting ? "Registering..." : "Register & Check In"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NewStudentForm;