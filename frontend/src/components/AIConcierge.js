// AI Chatbot Component
import React, { useState, useEffect, useRef } from 'react';
import {
    MainContainer,
    ChatContainer,
    MessageList,
    Message,
    MessageInput,
    TypingIndicator,
    Avatar,
} from '@chatscope/chat-ui-kit-react';
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { FaRobot, FaTimes, FaComments, FaPlus } from 'react-icons/fa';
import {
    createChatSession,
    sendChatMessage,
    getChatHistory,
    createWebSocketConnection,
} from '../services/aiApi';
import BundleList from './BundleList';
import WatchModal from './WatchModal';
import './AIConcierge.css';
import { useAuth } from '../contexts/AuthContext';

const AIConcierge = () => {
    const { isAuthenticated, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [bundles, setBundles] = useState([]);
    const [error, setError] = useState(null);
    const [watchModalOpen, setWatchModalOpen] = useState(false);
    const [selectedBundleId, setSelectedBundleId] = useState(null);
    const wsRef = useRef(null);

    console.log('AIConcierge rendered. isOpen:', isOpen, 'isAuthenticated:', isAuthenticated);

    // Render message content with markdown links as buttons
    const renderMessageContent = (text) => {
        // Decode HTML entities and strip HTML tags
        const decodeHTML = (html) => {
            const txt = document.createElement('textarea');
            txt.innerHTML = html;
            return txt.value;
        };
        
        // Strip HTML tags but preserve the text content
        const stripHTMLTags = (html) => {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };
        
        const decodedText = stripHTMLTags(decodeHTML(text));
        
        // Regex to match [text](url) markdown links
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(decodedText)) !== null) {
            // Add text before the link
            if (match.index > lastIndex) {
                parts.push(decodedText.slice(lastIndex, match.index));
            }
            
            const linkText = match[1];
            const url = match[2];
            
            // Render as a styled button
            parts.push(
                <a
                    key={match.index}
                    href={url}
                    className="ai-payment-link"
                    style={{
                        display: 'inline-block',
                        margin: '8px 0',
                        padding: '10px 20px',
                        backgroundColor: '#ff6b35',
                        color: 'white',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    {linkText}
                </a>
            );
            
            lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < decodedText.length) {
            parts.push(decodedText.slice(lastIndex));
        }
        
        return parts.length > 0 ? parts : decodedText;
    };

    // Initialize chat session
    useEffect(() => {
        const initSession = async () => {
            // Check if user is authenticated
            if (!isAuthenticated) {
                setError('Please login to use AI chat services');
                return;
            }

            // Clear any previous auth errors
            setError(null);

            try {
                // Get user ID from localStorage (set during login)
                const userId = parseInt(localStorage.getItem('userId'));
                if (!userId) {
                    setError('Please login to use AI chat services');
                    return;
                }
                
                // Use user-specific session storage key
                const userSessionKey = `aiChatSessionId_user${userId}`;
                const storedSessionId = localStorage.getItem(userSessionKey);
                let currentSession;
                
                if (storedSessionId) {
                    // Try to load existing session
                    try {
                        const history = await getChatHistory(storedSessionId, userId);
                        currentSession = { id: storedSessionId };
                        setMessages(
                            history.turns.map((turn) => ({
                                message: turn.content,
                                sender: turn.role === 'user' ? 'user' : 'ai',
                                direction: turn.role === 'user' ? 'outgoing' : 'incoming',
                                bundles: turn.bundles || null,
                            }))
                        );
                    } catch (err) {
                        // Session expired or invalid, create new one
                        console.log('Previous session expired or access denied, creating new one');
                        currentSession = await createChatSession(userId);
                        localStorage.setItem(userSessionKey, currentSession.id);
                    }
                } else {
                    // Create new session for this user
                    currentSession = await createChatSession(userId);
                    localStorage.setItem(userSessionKey, currentSession.id);
                }
                
                setSessionId(currentSession.id);
            } catch (err) {
                console.error('Failed to initialize chat:', err);
                setError('Failed to start chat session');
            }
        };

        if (isOpen && !sessionId) {
            initSession();
        }
    }, [isOpen, sessionId, isAuthenticated, user]);

    // WebSocket connection
    useEffect(() => {
        if (!sessionId) return;

        try {
            const ws = createWebSocketConnection(sessionId);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('WebSocket message:', data);

                // Handle different event types
                if (data.type === 'watch.triggered') {
                    setMessages((prev) => [
                        ...prev,
                        {
                            message: `🔔 Watch Alert: ${data.data.reasons.join(', ')}`,
                            sender: 'ai',
                            direction: 'incoming',
                        },
                    ]);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
            };

            return () => {
                ws.close();
            };
        } catch (err) {
            console.error('WebSocket connection failed:', err);
        }
    }, [sessionId]);

    const handleSendMessage = async (message) => {
        if (!sessionId || !user) return;

        // Add user message immediately
        setMessages((prev) => [
            ...prev,
            { message, sender: 'user', direction: 'outgoing' },
        ]);

        setIsTyping(true);
        setError(null);

        try {
            const response = await sendChatMessage(sessionId, message, user.id);

            // Add AI response
            setMessages((prev) => [
                ...prev,
                {
                    message: response.content,
                    sender: 'ai',
                    direction: 'incoming',
                    bundles: response.bundles || null,
                },
            ]);

            // Update bundles if any
            if (response.bundles && response.bundles.length > 0) {
                setBundles(response.bundles);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setError('Failed to send message. Please try again.');
            setMessages((prev) => [
                ...prev,
                {
                    message: 'Sorry, I encountered an error. Please try again.',
                    sender: 'ai',
                    direction: 'incoming',
                },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleBookBundle = async (bundle) => {
        if (!sessionId || !user) return;
        
        // First, select the bundle by sending its price
        const selectMessage = `I want the $${bundle.total_price.toFixed(0)} option`;
        
        setMessages((prev) => [
            ...prev,
            { message: selectMessage, sender: 'user', direction: 'outgoing' },
        ]);
        
        setIsTyping(true);
        
        try {
            // Step 1: Select the bundle
            const selectResponse = await sendChatMessage(sessionId, selectMessage, user.id);
            
            setMessages((prev) => [
                ...prev,
                {
                    message: selectResponse.content,
                    sender: 'ai',
                    direction: 'incoming',
                },
            ]);
            
            // Step 2: Confirm booking with "yes"
            setTimeout(async () => {
                setMessages((prev) => [
                    ...prev,
                    { message: 'yes', sender: 'user', direction: 'outgoing' },
                ]);
                
                const bookResponse = await sendChatMessage(sessionId, 'yes', user.id);
                
                setMessages((prev) => [
                    ...prev,
                    {
                        message: bookResponse.content,
                        sender: 'ai',
                        direction: 'incoming',
                    },
                ]);
                
                // Extract payment link with token from response
                const linkMatch = bookResponse.content.match(/\[.*?\]\((.*?)\)/);
                if (linkMatch && linkMatch[1]) {
                    // Navigate to payment page with token
                    window.location.href = linkMatch[1];
                } else {
                    // Fallback without token
                    window.location.href = `/booking/bundles/${bundle.bundle_id}?passengers=1`;
                }
                
                setIsTyping(false);
            }, 500);
            
        } catch (err) {
            console.error('Failed to initiate booking:', err);
            setIsTyping(false);
            // Fallback to direct navigation without token
            window.location.href = `/booking/bundles/${bundle.bundle_id}?passengers=1`;
        }
    };

    const handleTrackBundle = (bundle) => {
        setSelectedBundleId(bundle.bundle_id);
        setWatchModalOpen(true);
    };

    const handleWatchSuccess = () => {
        setMessages((prev) => [
            ...prev,
            {
                message: '✅ Watch created! You\'ll get notified when your criteria are met.',
                sender: 'ai',
                direction: 'incoming',
            },
        ]);
    };

    const handleNewChat = async () => {
        try {
            // Close existing WebSocket
            if (wsRef.current) {
                wsRef.current.close();
            }

            // Get user ID
            const userId = parseInt(localStorage.getItem('userId'));
            if (!userId) {
                setError('Please login to use AI chat services');
                return;
            }

            // Clear current session (user-specific key)
            const userSessionKey = `aiChatSessionId_user${userId}`;
            localStorage.removeItem(userSessionKey);
            setSessionId(null);
            setMessages([]);
            setBundles([]);
            setError(null);

            // Create new session for this user
            const newSession = await createChatSession(userId);
            localStorage.setItem(userSessionKey, newSession.id);
            setSessionId(newSession.id);
        } catch (err) {
            console.error('Failed to create new chat:', err);
            setError('Failed to start new chat');
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    if (!isOpen) {
        return (
            <button className="ai-chat-button" onClick={toggleChat} aria-label="Open AI Concierge">
                <FaComments size={24} />
            </button>
        );
    }

    return (
        <div className="ai-chat-container">
            <div className="ai-chat-header">
                <div className="ai-chat-header-content">
                    <FaRobot size={20} />
                    <span>AI Travel Concierge</span>
                </div>
                <div className="ai-chat-header-actions">
                    {isAuthenticated && (
                        <button className="ai-chat-new" onClick={handleNewChat} aria-label="New chat" title="Start new chat">
                            <FaPlus size={18} />
                        </button>
                    )}
                    <button className="ai-chat-close" onClick={toggleChat} aria-label="Close chat">
                        <FaTimes size={18} />
                    </button>
                </div>
            </div>

            {!isAuthenticated ? (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    height: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#f5f5f5'
                }}>
                    <FaRobot size={48} color="#666" style={{ marginBottom: '20px' }} />
                    <h3 style={{ color: '#333', marginBottom: '10px' }}>AI Chat Requires Login</h3>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                        Please login to use our AI Travel Concierge service
                    </p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#ff6b35',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Login to Continue
                    </button>
                </div>
            ) : (
                <MainContainer>
                    <ChatContainer>
                        <MessageList
                            typingIndicator={isTyping ? <TypingIndicator content="AI is thinking..." /> : undefined}
                        >
                            {messages.map((msg, index) => (
                                <Message
                                    key={index}
                                    model={{
                                        message: msg.message,
                                        sender: msg.sender,
                                        direction: msg.direction,
                                    }}
                                >
                                    <Message.CustomContent>
                                        {renderMessageContent(msg.message)}
                                    </Message.CustomContent>
                                </Message>
                            ))}
                        </MessageList>

                        <MessageInput
                            placeholder="Ask me anything about your trip..."
                            onSend={handleSendMessage}
                            attachButton={false}
                        />
                    </ChatContainer>
                </MainContainer>
            )}

            {error && (
                <div className="ai-chat-error">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            <WatchModal
                isOpen={watchModalOpen}
                onClose={() => setWatchModalOpen(false)}
                bundleId={selectedBundleId}
                onSuccess={handleWatchSuccess}
            />
        </div>
    );
};

export default AIConcierge;
