/**
 * Template Selector Component
 * 
 * Interactive UI for selecting server templates with preview and customization options.
 */

"use client";

import React, { useState, useMemo } from "react";
import { Check, Search, Users, Hash, Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { 
  ServerTemplate, 
  ServerTemplateCategory,
  CategoryDefinition 
} from "@/lib/matrix/server-templates";

// =============================================================================
// Types
// =============================================================================

export interface TemplateSelectionProps {
  /** Available templates */
  templates: ServerTemplate[];
  /** Currently selected template */
  selectedTemplate?: ServerTemplate;
  /** Called when a template is selected */
  onTemplateSelect: (template: ServerTemplate) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const CATEGORY_LABELS: Record<ServerTemplateCategory, string> = {
  gaming: "Gaming",
  community: "Community", 
  education: "Education",
  work: "Work",
  creative: "Creative",
  hobby: "Hobby",
};

const CATEGORY_DESCRIPTIONS: Record<ServerTemplateCategory, string> = {
  gaming: "Templates for gaming communities and esports teams",
  community: "General purpose community and discussion servers",
  education: "Templates for study groups and educational communities",
  work: "Professional workspaces and team collaboration",
  creative: "Communities for artists, writers, and creators",
  hobby: "Special interest groups and hobby communities",
};

// =============================================================================
// Helper Components
// =============================================================================

interface TemplateCardProps {
  template: ServerTemplate;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function TemplateCard({ template, isSelected, onSelect, disabled }: TemplateCardProps) {
  const totalChannels = template.structure.categories.reduce(
    (total, category) => total + category.channels.length,
    0
  );

  const voiceChannels = template.structure.categories.reduce(
    (total, category) => total + category.channels.filter(c => c.type === "voice").length,
    0
  );

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-primary shadow-md",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={disabled ? undefined : onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{template.icon}</div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {template.name}
                {template.featured && (
                  <Badge variant="secondary" className="text-xs">
                    Featured
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {template.description}
              </CardDescription>
            </div>
          </div>
          {isSelected && (
            <div className="flex-shrink-0">
              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Hash className="w-4 h-4" />
            <span>{totalChannels} channels</span>
          </div>
          {voiceChannels > 0 && (
            <div className="flex items-center gap-1">
              <Volume2 className="w-4 h-4" />
              <span>{voiceChannels} voice</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{template.structure.server.encrypted ? "Private" : "Public"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TemplatePreviewProps {
  template: ServerTemplate;
}

function TemplatePreview({ template }: TemplatePreviewProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">{template.icon}</span>
          {template.name} Preview
        </CardTitle>
        <CardDescription>
          Channel structure for this template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {template.structure.categories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span>{category.name}</span>
              <div className="h-px bg-border flex-1" />
            </div>
            <div className="space-y-1 ml-4">
              {category.channels.map((channel, channelIndex) => (
                <div 
                  key={channelIndex}
                  className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-accent/50"
                >
                  {channel.type === "voice" ? (
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  ) : channel.type === "announcement" ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    </div>
                  ) : (
                    <Hash className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-mono">{channel.name}</span>
                  {channel.encrypted && (
                    <div className="w-3 h-3 bg-green-500 rounded-full" title="Encrypted" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function TemplateSelector({
  templates,
  selectedTemplate,
  onTemplateSelect,
  disabled = false,
  className,
}: TemplateSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ServerTemplateCategory | "all" | "featured">("featured");

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by category
    if (activeCategory === "featured") {
      filtered = filtered.filter(t => t.featured);
    } else if (activeCategory !== "all") {
      filtered = filtered.filter(t => t.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [templates, activeCategory, searchQuery]);

  // Get available categories
  const availableCategories = useMemo(() => {
    const categories = new Set(templates.map(t => t.category));
    return Array.from(categories).sort();
  }, [templates]);

  // Get featured count
  const featuredCount = useMemo(() => {
    return templates.filter(t => t.featured).length;
  }, [templates]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
      </div>

      {/* Category Tabs */}
      <Tabs 
        value={activeCategory} 
        onValueChange={(value) => setActiveCategory(value as typeof activeCategory)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="featured" className="text-xs">
            Featured ({featuredCount})
          </TabsTrigger>
          <TabsTrigger value="all" className="text-xs">
            All ({templates.length})
          </TabsTrigger>
          {availableCategories.map(category => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {CATEGORY_LABELS[category]}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          {/* Category Description */}
          {activeCategory !== "all" && activeCategory !== "featured" && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {CATEGORY_DESCRIPTIONS[activeCategory as ServerTemplateCategory]}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {/* Template Grid */}
            <div className={cn(
              "space-y-4",
              selectedTemplate ? "lg:col-span-1 xl:col-span-2 2xl:col-span-3" : "lg:col-span-2 xl:col-span-3 2xl:col-span-4"
            )}>
              {filteredTemplates.length > 0 ? (
                <div className="grid gap-4">
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isSelected={selectedTemplate?.id === template.id}
                      onSelect={() => onTemplateSelect(template)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <CardContent className="pt-0">
                    <div className="text-muted-foreground">
                      <div className="text-4xl mb-2">🔍</div>
                      <p className="text-lg font-medium mb-1">No templates found</p>
                      <p className="text-sm">
                        {searchQuery.trim() 
                          ? `No templates match "${searchQuery}"`
                          : "No templates available in this category"
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Preview Panel */}
            {selectedTemplate && (
              <div className="lg:col-span-1">
                <TemplatePreview template={selectedTemplate} />
              </div>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

export default TemplateSelector;