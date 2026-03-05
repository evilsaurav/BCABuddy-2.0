import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

const StudyRoadmapCard = ({ hasRoadmap, title, roadmapPct, roadmapDays = [] }) => {
  const safeDays = Array.isArray(roadmapDays) ? roadmapDays.slice(0, 15) : [];

  return (
    <div
      className="bg-gray-900 border border-gray-700 rounded-2xl p-6 h-[400px] flex flex-col overflow-hidden"
      style={{
        background: '#111827',
        border: '1px solid #374151',
        borderRadius: 20,
        padding: 24,
        height: 400,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ color: '#03dac6', fontWeight: 800, letterSpacing: '0.04em' }}>My Study Roadmap</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4 }}>{title || 'My Study Roadmap'}</div>
        </div>
        <div style={{ color: '#10B981', fontWeight: 800, fontSize: 12 }}>{Math.round(Number(roadmapPct || 0))}%</div>
      </div>

      <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, Number(roadmapPct || 0)))}%`,
            background: '#10B981',
          }}
        />
      </div>

      {hasRoadmap && safeDays.length > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, marginBottom: 8 }}>
            <button
              type="button"
              className="roadmap-prev"
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: '1px solid rgba(3,218,198,0.5)',
                background: 'rgba(3,218,198,0.12)',
                color: '#03dac6',
                cursor: 'pointer',
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="roadmap-next"
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: '1px solid rgba(187,134,252,0.5)',
                background: 'rgba(187,134,252,0.12)',
                color: '#bb86fc',
                cursor: 'pointer',
              }}
            >
              ›
            </button>
          </div>

          <div className="flex-1 min-h-0 w-full" style={{ flex: 1, minHeight: 0, width: '100%' }}>
            <Swiper
              modules={[Navigation]}
              navigation={{ prevEl: '.roadmap-prev', nextEl: '.roadmap-next' }}
              spaceBetween={12}
              slidesPerView={1}
              breakpoints={{ 1100: { slidesPerView: 2 } }}
              style={{ height: '100%' }}
            >
              {safeDays.map((d, idx) => {
                const label = String(d?.label || `Day ${idx + 1}`);
                const task = String(d?.task || '').trim();
                const parts = task.split(/\s*\|\s*|\s*•\s*/).filter(Boolean);
                const bullets = parts.length > 1 ? parts.slice(0, 4) : [task || 'Topic revision and PYQ practice'];

                return (
                  <SwiperSlide key={`${label}-${idx}`}>
                    <div style={{ height: '100%' }}>
                      <div
                        style={{
                          height: '100%',
                          padding: '12px',
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          overflowY: 'auto',
                        }}
                      >
                        <div style={{ color: '#E6EAF0', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>{label}</div>
                        {bullets.map((point, pointIdx) => (
                          <div key={`${label}-p-${pointIdx}`} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6, whiteSpace: 'pre-wrap' }}>
                            • {String(point)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        </>
      ) : (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.72)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          Study Roadmap tool open karke 15-day plan generate karo. Plan yahin auto-sync ho jayega.
        </div>
      )}
    </div>
  );
};

export default StudyRoadmapCard;
