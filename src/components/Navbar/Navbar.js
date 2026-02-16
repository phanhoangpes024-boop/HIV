"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import './Navbar.css';
import { createClient } from '../../utils/supabase/client';
import { signOutAction } from '../../app/auth/auth-action';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [theme, setTheme] = useState('light');
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileNavVisible, setMobileNavVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [displayName, setDisplayName] = useState('');
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
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('avatar_url, display_name')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    setAvatarUrl(profile.avatar_url || null);
                    setDisplayName(profile.display_name || '');
                }
            }
        };
        getUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY < 50) {
                setMobileNavVisible(true);
            } else if (currentScrollY > lastScrollY) {
                setMobileNavVisible(false);
            } else {
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
                mainContent.style.marginLeft = '220px';
            } else if (mainContent && window.innerWidth <= 768) {
                mainContent.style.marginLeft = '0';
            }
        };
        updateMainContentMargin();
        window.addEventListener('resize', updateMainContentMargin);
        return () => window.removeEventListener('resize', updateMainContentMargin);
    }, []);

    // Đóng user menu khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userMenuOpen && !e.target.closest('.user-section')) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [userMenuOpen]);

    const navItems = [
        {
            href: '/',
            label: 'Khám phá',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
            )
        },
        {
            href: '/guidelines',
            label: 'Hướng dẫn',
            icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        }
    ];

    const getUserDisplay = () => {
        if (!user) return { initial: '', email: '' };
        const email = user.email;
        const initial = (displayName || email).charAt(0).toUpperCase();
        return { initial, email };
    };

    const { initial, email } = getUserDisplay();

    const renderAvatar = (size) => {
        if (avatarUrl) {
            return <img src={avatarUrl} alt="" className="sidebar-avatar-img" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
        }
        return <div className="sidebar-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>{initial}</div>;
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <nav className="sidebar">
                {/* Logo */}
                <div className="sidebar-header">
                    <Link href="/" className="sidebar-logo">
                        <div className="sidebar-logo-icon">
                            <img
                                src={theme === 'light' ? '/Logo.png' : '/Dark Logo.png'}
                                alt="EpiHouse Logo"
                                className="logo-img"
                            />
                        </div>
                        <span className="sidebar-logo-text brand-font">THE EPIDEMIC HOUSE</span>
                    </Link>
                </div>

                {/* Navigation Links */}
                <div className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                        >
                            <span className="sidebar-link-icon">{item.icon}</span>
                            <span className="sidebar-link-text">{item.label}</span>
                        </Link>
                    ))}
                </div>

                {/* Footer */}
                <div className="sidebar-footer">
                    {/* Sign In / Account */}
                    {user ? (
                        <div className="user-section">
                            <button
                                className="sidebar-link user-trigger"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                {renderAvatar(24)}
                                <span className="sidebar-link-text">{displayName || 'Tài khoản'}</span>
                            </button>

                            {userMenuOpen && (
                                <div className="sidebar-dropdown">
                                    <div className="sidebar-dropdown-header">
                                        {renderAvatar(24)}
                                        <span className="sidebar-dropdown-email">{email}</span>
                                    </div>
                                    <div className="sidebar-dropdown-divider"></div>
                                    <button className="sidebar-dropdown-item" onClick={() => { setUserMenuOpen(false); router.push('/profile'); }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Hồ sơ
                                    </button>
                                    <button className="sidebar-dropdown-item logout" onClick={handleLogout}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/signin" className="sidebar-link">
                            <span className="sidebar-link-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </span>
                            <span className="sidebar-link-text">Đăng nhập</span>
                        </Link>
                    )}

                    {/* Dark Mode Toggle */}
                    <button onClick={toggleTheme} className="sidebar-link theme-toggle">
                        <span className="sidebar-link-icon">
                            <svg className="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="5"></circle>
                                <line x1="12" y1="1" x2="12" y2="3"></line>
                                <line x1="12" y1="21" x2="12" y2="23"></line>
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                                <line x1="1" y1="12" x2="3" y2="12"></line>
                                <line x1="21" y1="12" x2="23" y2="12"></line>
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                            </svg>
                            <svg className="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                            </svg>
                        </span>
                        <span className="sidebar-link-text">Giao diện</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Bottom Navbar — giữ nguyên */}
            <nav className={`mobile-navbar ${mobileNavVisible ? '' : 'hidden'}`}>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`mobile-nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <div className="mobile-nav-icon">{item.icon}</div>
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
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div className="user-avatar-mobile">{initial}</div>
                            )}
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