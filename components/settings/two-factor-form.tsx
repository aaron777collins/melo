"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface TwoFactorFormProps {
  profile: any; // TODO: Type this properly
}

export function TwoFactorForm({ profile }: TwoFactorFormProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 border rounded-lg">
        <Shield className="h-8 w-8 text-green-600 mt-1" />
        <div className="flex-1">
          <h3 className="font-medium">Two-Factor Authentication</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add an extra layer of security to your account by requiring a second factor in addition to your password.
          </p>
          <div className="mt-4 space-y-2">
            <div className="text-sm">
              <span className="font-medium">Status: </span>
              <span className="text-amber-600">Not configured</span>
            </div>
            <Button variant="outline" disabled>
              Set up Two-Factor Authentication
            </Button>
            <p className="text-xs text-muted-foreground">
              Two-factor authentication setup coming soon.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}