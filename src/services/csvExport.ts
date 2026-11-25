import { GeneratedTest } from "../types";

/**
 * Exports the test data to a CSV file.
 */
export const exportToCSV = (test: GeneratedTest): void => {
  const headers = ["ល.រ (No.)", "ប្រភេទ (Type)", "សំណួរ (Question)", "ជម្រើស (Options)", "ចម្លើយ (Answer)"];
  
  const rows = test.questions.map((q, index) => {
    const options = q.options ? q.options.join(" | ") : "";
    const answer = typeof q.answer === "string" ? q.answer : JSON.stringify(q.answer);
    
    return [
      (index + 1).toString(),
      q.type,
      q.question.replace(/,/g, " "), // Basic escaping
      options.replace(/,/g, " "),
      answer.replace(/,/g, " ")
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${test.title || 'test'}_export.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
