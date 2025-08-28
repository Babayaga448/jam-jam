// Get wallet address from any Privy account type
useEffect(() => {
  if (authenticated && user && ready) {
    // Try embedded wallet first, then linked accounts
    const address = user.wallet?.address || 
                   (user.linkedAccounts[0] && user.linkedAccounts[0].address);
    
    if (address) {
      setAccountAddress(address);
      setError(null);
    } else {
      setError("No wallet found. Please connect a wallet.");
    }
  } else {
    setAccountAddress('');
    setUsername(null);
    setHasUsername(false);
  }
}, [authenticated, user, ready]);