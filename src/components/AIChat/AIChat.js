"use client";

import { useState, useEffect, useRef } from 'react';
import './AIChat.css';

const placeholders = [
    "Which open-source models should I use if I want to train my own embedding model?",
    "Phác đồ điều trị mới nhất cho bệnh nhân tiểu đường type 2?",
    "Tác dụng phụ thường gặp của thuốc kháng retrovirus (ARV) là gì?",
    "Làm thế nào để phân tích ảnh X-quang phổi bằng AI?",
    "Các dấu hiệu sớm nhận biết biến chủng virus mới?"
];

export default function AIChat() {
    const [inputValue, setInputValue] = useState('');
    const [placeholderText, setPlaceholderText] = useState('');
    const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const sendBtnRef = useRef(null);

    // Typewriter effect
    useEffect(() => {
        let timer;
        const fullPhrase = placeholders[currentPhraseIndex];

        const tick = () => {
            setPlaceholderText(prev => {
                if (isDeleting) {
                    if (prev === '') {
                        setIsDeleting(false);
                        setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % placeholders.length);
                        return '';
                    }
                    return fullPhrase.substring(0, prev.length - 1);
                } else {
                    if (prev === fullPhrase) {
                        timer = setTimeout(() => setIsDeleting(true), 2000);
                        return prev;
                    }
                    return fullPhrase.substring(0, prev.length + 1);
                }
            });
        };

        const delta = isDeleting ? 50 : 100;
        if (!timer) {
            timer = setTimeout(tick, delta);
        }

        return () => clearTimeout(timer);
    }, [placeholderText, isDeleting, currentPhraseIndex]);

    const handleSend = () => {
        if (inputValue.trim()) {
            console.log('Gửi tin nhắn:', inputValue);
            setInputValue('');

            // Animation effect
            if (sendBtnRef.current) {
                sendBtnRef.current.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    if (sendBtnRef.current) sendBtnRef.current.style.transform = 'scale(1)';
                }, 150);
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.altKey && e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat-wrapper">
            <div className="chat-content">
                <h1 className="chat-title">Ask or search anything...</h1>

                <div className="search-container">
                    <textarea
                        className="chat-textarea"
                        placeholder={placeholderText}
                        rows="3"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                    ></textarea>

                    <div className="toolbar">
                        <div className="toolbar-left">
                            <button className="toolbar-btn attach-btn" aria-label="Đính kèm file">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                </svg>
                            </button>

                            <button className="toolbar-btn history-btn" aria-label="Lịch sử">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <span className="history-text">History</span>
                            </button>
                        </div>

                        <div className="toolbar-right">
                            <span className="search-hint">Alt+↵ To search</span>
                            <button
                                className="send-btn"
                                ref={sendBtnRef}
                                onClick={handleSend}
                                aria-label="Gửi"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="19" x2="12" y2="5" />
                                    <polyline points="5 12 12 5 19 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <p className="footer-hint">Powered by AI • Fast &amp; Intelligent Search</p>
            </div>
        </div>
    );
}
