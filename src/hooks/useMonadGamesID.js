// src/hooks/useMonadGamesID.js
import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

const USERNAME_API_URL = 'https://monad-games-id-site.vercel.app/api/check-wallet';
const REGISTER_USERNAME_URL = 'https://monad-games-id-site.vercel.app/';

export const useMonadGamesID = () => {
  const { authenticated, user, ready, login, logout } = usePrivy();
  const [accountAddress, setAccountAddress] = useState('');
  const [username, setUsername] = useState(null);
  const [hasUsername, setHasUsername] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract wallet address from any Privy account
  useEffect(() => {
    if (authenticated && user && ready) {
      // Try embedded wallet first, then linked accounts
      const address = user.wallet?.address || 
                     (user.linkedAccounts && user.linkedAccounts[0] && user.linkedAccounts[0].address);
      
      if (address) {
        setAccountAddress(address);
        setError(null);
      } else {
        setError("No wallet found. Please connect a wallet.");
      }
    } else {
      // Clear data when not authenticated
      setAccountAddress('');
      setUsername(null);
      setHasUsername(false);
      if (ready && !authenticated) {
        setError(null);
      }
    }
  }, [authenticated, user, ready]);

  // Fetch username when address is available
  useEffect(() => {
    if (!accountAddress) {
      setUsername(null);
      setHasUsername(false);
      setIsLoading(false);
      return;
    }

    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${USERNAME_API_URL}?wallet=${accountAddress}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        setHasUsername(data.hasUsername);
        setUsername(data.user?.username || null);
        
        if (!data.hasUsername) {
          setError("No username found. Please register a username first.");
        }
      } catch (err) {
        console.error('Error fetching username:', err);
        setError('Failed to fetch username information.');
        setHasUsername(false);
        setUsername(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [accountAddress]);

  const handleLogin = async () => {
    try {
      setError(null);
      await login();
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAccountAddress('');
      setUsername(null);
      setHasUsername(false);
      setError(null);
    } catch (err) {
      console.error("Logout failed:", err);
      setError("Logout failed. Please try again.");
    }
  };

  return {
    isAuthenticated: authenticated && ready && !!accountAddress && hasUsername,
    username,
    walletAddress: accountAddress,
    hasUsername,
    loading: !ready || isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
    registerUsernameUrl: REGISTER_USERNAME_URL
  };
};