import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper to convert Tailwind v4 OKLCH color strings to standard RGB/RGBA for html2canvas compatibility
export const convertOklchInString = (str: string): string => {
  let result = str.replace(/oklch\s*\(\s*([0-9.%]+)\s+([0-9.%]+)\s+([0-9.%]+)(?:\s*[\/,]\s*([0-9.%]+))?\s*\)/gi, (match, lStr, cStr, hStr, aStr) => {
    try {
      let L = parseFloat(lStr);
      if (lStr.endsWith('%')) L = L / 100;

      let C = parseFloat(cStr);
      if (cStr.endsWith('%')) C = C / 100;

      let H = parseFloat(hStr);

      let alpha = 1;
      if (aStr) {
        alpha = parseFloat(aStr);
        if (aStr.endsWith('%')) alpha = alpha / 100;
      }

      if (isNaN(L) || isNaN(C) || isNaN(H)) return 'rgb(128, 128, 128)';

      const a_lab = C * Math.cos((H * Math.PI) / 180);
      const b_lab = C * Math.sin((H * Math.PI) / 180);

      const l_ = L + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
      const m_ = L - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
      const s_ = L - 0.0894841775 * a_lab - 1.2914855480 * b_lab;

      const l = l_ * l_ * l_;
      const m = m_ * m_ * m_;
      const s = s_ * s_ * s_;

      const r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
      const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
      const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

      const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055);

      const r = Math.min(255, Math.max(0, Math.round(gamma(r_lin) * 255)));
      const g = Math.min(255, Math.max(0, Math.round(gamma(g_lin) * 255)));
      const b = Math.min(255, Math.max(0, Math.round(gamma(b_lin) * 255)));

      if (alpha < 1) {
        return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
      }
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return 'rgb(128, 128, 128)';
    }
  });

  result = result.replace(/oklch\([^)]+\)/gi, 'rgb(128, 128, 128)');
  result = result.replace(/oklab\([^)]+\)/gi, 'rgb(128, 128, 128)');
  result = result.replace(/color-mix\([^)]+\)/gi, 'rgb(128, 128, 128)');

  return result;
};

// High-Quality PDF Exporter Function using html2canvas & jsPDF
export const handleExportPDF = async (
  elementId: string,
  defaultFileName: string,
  callbacks?: {
    onStart?: () => void;
    onSuccess?: () => void;
    onFallback?: (msg: string) => void;
    onError?: (err: any) => void;
  }
) => {
  callbacks?.onStart?.();
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      callbacks?.onFallback?.('Report element not found — switching to browser print.');
      window.print();
      return;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 5000,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Sanitize style tags containing oklch
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach(styleTag => {
          if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('color-mix') || styleTag.textContent.includes('oklab'))) {
            styleTag.textContent = convertOklchInString(styleTag.textContent);
          }
        });

        // Sanitize inline style attributes on cloned elements
        const allEls = clonedDoc.querySelectorAll('*');
        allEls.forEach(el => {
          const inlineStyle = el.getAttribute('style');
          if (inlineStyle && (inlineStyle.includes('oklch') || inlineStyle.includes('color-mix') || inlineStyle.includes('oklab'))) {
            el.setAttribute('style', convertOklchInString(inlineStyle));
          }
        });

        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) {
          clonedEl.style.maxHeight = 'none';
          clonedEl.style.height = 'auto';
          clonedEl.style.overflow = 'visible';
          clonedEl.style.position = 'static';
          clonedEl.style.width = '100%';
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const scaledHeight = (imgHeight * pdfWidth) / imgWidth;

    if (scaledHeight <= pdfHeight) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledHeight);
    } else {
      let heightLeft = scaledHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;
      }
    }

    // Save PDF via standard method
    pdf.save(defaultFileName);

    // Secondary blob download fallback for iframe environments
    try {
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = defaultFileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 5000);
    } catch (err) {
      console.log('Blob download fallback skipped:', err);
    }

    callbacks?.onSuccess?.();
  } catch (err) {
    console.error('PDF Generation error, falling back to print dialog:', err);
    callbacks?.onError?.(err);
    window.print();
  }
};

export const exportElementToPDF = async (
  elementId: string,
  defaultFileName: string,
  onFallbackMessage?: (msg: string) => void
) => {
  return handleExportPDF(elementId, defaultFileName, {
    onFallback: onFallbackMessage,
  });
};

