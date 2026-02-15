import html2pdf from 'html2pdf.js';

export const downloadResultPDF = async (elementId, fileName) => {
  const target = document.getElementById(elementId);
  if (!target) return;

  const safeFileName = fileName || `BCABuddy_${Date.now()}.pdf`;

  const waitForNextPaint = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  // Avoid mutating the live UI (prevents flicker) by exporting from a hidden clone.
  const exportRootId = '__bcabuddy_pdf_export_root';
  const exportRoot = document.createElement('div');
  exportRoot.id = exportRootId;
  exportRoot.setAttribute('aria-hidden', 'true');
  exportRoot.style.position = 'fixed';
  exportRoot.style.left = '-100000px';
  exportRoot.style.top = '0';
  exportRoot.style.width = '794px';
  exportRoot.style.maxWidth = '794px';
  exportRoot.style.padding = '0';
  exportRoot.style.margin = '0';
  exportRoot.style.overflow = 'visible';
  exportRoot.style.background = '#0a0d17';
  exportRoot.style.color = '#E6EAF0';
  exportRoot.style.zIndex = '-1';

  const style = document.createElement('style');
  style.textContent = `
    #${exportRootId},
    #${exportRootId} * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      animation: none !important;
      transition: none !important;
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }

    #${exportRootId} {
      overflow: visible !important;
    }

    #${exportRootId} [data-pdf-expand="true"] {
      max-height: none !important;
      height: auto !important;
      overflow: visible !important;
    }

    #${exportRootId} .MuiCard-root,
    #${exportRootId} .MuiPaper-root {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  `;

  const clone = target.cloneNode(true);
  clone.id = `${elementId}__pdf_clone`;
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  clone.style.overflow = 'visible';
  clone.style.background = '#0a0d17';
  clone.style.transform = 'none';

  exportRoot.appendChild(style);
  exportRoot.appendChild(clone);
  document.body.appendChild(exportRoot);

  try {
    await waitForNextPaint();
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }
    await waitForNextPaint();

    const options = {
      margin: [15, 15, 15, 15],
      filename: safeFileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: '#0a0d17',
        windowWidth: 794,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },

      // Allow multi-page PDFs; 'avoid-all' can cause cutoffs when content exceeds a page.
      pagebreak: { mode: ['css', 'legacy'] }
    };

    await html2pdf().set(options).from(clone).save();
  } finally {
    exportRoot.remove();
  }
};
