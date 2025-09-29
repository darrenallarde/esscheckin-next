import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const magicLinkSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

type MagicLinkData = z.infer<typeof magicLinkSchema>;

const AuthPage = () => {
  const [loading, setLoading] = React.useState(false);
  const { signInWithOtp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard after authentication
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const magicLinkForm = useForm<MagicLinkData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSendMagicLink = async (data: MagicLinkData) => {
    setLoading(true);
    try {
      const { error } = await signInWithOtp(data.email);
      
      if (error) {
        toast({
          title: "Failed to Send Magic Link",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Magic Link Sent!",
          description: "Check your email and click the link to sign in.",
        });
        magicLinkForm.reset();
      }
    } catch (error) {
      console.error("Send magic link error:", error);
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
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>
            Enter your email to receive a magic link and sign in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...magicLinkForm}>
            <form onSubmit={magicLinkForm.handleSubmit(handleSendMagicLink)} className="space-y-4">
              <FormField
                control={magicLinkForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending Magic Link..." : "Send Magic Link"}
              </Button>
            </form>
          </Form>

          <Separator className="my-6" />

          {/* Quick Admin Login - Testing Only */}
          <div className="text-center space-y-2">
            <Button
              variant="secondary"
              onClick={async () => {
                setLoading(true);
                try {
                  const { error } = await signInWithOtp("dallarde@echo.church");
                  if (error) {
                    toast({
                      title: "Failed to Send Magic Link",
                      description: error.message,
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Magic Link Sent!",
                      description: "Check your email for the admin magic link.",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to send admin magic link.",
                    variant: "destructive",
                  });
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Sending..." : "Quick Admin Magic Link (Testing)"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sends magic link to: dallarde@echo.church
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;