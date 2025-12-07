import OpenAI from "openai";
import { GeneratedQuestion } from "./types";

// Function to shuffle array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Randomize MCQ answer positions
function randomizeAnswers(questions: GeneratedQuestion[]): GeneratedQuestion[] {
    return questions.map(q => {
        if (q.type === "MULTIPLE_CHOICE" && q.options && q.correctAnswer !== undefined) {
            const correctOption = q.options[q.correctAnswer];
            const shuffled = shuffleArray(q.options);
            const newCorrectIndex = shuffled.indexOf(correctOption);

            return {
                ...q,
                options: shuffled,
                correctAnswer: newCorrectIndex
            };
        }
        return q;
    });
}

export async function generateStructuredQuestions(
    apiKey: string,
    prompt: string,
    imageBase64?: string | string[],
): Promise<GeneratedQuestion[]> {
    console.log("🚀 [STAGE 1] Starting question generation...");
    console.log("📝 Prompt:", prompt);
    
    // Handle both single image and array of images
    const images = Array.isArray(imageBase64) ? imageBase64 : (imageBase64 ? [imageBase64] : []);
    console.log("🖼️  Images provided:", images.length > 0 ? `Yes (${images.length} image(s))` : "No");

    const client = new OpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
    });

    // Build message content with image(s) if provided
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: "text", text: `USER PROMPT: ${prompt}` }
    ];

    // Add all images to the content
    if (images.length > 0) {
        images.forEach((img, index) => {
            userContent.push({
                type: "image_url",
                image_url: { url: img }
            });
            console.log(`✅ Image ${index + 1} added to request`);
        });
    }

    console.log("🤖 [STAGE 2] Sending request to OpenRouter...");
    console.log("📡 Model: qwen/qwen-2.5-vl-7b-instruct");

    const response = await client.chat.completions.create({
        model: "qwen/qwen-2.5-vl-7b-instruct", // FREE vision model, reliaGoogle, better at following JSON instructions
        messages: [
            {
                role: "user",
                content: userContent as any,
            },
        ],
        // Remove response_format for better compatibility with free models
    });

    console.log("✅ [STAGE 3] Received response from OpenRouter");

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from OpenAI response.");

    console.log("📄 [STAGE 4] Raw response content:");
    console.log(content);

    // Try to extract JSON from the response (in case model adds extra text)
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Try to find a proper questions array structure
    let structured: { questions: GeneratedQuestion[] } | null = null;
    
    // Check if response already has the correct structure
    if (jsonContent.includes('"questions"')) {
        const jsonMatch = jsonContent.match(/\{[\s\S]*"questions"[\s\S]*\}/);
        if (jsonMatch) {
            jsonContent = jsonMatch[0];
            console.log("🔍 Found questions array structure");
            console.log("🔧 [STAGE 5] Parsing JSON...");
            
            try {
                structured = JSON.parse(jsonContent) as { questions: GeneratedQuestion[] };
            } catch (parseError) {
                console.error("❌ JSON parse error:", parseError);
                console.error("📄 Problematic JSON (first 1000 chars):");
                console.error(jsonContent.substring(0, 1000));
                
                // Try to fix common JSON issues
                let fixedJson = jsonContent
                    .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                    .replace(/\n/g, ' ') // Remove newlines
                    .replace(/\r/g, '') // Remove carriage returns
                    .replace(/\t/g, ' ') // Replace tabs with spaces
                    .replace(/\\/g, '\\\\') // Escape backslashes
                    .replace(/[\u0000-\u001F]+/g, ''); // Remove control characters
                
                console.log("🔧 Attempting to parse fixed JSON...");
                structured = JSON.parse(fixedJson) as { questions: GeneratedQuestion[] };
            }
        }
    }
    
    // If not found, try to extract individual question objects
    if (!structured) {
        console.log("🔧 Model returned individual questions, extracting...");
        
        // More flexible regex to match JSON objects with nested arrays
        const questionMatches = jsonContent.match(/\{[^{}]*"type"[^{}]*(?:\[[^\]]*\])?[^{}]*\}/g);
        
        console.log("Regex matches found:", questionMatches?.length || 0);
        if (questionMatches) {
            console.log("First match sample:", questionMatches[0]);
        }
        
        if (questionMatches && questionMatches.length > 0) {
            console.log(`Found ${questionMatches.length} individual question objects`);
            
            // Parse each question and fix the structure
            const questions = questionMatches.map((q, index) => {
                try {
                    const parsed = JSON.parse(q);
                    console.log(`Parsing question ${index + 1}:`, parsed);
                    
                    // Normalize the structure
                    return {
                        text: parsed.question || parsed.text || "",
                        type: parsed.type,
                        options: parsed.options || [],
                        correctAnswer: typeof parsed.correctAnswer === 'string' ? 0 : (parsed.correctAnswer || 0),
                        maxMarks: parseInt(parsed.maxMarks) || 1
                    };
                } catch (e) {
                    console.error(`Failed to parse question ${index + 1}:`, q, e);
                    return null;
                }
            }).filter(q => q !== null);
            
            structured = { questions: questions as GeneratedQuestion[] };
            console.log(`✅ Extracted and normalized ${questions.length} questions`);
        } else {
            console.error("❌ No question objects found. Raw content:");
            console.error(jsonContent.substring(0, 500));
            throw new Error("Could not find valid question objects in response");
        }
    }
    
    console.log(`✅ Parsed ${structured.questions.length} questions`);

    // Randomize MCQ answer positions to avoid LLM bias
    console.log("🎲 [STAGE 6] Randomizing answer positions...");
    const randomized = randomizeAnswers(structured.questions);
    
    console.log("🎉 [STAGE 7] Question generation complete!");
    console.log("📊 Final questions:", JSON.stringify(randomized, null, 2));

    return randomized;
}