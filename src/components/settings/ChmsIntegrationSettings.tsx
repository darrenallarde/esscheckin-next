"use client";

import { useState } from "react";
import {
  useChmsConnection,
  useChmsSyncHistory,
} from "@/hooks/queries/use-chms-connection";
import {
  useSaveChmsConnection,
  useDeleteChmsConnection,
  useTestChmsConnection,
  useChmsImport,
} from "@/hooks/mutations/use-chms-sync";
import { ChmsProviderCard } from "./ChmsProviderCard";
import { ChmsSyncStatus } from "./ChmsSyncStatus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Unplug,
  RefreshCw,
  Download,
} from "lucide-react";

type Provider = "rock" | "planning_center" | "ccb";

const PROVIDER_CONFIG: Record<
  Provider,
  {
    name: string;
    description: string;
    fields: Array<{
      key: string;
      label: string;
      placeholder: string;
      type: "text" | "password" | "url";
    }>;
    urlField?: { key: string; label: string; placeholder: string };
  }
> = {
  rock: {
    name: "Rock RMS",
    description: "Open-source, self-hosted church management",
    urlField: {
      key: "base_url",
      label: "Server URL",
      placeholder: "https://rock.mychurch.com",
    },
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "Your Rock RMS REST API key",
        type: "password",
      },
    ],
  },
  planning_center: {
    name: "Planning Center",
    description: "Cloud-based church management platform",
    fields: [
      {
        key: "app_id",
        label: "Application ID",
        placeholder: "Personal Access Token App ID",
        type: "text",
      },
      {
        key: "secret",
        label: "Secret",
        placeholder: "Personal Access Token Secret",
        type: "password",
      },
    ],
  },
  ccb: {
    name: "CCB (Pushpay)",
    description: "Church Community Builder",
    urlField: {
      key: "base_url",
      label: "Church URL",
      placeholder: "mychurch.ccbchurch.com",
    },
    fields: [
      {
        key: "username",
        label: "API Username",
        placeholder: "API username",
        type: "text",
      },
      {
        key: "password",
        label: "API Password",
        placeholder: "API password",
        type: "password",
      },
    ],
  },
};

interface Props {
  organizationId: string;
}

export function ChmsIntegrationSettings({ organizationId }: Props) {
  const { data: connection, isLoading } = useChmsConnection(organizationId);
  const { data: syncHistory } = useChmsSyncHistory(organizationId);

  const saveConnection = useSaveChmsConnection();
  const deleteConnection = useDeleteChmsConnection();
  const testConnection = useTestChmsConnection();
  const importData = useChmsImport();

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null
  );
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{
    status: "idle" | "testing" | "success" | "error";
    error?: string;
  }>({ status: "idle" });

  // Determine current state
  const hasConnection = !!connection;
  const isConnected = hasConnection && !!connection.connection_verified_at;
  const activeProvider = connection?.provider || selectedProvider;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // If no connection yet, show provider picker
  if (!hasConnection && !selectedProvider) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Church Database</CardTitle>
            <CardDescription>
              Import students and families from your existing church management
              system. Select your provider to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {(Object.keys(PROVIDER_CONFIG) as Provider[]).map((provider) => (
                <ChmsProviderCard
                  key={provider}
                  provider={provider}
                  name={PROVIDER_CONFIG[provider].name}
                  description={PROVIDER_CONFIG[provider].description}
                  selected={false}
                  onClick={() => setSelectedProvider(provider)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const providerKey = activeProvider as Provider;
  const config = PROVIDER_CONFIG[providerKey];

  // Connection form (no connection saved yet, or editing)
  if (!hasConnection && selectedProvider) {
    const handleSave = async () => {
      const credentials: Record<string, string> = {};
      for (const field of config.fields) {
        credentials[field.key] = formValues[field.key] || "";
      }

      try {
        await saveConnection.mutateAsync({
          organizationId,
          provider: selectedProvider,
          displayName: config.name,
          baseUrl: config.urlField
            ? formValues[config.urlField.key] || null
            : null,
          credentials,
        });

        // Auto-test after save
        setTestResult({ status: "testing" });
        try {
          await testConnection.mutateAsync(organizationId);
          setTestResult({ status: "success" });
        } catch (err: unknown) {
          setTestResult({
            status: "error",
            error: err instanceof Error ? err.message : "Test failed",
          });
        }
      } catch {
        // Save error handled by mutation
      }
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connect to {config.name}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedProvider(null);
                  setFormValues({});
                  setTestResult({ status: "idle" });
                }}
              >
                Change provider
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL field (Rock and CCB) */}
            {config.urlField && (
              <div className="space-y-2">
                <Label htmlFor={config.urlField.key}>
                  {config.urlField.label}
                </Label>
                <Input
                  id={config.urlField.key}
                  type="url"
                  placeholder={config.urlField.placeholder}
                  value={formValues[config.urlField.key] || ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [config.urlField!.key]: e.target.value,
                    }))
                  }
                />
              </div>
            )}

            {/* Credential fields */}
            {config.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formValues[field.key] || ""}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}

            {/* Test result */}
            {testResult.status === "success" && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Connection verified
              </div>
            )}
            {testResult.status === "error" && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <XCircle className="h-4 w-4" />
                {testResult.error || "Connection failed"}
              </div>
            )}

            {/* Save & Test button */}
            <Button
              onClick={handleSave}
              disabled={saveConnection.isPending || testConnection.isPending}
            >
              {saveConnection.isPending || testConnection.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {saveConnection.isPending
                    ? "Saving..."
                    : "Testing connection..."}
                </>
              ) : (
                "Save & Test Connection"
              )}
            </Button>

            {saveConnection.isError && (
              <p className="text-sm text-red-600">
                {saveConnection.error?.message || "Failed to save"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected state — show status + sync controls
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {config.name}
                  {isConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-yellow-600" />
                  )}
                </CardTitle>
                <CardDescription>
                  {connection?.base_url || "Connected"}
                  {connection?.connection_verified_at && (
                    <> &middot; Verified{" "}
                    {new Date(
                      connection.connection_verified_at
                    ).toLocaleDateString()}
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Unplug className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect {config.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the connection and stop syncing. Your
                    existing student data in SheepDoggo will not be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteConnection.mutate(organizationId)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnection.mutate(organizationId)}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Test Connection
            </Button>
          </div>

          {testConnection.isSuccess && (
            <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Connection verified
            </p>
          )}
          {testConnection.isError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <XCircle className="h-4 w-4" />{" "}
              {testConnection.error?.message || "Test failed"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Import Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Import</CardTitle>
          <CardDescription>
            Import students and families from {config.name} into SheepDoggo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Last sync info */}
          {connection?.last_sync_at && (
            <div className="text-sm text-muted-foreground">
              Last sync:{" "}
              {new Date(connection.last_sync_at).toLocaleString()}
              {connection.last_sync_stats && (
                <>
                  {" "}&middot;{" "}
                  {connection.last_sync_stats.created ?? 0} created,{" "}
                  {connection.last_sync_stats.linked ?? 0} linked,{" "}
                  {connection.last_sync_stats.updated ?? 0} updated
                </>
              )}
            </div>
          )}

          {connection?.last_sync_status === "error" &&
            connection.last_sync_error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 rounded-md p-3">
                Last sync failed: {connection.last_sync_error}
              </div>
            )}

          <div className="flex items-center gap-3">
            <Button
              onClick={() => importData.mutate(organizationId)}
              disabled={importData.isPending}
            >
              {importData.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Import Now
                </>
              )}
            </Button>
          </div>

          {importData.isSuccess && importData.data && (
            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/20 rounded-md p-3">
              Import complete!
              {importData.data.people?.stats && (
                <>
                  {" "}People: {importData.data.people.stats.created} created,{" "}
                  {importData.data.people.stats.linked} linked,{" "}
                  {importData.data.people.stats.updated} updated.
                </>
              )}
              {importData.data.families?.stats && (
                <>
                  {" "}Families: {importData.data.families.stats.created} links
                  created.
                </>
              )}
            </div>
          )}

          {importData.isError && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 rounded-md p-3">
              Import failed: {importData.error?.message || "Unknown error"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      {syncHistory && syncHistory.length > 0 && (
        <ChmsSyncStatus history={syncHistory} />
      )}
    </div>
  );
}
