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
import { FaRobot, FaTimes, FaComments } from 'react-icons/fa';
import {
    createChatSession,
    sendChatMessage,
    getChatHistory,
    createWebSocketConnection,
} from '../../services/aiApi';
import BundleList from './BundleList';
import WatchModal from './WatchModal';
import './AIConcierge.css';

const AIConcierge = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const [bundles, setBundles] = useState([]);
    const [error, setError] = useState(null);
    const [watchModalOpen, setWatchModalOpen] = useState(false);
    const [selectedBundleId, setSelectedBundleId] = useState(null);
    const wsRef = useRef(null);

    // Initialize chat session
    useEffect(() => {
        const initSession = async () => {
            try {
                // TODO: Get real user ID from auth context
                const userId = 1;
                const session = await createChatSession(userId);
                setSessionId(session.id);

                // Load chat history
                const history = await getChatHistory(session.id);
                setMessages(
                    history.turns.map((turn) => ({
                        message: turn.content,
                        sender: turn.role === 'user' ? 'user' : 'ai',
                        direction: turn.role === 'user' ? 'outgoing' : 'incoming',
                        bundles: turn.bundles || null,
                    }))
                );
            } catch (err) {
                console.error('Failed to initialize chat:', err);
                setError('Failed to start chat session');
            }
        };

        if (isOpen && !sessionId) {
            initSession();
        }
    }, [isOpen, sessionId]);

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
        if (!sessionId) return;

        // Add user message immediately
        setMessages((prev) => [
            ...prev,
            { message, sender: 'user', direction: 'outgoing' },
        ]);

        setIsTyping(true);
        setError(null);

        try {
            const response = await sendChatMessage(sessionId, message);

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

    const handleBookBundle = (bundle) => {
        // TODO: Navigate to booking page with bundle pre-selected
        console.log('Book bundle:', bundle);
        window.location.href = `/booking?bundleId=${bundle.bundle_id}`;
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
                <button className="ai-chat-close" onClick={toggleChat} aria-label="Close chat">
                    <FaTimes size={18} />
                </button>
            </div>

            <MainContainer>
                <ChatContainer>
                    <MessageList
                        typingIndicator={isTyping ? <TypingIndicator content="AI is thinking..." /> : null}
                    >
                        {messages.map((msg, index) => (
                            <React.Fragment key={index}>
                                <Message
                                    model={{
                                        message: msg.message,
                                        sender: msg.sender,
                                        direction: msg.direction,
                                    }}
                                >
                                    {msg.sender === 'ai' && (
                                        <Avatar src="/ai-avatar.png" name="AI Concierge" />
                                    )}
                                </Message>

                                {/* Render bundles if present */}
                                {msg.bundles && msg.bundles.length > 0 && (
                                    <div className="message-bundles">
                                        <BundleList
                                            bundles={msg.bundles}
                                            onSelectBundle={handleBookBundle}
                                            onTrackBundle={handleTrackBundle}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </MessageList>

                    <MessageInput
                        placeholder="Ask me anything about your trip..."
                        onSend={handleSendMessage}
                        attachButton={false}
                    />
                </ChatContainer>
            </MainContainer>

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
