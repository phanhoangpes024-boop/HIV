"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './Navbar.css';
import { createClient } from '../../utils/supabase/client';
import { signOutAction } from '../../app/auth/auth-action';

export default function Navbar() {
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(true);
    const [theme, setTheme] = useState('light');
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileNavVisible, setMobileNavVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const supabase = createClient();

    const handleLogout = async () => {
        await signOutAction();
        window.location.href = '/';
    };

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);

        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Handle scroll for mobile navbar
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY < 50) {
                // Ở đầu trang - luôn hiện
                setMobileNavVisible(true);
            } else if (currentScrollY > lastScrollY) {
                // Scroll xuống - ẩn
                setMobileNavVisible(false);
            } else {
                // Scroll lên - hiện
                setMobileNavVisible(true);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

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
            href: '/',
            label: 'Khám phá',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            )
        }
    ];

    const getUserDisplay = () => {
        if (!user) return { initial: '', shortId: '' };
        const email = user.email;
        const initial = email.charAt(0).toUpperCase();
        const shortId = user.id.substring(user.id.length - 4);
        return { initial, shortId };
    };

    const { initial } = getUserDisplay();

    return (
        <>
            {/* Desktop Navbar */}
            <nav className={`navbar ${isExpanded ? 'expanded' : ''}`}>
                <div className="navbar-header">
                    <div className="header-content">
                        <div 
                            className="standalone-logo-icon"
                            onClick={() => setIsExpanded(true)}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>

                        <Link href="/" className="logo">
                            <div className="logo-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <span className="logo-text">InfectiXiv</span>
                        </Link>

                        {isExpanded && (
                            <button
                                className="desktop-toggle-btn"
                                onClick={() => setIsExpanded(false)}
                                aria-label="Thu gọn menu"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="navbar-menu">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                            title={item.label}
                        >
                            <div className="icon-wrapper">
                                {item.icon}
                            </div>
                            <span className="nav-text">{item.label}</span>
                        </Link>
                    ))}
                </div>

                <div className="navbar-footer">
                    <button onClick={toggleTheme} className="footer-btn" title="Chế độ tối">
                        <div className="icon-wrapper">
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
                        </div>
                        <span className="nav-text">Chế độ tối</span>
                    </button>

                    {user ? (
                        <div className="user-section">
                            <div
                                className={`nav-item user-trigger ${userMenuOpen ? 'active' : ''}`}
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                <div className="user-avatar">{initial}</div>
                                <span className="nav-text user-name">Tài khoản</span>
                            </div>

                            {userMenuOpen && (
                                <div className="user-dropdown">
                                    <button className="dropdown-item">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Hồ sơ
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
                    ) : (
                        <Link href="/signin" className="nav-item">
                            <div className="icon-wrapper">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <span className="nav-text">Đăng nhập</span>
                        </Link>
                    )}
                </div>
            </nav>

            {/* Mobile Bottom Navbar */}
            <nav className={`mobile-navbar ${mobileNavVisible ? '' : 'hidden'}`}>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <div className="mobile-nav-icon">
                            {item.icon}
                        </div>
                        <span className="mobile-nav-label">{item.label}</span>
                    </Link>
                ))}

                <button onClick={toggleTheme} className="mobile-nav-item">
                    <div className="mobile-nav-icon">
                        <svg className="sun-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
                        <svg className="moon-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeWidth="2"></path>
                        </svg>
                    </div>
                    <span className="mobile-nav-label">Theme</span>
                </button>

                {user ? (
                    <button className="mobile-nav-item" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                        <div className="mobile-nav-icon">
                            <div className="user-avatar">{initial}</div>
                        </div>
                        <span className="mobile-nav-label">Tôi</span>
                    </button>
                ) : (
                    <Link href="/signin" className="mobile-nav-item">
                        <div className="mobile-nav-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <span className="mobile-nav-label">Đăng nhập</span>
                    </Link>
                )}
            </nav>
        </>
    );
}