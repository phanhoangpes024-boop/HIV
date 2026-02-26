"use client";

import GoogleLoginButton from "../../components/GoogleLoginButton";
import Link from "next/link";

export default function SignInPage() {
    return (
        <div className="signin-container">
            <div className="signin-card">
                <div className="signin-header">
                    <div className="logo-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="auth-title brand-font">Chào mừng đến với THE EPIDEMIC HOUSE</h1>
                    <p>Đăng nhập để trải nghiệm đầy đủ các tính năng của THE EPIDEMIC HOUSE</p>
                </div>

                <div className="signin-content">
                    <GoogleLoginButton />
                </div>

                <div className="signin-footer">
                    <p>Bằng cách tiếp tục, bạn đồng ý với Điều khoản và Chính sách của chúng tôi.</p>
                    <Link href="/" className="back-link">Quay lại trang chủ</Link>
                </div>
            </div>

            <style jsx>{`
                .signin-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 80vh;
                    padding: 2rem;
                }
                .signin-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 2.5rem;
                    width: 100%;
                    max-width: 400px;
                    text-align: center;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                }
                .logo-icon {
                    color: var(--accent-color);
                    margin-bottom: 1.5rem;
                    display: flex;
                    justify-content: center;
                }
                h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                p {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin-bottom: 2rem;
                }
                .signin-content {
                    margin-bottom: 2rem;
                    display: flex;
                    justify-content: center;
                }
                .signin-footer {
                    border-top: 1px solid var(--border-color);
                    padding-top: 1.5rem;
                }
                .signin-footer p {
                    font-size: 0.75rem;
                    margin-bottom: 1rem;
                }
                .back-link {
                    color: var(--accent-color);
                    text-decoration: none;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .back-link:hover {
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
}
