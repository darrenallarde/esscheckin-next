"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PublicCheckInForm from "@/components/checkin/PublicCheckInForm";
import DeviceSetupModal from "@/components/checkin/DeviceSetupModal";
import { getTheme, getThemeCSSVariables } from "@/lib/themes";
import { PLATFORM_NAME } from "@/lib/copy";
import { Loader2, Sprout, Tablet } from "lucide-react";

const verses = [
  { text: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
  { text: "Trust in the LORD with all your heart and lean not on your own understanding.", reference: "Proverbs 3:5" },
  { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
  { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", reference: "Joshua 1:9" },
  { text: "The LORD is my shepherd, I lack nothing.", reference: "Psalm 23:1" },
  { text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", reference: "Philippians 4:6" },
];

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  displayName: string | null;
  themeId: string | null;
  checkinStyle: string | null;
}

export default function OrgCheckInPage() {
  const params = useParams();
  const orgSlug = params.org as string;

  const [stars, setStars] = useState<Array<{top: string, left: string, delay: string}>>([]);
  const [verseIndex, setVerseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [notFoundState, setNotFoundState] = useState(false);

  // Device tracking state
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);

  // Check for existing device on mount
  useEffect(() => {
    const storedDeviceId = localStorage.getItem("deviceId");
    const storedDeviceName = localStorage.getItem("deviceName");

    if (storedDeviceId && storedDeviceName) {
      setDeviceId(storedDeviceId);
      setDeviceName(storedDeviceName);
    }
  }, []);

  // Fetch org info and generate stars on mount
  useEffect(() => {
    const fetchOrgInfo = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, display_name, theme_id, checkin_style")
        .eq("slug", orgSlug)
        .eq("status", "active")
        .single();

      if (error || !data) {
        setNotFoundState(true);
        setIsLoading(false);
        return;
      }

      setOrgInfo({
        id: data.id,
        name: data.name,
        slug: data.slug,
        displayName: data.display_name,
        themeId: data.theme_id,
        checkinStyle: data.checkin_style,
      });
      setIsLoading(false);

      // Show device setup if no device stored
      const storedDeviceId = localStorage.getItem("deviceId");
      if (!storedDeviceId) {
        setShowDeviceSetup(true);
      }
    };

    fetchOrgInfo();

    // Generate random stars
    const starArray = Array.from({ length: 50 }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`
    }));
    setStars(starArray);
  }, [orgSlug]);

  // Handle device creation
  const handleDeviceCreated = (newDeviceId: string, newDeviceName: string) => {
    setDeviceId(newDeviceId);
    setDeviceName(newDeviceName);
    setShowDeviceSetup(false);
  };

  // Function to cycle to next verse (called after check-in)
  const nextVerse = () => {
    setVerseIndex((prev) => (prev + 1) % verses.length);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFoundState || !orgInfo) {
    return notFound();
  }

  // Get theme for this org
  const theme = getTheme(orgInfo.themeId);
  const themeStyles = getThemeCSSVariables(theme);

  // Determine check-in style (gamified is default)
  const checkinStyle = orgInfo.checkinStyle || "gamified";
  const displayName = orgInfo.displayName || orgInfo.name;

  // For gamified style, use the JRPG theme
  if (checkinStyle === "gamified") {
    return (
      <div className="jrpg-background min-h-screen relative" style={themeStyles as React.CSSProperties}>
        {/* Device Setup Modal */}
        <DeviceSetupModal
          open={showDeviceSetup}
          organizationId={orgInfo.id}
          onDeviceCreated={handleDeviceCreated}
        />

        {/* Staging environment banner */}
        {process.env.NEXT_PUBLIC_APP_ENV === 'staging' && (
          <div className="fixed top-0 left-0 right-0 bg-amber-500 text-black text-center py-1 text-sm font-bold z-50">
            STAGING ENVIRONMENT - NOT PRODUCTION DATA
          </div>
        )}

        {/* Animated starfield */}
        <div className="jrpg-stars">
          {stars.map((star, i) => (
            <div
              key={i}
              className="jrpg-star"
              style={{
                top: star.top,
                left: star.left,
                animationDelay: star.delay
              }}
            />
          ))}
        </div>

        <div className={`container mx-auto px-4 py-12 relative z-10 ${process.env.NEXT_PUBLIC_APP_ENV === 'staging' ? 'pt-16' : ''}`}>
          <div className="text-center mb-12">
            <h1 className="jrpg-font text-3xl md:text-5xl mb-8 drop-shadow-lg jrpg-float" style={{ color: '#2F4F2F' }}>
              CHECK IN
            </h1>
            <p className="text-lg text-gray-600 mb-4">{displayName}</p>
            <div className="jrpg-textbox max-w-2xl mx-auto mb-4 transition-opacity duration-500">
              <p className="jrpg-font text-xs md:text-sm text-gray-700 leading-relaxed italic mb-2">
                &quot;{verses[verseIndex].text}&quot;
              </p>
              <p className="jrpg-font text-xs text-gray-600 text-right">
                - {verses[verseIndex].reference}
              </p>
            </div>
          </div>

          <PublicCheckInForm onCheckInComplete={nextVerse} orgSlug={orgInfo.slug} deviceId={deviceId} />
        </div>

        {/* Footer with device indicator */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm py-2 z-40">
          <div className="flex items-center justify-between px-4 max-w-4xl mx-auto">
            {deviceName && (
              <button
                onClick={() => setShowDeviceSetup(true)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Tablet className="h-3 w-3" />
                {deviceName}
              </button>
            )}
            <a
              href="https://seedlinginsights.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
            >
              <Sprout className="h-3 w-3" />
              Powered by {PLATFORM_NAME}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Standard style - clean, minimal
  return (
    <div className="min-h-screen bg-gradient-background" style={themeStyles as React.CSSProperties}>
      {/* Device Setup Modal */}
      <DeviceSetupModal
        open={showDeviceSetup}
        organizationId={orgInfo.id}
        onDeviceCreated={handleDeviceCreated}
      />

      {/* Staging environment banner */}
      {process.env.NEXT_PUBLIC_APP_ENV === 'staging' && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-black text-center py-1 text-sm font-bold z-50">
          STAGING ENVIRONMENT - NOT PRODUCTION DATA
        </div>
      )}

      <div className={`container mx-auto px-4 py-12 ${process.env.NEXT_PUBLIC_APP_ENV === 'staging' ? 'pt-16' : ''}`}>
        <div className="text-center mb-12">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary mb-4">
            <Sprout className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{displayName}</h1>
          <p className="text-muted-foreground">Check In</p>

          <div className="max-w-xl mx-auto mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground italic mb-1">
              &quot;{verses[verseIndex].text}&quot;
            </p>
            <p className="text-xs text-muted-foreground text-right">
              - {verses[verseIndex].reference}
            </p>
          </div>
        </div>

        <PublicCheckInForm onCheckInComplete={nextVerse} orgSlug={orgInfo.slug} deviceId={deviceId} />
      </div>

      {/* Footer with device indicator */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm py-2 border-t z-40">
        <div className="flex items-center justify-between px-4 max-w-4xl mx-auto">
          {deviceName && (
            <button
              onClick={() => setShowDeviceSetup(true)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Tablet className="h-3 w-3" />
              {deviceName}
            </button>
          )}
          <a
            href="https://seedlinginsights.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <Sprout className="h-3 w-3" />
            Powered by {PLATFORM_NAME}
          </a>
        </div>
      </div>
    </div>
  );
}
