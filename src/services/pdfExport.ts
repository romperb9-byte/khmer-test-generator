import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { GeneratedTest } from "../types";

/**
 * Generates a PDF version of the test by cloning the element into a hidden sandbox.
 */
export const generateTestPdf = async (test: GeneratedTest, element: HTMLElement): Promise<void> => {
  if (document.fonts) {
    await document.fonts.ready;
  }

  // Create a container same as the user's logic to isolate from app styles/scroll
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm'; // Standard A4 width
  container.style.backgroundColor = 'white';
  container.style.color = 'black';
  container.style.fontFamily = "'Kantumruy Pro', sans-serif";
  container.style.padding = '0';
  container.style.boxSizing = 'border-box';

  // Clone the test content
  const content = element.cloneNode(true) as HTMLElement;
  
  // Clean up UI-specific classes that might interfere (like shadow or max-w)
  content.style.width = '100%';
  content.style.maxWidth = 'none';
  content.style.boxShadow = 'none';
  content.style.border = 'none';
  content.style.padding = '20mm'; // Give it a print margin
  
  container.appendChild(content);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2.5, // High resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.body.querySelector('div[style*="left: -9999px"]') as HTMLElement;
        if (clonedElement) {
          clonedElement.style.left = '0';
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const canvasAspectRatio = canvas.height / canvas.width;
    const imgHeight = pageWidth * canvasAspectRatio;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(`${test.title || 'វិញ្ញាសា'}.pdf`);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw error;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};
