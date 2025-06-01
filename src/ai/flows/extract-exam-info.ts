// This is an auto-generated file from Firebase Studio.

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
  daysRemaining: z.number().describe('The number of days remaining until the exam.'),
});

const ExtractExamInfoOutputSchema = z.array(ExamEntrySchema).describe('A list of exam entries extracted from the PDF.');
export type ExtractExamInfoOutput = z.infer<typeof ExtractExamInfoOutputSchema>;

export async function extractExamInfo(input: ExtractExamInfoInput): Promise<ExtractExamInfoOutput> {
  return extractExamInfoFlow(input);
}

const extractExamDetails = ai.defineTool(
  {
    name: 'extractExamDetails',
    description: 'Extracts exam details (course name, exam date) from a PDF document for a given class code.',
    inputSchema: z.object({
      pdfDataUri: z
        .string()
        .describe(
          "A PDF document containing the exam schedule, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
        ),
      classCode: z.string().describe('The class code to search for in the PDF.'),
    }),
    outputSchema: z.array(z.string()),
  },
  async (input) => {
    // This placeholder needs to be implemented to extract exam details from the PDF.
    // Using a real PDF parsing library (like pdf-parse) is essential here.
    // The return type must be an array of strings containing the extracted exam information
    // in the form of course name and exam date.
    // For now, returning a placeholder based on classCode to allow flow to proceed.
    // Example: if classCode is "CS101", it could return ["Introduction to CS - 15.07.2025"]
    // The actual implementation would involve PDF parsing logic.
    console.log(`Mock extractExamDetails called for classCode: ${input.classCode}. PDF parsing not implemented.`);
    // This mock response should be tailored if specific test data is available or needed.
    // For example, if testing the flow's ability to handle multiple results for a class code,
    // or different date formats if the prompt was more general.
    // Given the prompt expects DD.MM.YYYY, we'll mock that.
    // To make it somewhat dynamic for testing, let's imagine a few predefined codes.
    if (input.classCode === "157324") {
        return ["Introduction to Programming - 20.06.2025"];
    }
    if (input.classCode === "158785") {
        return ["Data Structures and Algorithms - 25.06.2025"];
    }
    return []; // Default to no results if class code doesn't match mock.
  }
);

const prompt = ai.definePrompt({
  name: 'extractExamInfoPrompt',
  input: {schema: ExtractExamInfoInputSchema},
  output: {schema: ExtractExamInfoOutputSchema},
  tools: [extractExamDetails],
  prompt: `You are an expert at extracting exam information from PDF documents.

  The user will provide a PDF document containing an exam schedule and a list of class codes.
  Your task is to extract the exam information (course name, exam date) for each of the provided class codes from the PDF.

  Here are the class codes: {{{classCodes}}}

  Here is the PDF document: {{media url=pdfDataUri}}

  For each class code, use the 'extractExamDetails' tool to extract the exam information from the PDF.
  The tool will return an array of strings, where each string contains the course name and exam date. For example: ["Course Name - DD.MM.YYYY"].
  You must parse this string to get the course name and exam date.

  The exam date should be in DD.MM.YYYY format.

  Calculate the number of days remaining until each exam, relative to today's date ({{@global.timestampISO}}).
  Today's date is {{dateFormat @global.timestampISO format="DD.MM.YYYY"}}.

  Return the extracted exam information as a JSON array of objects, where each object contains the course name, exam date, and the number of days remaining until the exam.
  Make sure that the 'daysRemaining' field is a number. Ensure the courseName and examDate fields are accurately populated from the tool's output.

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
    inputSchema: ExtractExamInfoInputSchema,
    outputSchema: ExtractExamInfoOutputSchema,
  },
  async input => {
    // The prompt is designed to iterate through class codes and use the tool.
    // The main logic for calling the tool and processing its output is handled by the LLM based on the prompt instructions.
    // The LLM will call extractExamDetails for each class code derived from input.classCodes.
    // The LLM will then format the output as specified.
    const {output} = await prompt(input);
    return output!;
  }
);
