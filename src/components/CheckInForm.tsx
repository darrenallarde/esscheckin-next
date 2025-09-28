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
import NewStudentForm from "./NewStudentForm";
import CheckInSuccess from "./CheckInSuccess";

// Schema for phone search
const phoneSearchSchema = z.object({
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be less than 15 digits"),
});

// Schema for name/email search
const nameEmailSearchSchema = z.object({
  searchTerm: z.string().trim().min(1, "Please enter a name or email"),
});

type PhoneSearchData = z.infer<typeof phoneSearchSchema>;
type NameEmailSearchData = z.infer<typeof nameEmailSearchSchema>;

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string;
  high_school: string;
  parent_name: string;
  parent_phone: string;
  created_at: string;
}

type ViewState = 
  | { type: 'phone-search' }
  | { type: 'name-search' }
  | { type: 'confirm-student', student: Student }
  | { type: 'new-student' }
  | { type: 'success', student: Student };

const CheckInForm = () => {
  const [viewState, setViewState] = useState<ViewState>({ type: 'phone-search' });
  const [isSearching, setIsSearching] = useState(false);

  const phoneForm = useForm<PhoneSearchData>({
    resolver: zodResolver(phoneSearchSchema),
    defaultValues: { phoneNumber: "" },
  });

  const nameForm = useForm<NameEmailSearchData>({
    resolver: zodResolver(nameEmailSearchSchema),
    defaultValues: { searchTerm: "" },
  });

  const searchByPhone = async (data: PhoneSearchData) => {
    setIsSearching(true);
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('phone_number', data.phoneNumber)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (students) {
        setViewState({ type: 'confirm-student', student: students });
      } else {
        toast({
          title: "Student not found",
          description: "No student found with that phone number. Try searching by name or register as a new student.",
        });
        setViewState({ type: 'name-search' });
      }
    } catch (error) {
      console.error("Error searching by phone:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const searchByNameOrEmail = async (data: NameEmailSearchData) => {
    setIsSearching(true);
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .or(`first_name.ilike.%${data.searchTerm}%,last_name.ilike.%${data.searchTerm}%,email.ilike.%${data.searchTerm}%`);

      if (error) {
        throw error;
      }

      if (students && students.length > 0) {
        // For simplicity, take the first match. In a real app, you'd show a list to choose from
        setViewState({ type: 'confirm-student', student: students[0] });
      } else {
        toast({
          title: "Student not found",
          description: "No student found with that name or email. Let's register you as a new student!",
        });
        setViewState({ type: 'new-student' });
      }
    } catch (error) {
      console.error("Error searching by name/email:", error);
      toast({
        title: "Search Error", 
        description: "Failed to search for student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const confirmCheckIn = async (student: Student) => {
    setIsSearching(true);
    try {
      const { error } = await supabase
        .from('check_ins')
        .insert({
          student_id: student.id,
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Check-in successful!",
        description: `Welcome back ${student.first_name}!`,
      });
      
      setViewState({ type: 'success', student });
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: "Check-in Error",
        description: "Failed to check in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const resetToSearch = () => {
    setViewState({ type: 'phone-search' });
    phoneForm.reset();
    nameForm.reset();
  };

  // Success view
  if (viewState.type === 'success') {
    return <CheckInSuccess student={viewState.student} onNewCheckIn={resetToSearch} />;
  }

  // New student form
  if (viewState.type === 'new-student') {
    return (
      <NewStudentForm 
        onSuccess={() => setViewState({ type: 'phone-search' })}
        onBack={() => setViewState({ type: 'name-search' })}
      />
    );
  }

  // Student confirmation view
  if (viewState.type === 'confirm-student') {
    const { student } = viewState;
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Confirm Check-In</CardTitle>
          <CardDescription>
            Is this you?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <h3 className="font-semibold text-lg">
              {student.first_name} {student.last_name}
            </h3>
            <p className="text-muted-foreground">{student.grade} at {student.high_school}</p>
            {student.phone_number && (
              <p className="text-sm text-muted-foreground">Phone: {student.phone_number}</p>
            )}
            {student.email && (
              <p className="text-sm text-muted-foreground">Email: {student.email}</p>
            )}
          </div>
          
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setViewState({ type: 'phone-search' })}
              className="flex-1"
            >
              No, search again
            </Button>
            <Button
              onClick={() => confirmCheckIn(student)}
              disabled={isSearching}
              className="flex-1"
            >
              {isSearching ? "Checking in..." : "Yes, that's me!"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Phone search view
  if (viewState.type === 'phone-search') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Youth Ministry Check-In</CardTitle>
          <CardDescription>
            Enter your phone number to check in quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(searchByPhone)} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your phone number" 
                        {...field} 
                        autoFocus
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Find Me"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setViewState({ type: 'name-search' })}
                  className="text-sm"
                >
                  Search by name or email instead
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  // Name/email search view
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Search by Name or Email</CardTitle>
        <CardDescription>
          Enter your first name, last name, or email address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...nameForm}>
          <form onSubmit={nameForm.handleSubmit(searchByNameOrEmail)} className="space-y-4">
            <FormField
              control={nameForm.control}
              name="searchTerm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name or Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your name or email" 
                      {...field} 
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewState({ type: 'phone-search' })}
                className="flex-1"
              >
                Back to Phone Search
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={isSearching}
              >
                {isSearching ? "Searching..." : "Find Me"}
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setViewState({ type: 'new-student' })}
                className="text-sm"
              >
                I'm a new student
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CheckInForm;