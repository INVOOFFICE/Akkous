CUSTOM_CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

/* ── Reset & Globals ── */
*, *::before, *::after { box-sizing: border-box; }

html, body, [data-testid="stAppViewContainer"] {
    font-family: 'DM Sans', sans-serif;
    background: #0a0b0f !important;
    color: #e2e8f0 !important;
}

[data-testid="stAppViewContainer"] {
    background: linear-gradient(135deg, #0a0b0f 0%, #0f1117 50%, #0a0f1a 100%) !important;
}

/* ── Sidebar ── */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d0e14 0%, #111827 100%) !important;
    border-right: 1px solid rgba(99,102,241,0.15) !important;
}
[data-testid="stSidebar"] * { color: #cbd5e1 !important; }
[data-testid="stSidebar"] .stRadio label {
    padding: 10px 16px !important;
    border-radius: 10px !important;
    transition: all 0.2s !important;
    cursor: pointer !important;
    display: block !important;
    font-size: 14px !important;
}
[data-testid="stSidebar"] .stRadio label:hover {
    background: rgba(99,102,241,0.15) !important;
    color: #a78bfa !important;
}

/* ── Main Content ── */
.main .block-container {
    padding: 2rem 2.5rem !important;
    max-width: 1200px !important;
}

/* ── Hero Section ── */
.hero-header {
    text-align: center;
    padding: 3rem 1rem 2rem;
    position: relative;
}
.hero-header::before {
    content: '';
    position: absolute;
    top: 0; left: 50%; transform: translateX(-50%);
    width: 600px; height: 300px;
    background: radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%);
    pointer-events: none;
}
.hero-badge {
    display: inline-block;
    background: linear-gradient(90deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2));
    border: 1px solid rgba(99,102,241,0.4);
    border-radius: 100px;
    padding: 4px 16px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: #a78bfa;
    text-transform: uppercase;
    margin-bottom: 1.2rem;
}
.hero-title {
    font-family: 'Syne', sans-serif;
    font-size: clamp(2.2rem, 5vw, 4rem);
    font-weight: 800;
    line-height: 1.1;
    background: linear-gradient(135deg, #e2e8f0 0%, #a78bfa 50%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 1rem;
}
.hero-subtitle {
    font-size: 1.1rem;
    color: #94a3b8;
    font-weight: 300;
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.6;
}

/* ── Tool Cards ── */
.tool-card {
    background: linear-gradient(145deg, #131520, #0f1117);
    border: 1px solid rgba(99,102,241,0.15);
    border-radius: 16px;
    padding: 1.8rem;
    margin-bottom: 1.5rem;
    transition: border-color 0.3s, transform 0.2s;
    position: relative;
    overflow: hidden;
}
.tool-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent);
}
.tool-card:hover {
    border-color: rgba(99,102,241,0.4);
    transform: translateY(-1px);
}
.tool-card-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
    display: block;
}
.tool-card-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 0.4rem;
}
.tool-card-desc {
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.5;
}

/* ── Upload Zone ── */
[data-testid="stFileUploader"] {
    background: linear-gradient(145deg, rgba(99,102,241,0.05), rgba(167,139,250,0.03)) !important;
    border: 2px dashed rgba(99,102,241,0.3) !important;
    border-radius: 16px !important;
    transition: border-color 0.3s !important;
}
[data-testid="stFileUploader"]:hover {
    border-color: rgba(99,102,241,0.6) !important;
}
[data-testid="stFileUploaderDropzone"] {
    background: transparent !important;
    padding: 2rem !important;
}
[data-testid="stFileUploaderDropzone"] > div > div {
    color: #94a3b8 !important;
}

/* ── Buttons ── */
.stButton > button, .stDownloadButton > button {
    background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 0.65rem 1.5rem !important;
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 500 !important;
    font-size: 0.9rem !important;
    transition: all 0.2s !important;
    box-shadow: 0 4px 15px rgba(99,102,241,0.25) !important;
}
.stButton > button:hover, .stDownloadButton > button:hover {
    background: linear-gradient(135deg, #4338ca, #6d28d9) !important;
    box-shadow: 0 6px 20px rgba(99,102,241,0.4) !important;
    transform: translateY(-1px) !important;
}

/* ── Progress Bar ── */
.stProgress > div > div {
    background: linear-gradient(90deg, #4f46e5, #7c3aed) !important;
    border-radius: 100px !important;
}
.stProgress > div {
    background: rgba(99,102,241,0.1) !important;
    border-radius: 100px !important;
}

/* ── Tabs ── */
.stTabs [data-baseweb="tab-list"] {
    background: rgba(99,102,241,0.05) !important;
    border-radius: 12px !important;
    padding: 4px !important;
    gap: 4px !important;
    border: 1px solid rgba(99,102,241,0.15) !important;
}
.stTabs [data-baseweb="tab"] {
    background: transparent !important;
    border-radius: 8px !important;
    color: #64748b !important;
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 500 !important;
    font-size: 0.875rem !important;
    padding: 8px 16px !important;
    transition: all 0.2s !important;
}
.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
    color: white !important;
}

/* ── Metrics / Stat Cards ── */
[data-testid="stMetric"] {
    background: linear-gradient(145deg, #131520, #0f1117) !important;
    border: 1px solid rgba(99,102,241,0.15) !important;
    border-radius: 12px !important;
    padding: 1rem !important;
}
[data-testid="stMetricValue"] {
    color: #a78bfa !important;
    font-family: 'Syne', sans-serif !important;
    font-weight: 700 !important;
}
[data-testid="stMetricLabel"] { color: #64748b !important; }

/* ── Alerts / Info ── */
[data-testid="stAlert"] {
    border-radius: 12px !important;
    border-left-width: 3px !important;
}

/* ── Select / Input ── */
.stSelectbox select, .stNumberInput input, .stTextInput input {
    background: #131520 !important;
    border: 1px solid rgba(99,102,241,0.25) !important;
    border-radius: 8px !important;
    color: #e2e8f0 !important;
}

/* ── Spinner ── */
.stSpinner > div {
    border-top-color: #6366f1 !important;
}

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0a0b0f; }
::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.5); }

/* ── Feature List ── */
.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
}
.feature-item {
    background: rgba(99,102,241,0.05);
    border: 1px solid rgba(99,102,241,0.12);
    border-radius: 10px;
    padding: 1rem 1.2rem;
    font-size: 0.875rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.feature-item span { color: #a78bfa; font-size: 1rem; }

/* ── Divider ── */
hr { border-color: rgba(99,102,241,0.12) !important; margin: 1.5rem 0 !important; }

/* ── Section Title ── */
.section-title {
    font-family: 'Syne', sans-serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 0.25rem;
}
.section-sub {
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 1.5rem;
}

/* ── Status Badge ── */
.status-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
}
.status-success { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
.status-processing { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }

/* ── Hide Streamlit branding ── */
#MainMenu, footer, header { visibility: hidden !important; }
[data-testid="stToolbar"] { display: none !important; }
</style>
"""


def load_styles():
    import streamlit as st
    st.markdown(CUSTOM_CSS, unsafe_allow_html=True)
