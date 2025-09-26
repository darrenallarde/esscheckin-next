import CheckInForm from "@/components/CheckInForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Youth Ministry Check-In
          </h1>
          <p className="text-xl text-muted-foreground">
            Welcome! Let's get you checked in for today's ministry.
          </p>
        </div>
        <CheckInForm />
      </div>
    </div>
  );
};

export default Index;
