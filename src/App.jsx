// src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Music, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { useMonadGamesID } from './hooks/useMonadGamesID';
import { useScoreSubmission } from './hooks/useScoreSubmission';
import './App.css';

const TRACKS = [
  { id: 1, name: "Track 1", file: "/tracks/track1.mp3" }
];

const COLUMNS = 4;
const INITIAL_SPEED = 1000;
const SPEED_INCREASE = 50;
const INITIAL_SLICE_DURATION = 1000;
const MIN_SLICE_DURATION = 300;

function JamJamGame() {
  const { 
    isAuthenticated, 
    username, 
    walletAddress, 
    hasUsername, 
    loading, 
    error, 
    login, 
    logout,
    registerUsernameUrl 
  } = useMonadGamesID();
  
  const { submitScore } = useScoreSubmission();
  
  const [gameState, setGameState] = useState({
    screen: 'menu',
    isPlaying: false,
    selectedTrack: null,
    score: 0,
    speed: INITIAL_SPEED,
    sliceDuration: INITIAL_SLICE_DURATION,
    gameStartTime: null,
    tiles: [],
    nextTileId: 0,
    audioPosition: 0,
    level: 1
  });
  
  const [audioState, setAudioState] = useState({
    isLoaded: false,
    isMuted: false,
    currentTime: 0,
    duration: 0
  });
  
  const [submitting, setSubmitting] = useState(false);
  const audioRef = useRef(null);
  const gameLoopRef = useRef(null);
  const tileSpawnRef = useRef(null);
  
  const generateTile = useCallback(() => {
    const column = Math.floor(Math.random() * COLUMNS);
    return {
      id: gameState.nextTileId,
      column,
      y: -120,
      active: true,
      hit: false
    };
  }, [gameState.nextTileId]);
  
  const startGame = useCallback(() => {
    if (!gameState.selectedTrack) return;
    
    setGameState(prev => ({
      ...prev,
      screen: 'playing',
      isPlaying: true,
      score: 0,
      speed: INITIAL_SPEED,
      sliceDuration: INITIAL_SLICE_DURATION,
      gameStartTime: Date.now(),
      tiles: [{ ...generateTile(), id: 0 }],
      nextTileId: 1,
      audioPosition: 0,
      level: 1
    }));
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [gameState.selectedTrack, generateTile]);
  
  const endGame = useCallback(async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (tileSpawnRef.current) clearInterval(tileSpawnRef.current);
    
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      screen: 'gameOver'
    }));
    
    if (gameState.score > 0 && walletAddress) {
      setSubmitting(true);
      try {
        const gameData = {
          gameTime: Math.floor((Date.now() - gameState.gameStartTime) / 1000),
          level: gameState.level,
          tilesHit: gameState.score,
          trackId: gameState.selectedTrack.id,
          finalScore: gameState.score,
          playerAddress: walletAddress
        };
        
        await submitScore(gameState.score, 1, gameData);
      } catch (error) {
        console.error("Score submission failed:", error);
      } finally {
        setSubmitting(false);
      }
    }
  }, [gameState.score, gameState.gameStartTime, gameState.level, gameState.selectedTrack, submitScore, walletAddress]);
  
  const playBeepSound = useCallback((score) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88];
      const noteIndex = (score % notes.length);
      oscillator.frequency.value = notes[noteIndex];
      
      gainNode.gain.value = 0.3;
      oscillator.type = 'sine';
      
      oscillator.start();
      setTimeout(() => oscillator.stop(), 200);
      
    } catch (error) {
      console.error("Beep sound failed:", error);
    }
  }, []);
  
  const handleColumnClick = useCallback((column, yPosition) => {
    const activeTile = gameState.tiles.find(tile => 
      tile.column === column && 
      tile.active && 
      !tile.hit &&
      tile.y >= yPosition - 60 && 
      tile.y <= yPosition + 60
    );
    
    if (activeTile) {
      setGameState(prev => {
        const newScore = prev.score + 1;
        const newLevel = Math.floor(newScore / 10) + 1;
        const newSpeed = Math.max(INITIAL_SPEED - (newScore * SPEED_INCREASE), 400);
        const newSliceDuration = Math.max(
          INITIAL_SLICE_DURATION - (newScore * 20),
          MIN_SLICE_DURATION
        );
        const newAudioPosition = Math.min(
          prev.audioPosition + (newSliceDuration / 1000),
          audioState.duration - 1
        );
        
        const updatedTiles = prev.tiles.map(t =>
          t.id === activeTile.id ? { ...t, hit: true, active: false } : t
        );
        
        return {
          ...prev,
          score: newScore,
          level: newLevel,
          speed: newSpeed,
          sliceDuration: newSliceDuration,
          audioPosition: newAudioPosition,
          tiles: updatedTiles
        };
      });
      
      playBeepSound(gameState.score);
    } else {
      console.log("Missed! Game over");
      endGame();
    }
  }, [gameState.tiles, gameState.score, audioState.duration, playBeepSound, endGame]);
  
  const checkGameOver = useCallback(() => {
    const activeTile = gameState.tiles.find(tile => tile.active && !tile.hit);
    if (activeTile && activeTile.y > 480) {
      endGame();
    }
  }, [gameState.tiles, endGame]);
  
  useEffect(() => {
    if (!gameState.isPlaying) return;
    
    gameLoopRef.current = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        tiles: prev.tiles.map(tile => ({
          ...tile,
          y: tile.y + 3
        })).filter(tile => tile.y < 600)
      }));
    }, 20);
    
    tileSpawnRef.current = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        tiles: [...prev.tiles, { ...generateTile(), id: prev.nextTileId }],
        nextTileId: prev.nextTileId + 1
      }));
    }, gameState.speed);
    
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (tileSpawnRef.current) clearInterval(tileSpawnRef.current);
    };
  }, [gameState.isPlaying, gameState.speed, generateTile]);
  
  useEffect(() => {
    checkGameOver();
  }, [checkGameOver]);
  
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const handleLoadedData = () => {
        setAudioState(prev => ({
          ...prev,
          isLoaded: true,
          duration: audio.duration
        }));
      };
      
      const handleTimeUpdate = () => {
        setAudioState(prev => ({
          ...prev,
          currentTime: audio.currentTime
        }));
      };
      
      audio.addEventListener('loadeddata', handleLoadedData);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [gameState.selectedTrack]);
  
  const selectTrack = (track) => {
    setGameState(prev => ({
      ...prev,
      selectedTrack: track,
      screen: 'ready'
    }));
  };
  
  const resetGame = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (tileSpawnRef.current) clearInterval(tileSpawnRef.current);
    
    setGameState({
      screen: 'menu',
      isPlaying: false,
      selectedTrack: null,
      score: 0,
      speed: INITIAL_SPEED,
      sliceDuration: INITIAL_SLICE_DURATION,
      gameStartTime: null,
      tiles: [],
      nextTileId: 0,
      audioPosition: 0,
      level: 1
    });
  };
  
  const toggleMute = () => {
    setAudioState(prev => ({
      ...prev,
      isMuted: !prev.isMuted
    }));
  };

  // Show loading state
  if (loading) {
    return (
      <div className="center-container">
        <div className="login-card">
          <div className="icon-container">
            <img src="/piano.png" alt="Piano" style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 className="title">TapJam</h1>
          <p className="subtitle">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="center-container">
        <div className="login-card">
          <div className="icon-container">
            <img src="/piano.png" alt="Piano" style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 className="title">TapJam</h1>
          <p className="subtitle" style={{ color: '#ef4444', marginBottom: '16px' }}>
            {error}
          </p>
          {error.includes('username') && (
            <a 
              href={registerUsernameUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="secondary-button"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginBottom: '16px',
                textDecoration: 'none'
              }}
            >
              Register Username <ExternalLink size={16} />
            </a>
          )}
          <button className="primary-button" onClick={login}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="center-container">
        <div className="login-card">
          <div className="icon-container">
            <img src="/piano.png" alt="Piano" style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 className="title">TapJam</h1>
          <p className="subtitle">
              Made with 💜 by 
  <a href="https://x.com/Babayaga4487_" target="_blank"> Babayaga</a>
          </p>
          <button className="primary-button" onClick={login}>
            Sign in with Monad Games ID
          </button>
        </div>
      </div>
    );
  }

  // Authenticated but no username
  if (!hasUsername) {
    return (
      <div className="center-container">
        <div className="login-card">
          <div className="icon-container">
            <img src="/piano.png" alt="Piano" style={{ width: '32px', height: '32px' }} />
          </div>
          <h1 className="title">Username Required</h1>
          <p className="subtitle">
            You need to register a username with Monad Games ID to play.
          </p>
          <p className="subtitle" style={{ fontSize: '12px', marginBottom: '24px' }}>
            Wallet: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </p>
          
          <div className="button-group">
            <a 
              href={registerUsernameUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="orange-button"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={20} />
              Register Username
            </a>
            
            <button className="secondary-button" onClick={logout}>
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (gameState.screen === 'menu') {
    return (
      <div className="container">
        <div className="header">
          <div className="header-content">
            <div className="header-left">
              <div className="header-icon">
                <img src="/piano.png" alt="Piano" style={{ width: '24px', height: '24px' }} />
              </div>
              <h1 className="header-title">TapJam</h1>
            </div>
            <div className="header-right">
              <span className="username">Welcome, {username}!</span>
              <button className="secondary-button" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
        
        <div className="main-content">
          <div className="section-header">
            <h2 className="section-title">Ready to Play</h2>
            <p className="section-subtitle">So...you think you are Beethoven</p>
          </div>
          
          <div className="track-grid">
            {TRACKS.map((track) => (
              <div
                key={track.id}
                className="track-card"
                onClick={() => selectTrack(track)}
              >
                <div className="track-icon">
                  <img src="/piano.png" alt="Piano" style={{ width: '32px', height: '32px' }} />
                </div>
                <h3 className="track-name">{track.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (gameState.screen === 'ready') {
    return (
      <div className="center-container">
        <div className="ready-card">
          <div className="ready-icon">
            <img src="/piano.png" alt="Piano" style={{ width: '40px', height: '40px' }} />
          </div>
          <h2 className="ready-title">Ready to Play</h2>
          <p className="track-selected">{gameState.selectedTrack.name}</p>
          <p className="ready-subtitle">
            Tap the falling tiles to play your track. Miss a tile and the music stops!
          </p>
          
          <div className="button-group">
            <button className="orange-button" onClick={startGame}>
              <Play size={20} />
              Start Game
            </button>
            
            <button 
              className="secondary-button" 
              onClick={() => setGameState(prev => ({ ...prev, screen: 'menu' }))}
            >
              Choose Different Track
            </button>
          </div>
          
          <audio ref={audioRef} src={gameState.selectedTrack?.file} preload="auto" />
        </div>
      </div>
    );
  }
  
  if (gameState.screen === 'playing') {
    return (
      <div className="game-container">
        <div className="game-header">
          <div className="game-header-content">
            <div className="game-stats">
              <span className="score">{gameState.score}</span>
              <span className="level">Level {gameState.level}</span>
            </div>
            <div className="game-controls">
              <button className="icon-button" onClick={toggleMute}>
                {audioState.isMuted ? (
                  <VolumeX size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>
              <button className="end-game-button" onClick={endGame}>
                End Game
              </button>
            </div>
          </div>
        </div>
        
        <div className="game-area">
          <div className="game-board">
            <div className="game-columns">
              {Array.from({ length: COLUMNS }).map((_, index) => (
                <div 
                  key={index} 
                  className="game-column clickable-column"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const yPosition = e.clientY - rect.top;
                    handleColumnClick(index, yPosition);
                  }}
                />
              ))}
            </div>
            
            {gameState.tiles.map((tile) => (
              <div
                key={tile.id}
                className={`tile ${tile.hit ? 'tile-hit' : tile.active ? 'tile-active' : 'tile-inactive'}`}
                style={{
                  left: `${(tile.column / COLUMNS) * 100}%`,
                  top: `${tile.y}px`,
                  pointerEvents: 'none'
                }}
              />
            ))}
            
            <div className="game-line" />
          </div>
        </div>
      </div>
    );
  }
  
  if (gameState.screen === 'gameOver') {
    return (
      <div className="center-container">
        <div className="game-over-card">
          <div className="game-over-icon">
            <img src="/piano.png" alt="Piano" style={{ width: '40px', height: '40px' }} />
          </div>
          
          <h2 className="game-over-title">Game Over</h2>
          <p className="game-over-subtitle">Nice performance on {gameState.selectedTrack?.name}!</p>
          
          <div className="score-display">
            <div className="final-score">{gameState.score}</div>
            <div className="score-label">Tiles Hit</div>
            <div className="level-reached">Level {gameState.level} Reached</div>
          </div>
          
          {submitting && (
            <div className="submitting-message">
              Submitting score to leaderboard...
            </div>
          )}
          
          <div className="button-group">
            <button 
              className="orange-button" 
              onClick={startGame} 
              disabled={submitting}
            >
              <RotateCcw size={20} />
              Play Again
            </button>
            
            <button 
              className="secondary-button" 
              onClick={resetGame} 
              disabled={submitting}
            >
              Choose New Track
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}

export default JamJamGame;