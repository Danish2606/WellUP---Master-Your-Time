// ==========================================
// WellUp Chatbot - n8n Integration
// ==========================================

const WEBHOOK_URL = 'https://n8ngc.codeblazar.org/webhook/80685110-24a7-493d-b474-80ff7d67bae7/chat';

class Chatbot {
    constructor() {
        this.sidebar = document.getElementById('chatbot-sidebar');
        this.toggleBtn = document.getElementById('chatbot-toggle');
        this.closeBtn = document.getElementById('chatbot-close');
        this.messagesContainer = document.getElementById('chatbot-messages');
        this.input = document.getElementById('chatbot-input');
        this.sendBtn = document.getElementById('chatbot-send');
        this.conversationHistory = [];
        
        this.init();
    }
    
    init() {
        // Event listeners
        this.toggleBtn.addEventListener('click', () => this.open());
        this.closeBtn.addEventListener('click', () => this.close());
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebar.classList.contains('open')) {
                this.close();
            }
        });
    }
    
    open() {
        this.sidebar.classList.add('open');
        this.input.focus();
    }
    
    close() {
        this.sidebar.classList.remove('open');
    }
    
    async sendMessage() {
        const message = this.input.value.trim();
        
        if (!message) return;
        
        // Add user message to UI
        this.addMessage(message, 'user');
        
        // Clear input
        this.input.value = '';
        
        // Disable send button
        this.sendBtn.disabled = true;
        
        // Show typing indicator
        const typingIndicator = this.showTypingIndicator();
        
        try {
            console.log('Sending to n8n:', WEBHOOK_URL);
            console.log('Payload:', { chatInput: message, action: 'sendMessage', sessionId: this.getSessionId() });
            
            // Send to n8n webhook with no-cors mode as fallback
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'cors',
                body: JSON.stringify({
                    chatInput: message,
                    action: 'sendMessage',
                    sessionId: this.getSessionId()
                })
            });
            
            // Remove typing indicator
            typingIndicator.remove();
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', response.status, errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            // Get the raw response text first
            const rawText = await response.text();
            console.log('Raw response:', rawText);
            
            let botMessage = '';
            
            try {
                // Parse n8n streaming format
                // Split by '}' and '{' to handle concatenated JSON objects
                const jsonChunks = rawText.split(/\}\s*\{/).map((chunk, index, arr) => {
                    if (index === 0) return chunk + '}';
                    if (index === arr.length - 1) return '{' + chunk;
                    return '{' + chunk + '}';
                });
                
                // Extract content from "item" type messages
                for (const chunk of jsonChunks) {
                    try {
                        const parsed = JSON.parse(chunk);
                        if (parsed.type === 'item' && parsed.content) {
                            botMessage += parsed.content;
                        }
                    } catch (e) {
                        // Skip malformed chunks
                    }
                }
                
                // If no content was extracted, try parsing as regular JSON
                if (!botMessage) {
                    const data = JSON.parse(rawText);
                    botMessage = data.output || data.response || data.message || data.text || JSON.stringify(data);
                }
            } catch (jsonError) {
                // If all parsing fails, use the raw text
                console.log('Using raw text as fallback');
                botMessage = rawText;
            }
            
            // Add bot response to UI
            this.addMessage(botMessage, 'bot');
            
            // Update conversation history
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: botMessage }
            );
            
            // Keep only last 10 messages in history
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
            
        } catch (error) {
            console.error('Detailed error:', error);
            
            // Remove typing indicator if still there
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.remove();
            }
            
            // Show detailed error message
            this.addMessage(`Connection error: ${error.message}. Check console for details.`, 'bot');
        }
        
        // Re-enable send button
        this.sendBtn.disabled = false;
        this.input.focus();
    }
    
    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chatbot-message ${type}-message`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        
        return messageDiv;
    }
    
    showTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'chatbot-message bot-message';
        indicatorDiv.id = 'typing-indicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content typing-indicator';
        contentDiv.innerHTML = '<span></span><span></span><span></span>';
        
        indicatorDiv.appendChild(contentDiv);
        this.messagesContainer.appendChild(indicatorDiv);
        
        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        
        return indicatorDiv;
    }
    
    getSessionId() {
        // Get or create a session ID for conversation continuity
        let sessionId = sessionStorage.getItem('chatbot-session-id');
        if (!sessionId) {
            sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('chatbot-session-id', sessionId);
        }
        return sessionId;
    }
}

// Initialize chatbot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new Chatbot();
    });
} else {
    new Chatbot();
}
