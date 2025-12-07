import { NextRequest, NextResponse } from 'next/server';
import { generateStructuredQuestions } from '@/lib/openai';
import { GenerateQuestionsRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🎯 API ROUTE: /api/generate-questions");
    console.log("=".repeat(60));

    const body: GenerateQuestionsRequest = await request.json();
    const { imageBase64, config, customPrompt } = body;

    console.log("📦 Request config:", {
      questionCount: config.questionCount,
      questionType: config.questionType,
      educationLevel: config.educationLevel,
      quizType: config.quizType,
      hasCustomPrompt: !!customPrompt,
      hasImage: !!imageBase64
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ API key not configured!");
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    console.log("✅ API key found");

    // Build comprehensive prompt based on quiz type
    let prompt = customPrompt;
    
    if (!prompt) {
      const level = config.educationLevel; // "GCSE" or "A-LEVEL"
      const levelDisplay = config.educationLevel === "GCSE" ? "GCSE" : "A-Level";
      
      switch (config.quizType) {
        case "retrieval":
          prompt = `You are generating a ready-to-use ${levelDisplay} Retrieval Quiz. Treat this as a final deliverable that students can use immediately.

CRITICAL INSTRUCTIONS:
1. Generate EXACTLY 30 multiple-choice questions total
2. Divide into 3 topics with 10 questions each (based on the 3 images provided)
3. Each topic: First 5 questions are AO1 (recall), Last 5 questions are AO2 (application/data/cause-effect)
4. Questions must be short, answerable in under 30 seconds
5. Each question has 1 correct answer + 3 plausible distractors
6. Distractors MUST be common misconceptions that test deep understanding, NOT obviously wrong answers
7. The aim is to TRICK students with plausible wrong answers

Topic Structure:
- Topic A: Based on first image (revised last week)
- Topic B: Based on second image (revised 2-3 weeks ago)  
- Topic C: Based on third image (revised 4+ weeks ago)

AO2 Question Types (questions 6-10 in each topic):
- Application of knowledge to unfamiliar scenarios
- Data interpretation
- One-sentence "why" or cause-effect reasoning

ANSWER KEY REQUIREMENTS:
- Before generating questions, create a random 30-letter sequence using a,b,c,d (roughly equal amounts)
- This sequence determines the position of correct answers
- Correct answer position must NEVER be the same as the previous question
- Place correct answer at the position indicated by the sequence

Respond with ONLY valid JSON in this exact format:
{
  "title": "Retrieval Quiz - [Current Date]",
  "answerKeySequence": "abcdabcdabcdabcdabcdabcdabcdab",
  "questions": [
    {
      "text": "Question 1 text",
      "type": "MULTIPLE_CHOICE",
      "topic": "Topic A",
      "questionNumber": 1,
      "options": ["option a", "option b", "option c", "option d"],
      "correctAnswer": 0,
      "maxMarks": 1
    }
  ]
}

IMPORTANT: 
- Do NOT label which questions are AO1/AO2 in the quiz
- Do NOT reveal which option is correct in the question text
- Base questions on the image content provided
- Ensure distractors reflect real student misconceptions
- Plain text only, no markdown`;
          break;

        case "mini":
          const miniCounts = level === "A-LEVEL" ? "8 AO1, 10 AO2, 6 AO3" : "10 AO1, 6 AO2, 3 AO3";
          const totalQuestions = level === "A-LEVEL" ? 24 : 19;
          prompt = `You are generating a 10-15 minute ${levelDisplay} science worksheet (Mini Quiz) based on the image content.

CRITICAL INSTRUCTIONS:
Generate EXACTLY ${totalQuestions} questions total:
${level === "A-LEVEL" ? "- 8 AO1 questions (Remember/Understand)\n- 10 AO2 questions (Apply/Analyse)\n- 6 AO3 questions (Evaluate/Create)" : "- 10 AO1 questions (Remember/Understand)\n- 6 AO2 questions (Apply/Analyse)\n- 3 AO3 questions (Evaluate/Create)"}

Assessment Framework:
- Use Bloom's Taxonomy progression: AO1 → Remember, Understand | AO2 → Apply, Analyse | AO3 → Evaluate, Create
- ${level === "A-LEVEL" ? "OCR A-Level Biology" : "AQA GCSE Science"} standards
- Address all sub-points of assessment objectives

Coverage Requirements:
- Cover as much of the textbook extract as possible
- Touch on all key definitions, processes, functions, examples, and practical details
- Act as a broad coverage check, not narrow subset

Format Requirements:
- Plain text only (easy to copy to Word/Google Docs)
- Title: "[INSERT TOPIC] - Mini Quiz"
- Clear sub-headings and sections (emboldened where appropriate)
- Include a self-reflection question at the end with 3 options
- After self-reflection: "Include your answer to this in the comment section"
- Include student-friendly mark scheme with bullet points
- Mark scheme should have sections and question numbers

Respond with ONLY valid JSON. Use this EXACT format with NO extra commas or syntax errors:
{
  "questions": [
    {
      "text": "question text here",
      "type": "SHORT_ANSWER",
      "maxMarks": 2
    }
  ]
}

CRITICAL JSON RULES:
- NO trailing commas before closing braces or brackets
- Use double quotes for all strings
- Escape special characters properly
- For MULTIPLE_CHOICE: place correct answer at index 0 in options array
- For SHORT_ANSWER/LONG_ANSWER: omit options and correctAnswer fields
- Keep JSON simple and valid`;
          break;

        case "assignment":
          const aoDistribution = level === "A-LEVEL" 
            ? "2 marks AO1 (knowledge/understanding), 5 marks AO2 (application), 3 marks AO3 (analysis/evaluation)"
            : "3 marks AO1 (knowledge/understanding), 4 marks AO2 (application), 3 marks AO3 (analysis/evaluation)";
          
          const difficultyProgression = level === "A-LEVEL"
            ? "Question 1: Least challenging (bridging GCSE and A-level)\nQuestions 2-3: Standard A-level difficulty\nQuestion 4: Slightly more demanding (but within specification)"
            : "Question 1: Grade 4-5 level\nQuestions 2-3: Grade 6-7 level\nQuestion 4: Grade 8-9 level (but within specification)";

          prompt = `Create a 40-mark exam-style assignment for ${levelDisplay} ${level === "A-LEVEL" ? "OCR A-Level Biology" : "AQA GCSE Science"} based on the image content.

CRITICAL STRUCTURE:
- EXACTLY 4 questions, each worth 10 marks (40 marks total)
- Each question: ${aoDistribution}
- This should feel like a mini mock exam, not just practice questions

Difficulty Progression:
${difficultyProgression}

Question Requirements:
- Use ${level === "A-LEVEL" ? "OCR A-Level Biology" : "AQA GCSE Science"} style command words (state, describe, explain, suggest, compare, evaluate, calculate)
- Include variety of command words across questions
- Balance theory and practical/skills-based assessment
- Link practical/skills assessment to underlying ${level === "A-LEVEL" ? "biological" : "scientific"} theory
- Skills questions should assess conceptual understanding, not just method
- Include data/information in text form for interpretation
- Assess deep conceptual understanding
- AO3 questions should reward reasoned, conceptual evaluation (not surface-level recall)

Content Coverage:
- Use full content of textbook extract as base
- Cover as much textbook content as possible
- Only mild overlap with mini quiz questions (to support recall)

Format Requirements:
- Plain text only (easy to copy to Word)
- Title: "[INSERT TOPICS] (Assignment)"
- NO emboldened text
- NO answer lines
- Question number line should only have the question itself
- Clean question paper format

Respond with ONLY valid JSON in this exact format:
{
  "title": "[Topic Name] (Assignment)",
  "questions": [
    {
      "questionNumber": 1,
      "text": "Question text with command word",
      "type": "LONG_ANSWER",
      "maxMarks": 10,
      "aoBreakdown": "2 AO1, 5 AO2, 3 AO3",
      "markScheme": ["mark point 1", "mark point 2", "mark point 3"]
    }
  ]
}

IMPORTANT:
- NO trailing commas in JSON
- Each question must be 10 marks
- Include detailed mark scheme with indicative content
- ${level === "A-LEVEL" ? "Include level-of-response criteria for AO3 parts" : "Use bullet point style for mark scheme"}`;
          break;

        case "application":
          prompt = `Create a 12-question science worksheet for a student who struggles with application questions, based on the textbook content in the image.

CRITICAL STRUCTURE:
- EXACTLY 12 questions total
- 3-tier difficulty structure:
  * Tier 1: 3 questions (simple application with familiar material)
  * Tier 2: 5 questions (new contexts, analogy, statement/claim judgement)
  * Tier 3: 4 questions (multi-step or data-based)

Question Requirements:
- Questions based on textbook content BUT written in NOVEL contexts
- Student must transfer their knowledge to unfamiliar scenarios
- Each question should be ONE LINE only
- Followed by "Prior knowledge needed:" (leave blank for students to fill in)
- Use OCR exam command words: state, describe, explain, suggest, compare, evaluate, calculate
- Mix of question styles:
  * Scenario-based (real-life contexts)
  * Statement/claim-based
  * Analogy-based
  * Data/calculation questions
- Include applied or unfamiliar contexts:
  * Medical contexts
  * Technological contexts
  * Ecological contexts
  * Everyday analogies

Worked Example:
- Include ONE worked example at the start
- Should be a more complex application-style question
- For worked example: "Prior knowledge needed:" should only state the topic area (not full answer)

Format Requirements:
- Plain text only
- Tier subheadings: "Tier 1", "Tier 2", "Tier 3" (NO extra descriptions)
- Each question one line
- "Prior knowledge needed:" after each question (blank)

Respond with ONLY valid JSON in this exact format:
{
  "workedExample": {
    "text": "Complex application question",
    "priorKnowledge": "Topic area only",
    "solution": "Step by step solution"
  },
  "questions": [
    {
      "tier": 1,
      "text": "One-line question in novel context",
      "type": "SHORT_ANSWER",
      "maxMarks": 2
    }
  ]
}

IMPORTANT:
- NO trailing commas in JSON
- Questions must be in novel/unfamiliar contexts
- Transfer knowledge, don't just recall`;
          break;

        case "marks-per-point":
          prompt = `Create a set of 12 GCSE science practice questions based on the topics in the image.

CRITICAL REQUIREMENTS:
- EXACTLY 12 questions total
- Questions worth 2, 3, or 4 marks each
- NO calculation questions - ONLY explanation and description
- Exam-style format
- Students should answer in bullet points
- Clear mark scheme for each question at the end

Format Requirements:
- Title: "Marks Per Point: [INSERT TOPICS]"
- Plain text format (easy to copy to Google Docs)
- Each question clearly numbered
- Mark scheme at the end with bullet points

Respond with ONLY valid JSON in this exact format:
{
  "title": "Marks Per Point: [Topic Name]",
  "questions": [
    {
      "text": "Explain why... (exam-style question)",
      "type": "SHORT_ANSWER",
      "maxMarks": 2,
      "markScheme": ["mark point 1", "mark point 2"]
    }
  ]
}

IMPORTANT:
- NO trailing commas in JSON
- Only explanation/description questions
- Each question must have clear mark scheme`;
          break;

        case "specific":
          prompt = `Create 12 practice questions to help a student practice a specific exam technique based on the image content.

CONTEXT:
A student struggled with a question because they lacked a specific exam technique. This technique has been retaught, and now they need practice questions.

CRITICAL REQUIREMENTS:
- EXACTLY 12 questions total
- All questions focus on practicing the SAME exam technique
- Questions can cover variety of topics (not just the original question topic)
- Exam-style format
- Allow focused technique practice

Question Design:
- Questions should require the specific technique to answer well
- Variety of topics to show technique applies broadly
- Exam-style command words
- Range of mark values (2-6 marks)

Respond with ONLY valid JSON in this exact format:
{
  "technique": "Description of the exam technique being practiced",
  "questions": [
    {
      "text": "Question requiring the technique",
      "type": "SHORT_ANSWER",
      "maxMarks": 3
    }
  ]
}

IMPORTANT:
- NO trailing commas in JSON
- All questions must practice the same technique
- Variety of topics to reinforce technique`;
          break;

        default:
          prompt = `Generate ${config.questionCount} ${config.questionType} questions for ${levelDisplay} based on the image.

CRITICAL: Respond with ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "text": "question text",
      "type": "MULTIPLE_CHOICE",
      "options": ["correct answer FIRST", "wrong1", "wrong2", "wrong3"],
      "correctAnswer": 0,
      "maxMarks": 1
    }
  ]
}

For MULTIPLE_CHOICE: place correct answer at index 0 in options array.
For SHORT_ANSWER/LONG_ANSWER: omit options and correctAnswer.`;
      }
    }

    console.log("📝 Final prompt:", prompt);

    // Pass the image to the vision model
    const questions = await generateStructuredQuestions(apiKey, prompt, imageBase64);

    console.log("✅ Successfully generated questions");
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("\n" + "❌".repeat(30));
    console.error('Error generating questions:', error);
    console.error("❌".repeat(30) + "\n");
    return NextResponse.json(
      { error: 'Failed to generate questions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}