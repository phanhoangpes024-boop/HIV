"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import './WindowPeriod.css';

// ===== TEST DATA =====
const TESTS = [
    {
        id: "rna_pcr",
        name: "HIV RNA PCR (NAT/NAAT)",
        name_vi: "Xét nghiệm HIV RNA PCR",
        name_short: "RNA PCR",
        generation: "NAT",
        color: "#185FA5",
        eclipse_end_days: 7,
        p25_days: 8,
        p50_days: 10,
        p75_days: 14,
        p99_days: 33,
        conclusive_plasma: 33,
        conclusive_cdc: 33,
        setting: "Phòng xét nghiệm",
    },
    {
        id: "4gen_lab",
        name: "4th-gen Ag/Ab combo (laboratory)",
        name_vi: "Ag/Ab combo thế hệ 4 (phòng lab)",
        name_short: "Ag/Ab lab thế hệ 4",
        generation: "4th",
        color: "#1D9E75",
        eclipse_end_days: 13,
        p25_days: 13,
        p50_days: 18,
        p75_days: 24,
        p99_days: 44,
        conclusive_plasma: 44,
        conclusive_cdc: 45,
        setting: "Phòng xét nghiệm",
    },
    {
        id: "rapid",
        name: "Rapid HIV antibody test (point-of-care)",
        name_vi: "Test nhanh HIV (kháng thể)",
        name_short: "Test nhanh",
        generation: "rapid",
        color: "#BA7517",
        eclipse_end_days: 18,
        p25_days: 18,
        p50_days: 29,
        p75_days: 40,
        p99_days: 57,
        conclusive_plasma: 57,
        conclusive_cdc: 90,
        setting: "Tại chỗ (POC)",
    },
];

// ===== SIGMOID FORMULA (no cap) =====
function getSensitivity(day, test) {
    if (day < test.eclipse_end_days) return 0;
    const k = 5.5 / (test.p99_days - test.p50_days);
    return 100 / (1 + Math.exp(-k * (day - test.p50_days)));
    // No Math.min(100) — asymptotic, never exactly 100
}

// ===== DISPLAY FORMAT =====
function formatSensitivity(v) {
    if (v >= 99.9) {
        let res = v.toPrecision(8);
        if (parseFloat(res) >= 100 && v < 100) return ">99.999999%";
        return res + '%';
    }
    if (v >= 99) return v.toFixed(4) + '%';
    if (v >= 1) return v.toFixed(1) + '%';
    if (v > 0) return '~0%';
    return '0%';
}

// ===== VERDICT LOGIC =====
function getVerdict(sensitivity, day, test) {
    if (day < test.eclipse_end_days || sensitivity < 0.01)
        return { label: 'Chưa phát hiện', bg: '#F1EFE8', text: '#5F5E5A', bgDark: '#2a2926', textDark: '#9e9d99' };
    if (sensitivity < 70)
        return { label: 'Quá sớm', bg: '#FCEBEB', text: '#A32D2D', bgDark: '#3a2020', textDark: '#e86363' };
    if (sensitivity < 99)
        return { label: 'Tạm dùng', bg: '#FAEEDA', text: '#854F0B', bgDark: '#352d17', textDark: '#d4963a' };
    return { label: 'Đáng tin cậy', bg: '#EAF3DE', text: '#3B6D11', bgDark: '#1e2d14', textDark: '#76b44a' };
}

// ===== CLINICAL DECISION RULES =====
const CLINICAL_RULES = [
    {
        range: [1, 6],
        recommendation: "Quá sớm để xét nghiệm bất kỳ loại nào. Không có test nào có thể phát hiện HIV trong giai đoạn eclipse.",
        action: "Nếu nghi ngờ phơi nhiễm, hãy tham khảo bác sĩ về PEP (cần dùng trong 72 giờ đầu).",
        severity: "warn",
    },
    {
        range: [7, 13],
        recommendation: "Chỉ HIV RNA PCR có thể cho kết quả — độ nhạy còn thấp (~0–92%). Kết quả âm tính chưa kết luận được.",
        action: "Xét nghiệm RNA PCR nếu cần phát hiện sớm. Bắt buộc xét nghiệm lại sau ngày 45.",
        severity: "caution",
    },
    {
        range: [14, 17],
        recommendation: "RNA PCR > 94%. Ag/Ab lab thế hệ 4 bắt đầu phát hiện (~8%). Test nhanh thế hệ 4 chưa phát hiện.",
        action: "Ưu tiên RNA PCR + Ag/Ab lab cùng lúc. Xét nghiệm lại sau ngày 45 để kết luận.",
        severity: "caution",
    },
    {
        range: [18, 27],
        recommendation: "RNA PCR > 99%. Ag/Ab lab thế hệ 4 đạt 50–90%. Test nhanh còn thấp.",
        action: "Ag/Ab lab thế hệ 4 là lựa chọn chính. Test nhanh có thể dùng nếu cần kết quả ngay. Xét nghiệm lại sau ngày 45.",
        severity: "info",
    },
    {
        range: [28, 44],
        recommendation: "Ag/Ab lab thế hệ 4 đạt 91–99%. Test nhanh đạt 12–82%.",
        action: "Ag/Ab lab thế hệ 4 hoặc Test nhanh là đủ tin cậy. Kết quả âm tính cần xác nhận lại sau ngày 45.",
        severity: "info",
    },
    {
        range: [45, 56],
        recommendation: "Ag/Ab lab thế hệ 4 đạt >99.2% — KẾT LUẬN ĐƯỢC (theo CDC/BHIVA).",
        action: "Xét nghiệm Ag/Ab lab thế hệ 4 hoặc Test nhanh. Kết quả âm tính là kết luận cuối (plasma).",
        severity: "good",
    },
    {
        range: [57, 89],
        recommendation: "Tất cả 3 loại xét nghiệm đạt >99%. Test nhanh đạt p99 từ ngày 57.",
        action: "Bất kỳ loại xét nghiệm nào đều cho kết quả kết luận. Test nhanh: kết luận từ ngày 57 (plasma) hoặc ngày 90.",
        severity: "good",
    },
    {
        range: [90, 999],
        recommendation: "Tất cả xét nghiệm đều kết luận được.",
        action: "Xét nghiệm bất kỳ loại nào. Kết quả âm tính là kết luận cuối cùng.",
        severity: "good",
    },
];

function getClinicalRule(day) {
    return CLINICAL_RULES.find(r => day >= r.range[0] && day <= r.range[1]);
}

// ===== CITATIONS =====
const CITATIONS_SHORT = "Delaney et al. CID 2017 · Delaney et al. CROI 2018 · CDC 2014 · StatPearls 2025 · NHC / UW · aidsmap 2021 · Stekler et al. 2017 · BHIVA 2020";

const CITATIONS_FULL = [
    { id: "delaney2017", text: "Delaney KP et al. \"Time Until Emergence of HIV Test Reactivity Following Infection With HIV-1.\" Clin Infect Dis. 2017;64:53–59.", url: "https://academic.oup.com/cid/article/64/1/53/2197867" },
    { id: "delaney2018croi", text: "Delaney KP et al. \"Time from HIV infection to earliest detection for 4 FDA-approved point-of-care tests.\" CROI 2018, Abstract 565.", url: "http://www.croiconference.org/sessions/time-hiv-infection-earliest-detection-4-fda-approved-point-care-tests" },
    { id: "cdc2014lab", text: "CDC. \"Laboratory Testing for the Diagnosis of HIV Infection: Updated Recommendations.\" 2014.", url: "https://stacks.cdc.gov/view/cdc/23447" },
    { id: "statpearls2025", text: "StatPearls. \"HIV Testing.\" NCBI Bookshelf, 2025.", url: "https://www.ncbi.nlm.nih.gov/books/NBK482145/" },
    { id: "nhc_uw", text: "National HIV Curriculum — Univ. of Washington / CDC. \"HIV Diagnostic Testing.\"", url: "https://www.hiv.uw.edu/go/screening-diagnosis/diagnostic-testing/core-concept/all" },
    { id: "aidsmap2021", text: "Pebody R, NAM aidsmap. \"What is the window period for HIV testing?\" 2021.", url: "https://www.aidsmap.com/about-hiv/what-window-period-hiv-testing" },
    { id: "pmc5718364", text: "Stekler JD et al. \"Selecting an HIV Test: A Narrative Review.\" Sex Transm Dis. 2017.", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5718364/" },
    { id: "bhiva2020", text: "BHIVA/BASHH/BIA. \"Adult HIV Testing Guidelines 2020.\"", url: "https://www.bhiva.org/HIV-testing-guidelines" },
];

// ===== CHART COMPONENT (Canvas-based) =====
function SensitivityChart({ day, tests }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const W = rect.width;
        const H = rect.height;
        const pad = { top: 20, right: 20, bottom: 36, left: 48 };
        const plotW = W - pad.left - pad.right;
        const plotH = H - pad.top - pad.bottom;

        // Clear
        ctx.clearRect(0, 0, W, H);

        // Detect dark mode
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        const labelColor = isDark ? '#9ca3af' : '#6b7280';

        // Grid lines
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        for (let p = 0; p <= 100; p += 25) {
            const y = pad.top + plotH - (p / 100) * plotH;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + plotW, y);
            ctx.stroke();
        }

        // Y axis labels
        ctx.fillStyle = labelColor;
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let p = 0; p <= 100; p += 25) {
            const y = pad.top + plotH - (p / 100) * plotH;
            ctx.fillText(p + '%', pad.left - 6, y);
        }

        // X axis labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const xTicks = [1, 10, 20, 30, 45, 60, 90];
        for (const d of xTicks) {
            const x = pad.left + ((d - 1) / 89) * plotW;
            ctx.fillText(d, x, pad.top + plotH + 6);
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, pad.top);
            ctx.lineTo(x, pad.top + plotH);
            ctx.stroke();
        }

        // X axis label
        ctx.fillStyle = labelColor;
        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('Ngày', pad.left + plotW / 2, pad.top + plotH + 22);

        // Draw curves
        tests.forEach(test => {
            ctx.strokeStyle = test.color;
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            let started = false;
            for (let d = 1; d <= 90; d++) {
                const s = getSensitivity(d, test);
                const x = pad.left + ((d - 1) / 89) * plotW;
                const y = pad.top + plotH - (s / 100) * plotH;
                if (!started) { ctx.moveTo(x, y); started = true; }
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        });

        // Vertical day marker
        const markerX = pad.left + ((day - 1) / 89) * plotW;
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(markerX, pad.top);
        ctx.lineTo(markerX, pad.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Day marker dots
        tests.forEach(test => {
            const s = getSensitivity(day, test);
            const x = markerX;
            const y = pad.top + plotH - (s / 100) * plotH;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = test.color;
            ctx.fill();
            ctx.strokeStyle = isDark ? '#1f2937' : '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Day label at top
        ctx.fillStyle = isDark ? '#f9fafb' : '#111827';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ngày ' + day, markerX, pad.top - 20);

    }, [day, tests]);

    return (
        <canvas
            ref={canvasRef}
            className="wp-chart-canvas"
            style={{ width: '100%', height: '280px' }}
        />
    );
}

// ===== MAIN COMPONENT =====
export default function WindowPeriodPage() {
    const [day, setDay] = useState(21);
    const [showCitations, setShowCitations] = useState(false);
    const [activeTab, setActiveTab] = useState('chart');
    const sliderRef = useRef(null);

    // Compute all sensitivities
    const sensitivities = useMemo(() => {
        return TESTS.map(test => {
            const s = getSensitivity(day, test);
            const verdict = getVerdict(s, day, test);
            return { ...test, sensitivity: s, verdict };
        });
    }, [day]);

    const clinicalRule = getClinicalRule(day);

    // Slider fill style
    const sliderPercent = ((day - 1) / 89) * 100;

    // Handle slider interaction
    const handleSliderChange = useCallback((e) => {
        setDay(parseInt(e.target.value, 10));
    }, []);

    return (
        <div className="wp-container">
            {/* Back link */}
            <Link href="/tools" className="wp-back-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Công cụ
            </Link>

            {/* Hero */}
            <div className="wp-hero">
                <h1 className="wp-hero-title">Cửa sổ xét nghiệm HIV</h1>
                <p className="wp-hero-desc">
                    Độ nhạy ước tính của 3 loại xét nghiệm HIV theo ngày sau phơi nhiễm.
                    Mô hình sigmoid không giới hạn — độ nhạy tiệm cận nhưng không bao giờ đạt chính xác 100%.
                </p>
            </div>

            {/* Slider */}
            <div className="wp-slider-card">
                <div className="wp-slider-header">
                    <span className="wp-slider-label">Ngày sau phơi nhiễm</span>
                    <span className="wp-slider-value">
                        <span className="wp-slider-day">{day}</span>
                        <span className="wp-slider-unit">ngày</span>
                    </span>
                </div>
                <div className="wp-slider-track-wrapper">
                    <input
                        ref={sliderRef}
                        type="range"
                        min="1"
                        max="90"
                        step="1"
                        value={day}
                        onChange={handleSliderChange}
                        className="wp-slider"
                        id="day-slider"
                        style={{
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${sliderPercent}%, var(--border-color) ${sliderPercent}%, var(--border-color) 100%)`
                        }}
                    />
                    <div className="wp-slider-marks">
                        {[1, 14, 28, 45, 60, 90].map(val => (
                            <span 
                                key={val}
                                style={{ left: `${((val - 1) / 89) * 100}%` }}
                            >
                                {val}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab switcher */}
            <div className="wp-tabs">
                <button
                    className={`wp-tab ${activeTab === 'chart' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chart')}
                    id="tab-chart"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                    </svg>
                    Biểu đồ đường
                </button>
                <button
                    className={`wp-tab ${activeTab === 'bars' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bars')}
                    id="tab-bars"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="12" width="4" height="8" rx="1" />
                        <rect x="10" y="8" width="4" height="12" rx="1" />
                        <rect x="17" y="4" width="4" height="16" rx="1" />
                    </svg>
                    Thanh ngang
                </button>
            </div>

            {/* Chart or Bars */}
            <div className="wp-visual-card">
                {activeTab === 'chart' && (
                    <SensitivityChart day={day} tests={TESTS} />
                )}

                {activeTab === 'bars' && (
                    <div className="wp-bar-list">
                        {sensitivities.map(test => (
                            <div key={test.id} className="wp-bar-row">
                                <div className="wp-bar-info">
                                    <span className="wp-bar-dot" style={{ backgroundColor: test.color }} />
                                    <span className="wp-bar-name">{test.name_short}</span>
                                </div>
                                <div className="wp-bar-track">
                                    <div
                                        className="wp-bar-fill"
                                        style={{
                                            width: `${Math.min(test.sensitivity, 100)}%`,
                                            backgroundColor: test.color,
                                        }}
                                    />
                                </div>
                                <span className="wp-bar-pct" style={{ color: test.color }}>
                                    {formatSensitivity(test.sensitivity)}
                                </span>
                                <span
                                    className="wp-verdict-badge"
                                    style={{
                                        '--badge-bg': test.verdict.bg,
                                        '--badge-text': test.verdict.text,
                                        '--badge-bg-dark': test.verdict.bgDark,
                                        '--badge-text-dark': test.verdict.textDark,
                                    }}
                                >
                                    {test.verdict.label}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Legend (always visible under chart) */}
                {activeTab === 'chart' && (
                    <div className="wp-chart-legend">
                        {TESTS.map(test => (
                            <div key={test.id} className="wp-legend-item">
                                <span className="wp-legend-swatch" style={{ backgroundColor: test.color }} />
                                <span className="wp-legend-label">{test.name_short}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Clinical Recommendation */}
            {clinicalRule && (
                <div className={`wp-clinical-card wp-clinical-${clinicalRule.severity}`}>
                    <div className="wp-clinical-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {clinicalRule.severity === 'good' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : clinicalRule.severity === 'warn' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                        </svg>
                        <span className="wp-clinical-title">Khuyến nghị lâm sàng — Ngày {day}</span>
                    </div>
                    <p className="wp-clinical-rec">{clinicalRule.recommendation}</p>
                    <p className="wp-clinical-action">
                        <strong>Hành động:</strong> {clinicalRule.action}
                    </p>
                </div>
            )}

            {/* Special Cases */}
            <div className="wp-special-cases">
                <h3 className="wp-special-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Trường hợp đặc biệt
                </h3>
                <div className="wp-special-list">
                    <div className="wp-special-item">
                        <span>Đối với người đang điều trị dự phòng trước phơi nhiễm (PrEP), quá trình chuyển đảo huyết thanh có thể bị trì hoãn hàng tháng nên cần sử dụng xét nghiệm RNA PCR kết hợp với Ag/Ab thế hệ 4 mỗi lần kiểm tra và không tham khảo đường cong độ nhạy này.</span>
                    </div>
                    <div className="wp-special-item">
                        <span>Đối với người đang điều trị dự phòng sau phơi nhiễm (PEP), quy trình theo dõi tương tự như PrEP và cần thực hiện xét nghiệm lại sau 45 đến 90 ngày kể từ khi kết thúc hoàn toàn liệu trình điều trị PEP.</span>
                    </div>
                    <div className="wp-special-item">
                        <span>Đối với các loại xét nghiệm dịch miệng hoặc tự xét nghiệm tại nhà, giai đoạn cửa sổ thường kéo dài hơn nhiều so với xét nghiệm máu tĩnh mạch hoặc lấy máu đầu ngón tay nên cần đủ 90 ngày mới có thể khẳng định kết quả chính xác cuối cùng.</span>
                    </div>
                </div>
            </div>

            {/* Test details table */}
            <div className="wp-details-card">
                <h3 className="wp-details-title">Chi tiết 3 loại xét nghiệm</h3>
                <div className="wp-details-table-wrapper">
                    <table className="wp-details-table">
                        <thead>
                            <tr>
                                <th>Loại</th>
                                <th>Eclipse</th>
                                <th>p50</th>
                                <th>p99</th>
                                <th>Kết luận (CDC)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {TESTS.map(test => (
                                <tr key={test.id}>
                                    <td>
                                        <span className="wp-table-dot" style={{ backgroundColor: test.color }} />
                                        {test.name_short}
                                    </td>
                                    <td>{test.eclipse_end_days}d</td>
                                    <td>{test.p50_days}d</td>
                                    <td>{test.p99_days}d</td>
                                    <td>{test.conclusive_cdc}d</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Global Caveats */}
            <div className="wp-caveats">
                <h3 className="wp-caveats-title">Lưu ý quan trọng</h3>
                <ul className="wp-caveats-list">
                    <li>Dữ liệu dựa trên mẫu HUYẾT TƯƠNG từ HIV-1 subtype B (phổ biến ở phương Tây).</li>
                    <li>Máu đầu ngón tay / dịch miệng: cửa sổ DÀI HƠN vài ngày — chưa có con số chính xác (Delaney 2018).</li>
                    <li>Subtype HIV-1 khác (A, C, D…) có thể cho độ nhạy thấp hơn trên một số trường hợp.</li>
                    <li>Người dùng PrEP/PEP: chuyển đổi huyết thanh có thể bị trì hoãn, đường cong trên KHÔNG áp dụng.</li>
                    <li>Mô hình sigmoid là xấp xỉ thống kê — sai số cá nhân luôn tồn tại.</li>
                </ul>
            </div>

            {/* Citations Footer */}
            <div className="wp-citations-footer">
                <div className="wp-citations-summary" onClick={() => setShowCitations(!showCitations)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Nguồn: {CITATIONS_SHORT}</span>
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`wp-citations-chevron ${showCitations ? 'open' : ''}`}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                {showCitations && (
                    <div className="wp-citations-full">
                        {CITATIONS_FULL.map(c => (
                            <div key={c.id} className="wp-citation-item">
                                <span className="wp-citation-id">[{c.id}]</span>
                                <span className="wp-citation-text">{c.text}</span>
                                <a href={c.url} target="_blank" rel="noopener noreferrer" className="wp-citation-link">↗</a>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Disclaimer */}
            <div className="wp-disclaimer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                    <strong>Công cụ này chỉ mang tính tham khảo, không thay thế tư vấn y tế chuyên nghiệp.</strong>{' '}
                    Mọi thông tin được xử lý hoàn toàn trên trình duyệt, không lưu trữ hay gửi dữ liệu đi đâu.
                </div>
            </div>
        </div>
    );
}
