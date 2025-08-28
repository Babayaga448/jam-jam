// src/hooks/useScoreSubmission.js - Simplified version for development
import { useState } from 'react';

export const useScoreSubmission = () => {
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState(null);

  const submitScore = async (score, transactionCount = 1, gameData = {}) => {
    setSubmitting(true);
    
    try {
      // In development, just simulate the submission
      if (import.meta.env.DEV) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockSubmission = {
          hash: `0xmock-${Date.now()}`,
          score,
          transactionCount,
          gameData,
          timestamp: Date.now(),
          status: 'success'
        };
        
        setLastSubmission(mockSubmission);
        console.log('Mock Score Submission:', mockSubmission);
        
        return {
          success: true,
          hash: mockSubmission.hash,
          submission: mockSubmission
        };
      }
      
      // Production implementation would go here
      // This would call your backend API to submit the score
      throw new Error('Production score submission not implemented yet');
      
    } catch (error) {
      console.error('Score submission failed:', error);
      
      const submission = {
        error: error.message,
        score,
        transactionCount,
        gameData,
        timestamp: Date.now(),
        status: 'failed'
      };

      setLastSubmission(submission);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitScore,
    submitting,
    lastSubmission
  };
};