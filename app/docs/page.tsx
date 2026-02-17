/**
 * API Documentation Page
 * 
 * Provides access to interactive API documentation and explorer.
 * Only accessible in development environment for security.
 */

import { ApiExplorer } from "@/components/dev/api-explorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                API documentation is only accessible in development mode for security reasons.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Available Documentation:</h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href="/api/health" className="text-blue-600 hover:underline">
                    /api/health - System Health Check
                  </Link>
                </li>
                <li>
                  <Link href="/api/ready" className="text-blue-600 hover:underline">
                    /api/ready - Readiness Check
                  </Link>
                </li>
              </ul>
            </div>

            <div className="pt-4">
              <Button asChild variant="outline">
                <Link href="/">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Return to Melo
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Melo API Documentation</h1>
              <p className="text-muted-foreground text-sm">
                Interactive API explorer and documentation
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/api/health">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Health Check
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Back to Melo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ApiExplorer />
      
      <footer className="border-t bg-muted/50 py-6 mt-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>
              <p>Melo API Documentation - Development Environment</p>
            </div>
            <div className="flex items-center gap-4">
              <span>Generated from source code</span>
              <Link 
                href="https://github.com/aaron777collins/melo-v2" 
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}