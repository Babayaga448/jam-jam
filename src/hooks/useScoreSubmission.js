// src/hooks/useScoreSubmission.js
import { useState } from 'react';

export const useScoreSubmission = () => {
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState(null);

  const submitScore = async (score, transactionCount = 1, gameData = {}) => {
    setSubmitting(true);
    
    try {
      const response = await fetch('/.netlify/functions/submit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: gameData.playerAddress || 'NEED_PLAYER_ADDRESS',
          score,
          transactions: transactionCount
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const submission = {
          hash: result.hash,
          score,
          transactionCount,
          gameData,
          timestamp: Date.now(),
          status: 'success'
        };
        
        setLastSubmission(submission);
        console.log('Score submitted successfully:', submission);
        
        return {
          success: true,
          hash: result.hash,
          submission
        };
      } else {
        throw new Error(result.error || 'Score submission failed');
      }
      
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