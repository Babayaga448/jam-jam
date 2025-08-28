// src/hooks/useMonadGamesID.js - Add development mode simulation
import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

const MONAD_GAMES_ID_PROVIDER_APP_ID = 'cmd8euall0037le0my79qpz42';
const USERNAME_API_URL = 'https://monad-games-id-site.vercel.app/api/check-wallet';
const REGISTER_USERNAME_URL = 'https://monad-games-id-site.vercel.app/';

export const useMonadGamesID = () => {
  const { authenticated, user, ready, login, logout } = usePrivy();
  const [accountAddress, setAccountAddress] = useState('');
  const [username, setUsername] = useState(null);
  const [hasUsername, setHasUsername] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Development mode simulation
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    if (authenticated && user && ready) {
      if (isDevelopment) {
        // Development mode - simulate Monad Games ID account
        setAccountAddress('0x1234567890abcdef1234567890abcdef12345678');
        setUsername('DevPlayer');
        setHasUsername(true);
        setError(null);
        return;
      }

      // Production mode - real cross-app logic
      if (user.linkedAccounts && user.linkedAccounts.length > 0) {
        const crossAppAccount = user.linkedAccounts.find(
          account => 
            account.type === "cross_app" && 
            account.providerApp.id === MONAD_GAMES_ID_PROVIDER_APP_ID
        );

        if (crossAppAccount && crossAppAccount.embeddedWallets.length > 0) {
          const address = crossAppAccount.embeddedWallets[0].address;
          setAccountAddress(address);
          setError(null);
        } else {
          setError("You need to link your Monad Games ID account to continue.");
        }
      } else {
        setError("You need to link your Monad Games ID account to continue.");
      }
    } else {
      setAccountAddress('');
      setUsername(null);
      setHasUsername(false);
      if (ready && !authenticated) {
        setError(null);
      }
    }
  }, [authenticated, user, ready, isDevelopment]);

  // Skip username API call in development
  useEffect(() => {
    if (isDevelopment || !accountAddress) {
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
  }, [accountAddress, isDevelopment]);

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
    username: isDevelopment ? 'Babayaga' : username,
    walletAddress: accountAddress,
    hasUsername: isDevelopment ? true : hasUsername,
    loading: !ready || isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
    registerUsernameUrl: REGISTER_USERNAME_URL
  };
};