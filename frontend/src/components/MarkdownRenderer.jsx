import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import {
  BarChart as RechartsBarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

const NEON_PURPLE = '#bb86fc';
const NEON_CYAN = '#03dac6';
const GLASS_BG = 'var(--card-bg, rgba(30, 30, 30, 0.6))';
const GLASS_BORDER = '1px solid var(--card-border, rgba(255, 255, 255, 0.1))';

let mermaidModulePromise = null;
const loadMermaidModule = async () => {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((mod) => mod.default || mod);
  }
  return mermaidModulePromise;
};

// Helper function to detect and render Recharts data
export const ChartRenderer = ({ dataString }) => {
  try {
    const data = JSON.parse(dataString);
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      const keys = Object.keys(firstItem);
      
      if (keys.length === 2) {
        return (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <Box sx={{ my: 2, bgcolor: GLASS_BG, border: GLASS_BORDER, p: 2, borderRadius: '16px', overflow: 'auto', backdropFilter: 'blur(12px)' }}>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${NEON_CYAN}20`} />
                  <XAxis dataKey={keys[0]} stroke={NEON_CYAN} />
                  <YAxis stroke={NEON_CYAN} />
                  <RechartsTooltip contentStyle={{ bgcolor: GLASS_BG, border: `1px solid ${NEON_CYAN}` }} />
                  <Bar dataKey={keys[1]} fill={NEON_PURPLE} radius={8} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Box>
          </motion.div>
        );
      }
    }
  } catch (e) {
    // Not JSON data, render normally
  }
  return null;
};

export const SafeMermaidViewer = ({ chartCode }) => {
  const containerRef = useRef(null);
  const [renderState, setRenderState] = useState('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!chartCode || !containerRef.current) return;

    setRenderState('loading');
    setErrorMsg('');

    let clean = chartCode
      .trim()
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/\n?```$/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();

    clean = clean
      .split('\n')
      .map((line) => {
        if (!line.includes('-->|') && !line.includes('->|')) return line;
        line = line.replace(/(^|[^-])->\|/g, '$1-->|');
        line = line.replace(/\|>/g, '|');
        return line.replace(/-->\|([^|]*)\|/g, (_m, label) => `-->|${label.replace(/[()]/g, '')}|`);
      })
      .join('\n');

    clean = clean.replace(/\[([^\]]*)\]/g, (_m, inner) => `[${inner.replace(/[<>]/g, '')}]`);

    const uid = `mmd${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    let cancelled = false;

    const runRender = async () => {
      try {
        const mermaid = await loadMermaidModule();
        if (cancelled) return;

        const { svg } = await mermaid.render(uid, clean);
        const ghost = document.getElementById(uid);
        if (ghost) ghost.remove();

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
            svgEl.removeAttribute('height');
          }
          setRenderState('done');
        }
      } catch (err) {
        const ghost = document.getElementById(uid);
        if (ghost) ghost.remove();
        if (!cancelled) {
          setErrorMsg(err?.message || err?.str || String(err) || 'Unknown render error');
          setRenderState('error');
        }
      }
    };

    runRender();

    return () => {
      cancelled = true;
      const ghost = document.getElementById(uid);
      if (ghost) ghost.remove();
    };
  }, [chartCode]);

  const handleCopyCode = () => {
    const clean = chartCode.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    navigator.clipboard.writeText(clean).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div
      style={{
        width: '100%',
        backgroundColor: 'var(--bg-secondary)',
        padding: '16px',
        borderRadius: '12px',
        overflowX: 'auto',
        marginTop: '12px',
        border: '1px solid rgba(3, 218, 198, 0.25)'
      }}
    >
      {renderState === 'loading' && (
        <div style={{ color: '#03dac6', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
          Building diagram...
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%' }} />

      {renderState === 'error' && (
        <div style={{ marginTop: '8px' }}>
          <div
            style={{
              color: '#ff6b6b',
              fontSize: '12px',
              padding: '8px 12px',
              background: 'rgba(255,107,107,0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(255,107,107,0.25)',
              marginBottom: '10px'
            }}
          >
            Diagram render failed.
            {errorMsg && (
              <>
                <br />
                <span style={{ opacity: 0.6, fontSize: '11px' }}>{errorMsg}</span>
              </>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <pre
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                borderRadius: '8px',
                padding: '10px 42px 10px 12px',
                overflowX: 'auto',
                border: '1px solid #30363d',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {chartCode.trim().replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim()}
            </pre>
            <button
              onClick={handleCopyCode}
              style={{
                position: 'absolute',
                top: 7,
                right: 7,
                background: '#03dac6',
                color: '#111',
                border: 'none',
                borderRadius: 5,
                padding: '2px 9px',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 11
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const TypewriterText = ({ text, speed = 25, onProgress, onComplete, isInterrupted }) => {
  const [displayedText, setDisplayedText] = useState('');
  const indexRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isInterrupted) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return undefined;
    }

    const typeNext = () => {
      if (isInterrupted) return;

      if (indexRef.current < text.length) {
        setDisplayedText(text.substring(0, indexRef.current + 1));
        indexRef.current += 1;

        if (onProgress) onProgress();

        const jitter = Math.random() * 0.8 + 0.6;
        timerRef.current = setTimeout(typeNext, speed * jitter);
      } else if (onComplete) {
        onComplete();
      }
    };

    if (indexRef.current < text.length) {
      timerRef.current = setTimeout(typeNext, speed);
    } else if (indexRef.current >= text.length && text.length > 0 && onComplete) {
      onComplete();
    }

    return () => clearTimeout(timerRef.current);
  }, [text, speed, isInterrupted, onProgress, onComplete]);

  return <ReactMarkdown children={displayedText} remarkPlugins={[remarkGfm]} components={markdownComponents} />;
};

export const enhancedCodeComponents = ({ inline, className, children, ...props }) => {
  const match = /language-(\w+)/.exec(className || '');
  const codeString = String(children).replace(/\n$/, '');

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  if (match && match[1] === 'mermaid') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Box sx={{ my: 2, bgcolor: GLASS_BG, border: GLASS_BORDER, p: 2, borderRadius: '16px', overflow: 'auto', backdropFilter: 'blur(12px)', position: 'relative' }}>
          <SafeMermaidViewer chartCode={codeString} />
          <button
            onClick={handleCopy}
            style={{ position: 'absolute', top: 12, right: 16, background: NEON_CYAN, color: '#222', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer', fontSize: 13, zIndex: 2 }}
            title="Copy diagram code"
          >{copied ? 'Copied!' : 'Copy'}</button>
        </Box>
      </motion.div>
    );
  }

  if (!inline && match) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <Box sx={{ borderRadius: '12px', overflow: 'hidden', my: 2, position: 'relative' }}>
          <SyntaxHighlighter children={codeString} style={dracula} language={match[1]} PreTag="div" wrapLongLines />
          <button
            onClick={handleCopy}
            style={{ position: 'absolute', top: 12, right: 16, background: NEON_CYAN, color: '#222', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 600, cursor: 'pointer', fontSize: 13, zIndex: 2 }}
            title="Copy code"
          >{copied ? 'Copied!' : 'Copy'}</button>
        </Box>
      </motion.div>
    );
  }

  return <code style={{ color: NEON_CYAN, fontSize: '14px' }} {...props}>{children}</code>;
};

export const markdownComponents = {
  code: enhancedCodeComponents,
  p: ({ children }) => {
    const childStr = String(children);
    if (childStr.startsWith('[{') && childStr.endsWith('}]')) {
      const chart = <ChartRenderer dataString={childStr} />;
      if (chart) return chart;
    }
    return <p style={{ color: 'var(--chat-ai-text)', margin: 0 }}>{children}</p>;
  },
  strong: ({ children }) => <strong style={{ color: 'var(--chat-ai-text)', fontWeight: 600 }}>{children}</strong>,
  em: ({ children }) => <em style={{ color: 'var(--chat-ai-text)', fontStyle: 'italic' }}>{children}</em>,
  h1: ({ children }) => <h1 style={{ color: 'var(--chat-ai-text)', marginBottom: '8px', marginTop: '12px', fontSize: '24px', fontWeight: 700 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ color: 'var(--chat-ai-text)', marginBottom: '8px', marginTop: '10px', fontSize: '20px', fontWeight: 600 }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ color: 'var(--chat-ai-text)', marginBottom: '6px', marginTop: '8px', fontSize: '16px', fontWeight: 600 }}>{children}</h3>,
  li: ({ children }) => <li style={{ color: 'var(--chat-ai-text)', marginBottom: '4px' }}>{children}</li>,
  blockquote: ({ children }) => <blockquote style={{ color: 'var(--chat-ai-text)', borderLeft: `3px solid ${NEON_CYAN}`, paddingLeft: '12px', marginLeft: 0, marginTop: '8px', marginBottom: '8px', fontStyle: 'italic' }}>{children}</blockquote>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: NEON_CYAN, textDecoration: 'underline', cursor: 'pointer' }}>{children}</a>,
  ul: ({ children }) => <ul style={{ color: 'var(--chat-ai-text)', marginLeft: '20px', marginTop: '8px' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ color: 'var(--chat-ai-text)', marginLeft: '20px', marginTop: '8px' }}>{children}</ol>,
  table: ({ children }) => <table style={{ color: 'var(--chat-ai-text)', borderCollapse: 'collapse', marginTop: '8px', marginBottom: '8px', width: '100%' }}>{children}</table>,
  td: ({ children }) => <td style={{ border: `1px solid ${NEON_CYAN}20`, padding: '8px', textAlign: 'left' }}>{children}</td>,
  th: ({ children }) => <th style={{ border: `1px solid ${NEON_CYAN}40`, padding: '8px', textAlign: 'left', backgroundColor: `${NEON_PURPLE}20`, fontWeight: 600 }}>{children}</th>,
};
