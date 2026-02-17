import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQData = [
  {
    category: 'Matrix',
    questions: [
      {
        question: 'What is Matrix?',
        answer: 'Matrix is an open standard for decentralized communication, allowing secure, federated messaging across different servers and networks.'
      },
      {
        question: 'How does end-to-end encryption work in Matrix?',
        answer: 'Matrix uses Olm and Megolm encryption protocols to provide end-to-end encryption for messages, ensuring only intended recipients can read them.'
      }
    ]
  },
  {
    category: 'Features',
    questions: [
      {
        question: 'Can I create my own server?',
        answer: 'Yes! Melo supports self-hosting and allows you to create and manage your own Matrix server with full control over users and permissions.'
      },
      {
        question: 'What platforms are supported?',
        answer: 'Melo is a web application that works on desktop and mobile browsers. Native mobile and desktop apps are in development.'
      }
    ]
  }
];

interface FAQSectionProps {
  searchQuery?: string;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ searchQuery = '' }) => {
  const filteredFAQs = FAQData.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <div className="faq-section">
      {filteredFAQs.length === 0 ? (
        <p className="text-center text-gray-500 mt-4">No FAQs found matching your search.</p>
      ) : (
        filteredFAQs.map((category, index) => (
          <div key={index} className="mb-6">
            <h2 className="text-xl font-semibold mb-4">{category.category}</h2>
            <Accordion type="single" collapsible className="w-full">
              {category.questions.map((faq, qIndex) => (
                <AccordionItem key={qIndex} value={`item-${index}-${qIndex}`}>
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))
      )}
    </div>
  );
};