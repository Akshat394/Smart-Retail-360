import React, { useState, useRef, useEffect } from 'react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
}

const BOT_AVATAR = (
  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-2" aria-label="Bot avatar">🤖</div>
);
const USER_AVATAR = (
  <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold ml-2" aria-label="User avatar">🧑</div>
);

const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: 'Hi! I can help you track orders or recommend green delivery options. How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages(msgs => [...msgs, { sender: 'user', text: input }]);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/chatbot/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryResult: { queryText: input, intent: { displayName: '' }, parameters: {} } })
      });
      const data = await res.json();
      setMessages(msgs => [...msgs, { sender: 'bot', text: data.fulfillmentText || data.text || 'Sorry, I did not understand.' }]);
    } catch (e) {
      setError('Failed to connect to chatbot.');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg focus:outline-none"
        onClick={() => setOpen(o => !o)}
        aria-label="Open chat"
      >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 3C6.477 3 2 6.805 2 11c0 1.61.67 3.1 1.82 4.36-.13.7-.46 2.13-.7 3.04-.1.36.25.68.6.57.96-.3 2.36-.77 3.02-.98C8.7 18.66 10.3 19 12 19c5.523 0 10-3.805 10-8s-4.477-8-10-8Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {/* Chat Window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-11/12 max-w-lg md:w-96 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-label="SmartRetail360 Chatbot"
        >
          <div className="bg-blue-600 text-white px-4 py-3 font-bold flex items-center justify-between">
            <span>SmartRetail360 Chatbot</span>
            <button className="text-white hover:text-gray-200" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 bg-gray-50" style={{ maxHeight: 400 }} role="log" aria-live="polite">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex items-end ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                aria-label={msg.sender === 'user' ? 'User message' : 'Bot message'}
              >
                {msg.sender === 'bot' && BOT_AVATAR}
                <div className={`rounded-lg px-3 py-2 text-sm shadow transition-all duration-200 ${msg.sender === 'user' ? 'bg-blue-500 text-white ml-2' : 'bg-gray-200 text-gray-900 mr-2'}`}>{msg.text}</div>
                {msg.sender === 'user' && USER_AVATAR}
              </div>
            ))}
            {loading && (
              <div className="flex items-end justify-start animate-fadeIn">
                {BOT_AVATAR}
                <div className="rounded-lg px-3 py-2 text-sm shadow bg-gray-200 text-gray-900 mr-2 flex items-center">
                  <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce mr-1" style={{ animationDelay: '0s' }}></span>
                  <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce mr-1" style={{ animationDelay: '0.2s' }}></span>
                  <span className="inline-block w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {error && <div className="text-red-500 text-xs px-4 py-1">{error}</div>}
          <div className="flex items-center border-t border-gray-200 bg-white px-2 py-2">
            <input
              className="flex-1 rounded-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              aria-label="Chat input"
            />
            <button
              className="ml-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 font-semibold disabled:opacity-50"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce mr-1" style={{ animationDelay: '0s' }}></span>
                  <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce mr-1" style={{ animationDelay: '0.2s' }}></span>
                  <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </span>
              ) : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget; 