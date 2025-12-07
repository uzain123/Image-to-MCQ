import jsPDF from 'jspdf';
import { GeneratedQuestion } from './types';

export function generatePDF(questions: GeneratedQuestion[], title: string = "Generated Quiz"): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, yPosition);
  yPosition += lineHeight * 2;

  // Instructions
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Answer all questions in the spaces provided.", margin, yPosition);
  yPosition += lineHeight * 2;

  // Questions
  questions.forEach((question, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    // Question number and text
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const questionNumber = `${index + 1}. `;
    doc.text(questionNumber, margin, yPosition);
    
    doc.setFont("helvetica", "normal");
    const questionText = doc.splitTextToSize(question.text, pageWidth - margin * 2 - 10);
    doc.text(questionText, margin + 8, yPosition);
    yPosition += questionText.length * lineHeight;

    // Options for MCQ
    if (question.type === "MULTIPLE_CHOICE" && question.options) {
      yPosition += 3;
      question.options.forEach((option, optIndex) => {
        const optionLabel = String.fromCharCode(65 + optIndex); // A, B, C, D
        const optionText = doc.splitTextToSize(`${optionLabel}) ${option}`, pageWidth - margin * 2 - 15);
        doc.text(optionText, margin + 5, yPosition);
        yPosition += optionText.length * lineHeight;
      });
    }

    // Answer space
    if (question.type === "SHORT_ANSWER" || question.type === "LONG_ANSWER") {
      yPosition += 5;
      const lines = question.type === "LONG_ANSWER" ? 5 : 2;
      for (let i = 0; i < lines; i++) {
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += lineHeight;
      }
    }

    yPosition += lineHeight;
  });

  return doc;
}

export function generateAnswerKey(questions: GeneratedQuestion[]): jsPDF {
  const doc = new jsPDF();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Answer Key", margin, yPosition);
  yPosition += lineHeight * 2;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  questions.forEach((question, index) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = margin;
    }

    let answerText = `${index + 1}. `;
    
    if (question.type === "MULTIPLE_CHOICE" && question.correctAnswer !== undefined && question.options) {
      const letter = String.fromCharCode(65 + question.correctAnswer);
      answerText += `${letter}) ${question.options[question.correctAnswer]}`;
    } else if (question.type === "TRUE_FALSE" && question.correctAnswer !== undefined) {
      answerText += question.correctAnswer === 1 ? "True" : "False";
    } else {
      answerText += "[Open-ended answer]";
    }

    const splitText = doc.splitTextToSize(answerText, 170);
    doc.text(splitText, margin, yPosition);
    yPosition += splitText.length * lineHeight + 2;
  });

  return doc;
}