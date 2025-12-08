// AI Service API Client
import axios from 'axios';

const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8080/api/ai';

// Create axios instance
const aiApi = axios.create({
    baseURL: AI_SERVICE_URL,
    timeout: 30000, // 30s for LLM responses
    headers: {
        'Content-Type': 'application/json',
    },
});

// Chat Session APIs
export const createChatSession = async (userId) => {
    const response = await aiApi.post('/chat/sessions', { user_id: userId });
    return response.data;
};

export const getChatHistory = async (sessionId, userId) => {
    const response = await aiApi.get(`/chat/sessions/${sessionId}/history`, {
        params: { user_id: userId }
    });
    return response.data;
};

export const sendChatMessage = async (sessionId, message, userId) => {
    const response = await aiApi.post('/chat', {
        session_id: sessionId,
        message,
    }, {
        params: { user_id: userId }
    });
    return response.data;
};

// Bundle APIs
export const getBundles = async (query) => {
    const response = await aiApi.post('/bundles', query);
    return response.data;
};

export const getLatestDeals = async (limit = 20) => {
    const response = await aiApi.get(`/deals/latest?limit=${limit}`);
    return response.data;
};

// Watch APIs
export const createWatch = async (watchData) => {
    const response = await aiApi.post('/watches', watchData);
    return response.data;
};

export const getWatch = async (watchId) => {
    const response = await aiApi.get(`/watches/${watchId}`);
    return response.data;
};

export const deleteWatch = async (watchId) => {
    await aiApi.delete(`/watches/${watchId}`);
};

// Policy Q&A
export const queryPolicy = async (entityType, entityId, question) => {
    const response = await aiApi.post('/policies/query', {
        entity_type: entityType,
        entity_id: entityId,
        question,
    });
    return response.data;
};

// WebSocket connection helper
export const createWebSocketConnection = (sessionId) => {
    const wsUrl = AI_SERVICE_URL.replace('http', 'ws').replace('/api/ai', '/api/ai/events');
    return new WebSocket(`${wsUrl}?session_id=${sessionId}`);
};

export default aiApi;
