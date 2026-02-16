import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const KNOWLEDGE_BASE_SECTIONS = [
  {
    category: 'Getting Started',
    articles: [
      { 
        title: 'What is HAOS?', 
        description: 'Learn about our Discord-like chat platform powered by Matrix',
        href: '/docs/getting-started/introduction'
      },
      { 
        title: 'Creating Your First Server', 
        description: 'Step-by-step guide to creating and managing your first server',
        href: '/docs/getting-started/create-server'
      }
    ]
  },
  {
    category: 'Advanced Features',
    articles: [
      { 
        title: 'End-to-End Encryption', 
        description: 'Understanding how Matrix keeps your conversations secure',
        href: '/docs/advanced/encryption'
      },
      { 
        title: 'Self-Hosting HAOS', 
        description: 'How to set up and run your own HAOS instance',
        href: '/docs/advanced/self-hosting'
      }
    ]
  },
  {
    category: 'Troubleshooting',
    articles: [
      { 
        title: 'Common Login Issues', 
        description: 'Resolving authentication and login problems',
        href: '/docs/troubleshooting/login'
      },
      { 
        title: 'Resolving Connection Problems', 
        description: 'Debugging network and connectivity issues',
        href: '/docs/troubleshooting/connection'
      }
    ]
  }
];

interface KnowledgeBaseSectionProps {
  searchQuery?: string;
}

export const KnowledgeBaseSection: React.FC<KnowledgeBaseSectionProps> = ({ searchQuery = '' }) => {
  const filteredSections = KNOWLEDGE_BASE_SECTIONS.map(section => ({
    ...section,
    articles: section.articles.filter(
      article => 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        article.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.articles.length > 0);

  return (
    <div className="knowledge-base-section">
      {filteredSections.length === 0 ? (
        <p className="text-center text-gray-500 mt-4">No knowledge base articles found matching your search.</p>
      ) : (
        filteredSections.map((section, index) => (
          <div key={index} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{section.category}</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {section.articles.map((article, articleIndex) => (
                <Link href={article.href} key={articleIndex} className="no-underline">
                  <Card className="hover:bg-accent/10 transition-colors">
                    <CardHeader>
                      <CardTitle>{article.title}</CardTitle>
                      <CardDescription>{article.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};