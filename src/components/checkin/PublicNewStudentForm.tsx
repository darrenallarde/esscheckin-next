"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  validateFormSubmission,
  handleSecurityFailure,
  TIMING_THRESHOLDS,
  honeypotStyles,
} from "@/lib/security";
import * as Sentry from "@sentry/nextjs";

const newStudentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits"),
  email: z.string().trim().email("Invalid email address").min(1, "Email is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  instagramHandle: z.string().trim().optional().or(z.literal("")),
  isStudentLeader: z.boolean(),
  grade: z.string().trim().optional().or(z.literal("")),
  highSchool: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  zip: z.string().trim().optional().or(z.literal("")),
  fatherFirstName: z.string().trim().optional().or(z.literal("")),
  fatherLastName: z.string().trim().optional().or(z.literal("")),
  fatherPhone: z.string().trim().optional().or(z.literal("")),
  motherFirstName: z.string().trim().optional().or(z.literal("")),
  motherLastName: z.string().trim().optional().or(z.literal("")),
  motherPhone: z.string().trim().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
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
  }
});

type NewStudentFormData = z.infer<typeof newStudentSchema>;

interface RegistrationResult {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    user_type: string;
    grade: string | null;
    high_school: string | null;
  };
  checkInId: string;
  profilePin?: string;
}

interface PublicNewStudentFormProps {
  onSuccess: (result: RegistrationResult) => void;
  onBack: () => void;
  orgSlug: string;
  deviceId?: string | null;
  checkinStyle?: string;
}

const PublicNewStudentForm = ({ onSuccess, onBack, orgSlug, deviceId, checkinStyle = 'gamified' }: PublicNewStudentFormProps) => {
  const isGamified = checkinStyle === 'gamified';
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security: Honeypot and timing
  const [honeypot, setHoneypot] = useState('');
  const formLoadTime = useRef<number>(Date.now());

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
    // Security validation
    const security = validateFormSubmission(
      honeypot,
      formLoadTime.current,
      TIMING_THRESHOLDS.REGISTRATION_FORM
    );
    if (!security.isValid) {
      setIsSubmitting(true);
      await handleSecurityFailure(security.failureReason!);
      setIsSubmitting(false);
      return; // Silent fail
    }

    setIsSubmitting(true);
    const supabase = createClient();
    try {
      // Use public RPC function with optional device tracking
      const { data: result, error } = await supabase
        .rpc('register_student_and_checkin_public', {
          p_org_slug: orgSlug,
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
          p_device_id: deviceId || null,
        });

      if (error) {
        Sentry.captureException(error, {
          tags: { action: 'public_registration', org_slug: orgSlug },
        });
        throw error;
      }

      if (result && result[0]?.success) {
        // Pass registration result back to parent for success screen
        onSuccess({
          student: {
            id: result[0].student_id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email || null,
            user_type: data.isStudentLeader ? 'student_leader' : 'student',
            grade: data.grade || null,
            high_school: data.highSchool || null,
          },
          checkInId: result[0].check_in_id,
          profilePin: result[0].profile_pin,
        });
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

  // Common input class based on style
  const inputClass = isGamified ? "jrpg-input" : "";
  const labelClass = isGamified ? "jrpg-font text-xs text-gray-700" : "";
  const sectionHeaderClass = isGamified
    ? "jrpg-font text-xs text-gray-700 uppercase"
    : "text-sm font-semibold text-foreground uppercase tracking-wide";
  const optionalHeaderClass = isGamified
    ? "jrpg-font text-xs text-gray-600 uppercase"
    : "text-sm font-semibold text-muted-foreground uppercase tracking-wide";

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Honeypot field */}
        <input
          type="text"
          name="company"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          style={honeypotStyles}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {/* Student Leader Toggle */}
        <FormField
          control={form.control}
          name="isStudentLeader"
          render={({ field }) => (
            <FormItem className={isGamified
              ? "flex flex-row items-center justify-between p-4 bg-green-100/50 border-2 border-green-600/50"
              : "flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50"
            }>
              <div className="space-y-0.5">
                <FormLabel className={isGamified ? "jrpg-font text-xs text-gray-700" : "text-base font-medium"}>
                  {isGamified ? "I'M A LEADER" : "I'm a Student Leader"}
                </FormLabel>
                <p className={isGamified ? "text-xs text-gray-600" : "text-sm text-muted-foreground"}>
                  {isGamified ? "Toggle if you're a volunteer" : "Toggle this if you're a volunteer or adult leader"}
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

        {/* REQUIRED FIELDS */}
        <div className="space-y-4">
          <h3 className={sectionHeaderClass}>
            {isGamified ? "REQUIRED INFO" : "Required Information"}
          </h3>

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>{isGamified ? "FIRST NAME *" : "First Name *"}</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter first name" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage className={isGamified ? "jrpg-font text-xs text-red-600" : ""} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>{isGamified ? "LAST NAME *" : "Last Name *"}</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter last name" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage className={isGamified ? "jrpg-font text-xs text-red-600" : ""} />
                </FormItem>
              )}
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>{isGamified ? "PHONE *" : "Phone Number *"}</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" type="tel" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage className={isGamified ? "jrpg-font text-xs text-red-600" : ""} />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>{isGamified ? "EMAIL *" : "Email *"}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage className={isGamified ? "jrpg-font text-xs text-red-600" : ""} />
                </FormItem>
              )}
            />
          </div>

          {/* DOB */}
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>{isGamified ? "BIRTHDAY *" : "Date of Birth *"}</FormLabel>
                <FormControl>
                  <Input type="date" className={`${inputClass} w-full md:w-1/2`} {...field} />
                </FormControl>
                <FormMessage className={isGamified ? "jrpg-font text-xs text-red-600" : ""} />
              </FormItem>
            )}
          />

          {/* Grade & School */}
          {!isStudentLeader && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>{isGamified ? "GRADE *" : "Grade *"}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="6">6th Grade</SelectItem>
                        <SelectItem value="7">7th Grade</SelectItem>
                        <SelectItem value="8">8th Grade</SelectItem>
                        <SelectItem value="9">9th Grade</SelectItem>
                        <SelectItem value="10">10th Grade</SelectItem>
                        <SelectItem value="11">11th Grade</SelectItem>
                        <SelectItem value="12">12th Grade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className={isGamified ? "jrpg-font text-xs text-red-600" : ""} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="highSchool"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>{isGamified ? "SCHOOL *" : "School Name *"}</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your school" className={inputClass} {...field} />
                    </FormControl>
                    <FormMessage className={isGamified ? "jrpg-font text-xs text-red-600" : ""} />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* OPTIONAL FIELDS */}
        <div className={isGamified ? "space-y-4 pt-4 border-t-2 border-green-600/30" : "space-y-4 pt-4 border-t border-dashed"}>
          <h3 className={optionalHeaderClass}>
            {isGamified ? "OPTIONAL INFO" : "Optional Information"}
          </h3>

          {/* Instagram */}
          <FormField
            control={form.control}
            name="instagramHandle"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>{isGamified ? "INSTAGRAM" : "Instagram Handle"}</FormLabel>
                <FormControl>
                  <Input placeholder="@username" className={`${inputClass} w-full md:w-1/2`} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Address */}
          <div className="space-y-3">
            <h4 className={isGamified ? "jrpg-font text-xs text-gray-600" : "text-sm font-medium text-muted-foreground"}>
              {isGamified ? "ADDRESS" : "Address"}
            </h4>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={labelClass}>{isGamified ? "STREET" : "Street Address"}</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="col-span-2 md:col-span-2">
                    <FormLabel className={labelClass}>{isGamified ? "CITY" : "City"}</FormLabel>
                    <FormControl>
                      <Input placeholder="Los Angeles" className={inputClass} {...field} />
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
                    <FormLabel className={labelClass}>{isGamified ? "STATE" : "State"}</FormLabel>
                    <FormControl>
                      <Input placeholder="CA" className={inputClass} {...field} />
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
                    <FormLabel className={labelClass}>{isGamified ? "ZIP" : "ZIP"}</FormLabel>
                    <FormControl>
                      <Input placeholder="90210" className={inputClass} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Parent Info */}
          {!isStudentLeader && (
            <div className="space-y-4">
              <h4 className={isGamified ? "jrpg-font text-xs text-gray-600" : "text-sm font-medium text-muted-foreground"}>
                {isGamified ? "PARENT INFO" : "Parent/Guardian Information"}
              </h4>

              {/* Father */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="fatherFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>{isGamified ? "DAD FIRST" : "Father's First Name"}</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" className={inputClass} {...field} />
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
                      <FormLabel className={labelClass}>{isGamified ? "DAD LAST" : "Father's Last Name"}</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" className={inputClass} {...field} />
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
                      <FormLabel className={labelClass}>{isGamified ? "DAD PHONE" : "Father's Phone"}</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" type="tel" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Mother */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="motherFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>{isGamified ? "MOM FIRST" : "Mother's First Name"}</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" className={inputClass} {...field} />
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
                      <FormLabel className={labelClass}>{isGamified ? "MOM LAST" : "Mother's Last Name"}</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" className={inputClass} {...field} />
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
                      <FormLabel className={labelClass}>{isGamified ? "MOM PHONE" : "Mother's Phone"}</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" type="tel" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant={isGamified ? "default" : "outline"}
            onClick={onBack}
            className={isGamified ? "jrpg-button flex-1" : "flex-1"}
          >
            {isGamified ? "BACK" : "Back to Search"}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className={isGamified ? "jrpg-button flex-1" : "flex-1"}
          >
            {isSubmitting
              ? (isGamified ? "LOADING..." : "Registering...")
              : (isGamified
                  ? `REGISTER${isStudentLeader ? ' AS LEADER' : ''}`
                  : `Register & Check In${isStudentLeader ? ' as Leader' : ''}`
                )
            }
          </Button>
        </div>
      </form>
    </Form>
  );

  // Render with appropriate wrapper
  if (isGamified) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="jrpg-textbox jrpg-corners">
          <div className="text-center mb-6">
            <h3 className="jrpg-font text-sm text-gray-700 mb-2">NEW ADVENTURER</h3>
            <p className="text-xs text-gray-600">Join the party and check in!</p>
          </div>
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>New Registration</CardTitle>
        <CardDescription>
          Let&apos;s get you registered and checked in for today&apos;s ministry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
};

export default PublicNewStudentForm;
