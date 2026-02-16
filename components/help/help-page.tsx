"use client";

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FAQSection } from './faq-section';
import { ContactForm } from './contact-form';
import { KnowledgeBaseSection } from './knowledge-base-section';
import { HelpSearch } from './help-search';

export const HelpPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="help-page container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Help & Support</h1>
      
      <HelpSearch 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)} 
        placeholder="Search help articles, FAQs, and documentation"
      />

      <Tabs defaultValue="faq" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="faq">Frequently Asked Questions</TabsTrigger>
          <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
          <TabsTrigger value="contact">Contact Support</TabsTrigger>
        </TabsList>
        
        <TabsContent value="faq">
          <FAQSection searchQuery={searchQuery} />
        </TabsContent>
        
        <TabsContent value="knowledge-base">
          <KnowledgeBaseSection searchQuery={searchQuery} />
        </TabsContent>
        
        <TabsContent value="contact">
          <ContactForm />
        </TabsContent>
      </Tabs>
    </div>
  );
};