import html2pdf from 'html2pdf.js';

export const downloadResultPDF = async (elementId, fileName) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  // Use a dark background to match the theme
  const opt = {
    margin:       0.5,
    filename:     fileName || 'BCABuddy_Result.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#090f1f' },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
};
