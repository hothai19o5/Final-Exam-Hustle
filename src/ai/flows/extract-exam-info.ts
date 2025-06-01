
'use server';

/**
 * @fileOverview Extracts relevant exam information from a PDF based on class codes.
 *
 * - extractExamInfo - A function that handles the exam information extraction process.
 * - ExtractExamInfoInput - The input type for the extractExamInfo function.
 * - ExtractExamInfoOutput - The return type for the extractExamInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format } from 'date-fns';

const ExtractExamInfoInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF document containing the exam schedule, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  classCodes: z
    .string()
    .describe('A comma-separated list of class codes to extract exam information for.'),
});
export type ExtractExamInfoInput = z.infer<typeof ExtractExamInfoInputSchema>;

const ExamEntrySchema = z.object({
  courseName: z.string().describe('The name of the course.'),
  examDate: z.string().describe('The date of the exam in DD.MM.YYYY format.'),
  daysRemaining: z.number().describe('The number of days remaining until the exam. Should be 0 if the exam date is in the past.'),
});

const ExtractExamInfoOutputSchema = z.array(ExamEntrySchema).describe('A list of exam entries extracted from the PDF.');
export type ExtractExamInfoOutput = z.infer<typeof ExtractExamInfoOutputSchema>;

export async function extractExamInfo(input: ExtractExamInfoInput): Promise<ExtractExamInfoOutput> {
  return extractExamInfoFlow(input);
}

const extractExamDetails = ai.defineTool(
  {
    name: 'extractExamDetails',
    description: 'Extracts exam details (course name, exam date) from a PDF document for a given class code. The tool expects exam dates to be in DD.MM.YYYY format from the PDF or should convert them to this format.',
    inputSchema: z.object({
      pdfDataUri: z
        .string()
        .describe(
          "A PDF document containing the exam schedule, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
      classCode: z.string().describe('The class code to search for in the PDF.'),
    }),
    outputSchema: z.array(z.string().describe("A string containing course name and exam date, e.g., 'Course Name - DD.MM.YYYY'")),
  },
  async (toolInput) => {
    console.log(`Mock extractExamDetails called for classCode: ${toolInput.classCode}. PDF parsing not implemented.`);
    // This mock response should be tailored if specific test data is available or needed.
    // The actual implementation would involve PDF parsing logic.
    if (toolInput.classCode === "157324") {
        // Simulate finding an exam for CS101
        return ["Introduction to Programming - 20.06.2025"];
    }
    if (toolInput.classCode === "158785") {
        // Simulate finding an exam for MA201
        return ["Data Structures and Algorithms - 25.06.2025"];
    }
    if (toolInput.classCode === "PHYS202") {
        // Simulate finding a past exam for testing daysRemaining = 0
        return ["Modern Physics - 10.03.2024"];
    }
    if (toolInput.classCode === "MULTI101") {
        // Simulate finding multiple exams for one code
        return ["Multi-Course Part 1 - 01.12.2025", "Multi-Course Part 2 - 05.12.2025"];
    }
    return []; // Default to no results if class code doesn't match mock.
  }
);

// Schema for the internal input of the prompt, extending the flow's input
const PromptInternalInputSchema = ExtractExamInfoInputSchema.extend({
  currentDateFormatted: z.string().describe("Today's date, pre-formatted as DD.MM.YYYY."),
});


const prompt = ai.definePrompt({
  name: 'extractExamInfoPrompt',
  input: {schema: PromptInternalInputSchema},
  output: {schema: ExtractExamInfoOutputSchema},
  tools: [extractExamDetails],
  prompt: `You are an expert at extracting exam information from PDF documents.

  The user will provide a PDF document containing an exam schedule and a list of class codes.
  Your task is to extract the exam information (course name, exam date) for each of the provided class codes from the PDF.

  Here are the class codes: {{{classCodes}}}
  Here is the PDF document: {{media url=pdfDataUri}}

  For each class code found in the 'classCodes' string, use the 'extractExamDetails' tool to extract the exam information from the PDF.
  The tool will return an array of strings, where each string contains the course name and exam date, formatted as "Course Name - DD.MM.YYYY".
  You must parse this string to get the course name and exam date.

  The exam date extracted from the tool must be in DD.MM.YYYY format.

  Calculate the number of days remaining until each exam. Consider today's date to be {{{currentDateFormatted}}}.
  If an exam date is in the past relative to {{{currentDateFormatted}}}, the 'daysRemaining' should be 0.
  Ensure the 'daysRemaining' field is a number.

  Return the extracted exam information as a JSON array of objects, where each object contains the course name, exam date, and the number of days remaining until the exam.
  Ensure the courseName and examDate fields are accurately populated from the tool's output.

  Example of expected output format:
  [
    {
      "courseName": "Introduction to Programming",
      "examDate": "20.06.2025",
      "daysRemaining": 30
    },
    {
      "courseName": "Data Structures and Algorithms",
      "examDate": "25.06.2025",
      "daysRemaining": 35
    }
  ]

  If the 'extractExamDetails' tool returns an empty array for a class code, do not include an entry for that class code in the final output.
  If the tool returns multiple entries for a single class code, create a separate exam object for each.
  `,
});

const extractExamInfoFlow = ai.defineFlow(
  {
    name: 'extractExamInfoFlow',
    inputSchema: ExtractExamInfoInputSchema, // This is the external input schema for the flow
    outputSchema: ExtractExamInfoOutputSchema,
  },
  async (flowInput: ExtractExamInfoInput) => {
    const currentDateFormatted = format(new Date(), 'dd.MM.yyyy');
    
    // Prepare the input for the prompt, including the pre-formatted date
    const promptInput = {
      ...flowInput,
      currentDateFormatted,
    };

    const {output} = await prompt(promptInput);
    return output!;
  }
);

