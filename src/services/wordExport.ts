/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType,
  VerticalAlign,
  ImageRun
} from "docx";
import { saveAs } from "file-saver";
import { GeneratedTest, QuestionType, Question } from "../types";
import { svgToPngBuffer } from "../lib/svgToImage";

export async function exportToWord(test: GeneratedTest) {
  const children: (Paragraph | Table)[] = [];

  // Subject Slogans Mapper
  const getSubjectSlogan = (subj: string): string => {
    const norm = (subj || "").trim();
    if (norm.includes("គណិត") || norm.toLowerCase().includes("math")) {
      return "«គណិតវិទ្យាគឺជាភាសានៃសកលលោក និងជាគ្រឹះដ៏រឹងមាំដាច់ខាតនៃវិទ្យាសាស្ត្រ»";
    }
    if (norm.includes("រូប") || norm.toLowerCase().includes("physic")) {
      return "«រូបវិទ្យាពន្យល់ពីយន្តការនៃធម្មជាតិ និងជាមូលដ្ឋានគ្រឹះនៃវិស្វកម្មទាំងឡាយ»";
    }
    if (norm.includes("ជីវ") || norm.toLowerCase().includes("bio")) {
      return "«ជីវវិទ្យាស្វែងយល់ពីអាថ៌កំបាំង ភាពលម្អិត និងសម្រស់ដ៏ស្កឹមស្កៃនៃភាវៈរស់»";
    }
    return "«ការអប់រំ និងការស្វែងយល់គឺជាពន្លឺបំភ្លឺអនាគត និងជាគន្លឹះដោះស្រាយបញ្ហានៅក្នុងសង្គមជាតិ»";
  };

  // 1. Elegant Administrative Header Table
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ children: [new TextRun({ text: "ក្រសួងអប់រំ យុវជន និងកីឡា", bold: true, font: "Kantumruy Pro", size: 22 })] }),
              new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: "សាលារៀន៖ .............................................", font: "Kantumruy Pro", size: 20 })] }),
              new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: "ឈ្មោះសិស្ស៖ ...........................................", font: "Kantumruy Pro", size: 20 })] }),
              new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `ថ្នាក់ទី៖ ${test.grade.replace('ថ្នាក់ទី ', '')}  •  លេខតុ៖ ...............`, font: "Kantumruy Pro", size: 20 })] }),
            ]
          }),
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ព្រះរាជាណាចក្រកម្ពុជា", bold: true, font: "Kantumruy Pro", size: 22 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 20 }, children: [new TextRun({ text: "ជាតិ សាសនា ព្រះមហាក្សត្រ", bold: true, font: "Kantumruy Pro", size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: "    ", font: "Kantumruy Pro", size: 16, color: "64748b" })] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 80 }, children: [new TextRun({ text: "កាលបរិច្ឆេទ៖ ...... / ...... / ២០២៦", font: "Kantumruy Pro", size: 18 })] }),
            ]
          })
        ]
      })
    ]
  }));

  children.push(new Paragraph({ spacing: { before: 150 } })); // spacer

  // 2. Customized Handwriting Blackboard Title Banner box
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: "0f172a" },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: "0f172a" },
      left: { style: BorderStyle.SINGLE, size: 12, color: "0f172a" },
      right: { style: BorderStyle.SINGLE, size: 12, color: "0f172a" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "f8fafc" },
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `កម្រងវិញ្ញាសា៖ ${test.title}`, font: "Kantumruy Pro", bold: true, size: 28, color: "0f172a" })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 100 },
                children: [
                  new TextRun({ text: `មុខវិជ្ជា៖ ${test.subject} `, font: "Kantumruy Pro", bold: true, size: 24, color: "0f172a" }),
                  new TextRun({ text: `  •   រយៈពេល៖ ${test.duration || 60} នាទី `, font: "Kantumruy Pro", bold: true, size: 22, color: "334155" }),
                  new TextRun({ text: `  •   ពិន្ទុ៖ ............. / ១០`, font: "Kantumruy Pro", bold: true, size: 22, color: "0f172a" })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80 },
                children: [
                   new TextRun({ text: getSubjectSlogan(test.subject), font: "Kantumruy Pro", italics: true, size: 20, color: "475569" })
                ]
              })
            ]
          })
        ]
      })
    ]
  }));

  // Clean-up and categorization logic
  const sectionConfig = [
    { type: QuestionType.MULTIPLE_CHOICE, title: "ភាគទី១៖ សំណួរពហុជ្រើសរើស (Multiple Choice)", instruction: "ចូរគូសសញ្ញា ✓ ក្នុងចន្លោះ [ ] មុខចម្លើយដែលត្រឹមត្រូវបំផុតតែមួយគត់៖" },
    { type: QuestionType.TRUE_FALSE, title: "ភាគទី២៖ សំណួរខុសឬត្រូវ (True or False)", instruction: "ចូរគូសសញ្ញា ✓ លើជម្រើស «ត្រឹមត្រូវ» ឬ «មិនត្រឹមត្រូវ» សម្រាប់សេចក្តីថ្លែងនីមួយៗខាងក្រោម៖" },
    { type: QuestionType.MATCHING, title: "ភាគទី៣៖ លំហាត់ផ្គូរផ្គង (Matching Questions)", instruction: "ចូរភ្ជាប់ពាក្យ/ល្បះនៅជួរ (ក) ទៅនឹងជួរ (ខ) ឱ្យសមស្របគ្នានឹងចម្លើយ៖" },
    { type: QuestionType.FILL_BLANKS, title: "ភាគទី៤៖ បំពេញចន្លោះ (Fill in the Blanks)", instruction: "ចួរសរសេរបំពេញពាក្យ ឬរូបមន្តសមស្របបំផុតទៅក្នុងចន្លោះទទេខាងក្រោម៖" },
    { type: QuestionType.SHORT_ANSWER, title: "ភាគទី៥៖ វិញ្ញាសាសំណួរ-លំហាត់ខ្លីៗ (Short Solutions)", instruction: "ចូរគណនា ឬឆ្លើយបកស្រាយសម្រាយបញ្ជាក់ឱ្យគួរសមល្មម៖" },
    { type: QuestionType.LONG_ANSWER, title: "ភាគទី៦៖ សំណួរវិភាគ និងលំហាត់កម្រិតខ្ពស់ (Detailed Calculations / Essay)", instruction: "ចូរបង្ហាញជំហានគណនាឱ្យបានលម្អិត រចនារូប រូបមន្ត និងស្រាយបញ្ជាក់តាមបច្ចេកទេស៖" }
  ];

  const groupedList: { title: string; instruction: string; questions: { q: Question; finalIndex: number }[] }[] = [];
  let currentIdx = 1;

  sectionConfig.forEach(section => {
    const list = test.questions.filter(qu => qu.type === section.type);
    if (list.length > 0) {
      const questionsWithIndices = list.map(qu => {
        const item = { q: qu, finalIndex: currentIdx };
        currentIdx++;
        return item;
      });
      groupedList.push({
        title: section.title,
        instruction: section.instruction,
        questions: questionsWithIndices
      });
    }
  });

  // Extract MCQ + TF for Student Response Board
  const responseBoardItems: { q: Question; finalIndex: number }[] = [];
  groupedList.forEach(g => {
    if (g.questions[0] && (g.questions[0].q.type === QuestionType.MULTIPLE_CHOICE || g.questions[0].q.type === QuestionType.TRUE_FALSE)) {
      responseBoardItems.push(...g.questions);
    }
  });

  // 3. Render Student Answer Sheet Grid (if MCQ/TF questions exist)
  if (responseBoardItems.length > 0) {
    children.push(new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: "✍ ក្រឡាសន្លឹកកិច្ចការបំពេញចម្លើយ (Student MCQ Response Grid):", bold: true, font: "Kantumruy Pro", size: 22, color: "0f172a" })
      ]
    }));

    // Build grid cells dynamically chunks of 10 to fit cleanly on A4 paper width without compressing
    const chunkSize = 12;
    for (let c = 0; c < responseBoardItems.length; c += chunkSize) {
      const chunk = responseBoardItems.slice(c, c + chunkSize);
      
      const tableHeaderRow = new TableRow({
        children: [
          new TableCell({
            width: { size: 16, type: WidthType.PERCENTAGE },
            shading: { fill: "f1f5f9" },
            margins: { top: 80, bottom: 80 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "សំណួរ", bold: true, font: "Kantumruy Pro", size: 18 })] })]
          }),
          ...chunk.map(item => new TableCell({
            width: { size: 84 / chunk.length, type: WidthType.PERCENTAGE },
            shading: { fill: "f1f5f9" },
            margins: { top: 80, bottom: 80 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${item.finalIndex}`, bold: true, font: "Kantumruy Pro", size: 18 })] })]
          }))
        ]
      });

      const tableValueRow = new TableRow({
        children: [
          new TableCell({
            width: { size: 16, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ចម្លើយ", bold: true, font: "Kantumruy Pro", size: 18 })] })]
          }),
          ...chunk.map(() => new TableCell({
            width: { size: 84 / chunk.length, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: " ", font: "Kantumruy Pro", size: 20 })] })]
          }))
        ]
      });

      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
          left: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
          right: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
          insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
        },
        rows: [tableHeaderRow, tableValueRow]
      }));

      children.push(new Paragraph({ spacing: { before: 80 } })); // small spacing between chunks
    }
  }

  // Divider Line
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.DASH_SMALL_GAP, size: 8, color: "cbd5e1" },
      bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({ children: [new TableCell({ children: [] })] })]
  }));

  children.push(new Paragraph({ spacing: { before: 100 } }));

  // 4. Render Grouped Questions
  for (const group of groupedList) {
    // Add Part Header
    children.push(new Paragraph({
      spacing: { before: 300, after: 80 },
      children: [
        new TextRun({ text: group.title, bold: true, font: "Kantumruy Pro", size: 24, color: "1e293b" })
      ]
    }));

    // Add Section Instruction (italic hand-written guideline)
    children.push(new Paragraph({
      spacing: { before: 40, after: 150 },
      children: [
        new TextRun({ text: `✍ ណែនាំ៖ ${group.instruction}`, italics: true, font: "Kantumruy Pro", size: 20, color: "475569" })
      ]
    }));

    for (const item of group.questions) {
      const q = item.q;
      const fIdx = item.finalIndex;

      // Question body paragraph
      children.push(new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({ text: `${fIdx}. ${formatMathForWord(q.question)}`, font: "Kantumruy Pro", bold: true, size: 24 })
        ]
      }));

      // Render Optional SVG Image Component beautifully centered
      if (q.svg) {
        const pngBuffer = await svgToPngBuffer(q.svg);
        if (pngBuffer) {
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
            children: [
              new ImageRun({
                data: pngBuffer,
                transformation: { width: 320, height: 210 },
              } as any)
            ]
          }));
        }
      }

      // Handle Option Layout Render based on type
      if (q.type === QuestionType.MULTIPLE_CHOICE && q.options) {
        // Format Khmer Letter prefixes
        const choicesPrefix = ["ក.", "ខ.", "គ.", "ឃ."];
        const formattedOptions = q.options.map((opt, oIdx) => {
          const prefix = choicesPrefix[oIdx] || `${String.fromCharCode(65 + oIdx)}.`;
          return `${prefix} [   ]  ${formatMathForWord(opt)}`;
        });

        // Determine if options are short enough to be rendered in an elegant 2-column grid or single-line
        const allShort = q.options.every(o => o.length < 35);
        
        if (allShort && q.options.length === 4) {
          // Render as a 2x2 grid (A4 paper width partitioned perfectly)
          children.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: formattedOptions[0], font: "Kantumruy Pro", size: 24 })] })]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: formattedOptions[1], font: "Kantumruy Pro", size: 24 })] })]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: formattedOptions[2], font: "Kantumruy Pro", size: 24 })] })]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: formattedOptions[3], font: "Kantumruy Pro", size: 24 })] })]
                  })
                ]
              })
            ]
          }));
        } else {
          // Render vertically with clean left indents
          q.options.forEach((opt, oIdx) => {
            const prefix = choicesPrefix[oIdx] || `${String.fromCharCode(65 + oIdx)}.`;
            children.push(new Paragraph({
              indent: { left: 480 },
              spacing: { before: 60 },
              children: [
                new TextRun({ text: `${prefix} [   ]  `, font: "Kantumruy Pro", size: 24 }),
                new TextRun({ text: formatMathForWord(opt), font: "Kantumruy Pro", size: 24 })
              ]
            }));
          });
        }
      } else if (q.type === QuestionType.TRUE_FALSE) {
        // Beautiful side-by-side checkboxes
        children.push(new Paragraph({
          indent: { left: 480 },
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({ text: "[   ]  ត្រឹមត្រូវ (True)", font: "Kantumruy Pro", size: 24 }),
            new TextRun({ text: "               [   ]  មិនត្រឹមត្រូវ (False)", font: "Kantumruy Pro", size: 24 })
          ]
        }));
      } else if (q.type === QuestionType.MATCHING && q.matchingPairs) {
        const tableRows = [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: "f8fafc" },
                margins: { top: 100, bottom: 100, left: 100 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ជួរ (ក)", font: "Kantumruy Pro", bold: true, size: 22 })] })]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: "f8fafc" },
                margins: { top: 100, bottom: 100, left: 100 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ជួរ (ខ)", font: "Kantumruy Pro", bold: true, size: 22 })] })]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                shading: { fill: "f8fafc" },
                margins: { top: 100, bottom: 100 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ចម្លើយផ្គូផ្គង", font: "Kantumruy Pro", bold: true, size: 22 })] })]
              }),
            ]
          })
        ];

        const rightList = [...q.matchingPairs, ...(q.distractors || []).map(d => ({ left: '', right: d }))];
        const maxLength = Math.max(q.matchingPairs.length, rightList.length);

        for (let j = 0; j < maxLength; j++) {
          tableRows.push(new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: q.matchingPairs[j] ? `${j + 1}. ${formatMathForWord(q.matchingPairs[j].left)}` : "", font: "Kantumruy Pro", size: 24 })] })]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100, left: 100, right: 100 },
                children: [new Paragraph({ children: [new TextRun({ text: rightList[j] ? `${String.fromCharCode(65 + j)}. ${formatMathForWord(rightList[j].right)}` : "", font: "Kantumruy Pro", size: 24 })] })]
              }),
              new TableCell({
                width: { size: 20, type: WidthType.PERCENTAGE },
                margins: { top: 100, bottom: 100 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: q.matchingPairs[j] ? `${j + 1} - [      ]` : "", font: "Kantumruy Pro", size: 24 })] })]
              }),
            ]
          }));
        }

        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
            left: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
            right: { style: BorderStyle.SINGLE, size: 6, color: "94a3b8" },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "cbd5e1" },
          },
          rows: tableRows
        }));
      } else if (q.type === QuestionType.SHORT_ANSWER || q.type === QuestionType.FILL_BLANKS) {
        // Short Answer - solution guidelines with 3 dotted lines to draw or write out calculations by hand
        children.push(new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: "ដំណោះស្រាយ (Answer/Solution)៖", italics: true, bold: true, font: "Kantumruy Pro", size: 20, color: "334155" })]
        }));
        for (let j = 0; j < 3; j++) {
          children.push(new Paragraph({
            spacing: { before: 80 },
            children: [new TextRun({ text: "................................................................................................................................................................", font: "Kantumruy Pro", color: "94a3b8" })]
          }));
        }
      } else if (q.type === QuestionType.LONG_ANSWER) {
        // Long calculations and detailed descriptive answers with 6 dotted lines
        children.push(new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: "ការបកស្រាយលម្អិត និងបង្ហាញជំហានគណនា (Detailed Calculation Steps)៖", italics: true, bold: true, font: "Kantumruy Pro", size: 20, color: "334155" })]
        }));
        for (let j = 0; j < 6; j++) {
          children.push(new Paragraph({
            spacing: { before: 80 },
            children: [new TextRun({ text: "................................................................................................................................................................", font: "Kantumruy Pro", color: "94a3b8" })]
          }));
        }
      }
    }
  }

  // 5. Build Document with Margins
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch
            bottom: 1440,
            left: 1440,
            right: 1440,
          }
        }
      },
      children: children
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${test.title.replace(/\s+/g, '_')}_${test.grade.replace(/\s+/g, '_')}.docx`);
}

const superscriptMap: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '₀': '⁰', '₁': '¹', '₂': '²', '₃': '³', '₄': '⁴', '₅': '⁵', '₆': '⁶', '₇': '⁷', '₈': '⁸', '₉': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', 'i': 'ⁱ', 'a': 'ᵃ',
  'b': 'ᵇ', 'c': 'ᶜ', 'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'j': 'ʲ', 'k': 'ᵏ', 'l': 'ˡ',
  'm': 'ᵐ', 'o': 'ᵒ', 'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'u': 'ᵘ', 'v': 'ᵛ', 'w': 'ʷ', 'z': 'ᶻ',
  'A': 'ᴬ', 'B': 'ᴮ', 'D': 'ᴰ', 'E': 'ᴱ', 'G': 'ᴳ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ',
  'M': 'ᴹ', 'N': 'ᴺ', 'O': 'ᴼ', 'P': 'ᴾ', 'R': 'ᴿ', 'T': 'ᵀ', 'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ'
};

const subscriptMap: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '⁰': '₀', '¹': '₁', '²': '₂', '³': '₃', '⁴': '₄', '⁵': '₅', '⁶': '₆', '⁷': '₇', '⁸': '₈', '⁹': '₉',
  'ⁿ': 'ₙ', 'ˣ': 'ₓ', 'ʸ': 'ᵧ', 'ⁱ': 'ᵢ',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ', 'y': 'ᵧ',
  'h': 'ₕ', 'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ'
};

const convertExponents = (str: string): string => {
  let result = str;
  result = result.replace(/\^\{([^}]*)\}/g, (match, p1) => {
    return p1.split('').map((char: string) => superscriptMap[char] || char).join('');
  });
  result = result.replace(/\^\(([^)]*)\)/g, (match, p1) => {
    return p1.split('').map((char: string) => superscriptMap[char] || char).join('');
  });
  result = result.replace(/\^([0-9a-zA-Z+-])/g, (match, p1) => {
    return superscriptMap[p1] || p1;
  });
  return result;
};

const convertFractions = (str: string): string => {
  let normalized = str
    .replace(/\x0c/g, 'f')
    .replace(/\r/g, 'r')
    .replace(/\t/g, 't');

  return normalized.replace(/\\?f?rac\{([^}]*)\}\{([^}]*)\}/g, (match, num, den) => {
    const cleanNum = convertExponents(num);
    const cleanDen = convertExponents(den);

    const toSuper = (s: string): string => {
      return s.split('').map(c => superscriptMap[c] || c).join('');
    };

    const toSub = (s: string): string => {
      return s.split('').map(c => subscriptMap[c] || c).join('');
    };

    const isSimple = (s: string): boolean => {
      const allowed = /^[a-zA-Z0-9\s\+\-\(\)⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿˣʸⁱᵃᵇᶜᵈᵉᶠᵍʰʲᵏˡᵐᵒᵖʳˢᵗᵘᵛʷᶻᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₒₓᵧₕₖₗₘₙₚᵣₛₜ]+$/;
      return allowed.test(s);
    };

    if (isSimple(cleanNum) && isSimple(cleanDen)) {
      const superNum = toSuper(cleanNum);
      const subDen = toSub(cleanDen);
      return `${superNum}⁄${subDen}`;
    }
    return `(${cleanNum}/${cleanDen})`;
  });
};

function formatMathForWord(text: string): string {
  if (!text) return "";
  
  let processed = text;
  
  // 1. Handle fractions
  processed = convertFractions(processed);
  
  // 2. Handle exponents
  processed = convertExponents(processed);
  
  // 3. Handle square roots
  processed = processed.replace(/\\sqrt\{([^}]*)\}/g, '√($1)');
  processed = processed.replace(/\\sqrt\[([^\]]*)\]\{([^}]*)\}/g, (match, root, val) => {
    const superRoot = root.split('').map((c: string) => superscriptMap[c] || c).join('');
    return `${superRoot}√(${val})`;
  });

  // 4. Other basic character replacements
  processed = processed.replace(/\$/g, '');
  processed = processed.replace(/\\times/g, '×')
                       .replace(/\\div/g, '÷')
                       .replace(/\\cdot/g, '⋅')
                       .replace(/\\approx/g, '≈')
                       .replace(/\\neq/g, '≠')
                       .replace(/\\leq/g, '≤')
                       .replace(/\\le/g, '≤')
                       .replace(/\\geq/g, '≥')
                       .replace(/\\ge/g, '≥')
                       .replace(/\\pi/g, 'π')
                       .replace(/\\alpha/g, 'α')
                       .replace(/\\beta/g, 'β')
                       .replace(/\\theta/g, 'θ')
                       .replace(/\\infty/g, '∞')
                       .replace(/\\circ/g, '°')
                       .replace(/\\square/g, ' [ ] ')
                       .replace(/\\pm/g, '±')
                       .replace(/\\text\{([^}]+)\}/g, '$1')
                       .replace(/\\mathrm\{([^}]+)\}/g, '$1')
                       .replace(/\\/g, '');

  return processed.replace(/\s+/g, ' ').trim();
}

