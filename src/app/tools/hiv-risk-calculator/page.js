"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import './HivRiskCalculator.css';

// ===== CONSTANTS =====
const ACT_TYPES = [
    { value: 'receptive_anal', label: 'Quan hệ hậu môn (bị động / nhận)', prob: 0.0138 },
    { value: 'insertive_anal', label: 'Quan hệ hậu môn (chủ động / đưa vào)', prob: 0.0011 },
    { value: 'receptive_vaginal', label: 'Quan hệ âm đạo (bị động / nhận)', prob: 0.0008 },
    { value: 'insertive_vaginal', label: 'Quan hệ âm đạo (chủ động / đưa vào)', prob: 0.0004 },
    { value: 'fellatio', label: 'Quan hệ bằng miệng (fellatio)', prob: 0.0001 },
    { value: 'shared_needle', label: 'Dùng chung kim tiêm', prob: 0.0063 },
];

const PARTNER_STATUS_OPTIONS = [
    { value: 'positive', label: 'Biết HIV dương tính', desc: 'Bạn tình đã xác nhận có HIV' },
    { value: 'unknown', label: 'Không rõ tình trạng', desc: 'Chưa xét nghiệm hoặc không biết kết quả' },
    { value: 'negative', label: 'Biết HIV âm tính', desc: 'Bạn tình đã xét nghiệm âm tính gần đây' },
];

const RISK_FACTORS = [
    { id: 'acute', label: 'Bạn tình nhiễm HIV cấp tính', hint: 'Trong 2–4 tuần đầu sau lây nhiễm', multiplier: 7.25, category: 'amplifier', sexualOnly: true },
    { id: 'sti_ulcer', label: 'STI có loét (giang mai, herpes)', hint: 'Ở bạn hoặc bạn tình', multiplier: 2.65, category: 'amplifier', sexualOnly: true },
    { id: 'sti_discharge', label: 'STI có tiết dịch (lậu, chlamydia)', hint: 'Ở bạn hoặc bạn tình', multiplier: 1.8, category: 'amplifier', sexualOnly: true },
    { id: 'bleeding', label: 'Chảy máu / tổn thương niêm mạc', hint: 'Trong quá trình quan hệ', multiplier: 2.0, category: 'amplifier', sexualOnly: true },
    { id: 'condom', label: 'Sử dụng bao cao su (đúng cách)', hint: 'Sử dụng suốt quá trình', multiplier: 0.20, category: 'protector', sexualOnly: true },
    { id: 'prep', label: 'Đang dùng PrEP (tuân thủ)', hint: 'Uống đều đặn theo phác đồ', multiplier: 0.01, category: 'protector' },
    { id: 'circumcision', label: 'Đã cắt bao quy đầu', hint: 'Chỉ áp dụng khi quan hệ chủ động', multiplier: 0.40, category: 'protector', insertiveOnly: true, sexualOnly: true },
];

const POPULATION_OPTIONS = [
    { value: 'high_risk', label: 'Nhóm nguy cơ cao', desc: 'MSM (~12–16%), tiêm chích (~15–20%), mại dâm — VAAC 2023', prevalence: 0.15 },
    { value: 'general', label: 'Dân số chung', desc: 'Không thuộc nhóm nguy cơ cao — prevalence ~0.3% (UNAIDS Vietnam 2023)', prevalence: 0.003 },
];

// ===== CALCULATION ENGINE =====
function calculateRisk({ actType, partnerStatus, isUU, populationRisk, riskFactors, hoursAgo }) {
    // Known negative → 0
    if (partnerStatus === 'negative') return { probability: 0, isZero: true };
    // U=U → 0
    if (isUU) return { probability: 0, isZero: true, isUU: true };

    const act = ACT_TYPES.find(a => a.value === actType);
    if (!act) return { probability: 0, isZero: true };

    let pBase = act.prob;

    // If unknown partner, multiply by prevalence
    if (partnerStatus === 'unknown') {
        const pop = POPULATION_OPTIONS.find(p => p.value === populationRisk);
        pBase *= (pop ? pop.prevalence : 0.05);
    }

    // Collect all multipliers
    let product = 1;
    const activeMultipliers = [];

    riskFactors.forEach(factorId => {
        const factor = RISK_FACTORS.find(f => f.id === factorId);
        if (factor) {
            // circumcision only applies to insertive roles
            if (factor.insertiveOnly) {
                if (!actType.startsWith('insertive')) return;
            }
            product *= factor.multiplier;
            activeMultipliers.push({ label: factor.label, multiplier: factor.multiplier });
        }
    });

    // Complementary formula: P = 1 - (1 - pBase)^product
    let pFinal = 1 - Math.pow(1 - pBase, product);

    // Cap
    pFinal = Math.min(pFinal, 0.999);

    return {
        probability: pFinal,
        isZero: false,
        pBase: act.prob,
        activeMultipliers,
    };
}

function getRiskLevel(p) {
    if (p < 0.0001) return { level: 'risk-very-low', label: 'Cực thấp', emoji: '🟢' };
    if (p < 0.001) return { level: 'risk-low', label: 'Thấp', emoji: '🟡' };
    if (p < 0.01) return { level: 'risk-moderate', label: 'Trung bình — cân nhắc PEP', emoji: '🟠' };
    return { level: 'risk-high', label: 'Cao — nên dùng PEP khẩn cấp', emoji: '🔴' };
}

function formatPercent(p) {
    if (p === 0) return '0.00%';
    if (p < 0.0001) return '< 0.01%';
    if (p < 0.01) return (p * 100).toFixed(3) + '%';
    return (p * 100).toFixed(2) + '%';
}

// ===== COMPONENT =====
export default function HivRiskCalculatorPage() {
    const [step, setStep] = useState(1);
    const [showResult, setShowResult] = useState(false);

    // Step 1
    const [actType, setActType] = useState('');
    // Step 2
    const [partnerStatus, setPartnerStatus] = useState('');
    const [isUU, setIsUU] = useState(false);
    const [populationRisk, setPopulationRisk] = useState('');
    // Step 3
    const [selectedFactors, setSelectedFactors] = useState([]);
    // Step 4
    const [timeWindow, setTimeWindow] = useState('');

    const isInsertive = actType.startsWith('insertive');
    const isNeedle = actType === 'shared_needle';

    // Calculate result
    const result = useMemo(() => {
        return calculateRisk({
            actType,
            partnerStatus,
            isUU,
            populationRisk,
            riskFactors: selectedFactors,
        });
    }, [actType, partnerStatus, isUU, populationRisk, selectedFactors]);

    const riskInfo = getRiskLevel(result.probability);

    // Navigation
    const canNext = () => {
        switch (step) {
            case 1: return !!actType;
            case 2: {
                if (!partnerStatus) return false;
                if (partnerStatus === 'unknown' && !populationRisk) return false;
                return true;
            }
            case 3: return true;
            case 4: return timeWindow !== '';
            default: return false;
        }
    };

    const goNext = () => {
        // Known negative → skip to result
        if (step === 2 && partnerStatus === 'negative') {
            setShowResult(true);
            return;
        }
        // U=U → skip to result
        if (step === 2 && isUU) {
            setShowResult(true);
            return;
        }
        if (step < 4) {
            setStep(step + 1);
        } else {
            setShowResult(true);
        }
    };

    const goBack = () => {
        if (showResult) {
            if (partnerStatus === 'negative' || isUU) {
                setShowResult(false);
                setStep(2);
            } else {
                setShowResult(false);
                setStep(4);
            }
            return;
        }
        if (step > 1) setStep(step - 1);
    };

    const recalculate = () => {
        setStep(1);
        setShowResult(false);
        setActType('');
        setPartnerStatus('');
        setIsUU(false);
        setPopulationRisk('');
        setSelectedFactors([]);
        setTimeWindow('');
    };

    const toggleFactor = (id) => {
        setSelectedFactors(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const getStepStatus = (s) => {
        if (showResult) return 'completed';
        if (s < step) return 'completed';
        if (s === step) return 'active';
        return '';
    };

    const stepLabels = ['Hành vi', 'Bạn tình', 'Yếu tố', 'Thời gian'];

    return (
        <div className="hrc-container">
            {/* Back link */}
            <Link href="/tools" className="hrc-back-link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Công cụ
            </Link>

            {/* Hero */}
            <div className="hrc-hero">
                <h1 className="hrc-hero-title">Đánh giá nguy cơ HIV</h1>
                <p className="hrc-hero-desc">
                    Ước tính xác suất lây nhiễm HIV sau phơi nhiễm. Base rates: Patel et al. (2014) <em>AIDS</em> 28:1509–1519 · Prevalence: UNAIDS Vietnam 2023
                </p>
            </div>

            {/* Progress bar */}
            <div className="hrc-progress">
                {stepLabels.map((label, i) => {
                    const s = i + 1;
                    const status = getStepStatus(s);
                    return (
                        <div key={s} style={{ display: 'contents' }}>
                            <div className={`hrc-progress-step ${status}`}>
                                <div className="hrc-progress-dot">
                                    {status === 'completed' ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : s}
                                </div>
                                <span className="hrc-progress-label">{label}</span>
                            </div>
                            {i < 3 && (
                                <div className={`hrc-progress-line ${s < step || showResult ? 'completed' : ''}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ===== WIZARD STEPS ===== */}
            {!showResult && (
                <>
                    {/* Step 1: Act Type */}
                    {step === 1 && (
                        <div className="hrc-card">
                            <h2 className="hrc-step-title">Loại hành vi phơi nhiễm</h2>
                            <p className="hrc-step-subtitle">Chọn hành vi có nguy cơ phơi nhiễm HIV</p>
                            <select
                                className="hrc-select"
                                value={actType}
                                onChange={(e) => setActType(e.target.value)}
                                id="act-type-select"
                            >
                                <option value="" disabled>— Chọn hành vi —</option>
                                {ACT_TYPES.map(act => (
                                    <option key={act.value} value={act.value}>{act.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Step 2: Partner Status */}
                    {step === 2 && (
                        <div className="hrc-card">
                            <h2 className="hrc-step-title">Tình trạng HIV của bạn tình</h2>
                            <p className="hrc-step-subtitle">Bạn có biết tình trạng HIV của người kia không?</p>
                            <div className="hrc-radio-group">
                                {PARTNER_STATUS_OPTIONS.map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`hrc-radio-option ${partnerStatus === opt.value ? 'selected' : ''}`}
                                        onClick={() => {
                                            setPartnerStatus(opt.value);
                                            setIsUU(false);
                                            setPopulationRisk('');
                                        }}
                                        id={`partner-${opt.value}`}
                                    >
                                        <div className="hrc-radio-dot">
                                            <div className="hrc-radio-dot-inner" />
                                        </div>
                                        <div>
                                            <div className="hrc-radio-label">{opt.label}</div>
                                            <div className="hrc-radio-desc">{opt.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Sub-question: Known positive → U=U? */}
                            {partnerStatus === 'positive' && (
                                <div className="hrc-sub-question">
                                    <div className="hrc-sub-label">Bạn tình đang điều trị ARV và tải lượng virus dưới ngưỡng phát hiện (U=U)?</div>
                                    <div className="hrc-radio-group">
                                        <div
                                            className={`hrc-radio-option ${isUU === true ? 'selected' : ''}`}
                                            onClick={() => setIsUU(true)}
                                            id="uu-yes"
                                        >
                                            <div className="hrc-radio-dot"><div className="hrc-radio-dot-inner" /></div>
                                            <div>
                                                <div className="hrc-radio-label">Có — U=U (Không phát hiện = Không lây truyền)</div>
                                                <div className="hrc-radio-desc">Tải lượng virus {"<"} 200 bản sao/mL</div>
                                            </div>
                                        </div>
                                        <div
                                            className={`hrc-radio-option ${isUU === false ? 'selected' : ''}`}
                                            onClick={() => setIsUU(false)}
                                            id="uu-no"
                                        >
                                            <div className="hrc-radio-dot"><div className="hrc-radio-dot-inner" /></div>
                                            <div>
                                                <div className="hrc-radio-label">Không / Không rõ</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sub-question: Unknown → population risk */}
                            {partnerStatus === 'unknown' && (
                                <div className="hrc-sub-question">
                                    <div className="hrc-sub-label">Bạn tình thuộc nhóm nào?</div>
                                    <div className="hrc-radio-group">
                                        {POPULATION_OPTIONS.map(opt => (
                                            <div
                                                key={opt.value}
                                                className={`hrc-radio-option ${populationRisk === opt.value ? 'selected' : ''}`}
                                                onClick={() => setPopulationRisk(opt.value)}
                                                id={`pop-${opt.value}`}
                                            >
                                                <div className="hrc-radio-dot"><div className="hrc-radio-dot-inner" /></div>
                                                <div>
                                                    <div className="hrc-radio-label">{opt.label}</div>
                                                    <div className="hrc-radio-desc">{opt.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Risk Factors */}
                    {step === 3 && (
                        <div className="hrc-card">
                            <h2 className="hrc-step-title">Yếu tố nguy cơ & bảo vệ</h2>
                            <p className="hrc-step-subtitle">Chọn các yếu tố áp dụng trong tình huống phơi nhiễm</p>
                            <div className="hrc-checkbox-group">
                                {RISK_FACTORS.map(factor => {
                                    const disabled =
                                        (factor.insertiveOnly && !isInsertive) ||
                                        (factor.sexualOnly && isNeedle) ||
                                        (isUU);
                                    const checked = selectedFactors.includes(factor.id);
                                    return (
                                        <div
                                            key={factor.id}
                                            className={`hrc-checkbox-option ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                                            onClick={() => !disabled && toggleFactor(factor.id)}
                                            id={`factor-${factor.id}`}
                                        >
                                            <div className="hrc-checkbox-box">
                                                <svg className="hrc-checkbox-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div className="hrc-checkbox-text">
                                                <div className="hrc-checkbox-label">{factor.label}</div>
                                                <div className="hrc-checkbox-hint">
                                                    {(factor.sexualOnly && isNeedle)
                                                        ? 'Không áp dụng cho đường lây kim tiêm'
                                                        : (
                                                            <>
                                                                {factor.hint}
                                                                {factor.multiplier > 1
                                                                    ? ` (×${factor.multiplier} nguy cơ)`
                                                                    : ` (giảm ${Math.round((1 - factor.multiplier) * 100)}% nguy cơ)`
                                                                }
                                                            </>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 4: Time Window */}
                    {step === 4 && (
                        <div className="hrc-card">
                            <h2 className="hrc-step-title">Thời gian phơi nhiễm</h2>
                            <p className="hrc-step-subtitle">Phơi nhiễm xảy ra cách đây bao lâu?</p>
                            <div className="hrc-radio-group">
                                {[
                                    { value: 'within72h', label: 'Trong vòng 72 giờ', desc: 'Dưới 3 ngày tính đến hiện tại' },
                                    { value: '3to7days', label: '3–7 ngày trước', desc: 'Khoảng 3 đến 7 ngày trước' },
                                    { value: '1to4weeks', label: '1–4 tuần trước', desc: 'Khoảng 1 đến 4 tuần trước' },
                                    { value: 'over1month', label: 'Hơn 1 tháng trước', desc: 'Từ khoảng 4 tuần trở lên' },
                                ].map(opt => (
                                    <div
                                        key={opt.value}
                                        className={`hrc-radio-option ${timeWindow === opt.value ? 'selected' : ''}`}
                                        onClick={() => setTimeWindow(opt.value)}
                                        id={`time-${opt.value}`}
                                    >
                                        <div className="hrc-radio-dot"><div className="hrc-radio-dot-inner" /></div>
                                        <div>
                                            <div className="hrc-radio-label">{opt.label}</div>
                                            <div className="hrc-radio-desc">{opt.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Nav buttons */}
                    <div className="hrc-nav">
                        {step > 1 && (
                            <button className="hrc-btn hrc-btn-back" onClick={goBack}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                Quay lại
                            </button>
                        )}
                        <button
                            className="hrc-btn hrc-btn-next"
                            onClick={goNext}
                            disabled={!canNext()}
                            id="next-btn"
                        >
                            {step === 4 ? 'Xem kết quả' : 'Tiếp theo'}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </>
            )}

            {/* ===== RESULT ===== */}
            {showResult && (
                <div className="hrc-result">
                    {/* Main result */}
                    <div className="hrc-result-main">
                        <div className={`hrc-result-percent ${riskInfo.level}`}>
                            {formatPercent(result.probability)}
                        </div>
                        <div className={`hrc-result-badge ${riskInfo.level}`}>
                            {riskInfo.emoji} {riskInfo.label}
                        </div>
                        <p className="hrc-result-explanation">
                            {result.isZero && result.isUU && (
                                <>Bạn tình có tải lượng virus không phát hiện được (U=U). Theo bằng chứng khoa học hiện tại, nguy cơ lây truyền HIV qua đường tình dục là <strong>0%</strong>.</>
                            )}
                            {result.isZero && partnerStatus === 'negative' && (
                                <>Bạn tình đã xét nghiệm HIV âm tính. Nếu kết quả xét nghiệm đáng tin cậy và trong thời gian cửa sổ, nguy cơ lây nhiễm là <strong>0%</strong>.</>
                            )}
                            {!result.isZero && (
                                <>
                                    Xác suất ước tính {formatPercent(result.probability)} dựa trên hành vi {ACT_TYPES.find(a => a.value === actType)?.label?.toLowerCase()}
                                    {result.activeMultipliers?.length > 0 && ', có tính đến các yếu tố nguy cơ và bảo vệ đã chọn'}.
                                    Đây là ước tính thống kê, không phải chẩn đoán.
                                </>
                            )}
                        </p>
                    </div>

                    {/* Clinical checklist */}
                    <div className="hrc-checklist">
                        <h3 className="hrc-checklist-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Khuyến nghị lâm sàng
                        </h3>

                        {/* No-intervention message for isZero cases */}
                        {result.isZero && (
                            <div className="hrc-checklist-item">
                                <span className="hrc-checklist-icon check">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                <div className="hrc-checklist-text">
                                    Không có khuyến nghị can thiệp đặc biệt trong trường hợp này.
                                </div>
                            </div>
                        )}

                        {/* PEP — logic based on timeWindow + probability; skip if already on PrEP */}
                        {timeWindow === 'within72h' && !result.isZero && result.probability >= 0.001 && !selectedFactors.includes('prep') && (
                            <div className="hrc-checklist-item">
                                <span className="hrc-checklist-icon warn">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </span>
                                <div className="hrc-checklist-text">
                                    <strong>PEP — khẩn cấp:</strong> Bạn còn trong khung 72 giờ và nguy cơ đáng kể. Hãy đến cơ sở y tế <strong>ngay hôm nay</strong> để được tư vấn và kê đơn PEP — càng sớm càng hiệu quả.
                                </div>
                            </div>
                        )}
                        {timeWindow === 'within72h' && !result.isZero && result.probability < 0.001 && !selectedFactors.includes('prep') && (
                            <div className="hrc-checklist-item">
                                <span className="hrc-checklist-icon info">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                                <div className="hrc-checklist-text">
                                    <strong>PEP:</strong> Nguy cơ ước tính thấp, nhưng bạn vẫn còn trong khung 72 giờ — có thể tham khảo ý kiến bác sĩ về PEP nếu bạn còn lo lắng.
                                </div>
                            </div>
                        )}

                        {/* HIV test — dynamic by timeWindow */}
                        {!result.isZero && (
                            <div className="hrc-checklist-item">
                                <span className="hrc-checklist-icon check">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </span>
                                <div className="hrc-checklist-text">
                                    <strong>Xét nghiệm HIV (Ag/Ab combo thế hệ 4):</strong>{' '}
                                    {timeWindow === 'within72h' && 'Xét nghiệm lần đầu sau 28 ngày kể từ hôm nay. Kết luận chắc chắn tại ngày 45 sau phơi nhiễm.'}
                                    {timeWindow === '3to7days' && 'Xét nghiệm lần đầu sau 28 ngày kể từ ngày phơi nhiễm. Nếu đã gần đủ 28 ngày thì có thể xét nghiệm sớm.'}
                                    {timeWindow === '1to4weeks' && 'Nếu đã qua 28 ngày kể từ phơi nhiễm — xét nghiệm ngay. Nếu chưa — chờ đủ 28 ngày rồi xét nghiệm, xác nhận lại lúc 45 ngày.'}
                                    {timeWindow === 'over1month' && 'Bạn đã qua cửa sổ 45 ngày — xét nghiệm ngay để có kết quả chính xác nhất.'}
                                </div>
                            </div>
                        )}



                        {/* PrEP recommendation */}
                        {!result.isZero && result.probability >= 0.001 && (
                            <div className="hrc-checklist-item">
                                <span className="hrc-checklist-icon info">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </span>
                                <div className="hrc-checklist-text">
                                    <strong>PrEP dự phòng:</strong> Nếu bạn thường xuyên có nguy cơ phơi nhiễm, hãy tư vấn bác sĩ về PrEP (dự phòng trước phơi nhiễm).
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Nav */}
                    <div className="hrc-nav">
                        <button className="hrc-btn hrc-btn-back" onClick={goBack}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Quay lại
                        </button>
                    </div>
                    <button className="hrc-btn hrc-btn-recalc" onClick={recalculate} id="recalculate-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Tính lại từ đầu
                    </button>

                    {/* Disclaimer */}
                    <div className="hrc-disclaimer">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                            <strong>Công cụ này chỉ mang tính tham khảo, không thay thế tư vấn y tế chuyên nghiệp.</strong>{' '}
                    Xác suất ước tính dựa trên: Base rates — Patel P et al. (2014) <em>AIDS</em> 28(10):1509–1519;
                    Multiplier HIV cấp tính — Quinn TC et al. (2000) <em>NEJM</em> 342:921–929;
                    Multiplier STI — Røttingen JA et al. (2001) <em>Sex Transm Dis</em> 28(10):579–597;
                    Hiệu quả bao cao su — Weller & Davis (2002) Cochrane Review;
                    PrEP — PARTNER2, Rodger AJ et al. (2019) <em>Lancet</em> 393:2428–2438;
                    Cắt bao quy đầu — Auvert B et al. (2005) <em>PLoS Med</em>;
                    Prevalence VN — UNAIDS Vietnam Country Data 2023 (dân số chung ~0.3%, nhóm nguy cơ cao ~12–20%).
                    Mọi thông tin nhập vào được xử lý hoàn toàn trên trình duyệt, không lưu trữ hay gửi đi đâu.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
