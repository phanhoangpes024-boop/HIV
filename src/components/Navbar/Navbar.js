"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Navbar.css';
import { createClient } from '../../utils/supabase/client';
import { signOutAction } from '../../app/auth/auth-action';

export default function Navbar() {
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [theme, setTheme] = useState('light');
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const supabase = createClient();

    const handleLogout = async () => {
        await signOutAction();
        window.location.href = '/';
    };

    useEffect(() => {
        // Initialize theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Check user session
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    useEffect(() => {
        const updateMainContentMargin = () => {
            const mainContent = document.querySelector('.main-content');
            if (mainContent && window.innerWidth > 768) {
                if (isExpanded) {
                    mainContent.style.marginLeft = '240px';
                } else {
                    mainContent.style.marginLeft = '70px';
                }
            } else if (mainContent && window.innerWidth <= 768) {
                mainContent.style.marginLeft = '0';
            }
        };

        updateMainContentMargin();
        window.addEventListener('resize', updateMainContentMargin);
        return () => window.removeEventListener('resize', updateMainContentMargin);
    }, [isExpanded]);

    const navItems = [
        {
            href: '/', text: 'Khám Phá', icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            )
        },
        {
            href: '/trending', text: 'Xu Hướng', icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
            )
        },
    ];

    // Chỉ hiện nút Đăng nhập nếu chưa có user
    if (!user) {
        navItems.push({
            href: '/signin', text: 'Đăng Nhập', icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
            )
        });
    }

    // Lấy chữ cái đầu và mã ngắn từ email
    const getUserDisplay = () => {
        if (!user) return { initial: '', shortId: '' };
        const email = user.email;
        const initial = email.charAt(0).toUpperCase();
        // Lấy 4 ký tự cuối của id làm mã ngắn
        const shortId = user.id.substring(user.id.length - 4);
        return { initial, shortId };
    };

    const { initial, shortId } = getUserDisplay();

    return (
        <>
            <div className="mobile-header">
                <button
                    className="toggle-btn"
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    aria-label="Menu"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"></line>
                        <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2"></line>
                        <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2"></line>
                    </svg>
                </button>

                <Link href="/" className="mobile-logo">
                    <div className="logo-icon small">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <span className="logo-text">InfectiXiv</span>
                </Link>
            </div>

            <div
                className={`navbar-overlay ${isMobileOpen ? 'active' : ''}`}
                onClick={() => setIsMobileOpen(false)}
            ></div>

            <nav
                className={`navbar ${isExpanded ? 'expanded' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
                onMouseEnter={() => window.innerWidth > 768 && setIsExpanded(true)}
                onMouseLeave={() => window.innerWidth > 768 && setIsExpanded(false)}
            >
                <div className="navbar-header">
                    <Link href="/" className="logo">
                        <div className="logo-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <span className="logo-text">InfectiXiv</span>
                    </Link>
                </div>

                <div className="navbar-menu">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                            title={item.text}
                            onClick={() => setIsMobileOpen(false)}
                        >
                            {item.icon}
                            <span className="nav-text">{item.text}</span>
                        </Link>
                    ))}

                    {user && (
                        <div className="user-section">
                            <div
                                className={`nav-item user-trigger ${userMenuOpen ? 'active' : ''}`}
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <div className="user-avatar">{initial}</div>
                                <span className="nav-text user-name">User #{shortId}</span>
                            </div>

                            {userMenuOpen && (
                                <div className="user-dropdown">
                                    <button className="dropdown-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Chỉnh sửa hồ sơ
                                    </button>
                                    <button
                                        className="dropdown-item logout"
                                        onClick={handleLogout}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="navbar-footer">
                    <button onClick={toggleTheme} className="footer-btn" title="Chế độ tối">
                        <svg className="sun-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="5" strokeWidth="2"></circle>
                            <line x1="12" y1="1" x2="12" y2="3" strokeWidth="2"></line>
                            <line x1="12" y1="21" x2="12" y2="23" strokeWidth="2"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeWidth="2"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeWidth="2"></line>
                            <line x1="1" y1="12" x2="3" y2="12" strokeWidth="2"></line>
                            <line x1="21" y1="12" x2="23" y2="12" strokeWidth="2"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeWidth="2"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeWidth="2"></line>
                        </svg>
                        <svg className="moon-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeWidth="2"></path>
                        </svg>
                        <span className="nav-text">Chế độ tối</span>
                    </button>

                    <button className="footer-btn" title="Tiện ích">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="nav-text">Tiện ích</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
