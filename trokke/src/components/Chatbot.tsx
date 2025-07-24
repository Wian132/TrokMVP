'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ChatBubbleLeftRightIcon, XMarkIcon } from '@heroicons/react/24/solid';

// --- Type Definitions for Speech Recognition API ---
interface SpeechRecognitionResult {
  isFinal: boolean;
  [key: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResult[];
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition: new () => SpeechRecognition;
}

// --- Message & Prop Interfaces ---
interface Message {
  text: string;
  sender: 'user' | 'bot';
}

interface ChatbotProps {
    userRole: 'admin' | 'worker' | 'client' | string;
}

export default function Chatbot({ userRole }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const speak = useCallback((text: string) => {
    if (!isAudioOutputEnabled || !text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }, [isAudioOutputEnabled]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    const userMessage: Message = { text, sender: 'user' };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    try {
        const apiMessages = newMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
        }));

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: text, 
                role: userRole,
                messages: apiMessages.slice(0, -1) // Send history, excluding current prompt
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        const botMessage: Message = { text: data.response, sender: 'bot' };

        setMessages((prev) => [...prev, botMessage]);
        speak(botMessage.text);

    } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage: Message = { text: "Sorry, I'm having trouble connecting.", sender: 'bot' };
        setMessages((prev) => [...prev, errorMessage]);
        speak(errorMessage.text);
    } finally {
        setIsLoading(false);
    }
  }, [messages, userRole, speak]);


  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionConstructor = (window as unknown as WindowWithSpeech).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        sendMessage(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'no-speech') {
            const errorMessage: Message = { text: "I didn't hear anything. Please try again.", sender: 'bot' };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
            speak(errorMessage.text);
        }
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [sendMessage, speak]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) {
    return (
        <button 
            onClick={() => setIsOpen(true)} 
            className="fixed bottom-6 right-6 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 z-50"
            aria-label="Open Chat"
        >
            <ChatBubbleLeftRightIcon className="h-8 w-8" />
        </button>
    );
  }

  return (
    <div className="fixed z-50 bg-white shadow-2xl flex flex-col rounded-t-lg bottom-0 right-0 w-full h-[85vh] sm:bottom-0 sm:right-4 sm:w-96 sm:h-[66vh]">
      <div className="flex justify-between items-center p-4 bg-gray-800 text-white rounded-t-lg">
        <h3 className="font-bold">{userRole.charAt(0).toUpperCase() + userRole.slice(1)} Assistant</h3>
        <div className="flex items-center gap-4">
            <button onClick={() => setIsAudioOutputEnabled(!isAudioOutputEnabled)} className="focus:outline-none">
                {isAudioOutputEnabled ? ( <SpeakerWaveIcon className="h-6 w-6 text-white" /> ) : ( <SpeakerXMarkIcon className="h-6 w-6 text-gray-400" /> )}
            </button>
            <button onClick={() => setIsOpen(false)} className="focus:outline-none">
                <XMarkIcon className="h-6 w-6 text-white" />
            </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`my-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <span className={`inline-block p-2 rounded-lg max-w-xs break-words ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-black'}`}>
              {msg.text}
            </span>
          </div>
        ))}
        {isLoading && <div className="flex justify-start"><span className="p-2 rounded-lg bg-gray-200 text-black">...</span></div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t">
        <form onSubmit={handleFormSubmit} className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded-l-lg text-black"
            placeholder="Type a message..."
            disabled={isLoading}
          />
          <button type="button" onClick={() => recognitionRef.current?.start()} disabled={isLoading || isListening} className={`p-3 border-t border-b ${isListening ? 'bg-red-500 text-white' : 'bg-gray-200 text-black'} disabled:opacity-50`}>
            <MicrophoneIcon className="h-6 w-6" />
          </button>
          <button type="submit" className="p-3 bg-blue-500 text-white rounded-r-lg disabled:opacity-50" disabled={isLoading}>
            <PaperAirplaneIcon className="h-6 w-6" />
          </button>
        </form>
      </div>
    </div>
  );
}
