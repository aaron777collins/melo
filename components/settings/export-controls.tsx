/**
 * Export Controls Component
 * 
 * UI controls for GDPR-compliant data export with format selection, 
 * progress indication, and download functionality.
 */

"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  FileText, 
  Table, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Info,
  Database,
  MessageSquare,
  Users,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import {
  ExportFormat,
  ExportProgress,
  ExportData,
  exportUserData,
  downloadExportData,
} from "@/lib/matrix/data-export";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ExportControlsProps {
  className?: string;
}

type ExportState = 'idle' | 'exporting' | 'complete' | 'error';

// =============================================================================
// Export Controls Component
// =============================================================================

export function ExportControls({ className }: ExportControlsProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartExport = useCallback(async () => {
    try {
      setState('exporting');
      setError(null);
      setExportData(null);
      
      const data = await exportUserData(format, (progress) => {
        setProgress(progress);
      });
      
      setExportData(data);
      setState('complete');
      toast.success('Data export completed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError(errorMessage);
      setState('error');
      toast.error('Failed to export data');
      console.error('Export failed:', err);
    }
  }, [format]);

  const handleDownload = useCallback(() => {
    if (!exportData) return;
    
    try {
      downloadExportData(exportData, format);
      toast.success('Download started!');
    } catch (err) {
      toast.error('Failed to download export file');
      console.error('Download failed:', err);
    }
  }, [exportData, format]);

  const handleReset = useCallback(() => {
    setState('idle');
    setProgress(null);
    setExportData(null);
    setError(null);
  }, []);

  const isExporting = state === 'exporting';
  const isComplete = state === 'complete';
  const hasError = state === 'error';

  return (
    <div className={cn("space-y-6", className)}>
      {/* Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Export Format
          </CardTitle>
          <CardDescription>
            Choose the format for your data export
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Select 
              value={format} 
              onValueChange={(value: ExportFormat) => setFormat(value)}
              disabled={isExporting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select export format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>JSON Format</span>
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    <span>CSV Format</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="text-sm text-muted-foreground">
              {format === 'json' && (
                <div className="space-y-1">
                  <p><strong>JSON Format:</strong> Complete structured data including all metadata</p>
                  <p>• Full message content and formatting</p>
                  <p>• Complete room information and settings</p>
                  <p>• Timestamps and technical metadata</p>
                  <p>• Best for technical analysis or re-importing</p>
                </div>
              )}
              {format === 'csv' && (
                <div className="space-y-1">
                  <p><strong>CSV Format:</strong> Simplified tabular data for spreadsheet applications</p>
                  <p>• Plain text messages only</p>
                  <p>• Basic room and profile information</p>
                  <p>• Easy to open in Excel or Google Sheets</p>
                  <p>• Best for data analysis and reporting</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Control
          </CardTitle>
          <CardDescription>
            Start the data export process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleStartExport}
              disabled={isExporting}
              size="lg"
              className="flex-1"
            >
              {isExporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {!isExporting && <Download className="h-4 w-4 mr-2" />}
              {isExporting ? 'Exporting...' : 'Start Export'}
            </Button>

            {isComplete && (
              <Button
                onClick={handleDownload}
                variant="default"
                size="lg"
                className="flex-1 sm:flex-initial"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}

            {(isComplete || hasError) && (
              <Button
                onClick={handleReset}
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-initial"
              >
                Start Over
              </Button>
            )}
          </div>

          {/* Progress Indicator */}
          {progress && isExporting && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{progress.phase}</span>
                <span className="text-sm text-muted-foreground">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress.message}</p>
              {progress.totalItems && progress.processedItems !== undefined && (
                <p className="text-xs text-muted-foreground">
                  Processing {progress.processedItems} of {progress.totalItems} items
                </p>
              )}
            </div>
          )}

          {/* Success State */}
          {isComplete && exportData && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Export completed successfully! Your data is ready for download.
              </AlertDescription>
            </Alert>
          )}

          {/* Error State */}
          {hasError && error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Export Statistics */}
      {exportData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Export Summary
            </CardTitle>
            <CardDescription>
              Statistics about your exported data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{exportData.statistics.totalRooms}</p>
                  <p className="text-sm text-muted-foreground">Rooms</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MessageSquare className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{exportData.statistics.totalMessages.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Messages</p>
                </div>
              </div>

              {exportData.statistics.dateRange.earliest && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-sm font-bold">
                      {new Date(exportData.statistics.dateRange.earliest).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">First Message</p>
                  </div>
                </div>
              )}

              {exportData.statistics.dateRange.latest && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm font-bold">
                      {new Date(exportData.statistics.dateRange.latest).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Latest Message</p>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">User ID:</span>
                <Badge variant="secondary">{exportData.profile.userId}</Badge>
              </div>
              {exportData.profile.displayName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Display Name:</span>
                  <span className="text-sm font-medium">{exportData.profile.displayName}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Export Created:</span>
                <span className="text-sm font-medium">
                  {new Date(exportData.export.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Format:</span>
                <Badge variant="outline" className="uppercase">
                  {exportData.export.format}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GDPR Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            GDPR & Privacy Information
          </CardTitle>
          <CardDescription>
            Important information about your data export
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-3">
            <div>
              <h4 className="font-semibold mb-2">What data is included:</h4>
              <ul className="space-y-1 text-muted-foreground pl-4">
                <li>• Your profile information (display name, avatar)</li>
                <li>• All rooms you are or were a member of</li>
                <li>• All messages you have sent</li>
                <li>• Room settings and your permission levels</li>
                <li>• Timestamps and technical metadata</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">What data is NOT included:</h4>
              <ul className="space-y-1 text-muted-foreground pl-4">
                <li>• Messages sent by other users</li>
                <li>• Private keys or encryption data</li>
                <li>• Server-side logs or analytics</li>
                <li>• Data from rooms after you left them</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Your rights:</h4>
              <ul className="space-y-1 text-muted-foreground pl-4">
                <li>• This export fulfills your GDPR Article 20 right to data portability</li>
                <li>• The exported data is yours to keep and use as you wish</li>
                <li>• You can request additional data exports at any time</li>
                <li>• For data deletion requests, use the Account Deletion feature</li>
              </ul>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Privacy Notice:</strong> Your exported data may contain sensitive information. 
                Store it securely and be mindful when sharing. The export process happens locally 
                in your browser and the data is not sent to any external services.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}